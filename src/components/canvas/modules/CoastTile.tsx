'use client';

import React from 'react';
import * as THREE from 'three';
import { getSharedWaterMaterial } from '@/shaders/waterShader';

interface CoastTileProps {
  variant: 'OCEAN' | 'BEACH' | 'PROMENADE';
  tileSeed: number;
  isNight: boolean;
}

const UMBRELLA_COLORS = ['#ff2a85', '#00e5ff', '#ffd166', '#ff6b6b', '#a855f7'];

// Shared geometries & materials across all coastal tiles
const OCEAN_PLANE_GEO = new THREE.PlaneGeometry(4.02, 4.02, 4, 4);
const SAND_MAIN_GEO = new THREE.BoxGeometry(4, 0.14, 3.3);
const SAND_WET_GEO = new THREE.BoxGeometry(4, 0.08, 0.92);
const UMBRELLA_POLE_GEO = new THREE.CylinderGeometry(0.025, 0.025, 0.84, 5);
const UMBRELLA_TOP_GEO = new THREE.ConeGeometry(0.58, 0.22, 7);
const BOARDWALK_GEO = new THREE.BoxGeometry(4, 0.16, 4);
const TERRAZZO_GEO = new THREE.BoxGeometry(4, 0.015, 1.15);
const SEAWALL_GEO = new THREE.BoxGeometry(4, 0.34, 0.26);
const NEON_STRIP_GEO = new THREE.BoxGeometry(4, 0.05, 0.04);

const SAND_DAY_MAT = new THREE.MeshStandardMaterial({ color: '#f3d5a5', roughness: 0.95 });
const SAND_NIGHT_MAT = new THREE.MeshStandardMaterial({ color: '#8c7a64', roughness: 0.95 });
const WET_SAND_DAY_MAT = new THREE.MeshStandardMaterial({ color: '#d2b48c', roughness: 0.35, metalness: 0.18 });
const WET_SAND_NIGHT_MAT = new THREE.MeshStandardMaterial({ color: '#4f463d', roughness: 0.35, metalness: 0.18 });
const POLE_MAT = new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.5 });
const BOARDWALK_MAT = new THREE.MeshStandardMaterial({ color: '#e8dcd0', roughness: 0.72 });
const TERRAZZO_MAT = new THREE.MeshStandardMaterial({ color: '#f5c6d6', roughness: 0.6 });
const SEAWALL_MAT = new THREE.MeshStandardMaterial({ color: '#fff3e6', roughness: 0.55 });
const CYAN_NEON_DAY = new THREE.MeshStandardMaterial({
  color: '#00f0ff',
  emissive: '#00f0ff',
  emissiveIntensity: 1.15,
  toneMapped: false,
});
const CYAN_NEON_NIGHT = new THREE.MeshStandardMaterial({
  color: '#00f0ff',
  emissive: '#00f0ff',
  emissiveIntensity: 2.4,
  toneMapped: false,
});

const umbrellaMatPool = new Map<string, THREE.MeshStandardMaterial>();
function getUmbrellaMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = umbrellaMatPool.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
    umbrellaMatPool.set(color, mat);
  }
  return mat;
}

function seededUnit(seed: number, salt: number): number {
  const x = Math.sin(seed * 73.1 + salt * 151.9) * 43758.5453;
  return x - Math.floor(x);
}

export function CoastTile({ variant, tileSeed, isNight }: CoastTileProps) {
  if (variant === 'OCEAN') {
    return (
      <mesh
        position={[0, -0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={OCEAN_PLANE_GEO}
        material={getSharedWaterMaterial(isNight)}
      />
    );
  }
  if (variant === 'BEACH') {
    return <BeachTile tileSeed={tileSeed} isNight={isNight} />;
  }
  return <PromenadeTile isNight={isNight} />;
}

function BeachTile({ tileSeed, isNight }: { tileSeed: number; isNight: boolean }) {
  const showUmbrella = seededUnit(tileSeed, 3) > 0.45;
  const umbrellaColor =
    UMBRELLA_COLORS[Math.floor(seededUnit(tileSeed, 9) * UMBRELLA_COLORS.length)];
  const umbrellaX = (seededUnit(tileSeed, 12) - 0.5) * 2.0;

  return (
    <group>
      <mesh
        position={[0, -0.02, -0.35]}
        geometry={SAND_MAIN_GEO}
        material={isNight ? SAND_NIGHT_MAT : SAND_DAY_MAT}
        receiveShadow
      />
      <mesh
        position={[0, -0.08, 1.55]}
        geometry={SAND_WET_GEO}
        material={isNight ? WET_SAND_NIGHT_MAT : WET_SAND_DAY_MAT}
        receiveShadow
      />

      {showUmbrella && (
        <group position={[umbrellaX, 0.05, -0.25]}>
          <mesh position={[0, 0.42, 0]} geometry={UMBRELLA_POLE_GEO} material={POLE_MAT} />
          <mesh
            position={[0, 0.82, 0]}
            geometry={UMBRELLA_TOP_GEO}
            material={getUmbrellaMaterial(umbrellaColor)}
          />
        </group>
      )}
    </group>
  );
}

function PromenadeTile({ isNight }: { isNight: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.08, 0]} geometry={BOARDWALK_GEO} material={BOARDWALK_MAT} receiveShadow />
      <mesh position={[0, 0.165, 0]} geometry={TERRAZZO_GEO} material={TERRAZZO_MAT} receiveShadow />
      <mesh position={[0, 0.32, 1.82]} geometry={SEAWALL_GEO} material={SEAWALL_MAT} receiveShadow />
      <mesh
        position={[0, 0.44, 1.96]}
        geometry={NEON_STRIP_GEO}
        material={isNight ? CYAN_NEON_NIGHT : CYAN_NEON_DAY}
      />
    </group>
  );
}
