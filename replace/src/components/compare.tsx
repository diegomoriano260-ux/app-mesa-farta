"use client";
import { useRef, useState } from "react";

// Antes/depois: arraste a barra para comparar o original com a versão melhorada.
export function CompareSlider({ before, after, labelBefore = "Original", labelAfter = "Com IA", aspect = "9/16" }: {
  before: string; after: string; labelBefore?: string; labelAfter?: string; aspect?: string;
}) {
  const [pos, setPos] = useState(50);
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const move = (x: number) => { const r = box.current!.getBoundingClientRect(); setPos(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100))); };
  const sync = () => { if (a.current && b.current && Math.abs(a.current.currentTime - b.current.currentTime) > 0.15) b.current.currentTime = a.current.currentTime; };
  return (
    <div className="space-y-2">
      <div ref={box} className="relative mx-auto w-full max-w-sm touch-none select-none overflow-hidden rounded-2xl bg-black shadow-lg" style={{ aspectRatio: aspect }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX); }}
        onPointerMove={(e) => e.buttons === 1 && move(e.clientX)}>
        <video ref={a} src={after} muted loop playsInline autoPlay onTimeUpdate={sync} className="absolute inset-0 h-full w-full object-cover" />
        <video ref={b} src={before} muted loop playsInline autoPlay className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
        <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }}>
          <div className="absolute top-1/2 -ml-4 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xs font-bold text-ink shadow">⇆</div>
        </div>
        <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">{labelBefore}</span>
        <span className="absolute right-2 top-2 rounded bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">{labelAfter}</span>
      </div>
      <p className="text-center text-xs text-muted">Arraste a barra para comparar</p>
    </div>
  );
}
