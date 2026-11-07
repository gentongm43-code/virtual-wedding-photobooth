"use client";
/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import { ArrowRight, CalendarDays, Heart, MapPin } from "lucide-react";

type Props = { title: string; bride: string; groom: string; date: string; location?: string | null; quote: string; onStart: () => void };

const NAVY = "#3d2b1f";
const GOLD = "#a8834a";
const at = (top: number): CSSProperties => ({ position: "absolute", left: 0, right: 0, top: `${top}%`, translate: "0 -50%", textAlign: "center" });
const line = (left: number, width: number, top: number): CSSProperties => ({ position: "absolute", left: `${left}%`, width: `${width}%`, top: `${top}%`, height: 1, background: GOLD, opacity: 0.75 });
const icon = (s: number): CSSProperties => ({ width: `${s}cqw`, height: `${s}cqw`, color: GOLD });
const nameSize = (n: string) => `${Math.min(11.7, 120 / Math.max(n.length, 1))}cqw`;

export default function WelcomeCard({ title, bride, groom, date, location, quote, onStart }: Props) {
  const wrap = { aspectRatio: "2 / 3", height: "min(100svh, 150vw)", containerType: "inline-size" } as CSSProperties;
  return (
    <main className="fixed inset-0 grid place-items-center overflow-hidden bg-[#f8f1e6]">
      <img src="/references/welcome-bg.svg" alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ filter: "blur(26px)", transform: "scale(1.25)" }} />
      <Petals />
      <div className="guest-fade relative" style={wrap}>
        <img src="/references/welcome-bg.svg" alt="" className="absolute inset-0 h-full w-full select-none" style={{ WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 3%, #000 97%, transparent 100%)", maskImage: "linear-gradient(to bottom, transparent 0%, #000 3%, #000 97%, transparent 100%)" }} draggable={false} />

        <Ornaments bride={bride} groom={groom} />
        <p lang="jv" aria-hidden="true" style={{ ...at(11.6), color: GOLD, fontSize: "4.6cqw", fontFamily: "'Noto Sans Javanese', serif", letterSpacing: "0.04em" }}>ꦱꦸꦒꦼꦁꦫꦮꦸꦃ</p>
        <p className="font-serif" style={{ ...at(15.2), color: NAVY, fontSize: "2.5cqw", letterSpacing: "0.42em", textTransform: "uppercase" }}>Sugeng Rawuh</p>
        <div style={line(30.1, 13.9, 22.5)} />
        <div style={line(56.1, 14, 22.5)} />
        <svg viewBox="0 0 80 56" style={{ ...at(22.5), left: "45.5%", right: "auto", width: "9cqw" }} fill="none" stroke={GOLD} strokeWidth="2.5">
          <circle cx="30" cy="34" r="16" /><circle cx="50" cy="34" r="16" /><path d="M34 12l6-8 6 8-6 6z" />
        </svg>

        <p style={{ ...at(26.8), color: NAVY, fontSize: "2.7cqw", letterSpacing: "0.36em", textTransform: "uppercase" }}>{title}</p>
        <h1 className="font-serif" style={{ ...at(34.2), color: NAVY, fontSize: nameSize(bride), fontWeight: 500, lineHeight: 1, whiteSpace: "nowrap" }}>{bride}</h1>

        <svg viewBox="0 0 490 70" style={{ ...at(40.8), left: "26%", right: "auto", width: "47.7cqw" }} fill="none" stroke={GOLD} strokeWidth="2">
          <path d="M0 48C80 28 160 52 205 38" /><path d="M285 38C340 50 400 40 490 6" />
        </svg>
        <p className="font-serif" style={{ ...at(40.8), color: GOLD, fontSize: "9cqw", lineHeight: 1 }}>&amp;</p>

        <h2 className="font-serif" style={{ ...at(46.7), color: NAVY, fontSize: nameSize(groom), fontWeight: 500, lineHeight: 1, whiteSpace: "nowrap" }}>{groom}</h2>

        <div style={line(26.9, 20.5, 53.2)} /><div style={line(52.7, 20.5, 53.2)} />
        <p style={{ ...at(53.2), color: GOLD, fontSize: "2.6cqw", lineHeight: 1 }}>✦</p>

        <div style={{ ...at(57), display: "flex", justifyContent: "center", alignItems: "center", gap: "2.6cqw", color: NAVY, fontSize: "2.5cqw", letterSpacing: "0.26em", textTransform: "uppercase" }}>
          <CalendarDays style={icon(3.6)} /><span>{date}</span>
        </div>
        {location ? (
          <div style={{ ...at(60.5), display: "flex", justifyContent: "center", alignItems: "center", gap: "2.6cqw", color: NAVY, fontSize: "2.5cqw", letterSpacing: "0.26em", textTransform: "uppercase" }}>
            <MapPin style={icon(3.6)} /><span>{location}</span>
          </div>
        ) : null}

        <p className="font-serif" style={{ ...at(67.4), padding: "0 26cqw", color: NAVY, fontSize: "3.6cqw", fontStyle: "italic", lineHeight: 1.4 }}>“{quote}”</p>

        <button type="button" onClick={onStart} aria-label="Mulai"
          className="absolute flex items-center justify-center transition active:scale-[.97]"
          style={{ left: "20.8%", width: "58.4%", top: "73%", height: "6.5%", borderRadius: 999, border: "0.2cqw solid #d7b98a", background: "linear-gradient(#7a5238,#54382a)", boxShadow: "0 1.2cqw 2.4cqw rgba(61,43,31,.28)", color: "#fff", gap: "3cqw" }}>
          <Heart fill="currentColor" style={{ width: "3.6cqw", height: "3.6cqw" }} />
          <span style={{ width: 1, height: "4cqw", background: "rgba(255,255,255,.5)" }} />
          <span className="font-serif" style={{ fontSize: "4.4cqw", letterSpacing: "0.03em" }}>Mulai</span>
          <ArrowRight style={{ width: "4cqw", height: "4cqw", marginLeft: "2cqw" }} />
        </button>
      </div>
    </main>
  );
}

