'use client';

import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { LightingPreset } from '@/store/useWfcStore';

interface LightingRigProps {
  preset: LightingPreset;
}

const SKY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldDirection;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldDirection = normalize(worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SKY_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uZenithColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;

  varying vec3 vWorldDirection;

  void main() {
    vec3 dir = normalize(vWorldDirection);
    float h = clamp(dir.y * 0.85 + 0.15, 0.0, 1.0);
    vec3 sky = mix(uHorizonColor, uZenithColor, pow(h, 0.65));

    // Stylized Vice City sun / synthwave moon glow on the horizon
    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    float sunDisc = smoothstep(0.9965, 0.9985, sunDot);
    float sunHalo = pow(sunDot, 16.0) * 0.45;

    sky += uSunColor * (sunHalo + sunDisc * 2.2);
    gl_FragColor = vec4(sky, 1.0);
  }
`;

export function LightingRig({ preset }: LightingRigProps) {
  const { scene } = useThree();
  const isNight = preset === 'midnight-neon';

  // Configure atmospheric exponential fog (FogExp2) and background color
  useEffect(() => {
    const fogColor = isNight ? '#0a091c' : '#f28c6b';
    const fogDensity = isNight ? 0.0085 : 0.0068;
    scene.fog = new THREE.FogExp2(fogColor, fogDensity);
    scene.background = new THREE.Color(fogColor);

    return () => {
      scene.fog = null;
    };
  }, [scene, isNight]);

  const skyMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX_SHADER,
      fragmentShader: SKY_FRAGMENT_SHADER,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uZenithColor: { value: new THREE.Color(isNight ? '#07061a' : '#2d1b69') },
        uHorizonColor: { value: new THREE.Color(isNight ? '#211145' : '#ff7b54') },
        uSunColor: { value: new THREE.Color(isNight ? '#ff2a85' : '#ffd166') },
        uSunDir: { value: new THREE.Vector3(-0.55, 0.16, -0.82).normalize() },
      },
    });
  }, [isNight]);

  useEffect(() => {
    return () => {
      skyMaterial.dispose();
    };
  }, [skyMaterial]);

  return (
    <>
      {/* Atmospheric gradient sky dome */}
      <mesh material={skyMaterial} scale={[220, 220, 220]}>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>

      {/* Low sunset directional key light / cool midnight moon light */}
      <directionalLight
        position={isNight ? [-32, 42, -26] : [-48, 22, -42]}
        intensity={isNight ? 0.9 : 2.65}
        color={isNight ? '#7c8dff' : '#ffab66'}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={5}
        shadow-camera-far={160}
        shadow-camera-left={-56}
        shadow-camera-right={56}
        shadow-camera-top={56}
        shadow-camera-bottom={-56}
        shadow-bias={-0.0005}
      />

      {/* Vice City neon rim fill light */}
      <directionalLight
        position={[36, 18, 34]}
        intensity={isNight ? 0.65 : 0.75}
        color={isNight ? '#ff2a85' : '#00d2ff'}
      />

      {/* Sky-to-ground hemisphere bounce */}
      <hemisphereLight
        args={[
          isNight ? '#2c1e66' : '#ff9a76',
          isNight ? '#0c0c1d' : '#3a224d',
          isNight ? 0.65 : 0.95,
        ]}
      />
    </>
  );
}
