import * as THREE from 'three';

export const interiorMappingVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vLocalNormal;

  void main() {
    vUv = uv;
    vLocalNormal = normalize(normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const interiorMappingFragmentShader = /* glsl */ `
  uniform vec2 uRooms;
  uniform float uDepth;
  uniform float uSeed;
  uniform float uNightFactor;
  uniform vec3 uFacadeColor;
  uniform vec3 uReflectionColor;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vLocalNormal;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    // Only apply interior mapping on vertical walls; roof/bottom use solid facade tone.
    if (abs(vLocalNormal.y) > 0.5) {
      gl_FragColor = vec4(uFacadeColor * 0.85, 1.0);
      return;
    }

    vec2 tiledUv = vUv * uRooms;
    vec2 roomId = floor(tiledUv);
    vec2 cellUv = fract(tiledUv);

    // Architectural window mullions and concrete spandrels around each room window.
    float frameX = step(0.09, cellUv.x) * step(cellUv.x, 0.91);
    float frameY = step(0.14, cellUv.y) * step(cellUv.y, 0.86);
    float isGlass = frameX * frameY;

    if (isGlass < 0.5) {
      // Subtle vertical Art Deco fluting on concrete frame
      float flute = 0.94 + 0.06 * sin(vUv.x * 90.0);
      gl_FragColor = vec4(uFacadeColor * flute, 1.0);
      return;
    }

    // Build orthonormal tangent basis (T, B, N) in world space for box facades.
    vec3 N = normalize(vWorldNormal);
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 T = normalize(cross(up, N));
    vec3 B = cross(N, T);

    // View ray from camera into the interior, projected into tangent space.
    vec3 viewDirW = normalize(vWorldPos - cameraPosition);
    vec3 viewTS = vec3(
      dot(viewDirW, T),
      dot(viewDirW, B),
      dot(viewDirW, -N)
    );
    viewTS.z = max(viewTS.z, 0.08);

    // Normalize cell UV to [-1, 1] inside the glass aperture.
    vec2 p = ((cellUv - vec2(0.09, 0.14)) / vec2(0.82, 0.72)) * 2.0 - 1.0;

    // Analytical ray-box intersection against interior walls, floor, ceiling, and back wall.
    vec3 rayDir = normalize(vec3(viewTS.xy, viewTS.z / max(uDepth, 0.25)));
    vec3 invDir = 1.0 / (rayDir + vec3(1e-5));

    vec3 kMin = (vec3(-1.0, -1.0, 0.0) - vec3(p, 0.0)) * invDir;
    vec3 kMax = (vec3(1.0, 1.0, 1.0) - vec3(p, 0.0)) * invDir;
    vec3 kFar = max(kMin, kMax);

    float dist = min(min(kFar.x, kFar.y), kFar.z);
    vec3 hitPos = vec3(p, 0.0) + rayDir * dist;

    // Deterministic per-room lighting & Vice City palette variation.
    float roomRand = hash21(roomId + vec2(uSeed * 17.3, uSeed * 31.7));
    float litThreshold = mix(0.52, 0.24, uNightFactor);
    float isLit = step(litThreshold, roomRand);

    vec3 warmLamp = vec3(1.35, 0.96, 0.62);
    vec3 coralNeon = vec3(1.45, 0.45, 0.78);
    vec3 cyanNeon = vec3(0.35, 1.15, 1.35);
    vec3 roomTint = warmLamp;
    if (roomRand > 0.86) {
      roomTint = coralNeon;
    } else if (roomRand > 0.76) {
      roomTint = cyanNeon;
    }

    vec3 unlitColor = vec3(0.06, 0.07, 0.11);
    vec3 baseRoomColor = mix(unlitColor, roomTint, isLit);

    // Shade interior surfaces based on which plane was intersected.
    float shade = 0.65;
    if (dist == kFar.y) {
      // Ceiling vs floor
      shade = hitPos.y > 0.0 ? 1.15 : 0.42;
      // Overhead ceiling fixture highlight
      float fixture = smoothstep(0.45, 0.08, length(hitPos.xz - vec2(0.0, 0.5)));
      shade += fixture * 0.6 * isLit;
    } else if (dist == kFar.z) {
      // Back wall with subtle venetian blind / framed art gradient
      shade = 0.78 - 0.2 * abs(hitPos.x);
      float silhouette = step(abs(hitPos.x), 0.35) * step(hitPos.y, -0.2);
      shade *= mix(1.0, 0.55, silhouette);
    } else {
      // Left / right walls
      shade = 0.58 + 0.18 * (1.0 - hitPos.z);
    }

    // Depth attenuation inside room
    float ao = mix(1.0, 0.58, clamp(hitPos.z, 0.0, 1.0));
    vec3 interiorColor = baseRoomColor * shade * ao;

    // Boost emissive glow at night for selective Bloom on lit interiors.
    float glowBoost = mix(0.85, 1.38, uNightFactor);
    interiorColor *= mix(1.0, glowBoost, isLit);

    // Glass Fresnel reflection of Vice City sky / sunset.
    float fresnel = pow(1.0 - clamp(dot(-viewDirW, N), 0.0, 1.0), 3.0);
    vec3 finalColor = mix(interiorColor, uReflectionColor, 0.18 + 0.42 * fresnel);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export interface InteriorMappingOptions {
  roomsX?: number;
  roomsY?: number;
  depth?: number;
  seed?: number;
  nightFactor?: number;
  facadeColor?: THREE.ColorRepresentation;
  reflectionColor?: THREE.ColorRepresentation;
}

export function createInteriorMappingMaterial(
  options: InteriorMappingOptions = {},
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: interiorMappingVertexShader,
    fragmentShader: interiorMappingFragmentShader,
    uniforms: {
      uRooms: { value: new THREE.Vector2(options.roomsX ?? 4, options.roomsY ?? 6) },
      uDepth: { value: options.depth ?? 0.65 },
      uSeed: { value: options.seed ?? 1.0 },
      uNightFactor: { value: options.nightFactor ?? 0.0 },
      uFacadeColor: { value: new THREE.Color(options.facadeColor ?? '#f6d5c9') },
      uReflectionColor: { value: new THREE.Color(options.reflectionColor ?? '#ff8866') },
    },
    toneMapped: true,
  });
}
