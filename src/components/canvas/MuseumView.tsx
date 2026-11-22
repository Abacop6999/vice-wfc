'use client';

import React from 'react';
import { Html } from '@react-three/drei';
import { BASE_MODULES } from '@/engine/modules';
import type { BaseModuleDefinition, SocketType } from '@/engine/types';
import { useWfcStore } from '@/store/useWfcStore';
import { BuildingBlock } from './modules/BuildingBlock';
import { CoastTile } from './modules/CoastTile';
import { ProceduralPalmTree } from './modules/ProceduralProps';
import { RoadTile } from './modules/RoadTile';

const SOCKET_COLORS: Record<SocketType, string> = {
  OCEAN: 'bg-cyan-500/90 text-slate-950 border-cyan-300',
  BEACH: 'bg-amber-300/90 text-slate-950 border-amber-100',
  PROMENADE: 'bg-pink-400/90 text-slate-950 border-pink-200',
  ROAD: 'bg-slate-700/95 text-amber-300 border-amber-400/60',
  BUILDING_BASE: 'bg-fuchsia-600/90 text-white border-fuchsia-300',
  PARK: 'bg-emerald-500/90 text-slate-950 border-emerald-200',
};

function SocketBadge({
  dir,
  socket,
  position,
}: {
  dir: 'N' | 'E' | 'S' | 'W';
  socket: SocketType;
  position: [number, number, number];
}) {
  return (
    <Html position={position} center distanceFactor={24} zIndexRange={[10, 0]}>
      <div
        className={`pointer-events-none select-none whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-tight shadow-md ${SOCKET_COLORS[socket]}`}
      >
        <span className="opacity-70">{dir}:</span> {socket}
      </div>
    </Html>
  );
}

function MuseumPedestal({
  moduleDef,
  position,
  index,
  isNight,
}: {
  moduleDef: BaseModuleDefinition;
  position: [number, number, number];
  index: number;
  isNight: boolean;
}) {
  const [n, e, s, w] = moduleDef.sockets;

  return (
    <group position={position}>
      {/* Gallery dark marble pedestal */}
      <mesh position={[0, -0.35, 0]} receiveShadow castShadow>
        <boxGeometry args={[4.5, 0.5, 4.5]} />
        <meshStandardMaterial color="#141422" roughness={0.35} metalness={0.4} />
      </mesh>
      {/* Neon pedestal accent rim */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[4.56, 0.04, 4.56]} />
        <meshStandardMaterial
          color="#00f0ff"
          emissive="#00f0ff"
          emissiveIntensity={isNight ? 2.0 : 1.1}
          toneMapped={false}
        />
      </mesh>

      {/* Module 3D preview */}
      <group position={[0, 0, 0]}>
        {(moduleDef.id === 'OCEAN' ||
          moduleDef.id === 'BEACH' ||
          moduleDef.id === 'PROMENADE') && (
          <CoastTile variant={moduleDef.id} tileSeed={index * 17 + 5} isNight={isNight} />
        )}
        {(moduleDef.id === 'ROAD_STRAIGHT' ||
          moduleDef.id === 'ROAD_CORNER' ||
          moduleDef.id === 'ROAD_CROSS') && (
          <RoadTile variant={moduleDef.id} tileSeed={index * 23 + 9} isNight={isNight} />
        )}
        {(moduleDef.id === 'BLOCK_ARTDECO' || moduleDef.id === 'PARK_PLAZA') && (
          <BuildingBlock variant={moduleDef.id} tileSeed={index * 31 + 11} isNight={isNight} />
        )}

        {/* Showcase palm trees on coastal & park tiles */}
        {moduleDef.id === 'PROMENADE' && (
          <>
            <ProceduralPalmTree position={[-1.1, 0.16, 0.85]} scale={0.95} />
            <ProceduralPalmTree position={[1.1, 0.16, 0.85]} scale={0.85} rotationY={1.4} />
          </>
        )}
        {moduleDef.id === 'PARK_PLAZA' && (
          <>
            <ProceduralPalmTree position={[-1.25, 0.15, -1.25]} scale={0.85} />
            <ProceduralPalmTree position={[1.25, 0.15, 1.25]} scale={0.9} rotationY={2.1} />
          </>
        )}
      </group>

      {/* Cardinal Socket Badges: N (Z-), E (X+), S (Z+), W (X-) */}
      <SocketBadge dir="N" socket={n} position={[0, 0.55, -2.55]} />
      <SocketBadge dir="E" socket={e} position={[2.65, 0.55, 0]} />
      <SocketBadge dir="S" socket={s} position={[0, 0.55, 2.55]} />
      <SocketBadge dir="W" socket={w} position={[-2.65, 0.55, 0]} />

      {/* Title & Weight Plate */}
      <Html position={[0, -0.75, 2.5]} center distanceFactor={24} zIndexRange={[10, 0]}>
        <div className="pointer-events-none select-none rounded-lg border border-white/15 bg-slate-950/85 px-2.5 py-1 text-center backdrop-blur-md">
          <div className="font-mono text-[11px] font-bold text-white">{moduleDef.name}</div>
          <div className="font-mono text-[9px] text-cyan-300">
            {moduleDef.id} · w={moduleDef.weight.toFixed(1)}
          </div>
        </div>
      </Html>
    </group>
  );
}

/**
 * Dedicated Asset Museum exhibiting all 8 base WFC modules side-by-side
 * with their cardinal sockets (N, E, S, W) and probabilistic weights.
 */
export function MuseumView() {
  const lightingPreset = useWfcStore((s) => s.lightingPreset);
  const isNight = lightingPreset === 'midnight-neon';

  const spacingX = 7.4;
  const spacingZ = 8.4;

  return (
    <group>
      {/* Reflective gallery floor */}
      <mesh position={[0, -0.62, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial
          color={isNight ? '#090914' : '#1a162b'}
          roughness={0.22}
          metalness={0.5}
        />
      </mesh>

      {BASE_MODULES.map((mod, idx) => {
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        const x = (col - 1.5) * spacingX;
        const z = (row - 0.5) * spacingZ;

        return (
          <MuseumPedestal
            key={mod.id}
            moduleDef={mod}
            position={[x, 0, z]}
            index={idx}
            isNight={isNight}
          />
        );
      })}
    </group>
  );
}
