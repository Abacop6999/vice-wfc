'use client';

import React, { useState } from 'react';
import {
  Boxes,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  Moon,
  Pause,
  Play,
  RotateCcw,
  StepForward,
  Sun,
  Zap,
} from 'lucide-react';
import { useWfcStore, type GridSize } from '@/store/useWfcStore';

const GRID_SIZES: readonly GridSize[] = [12, 16, 24];

export function ControlPanel() {
  const [collapsed, setCollapsed] = useState(false);

  const gridSize = useWfcStore((s) => s.gridSize);
  const grid = useWfcStore((s) => s.grid);
  const status = useWfcStore((s) => s.status);
  const stepDelayMs = useWfcStore((s) => s.stepDelayMs);
  const viewMode = useWfcStore((s) => s.viewMode);
  const lightingPreset = useWfcStore((s) => s.lightingPreset);
  const lastGenerationMs = useWfcStore((s) => s.lastGenerationMs);

  const setGridSize = useWfcStore((s) => s.setGridSize);
  const solveInstant = useWfcStore((s) => s.solveInstant);
  const startStepByStep = useWfcStore((s) => s.startStepByStep);
  const pauseSimulation = useWfcStore((s) => s.pauseSimulation);
  const stepOnce = useWfcStore((s) => s.stepOnce);
  const resetGrid = useWfcStore((s) => s.resetGrid);
  const setStepDelayMs = useWfcStore((s) => s.setStepDelayMs);
  const setViewMode = useWfcStore((s) => s.setViewMode);
  const setLightingPreset = useWfcStore((s) => s.setLightingPreset);

  const progressPct = Math.round((grid.collapsedCount / Math.max(1, grid.totalCells)) * 100);
  const remainingCells = grid.totalCells - grid.collapsedCount;

  return (
    <aside className="pointer-events-auto fixed left-4 top-4 z-20 w-[310px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/12 bg-slate-950/75 text-slate-100 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-tr from-[#ff2a85] to-[#00f0ff] shadow-[0_0_10px_#ff2a85]" />
          <div>
            <h1 className="font-sans text-sm font-bold tracking-wide text-white">
              ViceGrid <span className="text-[#00f0ff]">WFC</span>
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Procedural 3D City Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <a
            href="https://github.com/Abacop6999/vice-wfc"
            target="_blank"
            rel="noopener noreferrer"
            title="View repository on GitHub"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand control panel' : 'Collapse control panel'}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-4 p-4">
          {/* View Mode & Lighting Preset */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'city' ? 'museum' : 'city')}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-medium transition-all ${
                viewMode === 'museum'
                  ? 'border-[#00f0ff]/60 bg-[#00f0ff]/15 text-[#00f0ff]'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
            >
              {viewMode === 'city' ? (
                <>
                  <Boxes className="h-3.5 w-3.5" />
                  Asset Museum
                </>
              ) : (
                <>
                  <Grid3X3 className="h-3.5 w-3.5" />
                  City Grid
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                setLightingPreset(
                  lightingPreset === 'golden-hour' ? 'midnight-neon' : 'golden-hour',
                )
              }
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-medium transition-all ${
                lightingPreset === 'midnight-neon'
                  ? 'border-[#ff2a85]/60 bg-[#ff2a85]/15 text-[#ff85bc]'
                  : 'border-amber-400/50 bg-amber-500/15 text-amber-200'
              }`}
            >
              {lightingPreset === 'golden-hour' ? (
                <>
                  <Sun className="h-3.5 w-3.5" />
                  Golden Hour
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5" />
                  Midnight Neon
                </>
              )}
            </button>
          </div>

          {viewMode === 'city' && (
            <>
              {/* Grid Size */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono uppercase tracking-wider">Grid Resolution</span>
                  <span className="font-mono text-slate-200">
                    {gridSize}×{gridSize} ({gridSize * gridSize} cells)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {GRID_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setGridSize(size)}
                      className={`rounded-lg border py-1.5 font-mono text-xs font-semibold transition-all ${
                        gridSize === size
                          ? 'border-[#00f0ff]/70 bg-[#00f0ff]/15 text-[#00f0ff]'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {size}×{size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Solver Actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={solveInstant}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff2a85] to-[#b5179e] px-3 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(255,42,133,0.35)] transition-opacity hover:opacity-95"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Generate New Sector (Instant)
                </button>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={status === 'running' ? pauseSimulation : startStepByStep}
                    className="flex items-center justify-center gap-1 rounded-xl border border-white/12 bg-white/8 px-2 py-2 text-xs font-medium text-white transition-colors hover:bg-white/15"
                  >
                    {status === 'running' ? (
                      <>
                        <Pause className="h-3.5 w-3.5 text-amber-300" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 text-[#00f0ff]" />
                        Animate
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={stepOnce}
                    className="flex items-center justify-center gap-1 rounded-xl border border-white/12 bg-white/8 px-2 py-2 text-xs font-medium text-white transition-colors hover:bg-white/15"
                  >
                    <StepForward className="h-3.5 w-3.5 text-slate-200" />
                    Step
                  </button>

                  <button
                    type="button"
                    onClick={resetGrid}
                    className="flex items-center justify-center gap-1 rounded-xl border border-white/12 bg-white/8 px-2 py-2 text-xs font-medium text-white transition-colors hover:bg-white/15"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-slate-300" />
                    Reset
                  </button>
                </div>
              </div>

              {/* Step Delay Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono uppercase tracking-wider">Collapse Interval</span>
                  <span className="font-mono text-[#00f0ff]">{stepDelayMs} ms</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={stepDelayMs}
                  onChange={(e) => setStepDelayMs(Number(e.target.value))}
                  className="vice-slider w-full cursor-pointer"
                />
              </div>

              {/* Live Telemetry */}
              <div className="space-y-2 rounded-xl border border-white/10 bg-black/35 p-3">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-400">WAVE COLLAPSE</span>
                  <span className="font-semibold text-white">
                    {grid.collapsedCount}/{grid.totalCells} ({progressPct}%)
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#00f0ff] to-[#ff2a85] transition-all duration-150"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                  <div>
                    <div className="text-slate-500">ENTROPY</div>
                    <div className="text-cyan-300">{remainingCells} left</div>
                  </div>
                  <div>
                    <div className="text-slate-500">BACKTRACKS</div>
                    <div className="text-pink-300">{grid.backtrackCount}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">SOLVE TIME</div>
                    <div className="text-amber-300">
                      {lastGenerationMs > 0 ? `${lastGenerationMs}ms` : 'live'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/8 pt-2 font-mono text-[10px] text-slate-400">
                  <span>Entropy Heat</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[#00f0ff]">High</span>
                    <span className="inline-block h-1.5 w-12 rounded-full bg-gradient-to-r from-[#00f0ff] to-[#ff2a85]" />
                    <span className="text-[#ff2a85]">Low</span>
                  </span>
                </div>
              </div>
            </>
          )}

          {viewMode === 'museum' && (
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-950/25 p-3 text-xs leading-relaxed text-slate-300">
              Inspecting all <span className="font-semibold text-white">8 base WFC modules</span>{' '}
              with cardinal sockets (<span className="font-mono text-[#00f0ff]">N, E, S, W</span>)
              and probabilistic weights. Orbit freely to inspect shaders and geometry.
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
