'use client';

import React from 'react';
import * as THREE from 'three';
import { OptionalGltfAsset, ProceduralSportsCar } from './ProceduralProps';

interface RoadTileProps {
  variant: 'ROAD_STRAIGHT' | 'ROAD_CORNER' | 'ROAD_CROSS';
  tileSeed: number;
  isNight: boolean;
}

const CAR_COLORS = ['#ff2a85', '#00e5ff', '#ffd166', '#ffffff', '#ff6b6b'];

function seededUnit(seed: number, salt: number): number {
  const x = Math.sin(seed * 91.3 + salt * 197.7) * 43758.5453;
  return x - Math.floor(x);
}

// Shared geometries (allocated once for the entire city)
const ASPHALT_GEO = new THREE.BoxGeometry(4, 0.08, 4);
const SIDEWALK_LONG_GEO = new THREE.BoxGeometry(0.76, 0.1, 4);
const SIDEWALK_CORNER_S_GEO = new THREE.BoxGeometry(3.24, 0.1, 0.76);
const SIDEWALK_ISLAND_GEO = new THREE.BoxGeometry(0.76, 0.1, 0.76);
const SIDEWALK_MAT = new THREE.MeshStandardMaterial({ color: '#ddd2c6', roughness: 0.82 });

const roadMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

/**
 * Generates a cached procedural canvas texture for road lane markings & zebra crosswalks,
 * turning a 25-mesh intersection into 1 textured asphalt mesh + 4 corner islands.
 */
function getRoadMaterial(
  variant: 'ROAD_STRAIGHT' | 'ROAD_CORNER' | 'ROAD_CROSS',
  isNight: boolean,
): THREE.MeshStandardMaterial {
  const key = `${variant}-${isNight ? 'night' : 'day'}`;
  const cached = roadMaterialCache.get(key);
  if (cached) return cached;

  const baseColor = isNight ? '#151822' : '#252932';
  let map: THREE.CanvasTexture | undefined;

  if (typeof document !== 'undefined') {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, size, size);

      if (variant === 'ROAD_STRAIGHT') {
        ctx.fillStyle = '#f4b942';
        ctx.fillRect(size * 0.48, 0, size * 0.015, size);
        ctx.fillRect(size * 0.505, 0, size * 0.015, size);
      } else if (variant === 'ROAD_CORNER') {
        ctx.strokeStyle = '#f4b942';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(size * 0.5, 0);
        ctx.quadraticCurveTo(size * 0.5, size * 0.5, size, size * 0.5);
        ctx.stroke();
      } else if (variant === 'ROAD_CROSS') {
        ctx.fillStyle = '#f1f5f9';
        const stripes = [-0.2, -0.1, 0, 0.1, 0.2];
        for (const offset of stripes) {
          const p = size * (0.5 + offset) - 5;
          // North & South crosswalks
          ctx.fillRect(p, 10, 10, 28);
          ctx.fillRect(p, size - 38, 10, 28);
          // West & East crosswalks
          ctx.fillRect(10, p, 28, 10);
          ctx.fillRect(size - 38, p, 28, 10);
        }
      }

      map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
    }
  }

  const mat = new THREE.MeshStandardMaterial({
    color: map ? '#ffffff' : baseColor,
    map,
    roughness: isNight ? 0.14 : 0.22,
    metalness: isNight ? 0.48 : 0.32,
  });

  roadMaterialCache.set(key, mat);
  return mat;
}

/**
 * Wet PBR reflective asphalt road tiles (straight, 90-degree corner, 4-way cross).
 */
export function RoadTile({ variant, tileSeed, isNight }: RoadTileProps) {
  const asphaltMat = getRoadMaterial(variant, isNight);

  const hasCar = variant === 'ROAD_STRAIGHT' && seededUnit(tileSeed, 5) > 0.72;
  const carLaneX = seededUnit(tileSeed, 7) > 0.5 ? 0.52 : -0.52;
  const carRotY = carLaneX > 0 ? Math.PI : 0;
  const carColor = CAR_COLORS[Math.floor(seededUnit(tileSeed, 11) * CAR_COLORS.length)];

  return (
    <group>
      {/* Wet reflective PBR asphalt with painted markings */}
      <mesh position={[0, 0.04, 0]} geometry={ASPHALT_GEO} material={asphaltMat} receiveShadow />

      {variant === 'ROAD_STRAIGHT' && (
        <>
          <mesh position={[-1.62, 0.11, 0]} geometry={SIDEWALK_LONG_GEO} material={SIDEWALK_MAT} receiveShadow />
          <mesh position={[1.62, 0.11, 0]} geometry={SIDEWALK_LONG_GEO} material={SIDEWALK_MAT} receiveShadow />

          {hasCar && (
            <OptionalGltfAsset
              fallback={
                <ProceduralSportsCar
                  position={[carLaneX, 0.08, (seededUnit(tileSeed, 13) - 0.5) * 1.4]}
                  rotation={[0, carRotY, 0]}
                  color={carColor}
                  isNight={isNight}
                />
              }
            />
          )}
        </>
      )}

      {variant === 'ROAD_CORNER' && (
        <>
          <mesh position={[-1.62, 0.11, 0]} geometry={SIDEWALK_LONG_GEO} material={SIDEWALK_MAT} receiveShadow />
          <mesh position={[0.38, 0.11, 1.62]} geometry={SIDEWALK_CORNER_S_GEO} material={SIDEWALK_MAT} receiveShadow />
          <mesh position={[1.62, 0.11, -1.62]} geometry={SIDEWALK_ISLAND_GEO} material={SIDEWALK_MAT} receiveShadow />
        </>
      )}

      {variant === 'ROAD_CROSS' && (
        <>
          <mesh position={[-1.62, 0.11, -1.62]} geometry={SIDEWALK_ISLAND_GEO} material={SIDEWALK_MAT} receiveShadow />
          <mesh position={[1.62, 0.11, -1.62]} geometry={SIDEWALK_ISLAND_GEO} material={SIDEWALK_MAT} receiveShadow />
          <mesh position={[-1.62, 0.11, 1.62]} geometry={SIDEWALK_ISLAND_GEO} material={SIDEWALK_MAT} receiveShadow />
          <mesh position={[1.62, 0.11, 1.62]} geometry={SIDEWALK_ISLAND_GEO} material={SIDEWALK_MAT} receiveShadow />
        </>
      )}
    </group>
  );
}
