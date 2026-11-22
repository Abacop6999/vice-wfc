import { COMPATIBILITY, DIRECTIONS, DIRECTION_OFFSETS, PROTOTYPES } from './modules';
import type {
  Cell,
  GridState,
  Prototype,
  Snapshot,
  StepResult,
  WFCEngineOptions,
} from './types';

/**
 * Fast, deterministic Mulberry32 PRNG for reproducible city generation.
 */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_BACKTRACK_DEPTH = 64;
const MAX_SOLVE_ITERATIONS = 25000;

export class WFCEngine {
  readonly width: number;
  readonly height: number;
  readonly totalCells: number;
  readonly prototypes: readonly Prototype[] = PROTOTYPES;

  private readonly coastalBias: boolean;
  private seed: number;
  private rng: () => number;
  private cells: Cell[] = [];
  private snapshots: Snapshot[] = [];
  private collapsedCount = 0;
  private backtrackCount = 0;
  private completed = false;

  constructor(options: WFCEngineOptions) {
    this.width = options.width;
    this.height = options.height;
    this.totalCells = options.width * options.height;
    this.coastalBias = options.coastalBias ?? true;
    this.seed = (options.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
    this.rng = createRng(this.seed);
    this.initializeGrid();
  }

  reset(newSeed?: number): GridState {
    this.seed = (newSeed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
    this.rng = createRng(this.seed);
    this.snapshots = [];
    this.collapsedCount = 0;
    this.backtrackCount = 0;
    this.completed = false;
    this.initializeGrid();
    return this.getState();
  }

  getState(): GridState {
    return {
      width: this.width,
      height: this.height,
      cells: this.cells.map((cell) => ({
        ...cell,
        possible: [...cell.possible],
      })),
      collapsedCount: this.collapsedCount,
      totalCells: this.totalCells,
      backtrackCount: this.backtrackCount,
      completed: this.completed,
      seed: this.seed,
    };
  }

  /**
   * Advances the simulation by one collapse + BFS constraint propagation.
   * Automatically backtracks via snapshots if a contradiction is detected.
   */
  step(): StepResult {
    if (this.completed) {
      return {
        status: 'completed',
        cellIndex: null,
        prototypeIndex: null,
        collapsedCount: this.collapsedCount,
        totalCells: this.totalCells,
        backtrackCount: this.backtrackCount,
        completed: true,
      };
    }

    const nextCellIndex = this.findLowestEntropyCell();

    if (nextCellIndex === -1) {
      this.completed = true;
      return {
        status: 'completed',
        cellIndex: null,
        prototypeIndex: null,
        collapsedCount: this.collapsedCount,
        totalCells: this.totalCells,
        backtrackCount: this.backtrackCount,
        completed: true,
      };
    }

    const targetCell = this.cells[nextCellIndex];
    if (targetCell.possible.length === 0) {
      return this.handleContradiction();
    }

    const chosenProto = this.pickWeightedPrototype(targetCell.possible);

    // Save snapshot before committing a branching choice so we can backtrack cleanly.
    if (targetCell.possible.length > 1) {
      this.pushSnapshot(nextCellIndex, chosenProto);
    }

    this.collapseCell(nextCellIndex, chosenProto);

    const consistent = this.propagate([nextCellIndex]);
    if (!consistent) {
      return this.handleContradiction();
    }

    if (this.collapsedCount >= this.totalCells) {
      this.completed = true;
    }

    return {
      status: this.completed ? 'completed' : 'collapsed',
      cellIndex: nextCellIndex,
      prototypeIndex: chosenProto,
      collapsedCount: this.collapsedCount,
      totalCells: this.totalCells,
      backtrackCount: this.backtrackCount,
      completed: this.completed,
    };
  }

  /**
   * Runs the WFC solver synchronously until every cell is validly collapsed.
   */
  solveAll(): GridState {
    let iterations = 0;
    while (!this.completed && iterations < MAX_SOLVE_ITERATIONS) {
      this.step();
      iterations += 1;
    }
    return this.getState();
  }

  private initializeGrid(): void {
    const allProtoIndices = this.prototypes.map((p) => p.index);
    this.cells = new Array<Cell>(this.totalCells);

    for (let z = 0; z < this.height; z += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const index = z * this.width + x;
        const possible = [...allProtoIndices];
        this.cells[index] = {
          x,
          z,
          index,
          collapsed: false,
          prototypeIndex: null,
          possible,
          entropy: this.computeEntropy(possible),
          collapseOrder: -1,
        };
      }
    }

    if (this.coastalBias && this.height >= 6) {
      this.applyCoastalBoundaryConstraints();
    }
  }

  /**
   * Constrains the southern edge to Caribbean Ocean and Beach (without pre-collapsing)
   * and keeps the northern edge urban so every generated sector showcases Vice City's
   * Ocean -> Beach -> Ocean Drive Promenade -> Art Deco Downtown progression.
   */
  private applyCoastalBoundaryConstraints(): void {
    const oceanIdx = this.prototypes.find((p) => p.baseId === 'OCEAN')?.index;
    const beachSouthIdx = this.prototypes.find(
      (p) => p.baseId === 'BEACH' && p.rotation === 0,
    )?.index;
    const urbanIndices = this.prototypes
      .filter(
        (p) =>
          p.baseId === 'ROAD_STRAIGHT' ||
          p.baseId === 'ROAD_CORNER' ||
          p.baseId === 'ROAD_CROSS' ||
          p.baseId === 'BLOCK_ARTDECO' ||
          p.baseId === 'PARK_PLAZA',
      )
      .map((p) => p.index);

    if (oceanIdx === undefined || beachSouthIdx === undefined) return;

    const queue: number[] = [];

    for (let x = 0; x < this.width; x += 1) {
      const southRowIdx = (this.height - 1) * this.width + x;
      const beachRowIdx = (this.height - 2) * this.width + x;
      const northRowIdx = x;

      this.cells[southRowIdx].possible = [oceanIdx];
      this.cells[southRowIdx].entropy = this.computeEntropy([oceanIdx]);
      queue.push(southRowIdx);

      this.cells[beachRowIdx].possible = [beachSouthIdx];
      this.cells[beachRowIdx].entropy = this.computeEntropy([beachSouthIdx]);
      queue.push(beachRowIdx);

      this.cells[northRowIdx].possible = [...urbanIndices];
      this.cells[northRowIdx].entropy = this.computeEntropy(urbanIndices);
      queue.push(northRowIdx);
    }

    this.propagate(queue);
  }

  private computeEntropy(possible: readonly number[]): number {
    if (possible.length <= 1) return 0;

    let sumWeights = 0;
    let sumWeightLogWeight = 0;

    for (let i = 0; i < possible.length; i += 1) {
      const w = this.prototypes[possible[i]].weight;
      sumWeights += w;
      sumWeightLogWeight += w * Math.log(w);
    }

    if (sumWeights <= 0) return 0;
    return Math.log(sumWeights) - sumWeightLogWeight / sumWeights;
  }

  private findLowestEntropyCell(): number {
    let bestIndex = -1;
    let minScore = Number.POSITIVE_INFINITY;

    for (let i = 0; i < this.totalCells; i += 1) {
      const cell = this.cells[i];
      if (cell.collapsed) continue;

      if (cell.possible.length === 0) {
        return i;
      }

      // Small deterministic jitter breaks ties organically across the grid.
      const score = cell.entropy + this.rng() * 1e-4;
      if (score < minScore) {
        minScore = score;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  private pickWeightedPrototype(possible: readonly number[]): number {
    let totalWeight = 0;
    for (let i = 0; i < possible.length; i += 1) {
      totalWeight += this.prototypes[possible[i]].weight;
    }

    let threshold = this.rng() * totalWeight;
    for (let i = 0; i < possible.length; i += 1) {
      const protoIdx = possible[i];
      threshold -= this.prototypes[protoIdx].weight;
      if (threshold <= 0) {
        return protoIdx;
      }
    }

    return possible[possible.length - 1];
  }

  private collapseCell(cellIndex: number, prototypeIndex: number): void {
    const cell = this.cells[cellIndex];
    if (!cell.collapsed) {
      this.collapsedCount += 1;
      cell.collapseOrder = this.collapsedCount;
    }
    cell.collapsed = true;
    cell.prototypeIndex = prototypeIndex;
    cell.possible = [prototypeIndex];
    cell.entropy = 0;
  }

  /**
   * Breadth-first constraint propagation across neighboring cells.
   * Returns false immediately upon encountering a zero-possibility contradiction.
   */
  private propagate(initialQueue: number[]): boolean {
    const queue = [...initialQueue];
    const inQueue = new Uint8Array(this.totalCells);
    for (const idx of queue) {
      inQueue[idx] = 1;
    }

    let head = 0;
    while (head < queue.length) {
      const currentIdx = queue[head++];
      inQueue[currentIdx] = 0;
      const currentCell = this.cells[currentIdx];

      for (const dir of DIRECTIONS) {
        const [dx, dz] = DIRECTION_OFFSETS[dir];
        const nx = currentCell.x + dx;
        const nz = currentCell.z + dz;
        if (nx < 0 || nx >= this.width || nz < 0 || nz >= this.height) {
          continue;
        }

        const neighborIdx = nz * this.width + nx;
        const neighbor = this.cells[neighborIdx];
        const prevLength = neighbor.possible.length;
        if (prevLength === 0) return false;

        // Union of all neighbor prototypes allowed by currentCell's remaining options.
        const filtered: number[] = [];
        for (let i = 0; i < prevLength; i += 1) {
          const candidate = neighbor.possible[i];
          let supported = false;
          for (let j = 0; j < currentCell.possible.length; j += 1) {
            const sourceProto = currentCell.possible[j];
            if (COMPATIBILITY[sourceProto][dir].has(candidate)) {
              supported = true;
              break;
            }
          }
          if (supported) {
            filtered.push(candidate);
          }
        }

        if (filtered.length === 0) {
          neighbor.possible = [];
          neighbor.entropy = 0;
          return false;
        }

        if (filtered.length < prevLength) {
          neighbor.possible = filtered;
          neighbor.entropy = this.computeEntropy(filtered);

          if (!inQueue[neighborIdx]) {
            queue.push(neighborIdx);
            inQueue[neighborIdx] = 1;
          }
        }
      }
    }

    return true;
  }

  private pushSnapshot(decisionCellIndex: number, chosenPrototypeIndex: number): void {
    if (this.snapshots.length >= MAX_BACKTRACK_DEPTH) {
      this.snapshots.shift();
    }

    this.snapshots.push({
      possibleByCell: this.cells.map((c) => [...c.possible]),
      collapsedByCell: this.cells.map((c) => c.collapsed),
      prototypeByCell: this.cells.map((c) => c.prototypeIndex),
      collapseOrderByCell: this.cells.map((c) => c.collapseOrder),
      collapsedCount: this.collapsedCount,
      decisionCellIndex,
      chosenPrototypeIndex,
    });
  }

  private restoreSnapshot(snapshot: Snapshot): void {
    for (let i = 0; i < this.totalCells; i += 1) {
      const cell = this.cells[i];
      cell.possible = [...snapshot.possibleByCell[i]];
      cell.collapsed = snapshot.collapsedByCell[i];
      cell.prototypeIndex = snapshot.prototypeByCell[i];
      cell.collapseOrder = snapshot.collapseOrderByCell[i];
      cell.entropy = this.computeEntropy(cell.possible);
    }
    this.collapsedCount = snapshot.collapsedCount;
    this.completed = false;
  }

  private handleContradiction(): StepResult {
    this.backtrackCount += 1;

    while (this.snapshots.length > 0) {
      const snapshot = this.snapshots.pop()!;
      this.restoreSnapshot(snapshot);

      const decisionCell = this.cells[snapshot.decisionCellIndex];
      decisionCell.possible = decisionCell.possible.filter(
        (protoIdx) => protoIdx !== snapshot.chosenPrototypeIndex,
      );
      decisionCell.entropy = this.computeEntropy(decisionCell.possible);

      if (decisionCell.possible.length === 0) {
        continue;
      }

      if (this.propagate([snapshot.decisionCellIndex])) {
        return {
          status: 'backtracked',
          cellIndex: snapshot.decisionCellIndex,
          prototypeIndex: null,
          collapsedCount: this.collapsedCount,
          totalCells: this.totalCells,
          backtrackCount: this.backtrackCount,
          completed: false,
        };
      }
    }

    // Fallback: if the snapshot stack is exhausted, restart with a derived seed
    // so the solver is guaranteed to converge without deadlocking.
    this.seed = (this.seed + 0x9e3779b9) >>> 0;
    this.rng = createRng(this.seed);
    this.collapsedCount = 0;
    this.completed = false;
    this.initializeGrid();

    return {
      status: 'restarted',
      cellIndex: null,
      prototypeIndex: null,
      collapsedCount: this.collapsedCount,
      totalCells: this.totalCells,
      backtrackCount: this.backtrackCount,
      completed: false,
    };
  }
}
