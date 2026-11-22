# ViceGrid WFC

Interactive 3D procedural city generator powered by **Wave Function Collapse (WFC)**, custom **GLSL shaders**, and **React Three Fiber** — inspired by *Vice City* Golden Hour and Midnight Neon aesthetics.

- **Live Target:** `https://vice-wfc.vercel.app`
- **Repository:** `https://github.com/Abacop6999/vice-wfc`

---

## Quick Start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to explore the 3D city viewport, animate live entropy collapse, toggle *Golden Hour* / *Midnight Neon*, or inspect all 8 modules in the **Asset Museum**.

```bash
# Run pure WFC engine unit tests
bun test src/engine/__tests__/wfc.test.ts

# Production build & typecheck
pnpm build
```

---

## WFC Module & Socket Specification

Each base module defines cardinal sockets in clockwise order **`[North (Z-), East (X+), South (Z+), West (X-)]`** and automatically generates deduplicated `0° / 90° / 180° / 270°` prototypes.

| Base ID | Name | Sockets `[N, E, S, W]` | Weight | Role |
| :--- | :--- | :--- | :---: | :--- |
| `OCEAN` | Mar Caribe | `['OCEAN', 'OCEAN', 'OCEAN', 'OCEAN']` | `1.5` | Animated Caribbean ocean GLSL shader |
| `BEACH` | Playa | `['PROMENADE', 'BEACH', 'OCEAN', 'BEACH']` | `1.2` | Mandatory shoreline transition |
| `PROMENADE` | Ocean Drive | `['ROAD', 'PROMENADE', 'BEACH', 'PROMENADE']` | `1.2` | Coastal boardwalk with palms & neon bollards |
| `ROAD_STRAIGHT` | Avenida | `['ROAD', 'BUILDING_BASE', 'ROAD', 'BUILDING_BASE']` | `3.0` | Wet PBR two-lane reflective avenue |
| `ROAD_CORNER` | Curva | `['ROAD', 'ROAD', 'BUILDING_BASE', 'BUILDING_BASE']` | `1.8` | 90-degree avenue turn |
| `ROAD_CROSS` | Intersección | `['ROAD', 'ROAD', 'ROAD', 'ROAD']` | `1.0` | Four-way intersection with crosswalks |
| `BLOCK_ARTDECO` | Manzana Vice | `['BUILDING_BASE', 'BUILDING_BASE', 'BUILDING_BASE', 'BUILDING_BASE']` | `2.8` | Pastel Art Deco towers with Interior Mapping |
| `PARK_PLAZA` | Parque | `['BUILDING_BASE', 'PARK', 'BUILDING_BASE', 'PARK']` | `1.0` | Tropical plaza with glowing fountain |

---

## Architecture Overview

| Layer | Path | Responsibility |
| :--- | :--- | :--- |
| **Pure WFC Engine** | `src/engine/` | Framework-agnostic solver (`types.ts`, `modules.ts`, `wfc.ts`): Shannon entropy selection, weighted collapse, BFS constraint propagation, snapshot stack backtracking, and deterministic PRNG. |
| **State Store** | `src/store/useWfcStore.ts` | Zustand store decoupling WFC step/solve loops from the 60 FPS WebGL render loop. |
| **GLSL Shaders** | `src/shaders/` | `interiorMapping.ts` (tangent-space parallax 3D rooms behind tower windows) & `waterShader.ts` (multi-wave displacement, Fresnel sky reflection, solar/neon specular path). |
| **3D Scene & Museum** | `src/components/canvas/` | `SceneCanvas`, `LightingRig` (`FogExp2`, Golden Hour / Midnight Neon), `CityGrid` (`InstancedMesh` entropy cubes, palms & lamps), `MuseumView`, and modular tiles. |
| **HUD Overlay** | `src/components/ui/ControlPanel.tsx` | Dark glassmorphism telemetry panel for grid size (`12×12`, `16×16`, `24×24`), instant/step execution, speed slider, lighting presets, and Asset Museum toggle. |

---

## Performance & Visual Pipeline

- **Post-Processing:** `THREE.ACESFilmicToneMapping`, selective `<Bloom intensity={0.65} luminanceThreshold={1.05} mipmapBlur />`, and subtle `<Vignette />`.
- **Instancing:** Entropy volumes, palm trees, and Art Deco street lamps render via `InstancedMesh` to keep `24×24` grids (576 tiles) smooth at 60 FPS.
- **Optional `.glb` Assets:** `OptionalGltfAsset` supports `useGLTF` + `Suspense` for optional models in `public/models/` while rendering rich procedural fallbacks by default.
