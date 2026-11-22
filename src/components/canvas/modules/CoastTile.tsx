'use client';

import React, { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createWaterMaterial } from '@/shaders/waterShader';

interface CoastTileProps {
  variant: 'OCEAN' | 'BEACH' | 'PROMENADE';
  tileSeed: number;
  isNight: boolean;
}

const UMBRELLA_COLORS = ['#ff2a85', '#00e5ff', '#ffd166', '#ff6b6b', '#a855f7'];

function seededUnit(seed: number, salt: number): number {
  const x = Math.sin(seed * 73.1 + salt * 151.9) * 43758.5453;
  return x - Math.floor(x);
}

export function CoastTile({ variant, tileSeed, isNight }: CoastTileProps) {
  if (variant === 'OCEAN') {
    return <OceanTile isNight={isNight} />;
  }
  if (variant === 'BEACH') {
    return <BeachTile tileSeed={tileSeed} isNight={isNight} />;
  }
  return <PromenadeTile isNight={isNight} />;
}

function OceanTile({ isNight }: { isNight: boolean }) {
  const waterMaterial = useMemo(
    () => createWaterMaterial({ nightFactor: isNight ? 1.0 : 0.0 }),
    [isNight],
  );

  useEffect(() => {
    return () => {
      waterMaterial.dispose();
    };
  }, [waterMaterial]);

  useFrame(({ clock }) => {
    waterMaterial.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <group>
      {/* Seabed under translucent Caribbean water */}
      <mesh position={[0, -0.34, 0]} receiveShadow>
        <boxGeometry args={[4, 0.12, 4]} />
        <meshStandardMaterial color={isNight ? '#041224' : '#084c61'} roughness={0.95} />
      </mesh>
      {/* Animated GLSL ocean surface */}
      <mesh
        position={[0, -0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={waterMaterial}
      >
        <planeGeometry args={[4.02, 4.02, 12, 12]} />
      </mesh>
    </group>
  );
}

function BeachTile({ tileSeed, isNight }: { tileSeed: number; isNight: boolean }) {
  const showUmbrella = seededUnit(tileSeed, 3) > 0.35;
  const umbrellaColor =
    UMBRELLA_COLORS[Math.floor(seededUnit(tileSeed, 9) * UMBRELLA_COLORS.length)];
  const umbrellaX = (seededUnit(tileSeed, 12) - 0.5) * 2.0;

  return (
    <group>
      {/* Golden sand base (North side elevated toward Promenade, South side meeting Ocean) */}
      <mesh position={[0, -0.02, -0.35]} receiveShadow>
        <boxGeometry args={[4, 0.14, 3.3]} />
        <meshStandardMaterial color={isNight ? '#8c7a64' : '#f3d5a5'} roughness={0.95} />
      </mesh>
      {/* Wet shoreline sand strip on South edge (+Z) */}
      <mesh position={[0, -0.08, 1.55]} receiveShadow>
        <boxGeometry args={[4, 0.08, 0.92]} />
        <meshStandardMaterial
          color={isNight ? '#4f463d' : '#d2b48c'}
          roughness={0.35}
          metalness={0.18}
        />
      </mesh>
      {/* Surf foam accent */}
      <mesh position={[0, -0.035, 1.88]}>
        <boxGeometry args={[4, 0.02, 0.18]} />
        <meshStandardMaterial
          color="#e6fbff"
          transparent
          opacity={isNight ? 0.32 : 0.72}
          roughness={0.4}
        />
      </mesh>

      {/* Beach umbrella & towel */}
      {showUmbrella && (
        <group position={[umbrellaX, 0.05, -0.25]}>
          {/* Towel */}
          <mesh position={[0.38, 0.015, 0.15]} rotation={[0, 0.15, 0]} receiveShadow>
            <boxGeometry args={[0.42, 0.02, 0.75]} />
            <meshStandardMaterial color={umbrellaColor} roughness={0.9} />
          </mesh>
          {/* Pole */}
          <mesh position={[0, 0.42, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.84, 6]} />
            <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
          </mesh>
          {/* Canopy */}
          <mesh position={[0, 0.82, 0]} castShadow>
            <coneGeometry args={[0.58, 0.22, 8]} />
            <meshStandardMaterial color={umbrellaColor} roughness={0.65} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function PromenadeTile({ isNight }: { isNight: boolean }) {
  const bollardGlow = isNight ? 2.4 : 1.15;

  return (
    <group>
      {/* Ocean Drive pastel concrete boardwalk */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[4, 0.16, 4]} />
        <meshStandardMaterial color="#e8dcd0" roughness={0.72} />
      </mesh>

      {/* Decorative pink/mint Art Deco terrazzo stripe running East-West */}
      <mesh position={[0, 0.165, 0]} receiveShadow>
        <boxGeometry args={[4, 0.015, 1.15]} />
        <meshStandardMaterial color="#f5c6d6" roughness={0.6} />
      </mesh>

      {/* Low Art Deco coastal wall facing the Beach (+Z) */}
      <mesh position={[0, 0.32, 1.82]} castShadow receiveShadow>
        <boxGeometry args={[4, 0.34, 0.26]} />
        <meshStandardMaterial color="#fff3e6" roughness={0.55} />
      </mesh>

      {/* Neon ribbon along Ocean Drive seawall */}
      <mesh position={[0, 0.44, 1.96]}>
        <boxGeometry args={[4, 0.05, 0.04]} />
        <meshStandardMaterial
          color="#00f0ff"
          emissive="#00f0ff"
          emissiveIntensity={bollardGlow}
          toneMapped={false}
        />
      </mesh>

      {/* Glowing Art Deco neon bollards */}
      {[-1.3, 1.3].map((x, idx) => (
        <group key={idx} position={[x, 0.16, -1.55]}>
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 0.44, 8]} />
            <meshStandardMaterial color="#2a2d3a" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.48, 0]}>
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial
              color="#ff2a85"
              emissive="#ff2a85"
              emissiveIntensity={bollardGlow}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
