"use client";
/* eslint-disable @next/next/no-img-element */
import { ArrowRight, Camera, Check, ChevronRight, Video } from "lucide-react";

type Mode = "photo" | "video";
type Props = { allowVideo: boolean; mode: Mode | null; onMode: (m: Mode) => void; starting: boolean; error: string; onBack: () => void; onNext: () => void };

function Corner({ name, className }: { name: string; className: string }) {
  return <img src={`/references/batik-${name}.svg`} alt="" aria-hidden="true" draggable={false} className={`pointer-events-none absolute h-auto select-none ${className}`} />;
}

function Divider() {
  return (
    <div className="mx-auto flex w-full max-w-[460px] items-center gap-3 text-[#a8834a]">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#a8834a]/70" />
      <span className="text-sm">✦</span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#a8834a]/70" />
    </div>
  );
}

function Rings() {
  return (
    <svg viewBox="0 0 80 56" className="h-8 w-12" fill="none" stroke="#a8834a" strokeWidth="2.5">
      <path d="M40 3C51 17 62 29 62 52H18C18 29 29 17 40 3Z" /><path d="M40 22V52" /><path d="M40 29Q48 35 40 43Q32 35 40 29Z" fill="#a8834a" />
    </svg>
  );
}

export default function ChoiceScreen({ allowVideo, mode, onMode, starting, error, onBack, onNext }: Props) {
  const options = [
    { value: "photo" as const, Icon: Camera, title: "Foto", text: "Abadikan beberapa pose dengan bingkai pernikahan pilihan Anda" },
    ...(allowVideo ? [{ value: "video" as const, Icon: Video, title: "Video", text: "Rekam video, boomerang, atau foto live dari momen terbaik Anda" }] : []),
  ];
  return (
    <main className="relative min-h-[100svh] overflow-x-hidden overflow-y-auto bg-[#fcf4ea] text-[#3d2b1f]">
      <style>{`
@keyframes cc-sway{0%,100%{transform:rotate(0)}50%{transform:rotate(1.2deg)}}
.cc-tl{transform-origin:0 0;animation:cc-sway 9s ease-in-out infinite}
.cc-br{transform-origin:100% 100%;animation:cc-sway 11s ease-in-out infinite reverse}
@media (prefers-reduced-motion: reduce){.cc-tl,.cc-br{animation:none}}
`}</style>
      <Corner name="tl" className="cc-tl left-0 top-0 w-[62vw] max-w-[560px] sm:w-[36vw]" />
      <Corner name="tr" className="right-0 top-0 w-[44vw] max-w-[500px] sm:w-[32vw]" />
      <Corner name="bl" className="bottom-0 left-0 w-[40vw] max-w-[470px] sm:w-[30vw]" />
      <Corner name="br" className="cc-br bottom-0 right-0 w-[48vw] max-w-[400px] sm:w-[26vw]" />

      <button type="button" onClick={onBack} aria-label="Kembali" className="absolute left-4 top-[calc(16px+env(safe-area-inset-top))] z-20 grid h-10 w-10 place-items-center rounded-full border border-[#d9bf94] bg-white/90 text-[#3d2b1f] shadow-sm transition active:scale-95">←</button>

      <div className="guest-fade relative z-10 mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[148px] sm:max-w-3xl sm:px-8 sm:pt-10">
        <div className="flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-[#a8834a]/60 sm:w-24" /><Rings /><span className="h-px w-12 bg-[#a8834a]/60 sm:w-24" />
        </div>
        <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.38em] sm:text-xs">Photobooth Pawiwahan</p>
        <h1 className="mt-3 text-center font-serif text-[clamp(44px,13vw,60px)] font-medium leading-[.95] tracking-[-0.01em] sm:text-7xl">Abadikan<br />Kenangan</h1>
        <div className="mt-5"><Divider /></div>
        <p className="mx-auto mt-5 max-w-xs text-center font-serif text-base italic leading-7 sm:max-w-md sm:text-lg">Pilih cara untuk berbagi kenangan dan ucapan Anda bersama kami.</p>

        <div className={`mt-7 grid gap-3 sm:mt-9 sm:gap-5 ${options.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {options.map(({ value, Icon, title, text }) => {
            const selected = mode === value;
            return (
              <button key={value} type="button" onClick={() => onMode(value)}
                className={`relative flex items-center gap-4 rounded-[1.6rem] border p-4 text-left shadow-[0_14px_30px_-16px_rgba(61,43,31,.35)] transition active:scale-[.98] sm:p-5 ${selected ? "border-[#a8834a] bg-white ring-2 ring-[#a8834a]/40" : "border-[#d9bf94]/70 bg-[#fffaf1]/90"}`}>
                {selected && <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-[#a8834a] text-white"><Check size={14} /></span>}
                <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle,#f8ead8,#f3dfc4)] sm:h-20 sm:w-20">
                  <svg viewBox="0 0 40 12" className="absolute left-1/2 top-2 h-3 w-10 -translate-x-1/2" fill="none" stroke="#a8834a" strokeWidth="1.6" strokeLinecap="round"><path d="M8 10 5 4M20 8V1M32 10l3-6" /></svg>
                  <Icon className="mt-2 h-7 w-7 text-[#3d2b1f] sm:h-9 sm:w-9" strokeWidth={1.6} />
                </span>
                <span className="h-14 w-px shrink-0 bg-[#c9a068]/50 sm:h-16" />
                <span className="min-w-0 flex-1">
                  <strong className="block font-serif text-xl text-[#3d2b1f]">{title}</strong>
                  <small className="mt-1 block text-[13px] leading-5 text-[#6f5b4b] sm:text-sm">{text}</small>
                </span>
                <ChevronRight className="shrink-0 text-[#3d2b1f]" />
              </button>
            );
          })}
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <button type="button" disabled={!mode || starting} onClick={onNext}
          className="mx-auto mt-7 flex h-14 w-full max-w-[340px] items-center justify-center gap-2 rounded-full border border-[#d7b98a] bg-gradient-to-b from-[#7a5238] to-[#54382a] font-serif text-lg text-white shadow-[0_10px_24px_rgba(61,43,31,.28)] transition active:scale-[.97] disabled:opacity-45">
          {starting ? "Menyiapkan..." : "Lanjut"} <ArrowRight size={18} />
        </button>

        <div className="mr-auto mt-auto max-w-[56%] pt-10 text-left sm:mx-auto sm:max-w-none sm:text-center">
          <div className="hidden sm:block"><Divider /></div>
          <p className="font-serif text-sm italic sm:mt-3 sm:text-base">Matur nuwun sampun rawuh</p>
        </div>
      </div>
    </main>
  );
}
