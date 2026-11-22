'use client';

import React, { useEffect, useMemo } from 'react';
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
    const secondaryColor = PASTEL_PALETTE[Math.floor(r2 * PASTEL_PALETTE.length)];
    const neonColor = NEON_ACCENTS[Math.floor(r3 * NEON_ACCENTS.length)];
    const mainHeight = 2.6 + r2 * 3.4;
    const hasTwinTower = r4 > 0.45;
    const twinHeight = 1.6 + r1 * 1.8;

    return {
      facadeColor,
      secondaryColor,
      neonColor,
      mainHeight,
      hasTwinTower,
      twinHeight,
      roomsY: Math.max(4, Math.round(mainHeight * 1.8)),
    };
  }, [tileSeed]);

  const interiorMaterial = useMemo(
    () =>
      createInteriorMappingMaterial({
        roomsX: 4,
        roomsY: config.roomsY,
        depth: 0.65,
        seed: tileSeed * 0.137,
        nightFactor: isNight ? 1.0 : 0.0,
        facadeColor: config.facadeColor,
        reflectionColor: isNight ? '#27174d' : '#ff8c69',
      }),
    [config.facadeColor, config.roomsY, tileSeed, isNight],
  );

  useEffect(() => {
    return () => {
      interiorMaterial.dispose();
    };
  }, [interiorMaterial]);

  const neonIntensity = isNight ? 2.4 : 1.35;

  return (
    <group>
      {/* Urban concrete plaza base */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[4, 0.12, 4]} />
        <meshStandardMaterial color="#d8cec5" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Stepped Art Deco podium */}
      <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.46, 3.4]} />
        <meshStandardMaterial color={config.facadeColor} roughness={0.62} />
      </mesh>

      {/* Main Art Deco Tower with GLSL Interior Mapping windows */}
      <mesh
        position={[config.hasTwinTower ? -0.45 : 0, 0.56 + config.mainHeight / 2, 0]}
        material={interiorMaterial}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[config.hasTwinTower ? 1.85 : 2.5, config.mainHeight, 2.5]} />
      </mesh>

      {/* Art Deco stepped parapet crown */}
      <mesh
        position={[config.hasTwinTower ? -0.45 : 0, 0.56 + config.mainHeight + 0.18, 0]}
        castShadow
      >
        <boxGeometry args={[config.hasTwinTower ? 1.55 : 2.1, 0.36, 2.1]} />
        <meshStandardMaterial color={config.facadeColor} roughness={0.55} />
      </mesh>

      {/* Neon crown trim strip (triggers selective Bloom) */}
      <mesh position={[config.hasTwinTower ? -0.45 : 0, 0.56 + config.mainHeight + 0.02, 0]}>
        <boxGeometry args={[config.hasTwinTower ? 1.92 : 2.58, 0.08, 2.58]} />
        <meshStandardMaterial
          color={config.neonColor}
          emissive={config.neonColor}
          emissiveIntensity={neonIntensity}
          toneMapped={false}
        />
      </mesh>

      {/* Vertical Art Deco neon fin */}
      <mesh position={[config.hasTwinTower ? -0.45 : 0, 0.56 + config.mainHeight * 0.55, 1.28]}>
        <boxGeometry args={[0.1, config.mainHeight * 0.72, 0.06]} />
        <meshStandardMaterial
          color={config.neonColor}
          emissive={config.neonColor}
          emissiveIntensity={neonIntensity * 0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Optional companion boutique hotel wing */}
      {config.hasTwinTower && (
        <group position={[0.98, 0, 0.15]}>
          <mesh
            position={[0, 0.56 + config.twinHeight / 2, 0]}
            material={interiorMaterial}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[1.1, config.twinHeight, 1.85]} />
          </mesh>
          <mesh position={[0, 0.56 + config.twinHeight + 0.04, 0]}>
            <boxGeometry args={[1.16, 0.07, 1.92]} />
            <meshStandardMaterial
              color={config.secondaryColor}
              emissive={config.neonColor}
              emissiveIntensity={neonIntensity * 0.85}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

function ParkPlazaTile({ isNight }: { isNight: boolean }) {
  const waterGlow = isNight ? 1.85 : 0.7;

  return (
    <group>
      {/* Stone border apron */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[4, 0.12, 4]} />
        <meshStandardMaterial color="#e0d4c3" roughness={0.82} />
      </mesh>

      {/* Lush tropical turf */}
      <mesh position={[0, 0.13, 0]} receiveShadow>
        <boxGeometry args={[3.5, 0.06, 3.5]} />
        <meshStandardMaterial color="#1f8a5b" roughness={0.92} />
      </mesh>

      {/* Cross walkways */}
      <mesh position={[0, 0.145, 0]} receiveShadow>
        <boxGeometry args={[3.8, 0.05, 0.75]} />
        <meshStandardMaterial color="#eadbc8" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.145, 0]} receiveShadow>
        <boxGeometry args={[0.75, 0.05, 3.8]} />
        <meshStandardMaterial color="#eadbc8" roughness={0.78} />
      </mesh>

      {/* Central Art Deco fountain basin */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.78, 0.86, 0.22, 16]} />
        <meshStandardMaterial color="#f4e6d8" roughness={0.5} />
      </mesh>

      {/* Illuminated turquoise fountain pool */}
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.66, 0.66, 0.08, 16]} />
        <meshStandardMaterial
          color="#00f0ff"
          emissive="#00e5ff"
          emissiveIntensity={waterGlow}
          roughness={0.15}
          metalness={0.2}
          toneMapped={false}
        />
      </mesh>

      {/* Fountain center pedestal */}
      <mesh position={[0, 0.56, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.22, 0.44, 12]} />
        <meshStandardMaterial color="#fce6c6" roughness={0.45} />
      </mesh>

      {/* Neon accent ring */}
      <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.025, 8, 24]} />
        <meshStandardMaterial
          color="#ff2a85"
          emissive="#ff2a85"
          emissiveIntensity={isNight ? 2.0 : 1.0}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
