"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { FacingMode } from "./camera-view";

type Props = {
  onClose: () => void;
  camera: FacingMode;
  onCamera: (value: FacingMode) => void;
  mirror: boolean;
  onMirror: (value: boolean) => void;
  flash: boolean;
  onFlash: (value: boolean) => void;
  ring: boolean;
  onRing: (value: boolean) => void;
  timer: number;
  onTimer: (value: number) => void;
};

function Row({ title, children }: { title: string; children: ReactNode }) {
  return <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">{title}</p>{children}</div>;
}

function Switch({ on, onChange }: { on: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" aria-pressed={on} onClick={() => onChange(!on)} className="flex h-12 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[.06] px-4 transition active:scale-[.98]">
    <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-[#f1e6d3]" : "bg-white/20"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${on ? "left-[22px] bg-[#151413]" : "left-0.5 bg-white"}`} /></span>
    <span className="text-xs font-semibold tracking-[0.2em] text-white/75">{on ? "AKTIF" : "MATI"}</span>
  </button>;
}

const selectClass = "h-12 w-full appearance-none rounded-xl border border-white/10 bg-white/[.06] px-4 text-sm text-white outline-none [&>option]:text-black";

export default function CameraSettingsSheet(p: Props) {
  return <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/55" onClick={p.onClose}>
    <div onClick={(event) => event.stopPropagation()} className="sheet-up rounded-t-[1.75rem] border-t border-white/10 bg-[#2a1d14]/95 px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 text-white backdrop-blur-xl">
      <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-white/25" />
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-serif text-xl">Pengaturan Kamera</h2>
        <button type="button" onClick={p.onClose} aria-label="Tutup" className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5">
        <Row title="Sumber kamera">
          <select value={p.camera} onChange={(event) => p.onCamera(event.target.value as FacingMode)} className={selectClass}>
            <option value="user">Kamera Depan</option>
            <option value="environment">Kamera Belakang</option>
          </select>
        </Row>
        <Row title="Balik cermin"><Switch on={p.mirror} onChange={p.onMirror} /></Row>
        <Row title="Lampu kilat"><Switch on={p.flash} onChange={p.onFlash} /></Row>
        <Row title="Ring light"><Switch on={p.ring} onChange={p.onRing} /></Row>
        <Row title="Timer">
          <select value={p.timer} onChange={(event) => p.onTimer(Number(event.target.value))} className={selectClass}>
            <option value={0}>Tanpa timer</option>
            <option value={3}>3 detik</option>
            <option value={5}>5 detik</option>
            <option value={10}>10 detik</option>
          </select>
        </Row>
        <Row title="Kualitas"><div className="flex h-12 items-center rounded-xl border border-white/10 bg-white/[.06] px-4 text-sm text-[#f1e6d3]">Terbaik (HD)</div></Row>
      </div>
      <button type="button" onClick={p.onClose} className="mt-6 h-12 w-full rounded-full bg-[#f1e6d3] text-sm font-semibold text-[#3d2b1f] transition active:scale-[.98]">Selesai</button>
    </div>
  </div>;
}