const PETALS: [number, number, number, number, string, number][] = [
  [5, 16, -3, 30, "#f3e6d3", 14], [16, 20, -11, -24, "#d8c2a0", 11], [28, 14, -7, 36, "#e8d3ad", 12],
  [41, 22, -15, -30, "#f3e6d3", 15], [55, 17, -5, 26, "#d8c2a0", 10], [67, 19, -13, -34, "#e8d3ad", 13],
  [79, 15, -9, 28, "#f3e6d3", 12], [90, 21, -1, -22, "#d8c2a0", 14],
];

function Petals() {
  return (
    <>
      <style>{`
@keyframes wc-fall{0%{transform:translate3d(0,-6vh,0) rotate(0deg)}100%{transform:translate3d(var(--dx),106vh,0) rotate(420deg)}}
@keyframes wc-twinkle{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1.25)}}
@media (prefers-reduced-motion: reduce){.wc-anim{animation:none!important}}
`}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {PETALS.map(([left, dur, delay, dx, color, size], i) => (
          <span key={i} className="wc-anim absolute block" style={{ left: `${left}%`, top: 0, width: size, height: size * 0.7, borderRadius: "100% 0 100% 0", background: color, opacity: 0.8, boxShadow: "inset 0 -2px 3px rgba(168,131,74,.25)", animation: `wc-fall ${dur}s linear ${delay}s infinite`, "--dx": `${dx}px` } as CSSProperties} />
        ))}
      </div>
    </>
  );
}

function Sprig({ flip }: { flip?: boolean }) {
  const leaves: [number, number, number][] = [[22, 48, -40], [22, 48, 20], [44, 44, -45], [44, 44, 15], [66, 36, -50], [66, 36, 10], [88, 25, -55], [88, 25, 0]];
  return (
    <svg viewBox="0 0 120 60" style={{ width: "30cqw", transform: flip ? "scaleX(-1)" : undefined }} fill="none">
      <path d="M2 50C30 48 60 40 110 14" stroke="#a89377" strokeWidth="1.4" strokeLinecap="round" />
      {leaves.map(([x, y, r], i) => (
        <path key={i} d="M0 0C6-8 16-8 22 0C16 8 6 8 0 0Z" transform={`translate(${x} ${y}) rotate(${r})`} fill={i % 2 ? "#bfae92" : "#a89377"} opacity=".8" />
      ))}
      <circle cx="110" cy="14" r="2.2" fill="#d9b983" /><circle cx="116" cy="9" r="1.5" fill="#d9b983" /><circle cx="104" cy="8" r="1.3" fill="#d9b983" />
    </svg>
  );
}

const SPARKS: [number, number, number, number][] = [[8, 20, 2.4, 0], [22, 70, 1.8, 1.2], [40, 30, 2, 0.6], [62, 62, 2.2, 1.8], [78, 24, 1.8, 0.3], [92, 66, 2.4, 1.5]];

function Sparks() {
  return (
    <>
      {SPARKS.map(([l, t, s, d], i) => (
        <span key={i} className="wc-anim" style={{ position: "absolute", left: `${l}%`, top: `${t}%`, color: GOLD, fontSize: `${s}cqw`, lineHeight: 1, animation: `wc-twinkle 3.2s ease-in-out ${d}s infinite` }}>✦</span>
      ))}
    </>
  );
}

function Ornaments({ bride, groom }: { bride: string; groom: string }) {
  const m = `${(bride[0] || "").toUpperCase()}&${(groom[0] || "").toUpperCase()}`;
  const band = (side: "top" | "bottom"): CSSProperties => ({ position: "absolute", left: 0, right: 0, height: "21cqw", pointerEvents: "none", ...(side === "top" ? { bottom: "100%" } : { top: "100%" }) });
  return (
    <>
      <div style={band("top")} aria-hidden="true">
        <Sparks />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "3cqw", display: "flex", justifyContent: "center", alignItems: "center", gap: "1cqw" }}>
          <Sprig />
          <div className="font-serif" style={{ width: "12cqw", height: "12cqw", borderRadius: "50%", display: "grid", placeItems: "center", background: "#faf4ea", color: NAVY, fontSize: "3.8cqw", letterSpacing: "0.04em", border: "0.25cqw solid #c9a068", boxShadow: "inset 0 0 0 0.8cqw #faf4ea, inset 0 0 0 0.95cqw rgba(168,131,74,.6)" }}>{m}</div>
          <Sprig flip />
        </div>
      </div>
      <div style={band("bottom")} aria-hidden="true">
        <Sparks />
        <svg viewBox="0 0 300 30" style={{ position: "absolute", left: "25%", width: "50cqw", top: "4cqw" }} fill="none" stroke={GOLD} strokeWidth="1.2">
          <path d="M142 15H20" opacity=".7" /><path d="M158 15H280" opacity=".7" />
          <path d="M60 15c8-8 20-8 28 0" /><path d="M212 15c8-8 20-8 28 0" />
          <path d="M150 7l6 8-6 8-6-8z" fill={GOLD} stroke="none" />
          <circle cx="12" cy="15" r="2" fill={GOLD} stroke="none" /><circle cx="288" cy="15" r="2" fill={GOLD} stroke="none" />
        </svg>
      </div>
    </>
  );
}
