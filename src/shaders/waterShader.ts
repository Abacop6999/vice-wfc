import * as THREE from 'three';

export const waterVertexShader = /* glsl */ `
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vWaveHeight;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);

    float w1 = sin(worldPos.x * 0.95 + uTime * 1.45) * 0.045;
    float w2 = cos(worldPos.z * 1.15 - uTime * 1.15) * 0.038;
    float w3 = sin((worldPos.x + worldPos.z) * 1.65 + uTime * 1.9) * 0.022;

    float height = w1 + w2 + w3;
    worldPos.y += height;

    vWorldPos = worldPos.xyz;
    vWaveHeight = height;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const waterFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uSkyColor;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uNightFactor;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vWaveHeight;

  void main() {
    // Analytical wave normal perturbation in world XZ space.
    float dx =
      cos(vWorldPos.x * 0.95 + uTime * 1.45) * 0.095 +
      cos((vWorldPos.x + vWorldPos.z) * 1.65 + uTime * 1.9) * 0.06 +
      sin(vWorldPos.x * 3.8 - uTime * 2.4) * 0.025;
    float dz =
      -sin(vWorldPos.z * 1.15 - uTime * 1.15) * 0.085 +
      cos((vWorldPos.x + vWorldPos.z) * 1.65 + uTime * 1.9) * 0.06 +
      cos(vWorldPos.z * 4.2 + uTime * 2.1) * 0.025;

    vec3 N = normalize(vec3(-dx, 1.0, -dz));
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(uSunDirection);

    // Caribbean turquoise depth blend
    float crest = smoothstep(-0.08, 0.09, vWaveHeight);
    vec3 waterBase = mix(uDeepColor, uShallowColor, 0.35 + 0.55 * crest);

    // Subtle caustics shimmer
    float caustic =
      sin(vWorldPos.x * 2.8 + uTime * 1.6) *
      cos(vWorldPos.z * 2.6 - uTime * 1.3);
    waterBase += uShallowColor * max(caustic, 0.0) * 0.12;

    // Schlick Fresnel reflection
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.0);
    vec3 color = mix(waterBase, uSkyColor, clamp(fresnel * 0.72, 0.08, 0.78));

    // Specular solar / neon moon path reflection
    vec3 H = normalize(L + V);
    float specSharp = pow(max(dot(N, H), 0.0), 96.0);
    float specBroad = pow(max(dot(N, H), 0.0), 18.0);
    float specStrength = mix(1.45, 0.85, uNightFactor);
    color += uSunColor * (specSharp * 1.55 + specBroad * 0.32) * specStrength;

    // Soft sea-foam highlights on wave crests
    float foam = smoothstep(0.065, 0.098, vWaveHeight);
    color = mix(color, vec3(0.92, 0.98, 1.0), foam * mix(0.35, 0.15, uNightFactor));

    gl_FragColor = vec4(color, 0.96);
  }
`;

export interface WaterMaterialOptions {
  nightFactor?: number;
}

export function createWaterMaterial(options: WaterMaterialOptions = {}): THREE.ShaderMaterial {
  const isNight = (options.nightFactor ?? 0) > 0.5;
  return new THREE.ShaderMaterial({
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(isNight ? '#041226' : '#025d73') },
      uShallowColor: { value: new THREE.Color(isNight ? '#0a3b5c' : '#00d2d3') },
      uSkyColor: { value: new THREE.Color(isNight ? '#1b1038' : '#ff7e5f') },
      uSunColor: { value: new THREE.Color(isNight ? '#ff2a85' : '#ffd27d') },
      uSunDirection: { value: new THREE.Vector3(-0.6, 0.25, -0.75).normalize() },
      uNightFactor: { value: options.nightFactor ?? 0 },
    },
    toneMapped: true,
  });
}
