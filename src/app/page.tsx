'use client';

import dynamic from 'next/dynamic';
import { ControlPanel } from '@/components/ui/ControlPanel';

const SceneCanvas = dynamic(
  () => import('@/components/canvas/SceneCanvas').then((mod) => mod.SceneCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00f0ff] border-t-[#ff2a85]" />
          <p className="font-mono text-xs uppercase tracking-widest text-slate-400">
            Booting ViceGrid WebGL Engine...
          </p>
        </div>
      </div>
    ),
  },
);

export default function HomePage() {
  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-slate-950">
      <SceneCanvas />
      <ControlPanel />

      <div className="pointer-events-none fixed bottom-4 right-4 z-10 hidden rounded-xl border border-white/10 bg-slate-950/65 px-3 py-1.5 font-mono text-[10px] text-slate-400 backdrop-blur-md sm:block">
        Drag to orbit · Scroll to zoom · Right-drag to pan
      </div>
    </main>
  );
}
