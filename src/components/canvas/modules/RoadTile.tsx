'use client';

import React from 'react';
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

/**
 * Wet PBR reflective asphalt road tiles (straight, 90-degree corner, 4-way cross).
 * Socket orientation at rotation=0:
 * - ROAD_STRAIGHT: North (Z-) <-> South (Z+)
 * - ROAD_CORNER:   North (Z-) <-> East (X+)
 * - ROAD_CROSS:    North, East, South, West
 */
export function RoadTile({ variant, tileSeed, isNight }: RoadTileProps) {
  const asphaltColor = isNight ? '#151822' : '#252932';
  const asphaltRoughness = isNight ? 0.14 : 0.22;
  const asphaltMetalness = isNight ? 0.48 : 0.32;
  const sidewalkColor = '#ddd2c6';

  const hasCar = variant === 'ROAD_STRAIGHT' && seededUnit(tileSeed, 5) > 0.62;
  const carLaneX = seededUnit(tileSeed, 7) > 0.5 ? 0.52 : -0.52;
  const carRotY = carLaneX > 0 ? Math.PI : 0;
  const carColor = CAR_COLORS[Math.floor(seededUnit(tileSeed, 11) * CAR_COLORS.length)];

  return (
    <group>
      {/* Wet reflective PBR asphalt base */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[4, 0.08, 4]} />
        <meshStandardMaterial
          color={asphaltColor}
          roughness={asphaltRoughness}
          metalness={asphaltMetalness}
        />
      </mesh>

      {variant === 'ROAD_STRAIGHT' && (
        <>
          {/* Raised East & West sidewalks */}
          <mesh position={[-1.62, 0.11, 0]} receiveShadow castShadow>
            <boxGeometry args={[0.76, 0.1, 4]} />
            <meshStandardMaterial color={sidewalkColor} roughness={0.82} />
          </mesh>
          <mesh position={[1.62, 0.11, 0]} receiveShadow castShadow>
            <boxGeometry args={[0.76, 0.1, 4]} />
            <meshStandardMaterial color={sidewalkColor} roughness={0.82} />
          </mesh>

          {/* Center double yellow lane dividers */}
          <mesh position={[-0.05, 0.085, 0]}>
            <boxGeometry args={[0.045, 0.01, 3.8]} />
            <meshStandardMaterial
              color="#f4b942"
              emissive="#f4b942"
              emissiveIntensity={isNight ? 0.45 : 0.15}
            />
          </mesh>
          <mesh position={[0.05, 0.085, 0]}>
            <boxGeometry args={[0.045, 0.01, 3.8]} />
            <meshStandardMaterial
              color="#f4b942"
              emissive="#f4b942"
              emissiveIntensity={isNight ? 0.45 : 0.15}
            />
          </mesh>

          {/* Optional retro sports car with GLTF/procedural fallback */}
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
          {/* Outer West sidewalk */}
          <mesh position={[-1.62, 0.11, 0]} receiveShadow castShadow>
            <boxGeometry args={[0.76, 0.1, 4]} />
            <meshStandardMaterial color={sidewalkColor} roughness={0.82} />
          </mesh>
          {/* Outer South sidewalk */}
          <mesh position={[0.38, 0.11, 1.62]} receiveShadow castShadow>
            <boxGeometry args={[3.24, 0.1, 0.76]} />
            <meshStandardMaterial color={sidewalkColor} roughness={0.82} />
          </mesh>
          {/* Inner NE corner sidewalk island */}
          <mesh position={[1.62, 0.11, -1.62]} receiveShadow castShadow>
            <boxGeometry args={[0.76, 0.1, 0.76]} />
            <meshStandardMaterial color={sidewalkColor} roughness={0.82} />
          </mesh>

          {/* Curved guide lines connecting North (-Z) to East (+X) */}
          <mesh position={[0, 0.085, -1.05]}>
            <boxGeometry args={[0.08, 0.01, 1.8]} />
            <meshStandardMaterial color="#f4b942" />
          </mesh>
          <mesh position={[1.05, 0.085, 0]}>
            <boxGeometry args={[1.8, 0.01, 0.08]} />
            <meshStandardMaterial color="#f4b942" />
          </mesh>
        </>
      )}

      {variant === 'ROAD_CROSS' && (
        <>
          {/* Four corner sidewalk islands */}
          {[
            [-1.62, -1.62],
            [1.62, -1.62],
            [-1.62, 1.62],
            [1.62, 1.62],
          ].map(([x, z], idx) => (
            <mesh key={idx} position={[x, 0.11, z]} receiveShadow castShadow>
              <boxGeometry args={[0.76, 0.1, 0.76]} />
              <meshStandardMaterial color={sidewalkColor} roughness={0.82} />
            </mesh>
          ))}

          {/* Four zebra crosswalks */}
          {[-0.8, -0.4, 0, 0.4, 0.8].map((offset, idx) => (
            <React.Fragment key={idx}>
              <mesh position={[offset, 0.086, -1.55]}>
                <boxGeometry args={[0.16, 0.01, 0.45]} />
                <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
              </mesh>
              <mesh position={[offset, 0.086, 1.55]}>
                <boxGeometry args={[0.16, 0.01, 0.45]} />
                <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
              </mesh>
              <mesh position={[-1.55, 0.086, offset]}>
                <boxGeometry args={[0.45, 0.01, 0.16]} />
                <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
              </mesh>
              <mesh position={[1.55, 0.086, offset]}>
                <boxGeometry args={[0.45, 0.01, 0.16]} />
                <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
              </mesh>
            </React.Fragment>
          ))}
        </>
      )}
    </group>
  );
}
