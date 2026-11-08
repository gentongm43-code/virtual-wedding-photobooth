"use client";
/* eslint-disable @next/next/no-img-element */
import { Fragment } from "react";

export function Corners() {
  const c = (name: string, cls: string) => <img key={name} src={`/references/batik-${name}.svg`} alt="" aria-hidden="true" draggable={false} className={`pointer-events-none absolute h-auto select-none ${cls}`} />;
  return (
    <>
      {c("tl", "left-0 top-0 w-[42vw] max-w-[380px]")}
      {c("tr", "right-0 top-0 w-[30vw] max-w-[280px]")}
      {c("bl", "bottom-0 left-0 w-[30vw] max-w-[260px]")}
      {c("br", "bottom-0 right-0 w-[38vw] max-w-[320px]")}
    </>
  );
}

export function Rings() {
  return (
    <svg viewBox="0 0 80 56" className="h-8 w-12" fill="none" stroke="#6f93ac" strokeWidth="2.5">
      <path d="M40 3C51 17 62 29 62 52H18C18 29 29 17 40 3Z" /><path d="M40 22V52" /><path d="M40 29Q48 35 40 43Q32 35 40 29Z" fill="#6f93ac" />
    </svg>
  );
}

export function GuestHeader() {
  return (
    <div>
      <div className="flex items-center justify-center gap-3">
        <span className="h-px w-14 bg-[#6f93ac]/50 sm:w-28" /><Rings /><span className="h-px w-14 bg-[#6f93ac]/50 sm:w-28" />
      </div>
      <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-[0.34em] text-[#2d3c49] sm:text-xs">Photobooth Pawiwahan</p>
    </div>
  );
}

export function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Langkah ${current} dari 3`}>
      {[1, 2, 3].map((n, i) => (
        <Fragment key={n}>
          {i > 0 && <span className="h-px flex-1 bg-[#6f93ac]/55" />}
          <span className={`grid h-9 w-9 place-items-center rounded-full border text-sm font-semibold ${n === current ? "border-[#2d3c49] bg-[#2d3c49] text-white shadow-sm" : n < current ? "border-[#2d3c49] bg-[#dee6e2] text-[#2d3c49]" : "border-[#97b1c3] bg-[#f1f5f3] text-[#2d3c49]"}`}>{n}</span>
        </Fragment>
      ))}
    </div>
  );
}

export function GoldDivider() {
  return (
    <div className="mx-auto flex w-full max-w-[460px] items-center gap-3 text-[#6f93ac]">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#6f93ac]/70" />
      <span className="text-sm">✦</span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#6f93ac]/70" />
    </div>
  );
}
