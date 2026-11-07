"use client";

import { useEffect, useRef } from "react";
import { PHOTO_FILTER_OPTIONS, getPhotoFilterCss, type PhotoFilter } from "@/lib/image/photo-filter";

const SAMPLE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#e9b8a6'/><stop offset='.55' stop-color='#f6e3d3'/><stop offset='1' stop-color='#9a8873'/></linearGradient></defs><rect width='100' height='100' fill='url(#g)'/><circle cx='50' cy='40' r='17' fill='#c98f78'/><path d='M18 100c4-24 20-34 32-34s28 10 32 34z' fill='#f4f0ea'/><circle cx='80' cy='18' r='9' fill='#f3d27a'/></svg>`,
  );

export default function FilterCarousel({ value, onChange }: { value: PhotoFilter; onChange: (value: PhotoFilter) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const item = box?.querySelector<HTMLElement>(`[data-f="${value}"]`);
    if (!box || !item) return;
    box.scrollTo({ left: item.offsetLeft - box.clientWidth / 2 + item.offsetWidth / 2, behavior: "smooth" });
  }, [value]);

  return (
    <div data-noswipe>
      <div ref={boxRef} className="relative flex snap-x items-end gap-2 overflow-x-auto px-[calc(50%-32px)] py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PHOTO_FILTER_OPTIONS.map((option) => {
          const on = value === option.value;
          return (
            <button key={option.value} type="button" data-f={option.value} onClick={() => onChange(option.value)} aria-label={`Filter ${option.label}`} aria-pressed={on} className="flex w-16 shrink-0 snap-center flex-col items-center gap-1 transition active:scale-95">
              <span className={`block overflow-hidden rounded-full transition-all duration-300 ${on ? "h-14 w-14 ring-[3px] ring-[#f1e6d3] ring-offset-2 ring-offset-black/50" : "h-11 w-11 opacity-90 ring-1 ring-white/50"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SAMPLE} alt="" draggable={false} className="h-full w-full object-cover" style={{ filter: getPhotoFilterCss(option.value) }} />
              </span>
              <span className={`text-[10px] font-semibold tracking-wide drop-shadow ${on ? "text-[#f1e6d3]" : "text-white/75"}`}>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
