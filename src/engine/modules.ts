import type {
  BaseModuleDefinition,
  Direction,
  Prototype,
  RotationSteps,
  SocketTuple,
  SocketType,
} from './types';

export const DIRECTIONS: readonly Direction[] = [0, 1, 2, 3];

export const DIRECTION_LABELS: Record<Direction, 'N' | 'E' | 'S' | 'W'> = {
  0: 'N',
  1: 'E',
  2: 'S',
  3: 'W',
};

export const DIRECTION_OFFSETS: Record<Direction, readonly [dx: number, dz: number]> = {
  0: [0, -1], // North (Z-)
  1: [1, 0],  // East  (X+)
  2: [0, 1],  // South (Z+)
  3: [-1, 0], // West  (X-)
};

export function oppositeDirection(dir: Direction): Direction {
  return ((dir + 2) % 4) as Direction;
}

/**
 * Base module catalog following the ViceGrid WFC specification.
 * Socket order: [North (Z-), East (X+), South (Z+), West (X-)]
 */
export const BASE_MODULES: readonly BaseModuleDefinition[] = [
  {
    id: 'OCEAN',
    name: 'Mar Caribe',
    description: 'Open tropical water with animated GLSL waves and sunset reflections.',
    sockets: ['OCEAN', 'OCEAN', 'OCEAN', 'OCEAN'],
    weight: 1.5,
  },
  {
    id: 'BEACH',
    name: 'Playa',
    description: 'Mandatory sandy shoreline transition between Ocean and Promenade.',
    sockets: ['PROMENADE', 'BEACH', 'OCEAN', 'BEACH'],
    weight: 1.2,
  },
  {
    id: 'PROMENADE',
    name: 'Ocean Drive',
    description: 'Coastal boardwalk with palms, neon bollards, and Art Deco railings.',
    sockets: ['ROAD', 'PROMENADE', 'BEACH', 'PROMENADE'],
    weight: 1.2,
  },
  {
    id: 'ROAD_STRAIGHT',
    name: 'Avenida',
    description: 'Two-lane main avenue with wet reflective asphalt and palm-lined sidewalks.',
    sockets: ['ROAD', 'BUILDING_BASE', 'ROAD', 'BUILDING_BASE'],
    weight: 3.0,
  },
  {
    id: 'ROAD_CORNER',
    name: 'Curva',
    description: '90-degree avenue turn connecting two perpendicular road segments.',
    sockets: ['ROAD', 'ROAD', 'BUILDING_BASE', 'BUILDING_BASE'],
    weight: 1.8,
  },
  {
    id: 'ROAD_CROSS',
    name: 'Intersección',
    description: 'Four-way urban intersection with crosswalks and lane markings.',
    sockets: ['ROAD', 'ROAD', 'ROAD', 'ROAD'],
    weight: 1.0,
  },
  {
    id: 'BLOCK_ARTDECO',
    name: 'Manzana Vice',
    description: 'Procedural Art Deco pastel towers with neon trim and interior mapping.',
    sockets: ['BUILDING_BASE', 'BUILDING_BASE', 'BUILDING_BASE', 'BUILDING_BASE'],
    weight: 2.8,
  },
  {
    id: 'PARK_PLAZA',
    name: 'Parque',
    description: 'Urban tropical plaza with central fountain, pathways, and palms.',
    sockets: ['BUILDING_BASE', 'PARK', 'BUILDING_BASE', 'PARK'],
    weight: 1.0,
  },
];

/**
 * Rotates a socket tuple clockwise by `steps` 90-degree increments.
 * Looking from +Y down onto the XZ plane:
 * North (-Z) -> East (+X) -> South (+Z) -> West (-X) -> North (-Z).
 * In Three.js right-handed space, this matches `rotation.y = -steps * (Math.PI / 2)`.
 */
export function rotateSockets(sockets: SocketTuple, steps: RotationSteps): SocketTuple {
  const [n, e, s, w] = sockets;
  switch (steps) {
    case 0:
      return [n, e, s, w];
    case 1:
      return [w, n, e, s];
    case 2:
      return [s, w, n, e];
    case 3:
      return [e, s, w, n];
  }
}

/**
 * Generates all unique rotated prototypes (0°, 90°, 180°, 270°) from BASE_MODULES.
 * Deduplicates identical socket signatures per base module to avoid skewing weights.
 */
export function buildPrototypes(): Prototype[] {
  const prototypes: Prototype[] = [];

  for (const mod of BASE_MODULES) {
    const seen = new Set<string>();
    const rotations: readonly RotationSteps[] = [0, 1, 2, 3];

    for (const rotation of rotations) {
      const rotated = rotateSockets(mod.sockets, rotation);
      const signature = rotated.join('|');
      if (seen.has(signature)) continue;
      seen.add(signature);

      prototypes.push({
        index: prototypes.length,
        id: `${mod.id}_R${rotation * 90}`,
        baseId: mod.id,
        name: mod.name,
        rotation,
        sockets: rotated,
        weight: mod.weight,
      });
    }
  }

  return prototypes;
}

/**
 * Determines whether prototype A facing `socketA` can connect to prototype B facing `socketB`.
 * Handles the directed coastal transition where BEACH's 'PROMENADE' face pairs exclusively
 * with PROMENADE's 'BEACH' face, while lateral BEACH<->BEACH and PROMENADE<->PROMENADE
 * faces continue along the shoreline.
 */
export function areSocketsCompatible(
  protoA: Prototype,
  socketA: SocketType,
  protoB: Prototype,
  socketB: SocketType,
): boolean {
  const isBeachToPromenade = protoA.baseId === 'BEACH' && socketA === 'PROMENADE';
  const isPromenadeToBeach = protoA.baseId === 'PROMENADE' && socketA === 'BEACH';
  const bIsBeachToPromenade = protoB.baseId === 'BEACH' && socketB === 'PROMENADE';
  const bIsPromenadeToBeach = protoB.baseId === 'PROMENADE' && socketB === 'BEACH';

  if (isBeachToPromenade || bIsPromenadeToBeach) {
    return isBeachToPromenade && bIsPromenadeToBeach;
  }

  if (isPromenadeToBeach || bIsBeachToPromenade) {
    return isPromenadeToBeach && bIsBeachToPromenade;
  }

  return socketA === socketB;
}

export const PROTOTYPES: readonly Prototype[] = buildPrototypes();

/**
 * Precomputed adjacency table:
 * COMPATIBILITY[protoIndex][direction] = Set of allowed neighbor prototype indices.
 */
export const COMPATIBILITY: readonly (readonly ReadonlySet<number>[])[] = PROTOTYPES.map(
  (protoA) =>
    DIRECTIONS.map((dir) => {
      const opp = oppositeDirection(dir);
      const allowed = new Set<number>();
      for (const protoB of PROTOTYPES) {
        if (areSocketsCompatible(protoA, protoA.sockets[dir], protoB, protoB.sockets[opp])) {
          allowed.add(protoB.index);
        }
      }
      return allowed;
    }),
);
