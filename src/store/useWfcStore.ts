'use client';

import { create } from 'zustand';
import { WFCEngine } from '@/engine/wfc';
import type { GridState } from '@/engine/types';

export type GridSize = 12 | 16 | 24;
export type SimulationStatus = 'idle' | 'running' | 'paused' | 'completed';
export type ViewMode = 'city' | 'museum';
export type LightingPreset = 'golden-hour' | 'midnight-neon';

interface WfcStoreState {
  gridSize: GridSize;
  grid: GridState;
  status: SimulationStatus;
  stepDelayMs: number;
  viewMode: ViewMode;
  lightingPreset: LightingPreset;
  lastGenerationMs: number;
  version: number;

  setGridSize: (size: GridSize) => void;
  solveInstant: () => void;
  startStepByStep: () => void;
  pauseSimulation: () => void;
  stepOnce: () => void;
  resetGrid: () => void;
  setStepDelayMs: (ms: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setLightingPreset: (preset: LightingPreset) => void;
}

const DEFAULT_SIZE: GridSize = 16;
const INITIAL_SEED = 1986;

let engine = new WFCEngine({ width: DEFAULT_SIZE, height: DEFAULT_SIZE, seed: INITIAL_SEED });
const initialGrid = engine.solveAll();

let stepTimer: ReturnType<typeof setTimeout> | null = null;

function clearStepTimer(): void {
  if (stepTimer !== null) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }
}

export const useWfcStore = create<WfcStoreState>((set, get) => {
  const scheduleNextStep = () => {
    clearStepTimer();
    const { status, stepDelayMs } = get();
    if (status !== 'running') return;

    stepTimer = setTimeout(() => {
      const current = get();
      if (current.status !== 'running') return;

      const result = engine.step();
      const nextGrid = engine.getState();

      if (result.completed) {
        clearStepTimer();
        set({
          grid: nextGrid,
          status: 'completed',
        });
      } else {
        set({ grid: nextGrid });
        scheduleNextStep();
      }
    }, stepDelayMs);
  };

  return {
    gridSize: DEFAULT_SIZE,
    grid: initialGrid,
    status: 'completed',
    stepDelayMs: 25,
    viewMode: 'city',
    lightingPreset: 'golden-hour',
    lastGenerationMs: 0,
    version: 1,

    setGridSize: (size) => {
      clearStepTimer();
      const start = performance.now();
      engine = new WFCEngine({ width: size, height: size });
      const solved = engine.solveAll();
      const elapsed = Math.max(1, Math.round(performance.now() - start));

      set((state) => ({
        gridSize: size,
        grid: solved,
        status: 'completed',
        lastGenerationMs: elapsed,
        version: state.version + 1,
      }));
    },

    solveInstant: () => {
      clearStepTimer();
      const { gridSize } = get();
      const start = performance.now();
      engine = new WFCEngine({ width: gridSize, height: gridSize });
      const solved = engine.solveAll();
      const elapsed = Math.max(1, Math.round(performance.now() - start));

      set((state) => ({
        grid: solved,
        status: 'completed',
        lastGenerationMs: elapsed,
        version: state.version + 1,
      }));
    },

    startStepByStep: () => {
      clearStepTimer();
      const { status, gridSize } = get();

      if (status === 'completed') {
        engine = new WFCEngine({ width: gridSize, height: gridSize });
        set((state) => ({
          grid: engine.getState(),
          status: 'running',
          lastGenerationMs: 0,
          version: state.version + 1,
        }));
      } else {
        set({ status: 'running' });
      }

      scheduleNextStep();
    },

    pauseSimulation: () => {
      clearStepTimer();
      set((state) => ({
        status: state.status === 'running' ? 'paused' : state.status,
      }));
    },

    stepOnce: () => {
      clearStepTimer();
      const { status, gridSize } = get();

      if (status === 'completed') {
        engine = new WFCEngine({ width: gridSize, height: gridSize });
        const fresh = engine.getState();
        set((state) => ({
          grid: fresh,
          status: 'paused',
          lastGenerationMs: 0,
          version: state.version + 1,
        }));
      }

      const result = engine.step();
      set({
        grid: engine.getState(),
        status: result.completed ? 'completed' : 'paused',
      });
    },

    resetGrid: () => {
      clearStepTimer();
      const { gridSize } = get();
      engine = new WFCEngine({ width: gridSize, height: gridSize });
      set((state) => ({
        grid: engine.getState(),
        status: 'idle',
        lastGenerationMs: 0,
        version: state.version + 1,
      }));
    },

    setStepDelayMs: (ms) => {
      set({ stepDelayMs: Math.max(5, Math.min(250, ms)) });
    },

    setViewMode: (mode) => {
      set({ viewMode: mode });
    },

    setLightingPreset: (preset) => {
      set({ lightingPreset: preset });
    },
  };
});
