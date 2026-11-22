'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createInteriorMappingMaterial } from '@/shaders/interiorMapping';

const PASTEL_PALETTE = [
  '#f8b8c8', // Flamingo Pink
  '#a6ead8', // Miami Mint
  '#fce6c6', // Art Deco Cream
  '#f9c2a2', // Sunset Coral
  '#c5c9f7', // Ocean Periwinkle
  '#f7d7e8', // Soft Orchid
];

const NEON_ACCENTS = [
  '#ff2a85', // Hot Magenta
  '#00f0ff', // Electric Cyan
  '#ff9f1c', // Sunset Amber
  '#b5179e', // Vice Violet
];

// Shared unit geometries and material pools to minimize WebGL draw/state overhead.
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const PLAZA_BASE_GEO = new THREE.BoxGeometry(4, 0.12, 4);
const PODIUM_GEO = new THREE.BoxGeometry(3.4, 0.46, 3.4);
const TURF_GEO = new THREE.BoxGeometry(3.5, 0.06, 3.5);
const WALKWAY_X_GEO = new THREE.BoxGeometry(3.8, 0.05, 0.75);
const WALKWAY_Z_GEO = new THREE.BoxGeometry(0.75, 0.05, 3.8);
const FOUNTAIN_BASIN_GEO = new THREE.CylinderGeometry(0.78, 0.86, 0.22, 12);
const FOUNTAIN_POOL_GEO = new THREE.CylinderGeometry(0.66, 0.66, 0.08, 12);

const PLAZA_MAT = new THREE.MeshStandardMaterial({ color: '#d8cec5', roughness: 0.85, metalness: 0.05 });
const TURF_MAT = new THREE.MeshStandardMaterial({ color: '#1f8a5b', roughness: 0.92 });
const WALKWAY_MAT = new THREE.MeshStandardMaterial({ color: '#eadbc8', roughness: 0.78 });
const FOUNTAIN_STONE_MAT = new THREE.MeshStandardMaterial({ color: '#f4e6d8', roughness: 0.5 });

const facadeMaterialPool = new Map<string, THREE.MeshStandardMaterial>();
const neonMaterialPool = new Map<string, THREE.MeshStandardMaterial>();
const interiorMaterialPool = new Map<string, THREE.ShaderMaterial>();
const fountainWaterPool = new Map<boolean, THREE.MeshStandardMaterial>();

function getFacadeMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = facadeMaterialPool.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    facadeMaterialPool.set(color, mat);
  }
  return mat;
}

function getNeonMaterial(color: string, isNight: boolean): THREE.MeshStandardMaterial {
  const key = `${color}-${isNight ? 'n' : 'd'}`;
  let mat = neonMaterialPool.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: isNight ? 2.4 : 1.35,
      toneMapped: false,
    });
    neonMaterialPool.set(key, mat);
  }
  return mat;
}

function getPooledInteriorMaterial(facadeColor: string, isNight: boolean): THREE.ShaderMaterial {
  const key = `${facadeColor}-${isNight ? 'night' : 'day'}`;
  let mat = interiorMaterialPool.get(key);
  if (!mat) {
    mat = createInteriorMappingMaterial({
      roomsX: 4,
      roomsY: 7,
      depth: 0.65,
      seed: 1.0,
      nightFactor: isNight ? 1.0 : 0.0,
      facadeColor,
      reflectionColor: isNight ? '#27174d' : '#ff8c69',
    });
    interiorMaterialPool.set(key, mat);
  }
  return mat;
}

function getFountainWaterMaterial(isNight: boolean): THREE.MeshStandardMaterial {
  let mat = fountainWaterPool.get(isNight);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color: '#00f0ff',
      emissive: '#00e5ff',
      emissiveIntensity: isNight ? 1.85 : 0.7,
      roughness: 0.15,
      metalness: 0.2,
      toneMapped: false,
    });
    fountainWaterPool.set(isNight, mat);
  }
  return mat;
}

