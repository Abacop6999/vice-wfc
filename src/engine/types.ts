export type SocketType =
  | 'OCEAN'
  | 'BEACH'
  | 'PROMENADE'
  | 'ROAD'
  | 'BUILDING_BASE'
  | 'PARK';

/**
 * Cardinal directions ordered clockwise starting from North (-Z).
 * 0: North (Z-), 1: East (X+), 2: South (Z+), 3: West (X-)
 */
export type Direction = 0 | 1 | 2 | 3;

export type RotationSteps = 0 | 1 | 2 | 3;

export type BaseModuleId =
  | 'OCEAN'
  | 'BEACH'
  | 'PROMENADE'
  | 'ROAD_STRAIGHT'
  | 'ROAD_CORNER'
  | 'ROAD_CROSS'
  | 'BLOCK_ARTDECO'
  | 'PARK_PLAZA';

export type SocketTuple = readonly [SocketType, SocketType, SocketType, SocketType];

export interface BaseModuleDefinition {
  readonly id: BaseModuleId;
  readonly name: string;
  readonly description: string;
  readonly sockets: SocketTuple;
  readonly weight: number;
}

export interface Prototype {
  readonly index: number;
  readonly id: string;
  readonly baseId: BaseModuleId;
  readonly name: string;
  readonly rotation: RotationSteps;
  readonly sockets: SocketTuple;
  readonly weight: number;
}

export interface Cell {
  readonly x: number;
  readonly z: number;
  readonly index: number;
  collapsed: boolean;
  prototypeIndex: number | null;
  possible: number[];
  entropy: number;
  collapseOrder: number;
}

export interface Snapshot {
  readonly possibleByCell: number[][];
  readonly collapsedByCell: boolean[];
  readonly prototypeByCell: (number | null)[];
  readonly collapseOrderByCell: number[];
  readonly collapsedCount: number;
  readonly decisionCellIndex: number;
  readonly chosenPrototypeIndex: number;
}

export type StepStatus = 'collapsed' | 'backtracked' | 'restarted' | 'completed';

export interface StepResult {
  readonly status: StepStatus;
  readonly cellIndex: number | null;
  readonly prototypeIndex: number | null;
  readonly collapsedCount: number;
  readonly totalCells: number;
  readonly backtrackCount: number;
  readonly completed: boolean;
}

export interface GridState {
  readonly width: number;
  readonly height: number;
  readonly cells: Cell[];
  readonly collapsedCount: number;
  readonly totalCells: number;
  readonly backtrackCount: number;
  readonly completed: boolean;
  readonly seed: number;
}

export interface WFCEngineOptions {
  readonly width: number;
  readonly height: number;
  readonly seed?: number;
  readonly coastalBias?: boolean;
}
