'use client';

import React, { Component, Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

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
  const headlightIntensity = isNight ? 3.2 : 1.4;
  const taillightIntensity = isNight ? 2.8 : 1.2;

  return (
    <group position={position} rotation={rotation}>
      {/* Main wedge chassis */}
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.48, 0.16, 1.05]} />
        <meshStandardMaterial color={color} metalness={0.65} roughness={0.22} />
      </mesh>
      {/* Low-slung cockpit canopy */}
      <mesh position={[0, 0.28, -0.05]} castShadow>
        <boxGeometry args={[0.4, 0.13, 0.48]} />
        <meshStandardMaterial color="#101824" metalness={0.85} roughness={0.12} />
      </mesh>
      {/* Rear spoiler */}
      <mesh position={[0, 0.27, -0.46]} castShadow>
        <boxGeometry args={[0.48, 0.03, 0.1]} />
        <meshStandardMaterial color={color} metalness={0.65} roughness={0.22} />
      </mesh>
      {/* Wheels */}
      {[
        [-0.23, 0.09, 0.3],
        [0.23, 0.09, 0.3],
        [-0.23, 0.09, -0.32],
        [0.23, 0.09, -0.32],
      ].map(([x, y, z], idx) => (
        <mesh key={idx} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.09, 0.09, 0.07, 10]} />
          <meshStandardMaterial color="#18181b" roughness={0.8} />
        </mesh>
      ))}
      {/* Emissive headlights */}
      <mesh position={[-0.15, 0.17, 0.53]}>
        <boxGeometry args={[0.11, 0.05, 0.02]} />
        <meshStandardMaterial
          color="#fff7d6"
          emissive="#ffeaa7"
          emissiveIntensity={headlightIntensity}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.15, 0.17, 0.53]}>
        <boxGeometry args={[0.11, 0.05, 0.02]} />
        <meshStandardMaterial
          color="#fff7d6"
          emissive="#ffeaa7"
          emissiveIntensity={headlightIntensity}
          toneMapped={false}
        />
      </mesh>
      {/* Emissive rear light bar */}
      <mesh position={[0, 0.18, -0.53]}>
        <boxGeometry args={[0.42, 0.045, 0.02]} />
        <meshStandardMaterial
          color="#ff1f5a"
          emissive="#ff1f5a"
          emissiveIntensity={taillightIntensity}
          toneMapped={false}
        />
      </mesh>
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
