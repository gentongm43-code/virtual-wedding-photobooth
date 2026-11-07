"use client";
import { ArrowRight, Camera, Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { RefObject, UIEvent } from "react";
import { PhotoPreview, type PreviewTemplate } from "./photo-preview";
import { Corners, GoldDivider, GuestHeader, Stepper } from "./guest-chrome";

type Props = {
  frames: PreviewTemplate[];
  selectedId?: string | null;
  carouselRef: RefObject<HTMLDivElement | null>;
  onSelect: (id: string) => void;
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  sampleUrl: string;
  eventName: string;
  eventDate: string;
  location?: string | null;
  onBack: () => void;
  onNext: () => void;
};

export default function FrameScreen({ frames, selectedId, carouselRef, onSelect, onScroll, sampleUrl, eventName, eventDate, location, onBack, onNext }: Props) {
  const selected = frames.find((f) => f.id === selectedId) ?? frames[0] ?? null;
  const index = Math.max(0, frames.findIndex((f) => f.id === selectedId));
  const go = (d: number) => { const t = frames[index + d]; if (t) onSelect(t.id); };
  const poses = selected?.textConfig?.photoSlots?.length ?? 1;
  const arrow = "absolute top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-[#d9bf94] bg-white text-[#3d2b1f] shadow-md transition active:scale-95 disabled:opacity-40";
  return (
    <main className="relative min-h-[100svh] min-h-[100dvh] overflow-x-clip bg-[#fcf4ea] px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))] text-[#3d2b1f] sm:px-6 sm:pt-8">
      <Corners />
      <div className="guest-fade relative z-10 mx-auto flex max-w-lg flex-col">
        <GuestHeader />
        <div className="mt-5"><Stepper current={1} /></div>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-5xl leading-none sm:text-6xl">Foto</h1>
            <p className="mt-2 font-serif text-base italic leading-6">Pilih bingkai foto pilihan Anda.</p>
          </div>
          <button type="button" onClick={onBack} aria-label="Kembali ke pilihan media" className="mb-1 inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-[#d9bf94] bg-white/90 px-3 text-xs font-semibold shadow-sm transition active:scale-95"><ChevronLeft size={14} /> Kembali</button>
        </div>

        <section className="relative mt-5 rounded-[1.5rem] border border-[#dcc39a] bg-white/90 py-4 shadow-[0_18px_40px_-22px_rgba(61,43,31,.35)] sm:py-5">
          <div ref={carouselRef} onScroll={onScroll} className="flex snap-x snap-mandatory items-center gap-3 overflow-x-auto px-[calc((100%-190px)/2)] pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Pilihan frame photo booth">
            {frames.length ? frames.map((frame) => (
              <button type="button" key={frame.id} data-frame-id={frame.id} onClick={() => onSelect(frame.id)} style={{ width: Math.min(190, Math.round(230 * frame.width / frame.height) + 16) }}
                className={`shrink-0 snap-center rounded-[1rem] border-2 bg-[#fcf6ec] p-2 text-left transition-transform duration-200 active:scale-[.98] ${selectedId === frame.id ? "scale-100 border-[#a8834a] shadow-lg shadow-[#a8834a]/25" : "scale-90 border-[#e3d6c0] opacity-70"}`}>
                <PhotoPreview photoUrl={sampleUrl} template={frame} eventName={eventName} eventDate={eventDate} location={location} />
                <span className="mt-2 block truncate text-center font-serif text-sm font-medium">{frame.name}</span>
              </button>
            )) : <p className="px-5 text-sm text-[#7b6556]">Frame standar wedding akan digunakan.</p>}
          </div>
          {frames.length > 1 && (
            <>
              <button type="button" aria-label="Bingkai sebelumnya" disabled={index <= 0} onClick={() => go(-1)} className={`${arrow} left-2`}><ChevronLeft size={20} /></button>
              <button type="button" aria-label="Bingkai berikutnya" disabled={index >= frames.length - 1} onClick={() => go(1)} className={`${arrow} right-2`}><ChevronRight size={20} /></button>
            </>
          )}
        </section>

        {frames.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {frames.map((frame) => <button type="button" key={frame.id} onClick={() => onSelect(frame.id)} aria-label={`Pilih frame ${frame.name}`} className={`h-2 w-2 rounded-full transition ${selectedId === frame.id ? "bg-[#3d2b1f] ring-2 ring-[#a8834a]/30" : "bg-[#dccdb2]"}`} />)}
          </div>
        )}

        <div className="mt-5"><GoldDivider /></div>
        <div className="mt-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#a8834a]">Frame pilihan</p>
          <h2 className="mt-1 font-serif text-3xl leading-tight">{selected?.name ?? "Warm Editorial"}</h2>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#f1e6d3] py-1 pl-1 pr-4 text-sm font-semibold"><span className="grid h-6 w-6 place-items-center rounded-full bg-white"><Check size={14} /></span>Dipilih</div>
          <p className="mt-2 font-serif text-sm">{`${poses} pose foto pada bingkai ini`}</p>
        </div>

        <button type="button" onClick={onNext} className="sticky bottom-[calc(12px+env(safe-area-inset-bottom))] z-20 mx-auto mt-5 flex h-14 w-full max-w-[420px] items-center justify-center gap-2 rounded-full border border-[#d7b98a] bg-gradient-to-b from-[#7a5238] to-[#54382a] font-serif text-lg text-white shadow-[0_10px_24px_rgba(61,43,31,.3)] transition active:scale-[.97]"><Camera size={18} /> Lanjut ke kamera <ArrowRight size={18} /></button>
      </div>
    </main>
  );
}
