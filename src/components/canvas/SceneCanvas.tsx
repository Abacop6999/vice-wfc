'use client';

import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { updateSharedWaterTime } from '@/shaders/waterShader';
import { useWfcStore } from '@/store/useWfcStore';
import { CityGrid } from './CityGrid';
import { LightingRig } from './LightingRig';
import { MuseumView } from './MuseumView';

function SharedShaderClock() {
  useFrame(({ clock }) => {
    updateSharedWaterTime(clock.getElapsedTime());
  });
  return null;
}

function CameraController() {
  const viewMode = useWfcStore((s) => s.viewMode);
  const gridSize = useWfcStore((s) => s.gridSize);
  const { camera } = useThree();
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);

  useEffect(() => {
    if (viewMode === 'museum') {
      camera.position.set(0, 16, 22);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0.5, 0);
        controlsRef.current.update();
      }
    } else {
      const dist = gridSize === 24 ? 54 : gridSize === 16 ? 38 : 30;
      camera.position.set(dist * 0.82, dist * 0.62, dist * 0.88);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    }
  }, [viewMode, gridSize, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      maxPolarAngle={Math.PI / 2 - 0.08}
      minPolarAngle={0.18}
      minDistance={10}
      maxDistance={115}
    />
  );
}

export function SceneCanvas() {
  const viewMode = useWfcStore((s) => s.viewMode);
  const lightingPreset = useWfcStore((s) => s.lightingPreset);

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ fov: 44, near: 0.5, far: 450, position: [31, 24, 34] }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <SharedShaderClock />
        <LightingRig preset={lightingPreset} />
        {viewMode === 'city' ? <CityGrid /> : <MuseumView />}
        <CameraController />

        <EffectComposer multisampling={0}>
          <Bloom intensity={0.65} luminanceThreshold={1.05} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