function seededFloat(seed: number, offset: number): number {
  const x = Math.sin(seed * 127.1 + offset * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

interface BuildingBlockProps {
  variant: 'BLOCK_ARTDECO' | 'PARK_PLAZA';
  tileSeed: number;
  isNight: boolean;
}

export function BuildingBlock({ variant, tileSeed, isNight }: BuildingBlockProps) {
  if (variant === 'PARK_PLAZA') {
    return <ParkPlazaTile isNight={isNight} />;
  }

  return <ArtDecoBlockTile tileSeed={tileSeed} isNight={isNight} />;
}

function ArtDecoBlockTile({ tileSeed, isNight }: { tileSeed: number; isNight: boolean }) {
  const config = useMemo(() => {
    const r1 = seededFloat(tileSeed, 1);
    const r2 = seededFloat(tileSeed, 2);
    const r3 = seededFloat(tileSeed, 3);
    const r4 = seededFloat(tileSeed, 4);

    const facadeColor = PASTEL_PALETTE[Math.floor(r1 * PASTEL_PALETTE.length)];
    const neonColor = NEON_ACCENTS[Math.floor(r3 * NEON_ACCENTS.length)];
    const mainHeight = 2.6 + r2 * 3.4;
    const hasTwinTower = r4 > 0.55;
    const twinHeight = 1.6 + r1 * 1.8;

    return {
      facadeColor,
      neonColor,
      mainHeight,
      hasTwinTower,
      twinHeight,
    };
  }, [tileSeed]);

  const interiorMaterial = getPooledInteriorMaterial(config.facadeColor, isNight);
  const facadeMat = getFacadeMaterial(config.facadeColor);
  const neonMat = getNeonMaterial(config.neonColor, isNight);

  const mainX = config.hasTwinTower ? -0.45 : 0;
  const mainW = config.hasTwinTower ? 1.85 : 2.5;

  return (
    <group>
      {/* Concrete plaza base */}
      <mesh position={[0, 0.06, 0]} geometry={PLAZA_BASE_GEO} material={PLAZA_MAT} receiveShadow />

      {/* Stepped Art Deco podium */}
      <mesh position={[0, 0.34, 0]} geometry={PODIUM_GEO} material={facadeMat} receiveShadow />

      {/* Main Art Deco Tower with GLSL Interior Mapping windows */}
      <mesh
        position={[mainX, 0.56 + config.mainHeight / 2, 0]}
        scale={[mainW, config.mainHeight, 2.5]}
        geometry={UNIT_BOX}
        material={interiorMaterial}
        castShadow
        receiveShadow
      />

      {/* Stepped parapet crown */}
      <mesh
        position={[mainX, 0.56 + config.mainHeight + 0.18, 0]}
        scale={[mainW * 0.84, 0.36, 2.1]}
        geometry={UNIT_BOX}
        material={facadeMat}
      />

      {/* Neon crown trim strip (triggers selective Bloom) */}
      <mesh
        position={[mainX, 0.56 + config.mainHeight + 0.02, 0]}
        scale={[mainW + 0.08, 0.08, 2.58]}
        geometry={UNIT_BOX}
        material={neonMat}
      />

      {/* Optional companion boutique hotel wing */}
      {config.hasTwinTower && (
        <mesh
          position={[0.98, 0.56 + config.twinHeight / 2, 0.15]}
          scale={[1.1, config.twinHeight, 1.85]}
          geometry={UNIT_BOX}
          material={interiorMaterial}
          castShadow
        />
      )}
    </group>
  );
}

function ParkPlazaTile({ isNight }: { isNight: boolean }) {
  const waterMat = getFountainWaterMaterial(isNight);

  return (
    <group>
      <mesh position={[0, 0.06, 0]} geometry={PLAZA_BASE_GEO} material={PLAZA_MAT} receiveShadow />
      <mesh position={[0, 0.13, 0]} geometry={TURF_GEO} material={TURF_MAT} receiveShadow />
      <mesh position={[0, 0.145, 0]} geometry={WALKWAY_X_GEO} material={WALKWAY_MAT} receiveShadow />
      <mesh position={[0, 0.145, 0]} geometry={WALKWAY_Z_GEO} material={WALKWAY_MAT} receiveShadow />
      <mesh position={[0, 0.25, 0]} geometry={FOUNTAIN_BASIN_GEO} material={FOUNTAIN_STONE_MAT} receiveShadow />
      <mesh position={[0, 0.34, 0]} geometry={FOUNTAIN_POOL_GEO} material={waterMat} />
    </group>
  );
}
