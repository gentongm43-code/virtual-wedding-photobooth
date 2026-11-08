"use client";

export default function ZoomControl({ options, value, onChange }: { options: number[]; value: number; onChange: (value: number) => void }) {
  if (options.length < 2) return null;
  return (
    <div data-noswipe role="group" aria-label="Zoom" className="flex items-center gap-1 rounded-full bg-black/45 p-1 backdrop-blur">
      {options.map((z) => {
        const on = z === value;
        return (
          <button key={z} type="button" onClick={() => onChange(z)} aria-pressed={on} className={`grid h-8 min-w-9 place-items-center rounded-full px-2 text-[11px] font-bold transition active:scale-95 ${on ? "bg-[#dee6e2] text-[#2d3c49]" : "text-white/85"}`}>
            {z}x
          </button>
        );
      })}
    </div>
  );
}
