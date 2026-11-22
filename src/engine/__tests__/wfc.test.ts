import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BASE_MODULES,
  COMPATIBILITY,
  DIRECTIONS,
  DIRECTION_OFFSETS,
  PROTOTYPES,
  rotateSockets,
} from '../modules';
import { WFCEngine } from '../wfc';

test('BASE_MODULES defines all 8 ViceGrid modules', () => {
  assert.equal(BASE_MODULES.length, 8);
  assert.ok(PROTOTYPES.length > BASE_MODULES.length);
});

test('rotateSockets rotates clockwise 90 degrees per step', () => {
  const beach = ['PROMENADE', 'BEACH', 'OCEAN', 'BEACH'] as const;
  assert.deepEqual(rotateSockets(beach, 0), ['PROMENADE', 'BEACH', 'OCEAN', 'BEACH']);
  assert.deepEqual(rotateSockets(beach, 1), ['BEACH', 'PROMENADE', 'BEACH', 'OCEAN']);
  assert.deepEqual(rotateSockets(beach, 2), ['OCEAN', 'BEACH', 'PROMENADE', 'BEACH']);
  assert.deepEqual(rotateSockets(beach, 3), ['BEACH', 'OCEAN', 'BEACH', 'PROMENADE']);
});

function assertGridSocketsValid(engine: WFCEngine) {
  const state = engine.getState();
  assert.equal(state.completed, true);
  assert.equal(state.collapsedCount, state.totalCells);

  for (const cell of state.cells) {
    assert.equal(cell.collapsed, true);
    assert.notEqual(cell.prototypeIndex, null);
    const protoIndex = cell.prototypeIndex!;

    for (const dir of DIRECTIONS) {
      const [dx, dz] = DIRECTION_OFFSETS[dir];
      const nx = cell.x + dx;
      const nz = cell.z + dz;
      if (nx < 0 || nx >= state.width || nz < 0 || nz >= state.height) continue;

      const neighbor = state.cells[nz * state.width + nx];
      assert.notEqual(neighbor.prototypeIndex, null);
      assert.ok(
        COMPATIBILITY[protoIndex][dir].has(neighbor.prototypeIndex!),
        `Incompatible socket between (${cell.x},${cell.z})[${PROTOTYPES[protoIndex].id}] and (${nx},${nz})[${PROTOTYPES[neighbor.prototypeIndex!].id}] dir=${dir}`,
      );
    }
  }
}

test('WFCEngine solves 12x12, 16x16, and 24x24 grids with valid socket adjacency', () => {
  for (const size of [12, 16, 24]) {
    const engine = new WFCEngine({ width: size, height: size, seed: 1986 + size });
    engine.solveAll();
    assertGridSocketsValid(engine);
  }
});

test('WFCEngine step() progresses deterministically to completion', () => {
  const engine = new WFCEngine({ width: 12, height: 12, seed: 42 });
  let steps = 0;
  let result = engine.step();
  while (!result.completed && steps < 5000) {
    result = engine.step();
    steps += 1;
  }
  assert.equal(result.completed, true);
  assertGridSocketsValid(engine);
});

test('WFCEngine solves without coastal bias across multiple seeds', () => {
  for (const seed of [1, 7, 99, 2026]) {
    const engine = new WFCEngine({ width: 12, height: 12, seed, coastalBias: false });
    engine.solveAll();
    assertGridSocketsValid(engine);
  }
});
