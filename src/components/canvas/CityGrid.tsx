'use client';

import React, { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PROTOTYPES } from '@/engine/modules';
import type { BaseModuleId, Cell } from '@/engine/types';
import { useWfcStore } from '@/store/useWfcStore';
import { BuildingBlock } from './modules/BuildingBlock';
import { CoastTile } from './modules/CoastTile';
import { RoadTile } from './modules/RoadTile';

export const TILE_SIZE = 4;

const CYAN_HIGH_ENTROPY = new THREE.Color('#00f0ff');
const MAGENTA_LOW_ENTROPY = new THREE.Color('#ff2a85');
const MAX_PROTOTYPE_COUNT = PROTOTYPES.length;

interface ActiveAnimation {
  group: THREE.Group;
  progress: number;
}

/**
 * Renders a collapsed tile and registers itself into a single shared animation map
 * so zero per-tile useFrame hooks run after the pop-in bounce finishes.
 */
const AnimatedTile = memo(function AnimatedTile({
  id,
  x,
  z,
  baseId,
  rotationSteps,
  tileSeed,
  isNight,
  animateIn,
  animMapRef,
}: {
  id: number;
  x: number;
  z: number;
  baseId: BaseModuleId;
  rotationSteps: number;
  tileSeed: number;
  isNight: boolean;
  animateIn: boolean;
  animMapRef: React.MutableRefObject<Map<number, ActiveAnimation>>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const group = groupRef.current;
    const map = animMapRef.current;
    if (!group) return;

    if (animateIn) {
      group.scale.set(0.01, 0.01, 0.01);
      map.set(id, { group, progress: 0 });
    } else {
      group.scale.set(1, 1, 1);
      map.delete(id);
    }

    return () => {
      map.delete(id);
    };
  }, [id, animateIn, animMapRef]);

  const rotationY = -rotationSteps * (Math.PI / 2);

  return (
    <group
      ref={groupRef}
      position={[x, 0, z]}
      rotation={[0, rotationY, 0]}
      scale={animateIn ? [0.01, 0.01, 0.01] : [1, 1, 1]}
    >
      {(baseId === 'OCEAN' || baseId === 'BEACH' || baseId === 'PROMENADE') && (
        <CoastTile variant={baseId} tileSeed={tileSeed} isNight={isNight} />
      )}
      {(baseId === 'ROAD_STRAIGHT' || baseId === 'ROAD_CORNER' || baseId === 'ROAD_CROSS') && (
        <RoadTile variant={baseId} tileSeed={tileSeed} isNight={isNight} />
      )}
      {(baseId === 'BLOCK_ARTDECO' || baseId === 'PARK_PLAZA') && (
        <BuildingBlock variant={baseId} tileSeed={tileSeed} isNight={isNight} />
      )}
    </group>
  );
});

/**
 * Instanced wireframe + translucent glow cubes visualizing real-time WFC entropy
 * for all uncollapsed cells (Cyan #00f0ff -> Magenta #ff2a85).
 */
