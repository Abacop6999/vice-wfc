'use client';

import React, { Component, Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const CAR_BODY_GEO = new THREE.BoxGeometry(0.48, 0.16, 1.05);
const CAR_CABIN_GEO = new THREE.BoxGeometry(0.4, 0.13, 0.48);
const CAR_HEADLIGHT_GEO = new THREE.BoxGeometry(0.42, 0.05, 0.02);
const CAR_TAILLIGHT_GEO = new THREE.BoxGeometry(0.42, 0.045, 0.02);
const CAR_CABIN_MAT = new THREE.MeshStandardMaterial({ color: '#101824', metalness: 0.85, roughness: 0.12 });
const CAR_HEAD_DAY = new THREE.MeshStandardMaterial({ color: '#fff7d6', emissive: '#ffeaa7', emissiveIntensity: 1.4, toneMapped: false });
const CAR_HEAD_NIGHT = new THREE.MeshStandardMaterial({ color: '#fff7d6', emissive: '#ffeaa7', emissiveIntensity: 3.2, toneMapped: false });
const CAR_TAIL_DAY = new THREE.MeshStandardMaterial({ color: '#ff1f5a', emissive: '#ff1f5a', emissiveIntensity: 1.2, toneMapped: false });
const CAR_TAIL_NIGHT = new THREE.MeshStandardMaterial({ color: '#ff1f5a', emissive: '#ff1f5a', emissiveIntensity: 2.8, toneMapped: false });

const carBodyMatPool = new Map<string, THREE.MeshStandardMaterial>();
function getCarBodyMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = carBodyMatPool.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color, metalness: 0.65, roughness: 0.22 });
    carBodyMatPool.set(color, mat);
  }
  return mat;
}

interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class GltfErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function LoadedGltfAsset({ url, scale = 1 }: { url: string; scale?: number }) {
  const gltf = useGLTF(url);
  const cloned = useMemo(() => gltf.scene.clone(), [gltf.scene]);
  return <primitive object={cloned} scale={scale} />;
}

/**
 * Renders an optional .glb model via useGLTF + Suspense when enabled,
 * falling back seamlessly to high-detail procedural geometry.
 */
export function OptionalGltfAsset({
  url,
  scale = 1,
  fallback,
}: {
  url?: string;
  scale?: number;
  fallback: React.ReactNode;
}) {
  if (!url) {
    return <>{fallback}</>;
  }

  return (
    <GltfErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LoadedGltfAsset url={url} scale={scale} />
      </Suspense>
    </GltfErrorBoundary>
  );
}

/**
 * Detailed 1980s Vice City wedge sports car with emissive headlights & neon taillights.
 */
export function ProceduralSportsCar({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = '#ff3b7f',
  isNight = false,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  isNight?: boolean;
}) {
  const bodyMat = getCarBodyMaterial(color);

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.14, 0]} geometry={CAR_BODY_GEO} material={bodyMat} />
      <mesh position={[0, 0.26, -0.05]} geometry={CAR_CABIN_GEO} material={CAR_CABIN_MAT} />
      <mesh
        position={[0, 0.15, 0.53]}
        geometry={CAR_HEADLIGHT_GEO}
        material={isNight ? CAR_HEAD_NIGHT : CAR_HEAD_DAY}
      />
      <mesh
        position={[0, 0.16, -0.53]}
        geometry={CAR_TAILLIGHT_GEO}
        material={isNight ? CAR_TAIL_NIGHT : CAR_TAIL_DAY}
      />
    </group>
  );
}

/**
 * Detailed procedural tropical palm tree (used in Museum view & individual tiles).
 * In the full CityGrid, palms are rendered via InstancedMesh for 60 FPS on 24x24 grids.
 */
export function ProceduralPalmTree({
  position = [0, 0, 0],
  scale = 1,
  rotationY = 0,
}: {
  position?: [number, number, number];
  scale?: number;
  rotationY?: number;
}) {
  const frondAngles = [0, 1.05, 2.1, 3.14, 4.18, 5.23];

  return (
    <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
      {/* Segmented curved trunk */}
      <mesh position={[0, 0.45, 0]} rotation={[0.06, 0, 0.04]} castShadow>
        <cylinderGeometry args={[0.075, 0.11, 0.9, 7]} />
        <meshStandardMaterial color="#7c5638" roughness={0.9} />
      </mesh>
      <mesh position={[0.04, 1.25, 0.05]} rotation={[0.12, 0, 0.06]} castShadow>
        <cylinderGeometry args={[0.055, 0.075, 0.85, 7]} />
        <meshStandardMaterial color="#8b6242" roughness={0.9} />
      </mesh>
      {/* Arched frond canopy */}
      <group position={[0.1, 1.68, 0.11]}>
        {frondAngles.map((angle, i) => (
          <group key={i} rotation={[0, angle, 0]}>
            <mesh position={[0.38, 0.04, 0]} rotation={[0, 0, -0.35]} castShadow>
              <boxGeometry args={[0.78, 0.04, 0.22]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#1b8a5a' : '#26a66b'} roughness={0.75} />
            </mesh>
            <mesh position={[0.8, -0.14, 0]} rotation={[0, 0, -0.78]} castShadow>
              <boxGeometry args={[0.42, 0.03, 0.16]} />
              <meshStandardMaterial color="#167049" roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