function EntropyInstances({
  cells,
  width,
  height,
}: {
  cells: Cell[];
  width: number;
  height: number;
}) {
  const wireMeshRef = useRef<THREE.InstancedMesh>(null);
  const fillMeshRef = useRef<THREE.InstancedMesh>(null);
  const maxInstances = width * height;

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorScratch = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    const wireMesh = wireMeshRef.current;
    const fillMesh = fillMeshRef.current;
    if (!wireMesh || !fillMesh) return;

    const time = clock.getElapsedTime();
    const halfW = ((width - 1) * TILE_SIZE) / 2;
    const halfH = ((height - 1) * TILE_SIZE) / 2;

    let count = 0;
    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i];
      if (cell.collapsed) continue;

      const ratio = Math.min(1, Math.max(0, (cell.possible.length - 1) / Math.max(1, MAX_PROTOTYPE_COUNT - 1)));
      // High entropy -> Cyan, Low entropy -> Magenta
      colorScratch.copy(MAGENTA_LOW_ENTROPY).lerp(CYAN_HIGH_ENTROPY, ratio);

      const pulse = 1 + Math.sin(time * 3.5 + cell.x * 0.5 + cell.z * 0.5) * 0.05;
      const boxHeight = (0.65 + (1 - ratio) * 1.1) * pulse;
      const wx = cell.x * TILE_SIZE - halfW;
      const wz = cell.z * TILE_SIZE - halfH;

      dummy.position.set(wx, boxHeight * 0.5 + 0.15, wz);
      dummy.scale.set(3.45, boxHeight, 3.45);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();

      wireMesh.setMatrixAt(count, dummy.matrix);
      wireMesh.setColorAt(count, colorScratch);

      fillMesh.setMatrixAt(count, dummy.matrix);
      fillMesh.setColorAt(count, colorScratch);

      count += 1;
    }

    wireMesh.count = count;
    fillMesh.count = count;
    wireMesh.instanceMatrix.needsUpdate = true;
    fillMesh.instanceMatrix.needsUpdate = true;
    if (wireMesh.instanceColor) wireMesh.instanceColor.needsUpdate = true;
    if (fillMesh.instanceColor) fillMesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={wireMeshRef} args={[undefined, undefined, maxInstances]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial wireframe transparent opacity={0.85} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={fillMeshRef} args={[undefined, undefined, maxInstances]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial transparent opacity={0.14} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

interface PropTransform {
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale: number;
}

/**
 * InstancedMesh layers for Palm Trees and Art Deco Street Lamps across the entire city.
 * Keeps 24x24 grids running smoothly at 60 FPS with minimal draw calls.
 */
function CityInstancedProps({
  cells,
  width,
  height,
  isNight,
}: {
  cells: Cell[];
  width: number;
  height: number;
  isNight: boolean;
}) {
  const { palms, lamps } = useMemo(() => {
    const palmList: PropTransform[] = [];
    const lampList: PropTransform[] = [];
    const halfW = ((width - 1) * TILE_SIZE) / 2;
    const halfH = ((height - 1) * TILE_SIZE) / 2;

    const pushLocal = (
      list: PropTransform[],
      wx: number,
      wz: number,
      rotY: number,
      lx: number,
      ly: number,
      lz: number,
      scale = 1,
    ) => {
      const cos = Math.cos(rotY);
      const sin = Math.sin(rotY);
      const rx = lx * cos + lz * sin;
      const rz = -lx * sin + lz * cos;
      list.push({ x: wx + rx, y: ly, z: wz + rz, rotY: rotY + (lx + lz), scale });
    };

    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i];
      if (!cell.collapsed || cell.prototypeIndex === null) continue;

      const proto = PROTOTYPES[cell.prototypeIndex];
      const wx = cell.x * TILE_SIZE - halfW;
      const wz = cell.z * TILE_SIZE - halfH;
      const rotY = -proto.rotation * (Math.PI / 2);

      if (proto.baseId === 'PROMENADE') {
        pushLocal(palmList, wx, wz, rotY, -1.1, 0.16, 0.85, 1.05);
        pushLocal(palmList, wx, wz, rotY, 1.1, 0.16, 0.85, 0.92);
        pushLocal(lampList, wx, wz, rotY, 0, 0.16, -1.25, 1);
      } else if (proto.baseId === 'ROAD_STRAIGHT') {
        if ((cell.x + cell.z) % 2 === 0) {
          pushLocal(palmList, wx, wz, rotY, -1.62, 0.15, 0.8, 0.88);
          pushLocal(lampList, wx, wz, rotY, 1.62, 0.15, -0.8, 1);
        } else {
          pushLocal(palmList, wx, wz, rotY, 1.62, 0.15, -0.6, 0.92);
          pushLocal(lampList, wx, wz, rotY, -1.62, 0.15, 0.6, 1);
        }
      } else if (proto.baseId === 'ROAD_CORNER') {
        pushLocal(palmList, wx, wz, rotY, -1.55, 0.15, 1.55, 0.95);
        pushLocal(lampList, wx, wz, rotY, 1.55, 0.15, -1.55, 1);
      } else if (proto.baseId === 'PARK_PLAZA') {
        pushLocal(palmList, wx, wz, rotY, -1.25, 0.15, -1.25, 0.95);
        pushLocal(palmList, wx, wz, rotY, 1.25, 0.15, 1.25, 1.05);
        pushLocal(palmList, wx, wz, rotY, -1.25, 0.15, 1.25, 0.85);
        pushLocal(palmList, wx, wz, rotY, 1.25, 0.15, -1.25, 0.9);
      }
    }

    return { palms: palmList, lamps: lampList };
  }, [cells, width, height]);

  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);
  const poleRef = useRef<THREE.InstancedMesh>(null);
  const bulbRef = useRef<THREE.InstancedMesh>(null);

  const maxPalms = Math.max(1, width * height * 4);
  const maxLamps = Math.max(1, width * height * 2);

  useEffect(() => {
    const dummy = new THREE.Object3D();

    if (trunkRef.current && canopyRef.current) {
      for (let i = 0; i < palms.length; i += 1) {
        const p = palms[i];
        dummy.position.set(p.x, p.y + 0.82 * p.scale, p.z);
        dummy.rotation.set(0.08, p.rotY, 0.05);
        dummy.scale.set(p.scale, p.scale, p.scale);
        dummy.updateMatrix();
        trunkRef.current.setMatrixAt(i, dummy.matrix);

        dummy.position.set(p.x + 0.08 * p.scale, p.y + 1.65 * p.scale, p.z + 0.08 * p.scale);
        dummy.rotation.set(0, p.rotY, 0);
        dummy.scale.set(p.scale * 1.15, p.scale * 0.42, p.scale * 1.15);
        dummy.updateMatrix();
        canopyRef.current.setMatrixAt(i, dummy.matrix);
      }
      trunkRef.current.count = palms.length;
      canopyRef.current.count = palms.length;
      trunkRef.current.instanceMatrix.needsUpdate = true;
      canopyRef.current.instanceMatrix.needsUpdate = true;
    }

    if (poleRef.current && bulbRef.current) {
      for (let i = 0; i < lamps.length; i += 1) {
        const l = lamps[i];
        dummy.position.set(l.x, l.y + 0.72, l.z);
        dummy.rotation.set(0, l.rotY, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        poleRef.current.setMatrixAt(i, dummy.matrix);

        dummy.position.set(l.x, l.y + 1.48, l.z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bulbRef.current.setMatrixAt(i, dummy.matrix);
      }
      poleRef.current.count = lamps.length;
      bulbRef.current.count = lamps.length;
      poleRef.current.instanceMatrix.needsUpdate = true;
      bulbRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [palms, lamps]);

  return (
    <group>
      {/* Instanced Palm Trunks */}
      <instancedMesh ref={trunkRef} args={[undefined, undefined, maxPalms]} castShadow frustumCulled={false}>
        <cylinderGeometry args={[0.06, 0.11, 1.65, 6]} />
        <meshStandardMaterial color="#835b3c" roughness={0.92} />
      </instancedMesh>
      {/* Instanced Palm Canopies */}
      <instancedMesh ref={canopyRef} args={[undefined, undefined, maxPalms]} castShadow frustumCulled={false}>
        <coneGeometry args={[0.78, 0.9, 7]} />
        <meshStandardMaterial color="#1f9662" roughness={0.78} />
      </instancedMesh>
      {/* Instanced Street Lamp Poles */}
      <instancedMesh ref={poleRef} args={[undefined, undefined, maxLamps]} castShadow frustumCulled={false}>
        <cylinderGeometry args={[0.035, 0.055, 1.44, 6]} />
        <meshStandardMaterial color="#2a2d3a" metalness={0.6} roughness={0.35} />
      </instancedMesh>
      {/* Instanced Street Lamp Emissive Bulbs */}
      <instancedMesh ref={bulbRef} args={[undefined, undefined, maxLamps]} frustumCulled={false}>
        <sphereGeometry args={[0.095, 8, 8]} />
        <meshStandardMaterial
          color={isNight ? '#ff9f1c' : '#fff0c2'}
          emissive={isNight ? '#ff9f1c' : '#ffd166'}
          emissiveIntensity={isNight ? 2.8 : 1.15}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}

export function CityGrid() {
  const grid = useWfcStore((s) => s.grid);
  const version = useWfcStore((s) => s.version);
  const status = useWfcStore((s) => s.status);
  const lightingPreset = useWfcStore((s) => s.lightingPreset);
  const isNight = lightingPreset === 'midnight-neon';

  const animMapRef = useRef<Map<number, ActiveAnimation>>(new Map());
  const animateIn = status === 'running' || status === 'paused';

  // Single centralized animation loop: O(active animations), zero work once settled.
  useFrame((_, delta) => {
    const map = animMapRef.current;
    if (map.size === 0) return;

    const c1 = 1.70158;
    const c3 = c1 + 1;

    map.forEach((anim, key) => {
      anim.progress = Math.min(1, anim.progress + delta * 4.5);
      const t = anim.progress;
      const scale = Math.max(0.01, 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2));
      anim.group.scale.set(scale, scale, scale);
      if (anim.progress >= 1) {
        anim.group.scale.set(1, 1, 1);
        map.delete(key);
      }
    });
  });

  const halfW = ((grid.width - 1) * TILE_SIZE) / 2;
  const halfH = ((grid.height - 1) * TILE_SIZE) / 2;

  return (
    <group>
      {/* Surrounding Caribbean water horizon skirt */}
      <mesh position={[0, -0.36, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[280, 280]} />
        <meshStandardMaterial
          color={isNight ? '#041226' : '#036982'}
          roughness={0.28}
          metalness={0.35}
        />
      </mesh>

      {/* Collapsed procedural urban tiles */}
      {grid.cells.map((cell) => {
        if (!cell.collapsed || cell.prototypeIndex === null) return null;
        const proto = PROTOTYPES[cell.prototypeIndex];
        const wx = cell.x * TILE_SIZE - halfW;
        const wz = cell.z * TILE_SIZE - halfH;
        const tileSeed = grid.seed * 0.001 + cell.index * 13.37;

        return (
          <AnimatedTile
            key={`${version}-${cell.index}`}
            id={cell.index}
            x={wx}
            z={wz}
            baseId={proto.baseId}
            rotationSteps={proto.rotation}
            tileSeed={tileSeed}
            isNight={isNight}
            animateIn={animateIn}
            animMapRef={animMapRef}
          />
        );
      })}

      {/* Only mount entropy instanced mesh while uncollapsed cells remain */}
      {!grid.completed && (
        <EntropyInstances cells={grid.cells} width={grid.width} height={grid.height} />
      )}

      {/* Instanced palm trees & neon street lamps */}
      <CityInstancedProps
        cells={grid.cells}
        width={grid.width}
        height={grid.height}
        isNight={isNight}
      />
    </group>
  );
}
