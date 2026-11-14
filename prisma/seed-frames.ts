// Frame photobooth baru (5 desain orisinal). Jalankan: npx tsx prisma/seed-frames.ts
import fs from "node:fs";
import path from "node:path";

type Slot = { x: number; y: number; width: number; height: number };
type Txt = { text: string; x: number; y: number; align?: "left" | "center" | "right"; fontSize?: number; color?: string };

let seed = 11;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const n = (v: number) => Math.round(v * 10) / 10;
const at = (x: number, y: number, rot = 0, s = 1) => `translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${s})`;
const G = (t: string, b: string) => `<g transform="${t}">${b}</g>`;
const GOLD = "#c9a24f";

const DEFS = `<defs>
<radialGradient id="pr" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#f1e8de"/><stop offset="1" stop-color="#c4b3a0"/></radialGradient>
<linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e2a3"/><stop offset=".5" stop-color="#c99b3f"/><stop offset="1" stop-color="#f1d98f"/></linearGradient>
<radialGradient id="sb" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#f26a62"/><stop offset="1" stop-color="#b3141f"/></radialGradient>
<radialGradient id="ch" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#e8434f"/><stop offset="1" stop-color="#7c0f1c"/></radialGradient>
<filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
<pattern id="lace" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="8" fill="none" stroke="#e8cfc4" stroke-width="2"/><circle cx="0" cy="0" r="4" fill="#ecd6cb"/><circle cx="26" cy="26" r="4" fill="#ecd6cb"/></pattern>
<pattern id="dia" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M17 3L31 17L17 31L3 17Z" fill="none" stroke="#b9c9e6" stroke-width="1.6"/><circle cx="17" cy="17" r="2.2" fill="#b9c9e6"/></pattern>
</defs>`;
const doc = (w: number, h: number, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${DEFS}${body}</svg>`;
const b64 = (s: string) => `data:image/svg+xml;base64,${Buffer.from(s).toString("base64")}`;

// ---------- elemen dasar ----------
const scallop = (x: number, y: number, w: number, h: number, r: number) => {
  const nx = Math.round(w / (2 * r)), ny = Math.round(h / (2 * r)), rx = w / (2 * nx), ry = h / (2 * ny);
  let d = `M${x} ${y}`;
  for (let i = 0; i < nx; i++) d += `a${n(rx)} ${n(rx)} 0 0 1 ${n(2 * rx)} 0`;
  for (let i = 0; i < ny; i++) d += `a${n(ry)} ${n(ry)} 0 0 1 0 ${n(2 * ry)}`;
  for (let i = 0; i < nx; i++) d += `a${n(rx)} ${n(rx)} 0 0 1 ${n(-2 * rx)} 0`;
  for (let i = 0; i < ny; i++) d += `a${n(ry)} ${n(ry)} 0 0 1 0 ${n(-2 * ry)}`;
  return d + "Z";
};
const leaf = (x: number, y: number, len: number, rot: number, c = "#5f8a4e", v = "#9cc08a", o = 1) =>
  G(at(x, y, rot), `<path d="M0 0C${n(len * .3)} ${n(-len * .3)} ${n(len * .75)} ${n(-len * .22)} ${len} 0C${n(len * .75)} ${n(len * .22)} ${n(len * .3)} ${n(len * .3)} 0 0Z" fill="${c}" opacity="${o}"/><path d="M${n(len * .06)} 0H${n(len * .9)}" stroke="${v}" stroke-width="${n(Math.max(1, len / 36))}" fill="none" opacity="${o}"/>`);
const pearl = (x: number, y: number, r: number) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="url(#pr)" stroke="#bfae9b" stroke-width=".8"/>`;
const bez = (p: number[], t: number): [number, number] => {
  const u = 1 - t;
  return [u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6], u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7]];
};
const pearls = (p: number[], count: number, r: number) => Array.from({ length: count }, (_, i) => { const [x, y] = bez(p, i / (count - 1)); return pearl(x, y, r); }).join("");
const rose = (x: number, y: number, r: number, rot: number, p: string[]) => {
  let s = "";
  for (let i = 0; i < 6; i++) s += `<ellipse cy="${n(-r * .52)}" rx="${n(r * .46)}" ry="${n(r * .5)}" fill="${p[0]}" stroke="${p[3]}" stroke-width="${n(r * .03)}" transform="rotate(${i * 60})"/>`;
  for (let i = 0; i < 5; i++) s += `<ellipse cy="${n(-r * .34)}" rx="${n(r * .34)}" ry="${n(r * .36)}" fill="${p[1]}" stroke="${p[3]}" stroke-width="${n(r * .03)}" transform="rotate(${i * 72 + 20})"/>`;
  s += `<circle r="${n(r * .27)}" fill="${p[2]}" stroke="${p[3]}" stroke-width="${n(r * .03)}"/><path d="M${n(-r * .16)} ${n(r * .03)}A${n(r * .17)} ${n(r * .17)} 0 1 1 ${n(r * .1)} ${n(-r * .1)}A${n(r * .09)} ${n(r * .09)} 0 1 1 ${n(-r * .03)} ${n(r * .02)}" fill="none" stroke="${p[3]}" stroke-width="${n(r * .035)}" stroke-linecap="round"/>`;
  return G(at(x, y, rot), s);
};
const peony = (x: number, y: number, r: number, rot: number, p: string[], o = 1) => {
  let s = "";
  [[8, .62, .52, 0], [7, .46, .42, 20], [6, .32, .32, 8], [5, .18, .2, 30]].forEach(([k, d, pr, a], ring) => {
    for (let i = 0; i < k; i++) s += `<ellipse cy="${n(-r * d)}" rx="${n(r * pr * .78)}" ry="${n(r * pr)}" fill="${p[Math.min(ring, 2)]}" stroke="${p[3]}" stroke-width="${n(r * .02)}" transform="rotate(${n(i * (360 / k) + a)})"/>`;
  });
  s += `<circle r="${n(r * .09)}" fill="${p[2]}" stroke="${p[3]}" stroke-width="${n(r * .02)}"/>`;
  return `<g opacity="${o}">${G(at(x, y, rot), s)}</g>`;
};
const daisy = (x: number, y: number, r: number, rot = 0) => {
  let s = "";
  for (let i = 0; i < 8; i++) s += `<ellipse cy="${n(-r * .6)}" rx="${n(r * .24)}" ry="${n(r * .5)}" fill="#fffdf7" stroke="#e5d8c3" stroke-width="1" transform="rotate(${i * 45})"/>`;
  return G(at(x, y, rot), s + `<circle r="${n(r * .24)}" fill="#f1b53a"/>`);
};
const strawberry = (x: number, y: number, s: number, rot: number) => {
  let seeds = "";
  for (let i = 0; i < 14; i++) seeds += `<ellipse cx="${n((rnd() - .5) * 44)}" cy="${n(-14 + rnd() * 52)}" rx="1.6" ry="2.6" fill="#f7dd8d"/>`;
  return G(at(x, y, rot, s), `<path d="M0 -30C32 -36 44 -6 22 28C12 46 -12 46 -22 28C-44 -6 -32 -36 0 -30Z" fill="url(#sb)"/>${seeds}${leaf(0, -30, 26, -150, "#4d7f3d")}${leaf(0, -30, 26, -30, "#4d7f3d")}${leaf(0, -30, 24, -90, "#5f9248")}`);
};
const cherries = (x: number, y: number, s: number, rot = 0) => G(at(x, y, rot, s),
  `<path d="M-16 8Q-14 -22 2 -42M16 14Q14 -20 2 -42" fill="none" stroke="#6a8a38" stroke-width="2.6"/>${leaf(2, -42, 34, -20, "#52803f")}<circle cx="-16" cy="24" r="17" fill="url(#ch)"/><circle cx="17" cy="30" r="17" fill="url(#ch)"/><ellipse cx="-21" cy="17" rx="4" ry="2.6" fill="#fff" opacity=".7"/><ellipse cx="12" cy="23" rx="4" ry="2.6" fill="#fff" opacity=".7"/>`);
const ribbon = (d: string, w: number, c = "#eca2b5", e = "#d4748e", h = "#ffe6ec") =>
  `<path d="${d}" fill="none" stroke="${e}" stroke-width="${w + 5}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${h}" stroke-opacity=".65" stroke-width="${n(w * .2)}" stroke-linecap="round" transform="translate(${n(-w * .16)} ${n(-w * .05)})"/>`;
const bow = (x: number, y: number, s: number, c = "#f2a6ba", e = "#cf6f8a", h = "#ffdce5") => G(at(x, y, 0, s),
  [1, -1].map((m) => `<g transform="scale(${m} 1)"><path d="M0 0C-50 -90 -200 -100 -215 -30C-225 40 -90 34 0 0Z" fill="${c}" stroke="${e}" stroke-width="4"/><path d="M-20 -6C-70 -60 -150 -70 -190 -34" fill="none" stroke="${h}" stroke-width="9" stroke-linecap="round" opacity=".7"/><path d="M0 6C-60 40 -110 120 -100 170L-60 150L-52 190C-30 120 -10 60 0 6Z" fill="${c}" stroke="${e}" stroke-width="4" stroke-linejoin="round"/></g>`).join("") +
  `<ellipse rx="34" ry="30" fill="${c}" stroke="${e}" stroke-width="4"/><path d="M-14 -14C0 -4 0 8 -14 16" fill="none" stroke="${h}" stroke-width="5" opacity=".7"/>`);
const shell = (x: number, y: number, s: number) => G(at(x, y, 0, s),
  Array.from({ length: 7 }, (_, i) => `<ellipse cy="-58" rx="${i === 3 ? 26 : 23}" ry="${i === 3 ? 60 : 54}" fill="url(#gd)" stroke="#a97c2c" stroke-width="2.4" transform="rotate(${(i - 3) * 22} 0 0)"/>`).join("") + `<circle r="14" fill="url(#gd)" stroke="#a97c2c" stroke-width="2.4"/>`);
const flourish = (x: number, y: number, s: number, c = GOLD) => G(at(x, y, 0, s),
  [1, -1].map((m) => `<g transform="scale(${m} 1)" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"><path d="M12 0C40 -26 90 -26 112 -6C130 10 112 34 92 26C78 20 82 4 96 8"/><path d="M12 0C44 18 96 22 150 4C190 -10 214 -2 232 14"/></g>`).join("") + `<path d="M0 -12L12 0L0 12L-12 0Z" fill="${c}"/>`);
const spark = (x: number, y: number, r: number, c = "#fff", o = .9) => `<path d="M${x} ${n(y - r)}Q${x} ${y} ${n(x + r)} ${y}Q${x} ${y} ${x} ${n(y + r)}Q${x} ${y} ${n(x - r)} ${y}Q${x} ${y} ${x} ${n(y - r)}Z" fill="${c}" opacity="${o}"/>`;
const hydrangea = (x: number, y: number, r: number, p = ["#8fb0e0", "#6f95d2", "#b5ccec", "#5b7fc0"]) => {
  let s = "";
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a = i * 2.39996, d = r * Math.sqrt((i + .5) / N), fr = r * .22, c = p[i % 3];
    s += G(at(Math.cos(a) * d, Math.sin(a) * d, i * 31), [0, 90, 180, 270].map((k) => `<circle cx="${n(fr * .5 * Math.cos((k * Math.PI) / 180))}" cy="${n(fr * .5 * Math.sin((k * Math.PI) / 180))}" r="${n(fr * .52)}" fill="${c}" stroke="${p[3]}" stroke-width=".9"/>`).join("") + `<circle r="${n(fr * .17)}" fill="#fff"/>`);
  }
  return G(at(x, y), s);
};
const lily = (x: number, y: number, len: number, rot: number) => {
  const pts = [0, 0, len * .1, -len * .6, len * .7, -len * .75, len * .9, -len * .2];
  const [ex, ey] = bez(pts, 1);
  return G(at(x, y, rot), `<path d="M${pts[0]} ${pts[1]}C${pts[2]} ${pts[3]} ${pts[4]} ${pts[5]} ${pts[6]} ${pts[7]}" fill="none" stroke="#5e8a4a" stroke-width="3"/>` +
    Array.from({ length: 6 }, (_, i) => { const [px, py] = bez(pts, .35 + i * .12); return `<path d="M${n(px)} ${n(py)}l0 8" stroke="#5e8a4a" stroke-width="2"/>${pearl(px, py + 15, 9)}`; }).join("") + leaf(len * .05, -len * .1, len * .35, -100, "#6a9455") + leaf(len * .05, -len * .1, len * .3, -40, "#4f7c43") + `<circle cx="${n(ex)}" cy="${n(ey)}" r="2" fill="#5e8a4a"/>`);
};
const dove = (x: number, y: number, s: number, flip = false, c = "#4a6fb0") => G(`${at(x, y, 0, s)}${flip ? " scale(-1 1)" : ""}`,
  `<path d="M-14 -10C-40 -70 -90 -92 -128 -78C-104 -64 -96 -44 -88 -26C-74 4 -40 10 -14 -10Z" fill="#fbfbff" stroke="${c}" stroke-width="3.5"/><path d="M-34 -30C-56 -52 -80 -62 -104 -62M-30 -14C-52 -34 -76 -42 -96 -44" fill="none" stroke="${c}" stroke-width="2.2" opacity=".7"/><path d="M-60 24C-30 4 0 -8 30 -18C48 -26 64 -18 58 -6C54 4 42 8 24 14C-4 26 -34 34 -76 36C-70 32 -64 28 -60 24Z" fill="#fbfbff" stroke="${c}" stroke-width="3.5" stroke-linejoin="round"/><path d="M56 -14L84 -10L58 -4Z" fill="#e3b24a" stroke="${c}" stroke-width="2"/><circle cx="46" cy="-14" r="3" fill="${c}"/><path d="M-70 34C-90 44 -110 60 -126 72C-96 70 -72 56 -52 38Z" fill="#fbfbff" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>`);
const forgetmenot = (x: number, y: number, r: number, c = "#7ea3dc") => G(at(x, y), Array.from({ length: 5 }, (_, i) => `<circle cx="${n(Math.cos((i * 72 * Math.PI) / 180) * r * .62)}" cy="${n(Math.sin((i * 72 * Math.PI) / 180) * r * .62)}" r="${n(r * .46)}" fill="${c}" stroke="#4d71b3" stroke-width=".9"/>`).join("") + `<circle r="${n(r * .24)}" fill="#f6e3a0"/>`);
const def = (id: string, content: string) => `<defs><g id="${id}">${content}</g></defs>`;
const use = (id: string, x: number, y: number, flip = false, s = 1, rot = 0) => `<use href="#${id}" xlink:href="#${id}" transform="translate(${x} ${y}) rotate(${rot}) scale(${flip ? -s : s} ${s})"/>`;

// ---------- FRAME A: Pink Romantis ----------
const pinkContent = () => (
  [leaf(-30, 10, 90, -140), leaf(10, -20, 80, -70), leaf(40, 30, 90, 20), leaf(-60, 50, 80, 150), rose(0, 0, 78, 8, ["#f4b0ac", "#f7c6c0", "#fbdcd6", "#cf7f84"]), rose(-72, 40, 58, -20, ["#c32c3a", "#d9475a", "#a81c2c", "#6e1020"]), rose(66, 54, 52, 30, ["#f4b0ac", "#f7c6c0", "#fbdcd6", "#cf7f84"]),
    daisy(-110, -6, 22), daisy(30, -70, 20, 20), daisy(92, 10, 18), strawberry(-24, 98, .95, 12), strawberry(-118, 74, .8, -24), cherries(112, 74, .8, -8), pearl(-8, 130, 9), pearl(14, 140, 8), pearl(-34, 138, 8)].join(""));
const pinkCluster = (x: number, y: number, flip: boolean, big = 1) => use("pc", x, y, flip, big);
const frameA = () => {
  const bg = doc(1080, 1940,
    `<rect width="1080" height="1940" fill="#fbf6ec"/><rect y="1800" width="1080" height="140" fill="#f1e6d3"/>` +
    `<path d="${scallop(44, 28, 992, 1760, 24)}" fill="#fbead3" stroke="${GOLD}" stroke-width="4"/>` +
    `<rect x="72" y="56" width="936" height="1704" rx="18" fill="url(#lace)" stroke="#e2c9b5" stroke-width="2"/>` +
    `<rect x="162" y="228" width="756" height="1090" rx="18" fill="#f9e3df" stroke="${GOLD}" stroke-width="6"/><rect x="174" y="240" width="732" height="1066" rx="12" fill="none" stroke="${GOLD}" stroke-width="2"/>` +
    `<rect x="420" y="1360" width="240" height="40" fill="#fbead3"/>` +
    `<rect x="236" y="1368" width="608" height="296" rx="140" fill="#fff6e4" stroke="${GOLD}" stroke-width="9"/><rect x="254" y="1386" width="572" height="260" rx="124" fill="none" stroke="${GOLD}" stroke-width="2.5"/>` + flourish(540, 1628, .6));
  const ov = doc(1080, 1940, def("pc", pinkContent()) +
    ribbon("M118 250C46 400 190 520 110 690S60 880 132 1010", 42) + ribbon("M962 250C1034 400 890 520 970 690S1020 880 948 1010", 42) +
    pearls([160, 260, 90, 420, 200, 560, 150, 760], 16, 9) + pearls([920, 260, 990, 420, 880, 560, 930, 760], 16, 9) +
    [0, 1].map((i) => { const y = 262 + i * 526; return `<rect x="191" y="${y}" width="698" height="496" rx="6" fill="none" stroke="${GOLD}" stroke-width="12"/><rect x="198" y="${y + 7}" width="684" height="482" rx="3" fill="none" stroke="#fff3d6" stroke-width="2.5"/>`; }).join("") +
    ribbon("M300 235C230 160 400 130 540 205C680 130 850 160 780 235", 26) + pearls([360, 232, 440, 262, 640, 262, 720, 232], 13, 8) + bow(540, 118, .95) + shell(540, 178, .9) +
    pinkCluster(205, 742, false, .85) + pinkCluster(875, 742, true, .8) + pinkCluster(205, 1268, false, .85) + pinkCluster(875, 1268, true, .85) +
    pinkCluster(200, 1650, false, .95) + pinkCluster(880, 1650, true, .95) +
    ribbon("M240 1740C340 1690 420 1740 540 1706C660 1740 740 1690 840 1740", 24) + spark(120, 200, 16, "#fff4c8") + spark(960, 230, 12, "#fff4c8"));
  return {
    id: "frame-pink-romantis", name: "Pink Romantis · 2 Foto", width: 1080, height: 1940, bg, ov,
    slots: [{ x: 191, y: 262, width: 698, height: 496 }, { x: 191, y: 788, width: 698, height: 496 }],
    texts: [
      { text: "FOREVER", x: 540, y: 1500, fontSize: 60, color: "#b8863a" }, { text: "BEGINS HERE", x: 540, y: 1572, fontSize: 60, color: "#b8863a" },
      { text: "{{eventName}}", x: 540, y: 1862, fontSize: 46, color: "#8a6a2e" }, { text: "{{eventDate}}", x: 540, y: 1912, fontSize: 32, color: "#8a6a2e" },
    ] as Txt[],
  };
};

// ---------- FRAME B: Biru Floral ----------
const blueContent = () => (
  [lily(-10, 40, 190, -95), lily(20, 50, 170, -60), leaf(-40, 10, 80, -150, "#5f8a4e"), leaf(30, 20, 90, 25, "#4f7c43"), leaf(-70, 60, 80, 160, "#6a9455"),
    hydrangea(0, 0, 70), hydrangea(-78, 44, 52, ["#b5ccec", "#8fb0e0", "#dce7f6", "#5b7fc0"]), hydrangea(70, 52, 50), forgetmenot(-120, -6, 20), forgetmenot(34, -78, 18), forgetmenot(100, 8, 17), pearl(-6, 120, 10), pearl(18, 132, 9), pearl(-32, 130, 8)].join(""));
const blueCluster = (x: number, y: number, flip: boolean, big = 1) => use("bc", x, y, flip, big);
const blueRibbon = (d: string, w: number) => ribbon(d, w, "#8fb0e0", "#4a6fb0", "#dce8fa");
const frameB = () => {
  const bg = doc(1080, 1940,
    `<rect width="1080" height="1940" fill="#f6f5ee"/><rect y="1800" width="1080" height="140" fill="#f3f1ea"/>` +
    `<path d="${scallop(30, 20, 1020, 1770, 24)}" fill="#fdfcf6" stroke="#4a6fb0" stroke-width="6"/><path d="${scallop(46, 36, 988, 1738, 24)}" fill="none" stroke="#9db8e2" stroke-width="2"/>` +
    `<rect x="76" y="64" width="928" height="1690" rx="18" fill="url(#dia)" opacity=".55"/>` +
    `<rect x="162" y="228" width="756" height="1090" rx="14" fill="#fdfcf6" stroke="#4a6fb0" stroke-width="6"/><rect x="174" y="240" width="732" height="1066" rx="10" fill="none" stroke="#9db8e2" stroke-width="2.5"/>` +
    `<rect x="236" y="1368" width="608" height="296" rx="140" fill="#fdfcf6" stroke="#4a6fb0" stroke-width="8"/><rect x="254" y="1386" width="572" height="260" rx="124" fill="none" stroke="#9db8e2" stroke-width="2.5"/>` + flourish(540, 1628, .6, "#4a6fb0"));
  const ov = doc(1080, 1940, def("bc", blueContent()) +
    [0, 1].map((i) => { const y = 262 + i * 526; return `<rect x="191" y="${y}" width="698" height="496" rx="6" fill="none" stroke="#4a6fb0" stroke-width="12"/><rect x="198" y="${y + 7}" width="684" height="482" rx="3" fill="none" stroke="#dce8fa" stroke-width="2.5"/>`; }).join("") +
    blueRibbon("M300 235C230 160 400 130 540 205C680 130 850 160 780 235", 24) + bow(540, 118, .9, "#8fb0e0", "#4a6fb0", "#dce8fa") +
    blueCluster(215, 275, false, .7) + blueCluster(865, 275, true, .7) + dove(190, 130, .5) + dove(890, 130, .5, true) +
    blueCluster(205, 742, false, .8) + blueCluster(875, 742, true, .8) + blueCluster(205, 1268, false, .85) + blueCluster(875, 1268, true, .85) +
    blueCluster(200, 1650, false, .95) + blueCluster(880, 1650, true, .95) + bow(540, 1735, .45, "#8fb0e0", "#4a6fb0", "#dce8fa"));
  return {
    id: "frame-biru-floral", name: "Biru Floral · 2 Foto", width: 1080, height: 1940, bg, ov,
    slots: [{ x: 191, y: 262, width: 698, height: 496 }, { x: 191, y: 788, width: 698, height: 496 }],
    texts: [
      { text: "OUR BLUE", x: 540, y: 1500, fontSize: 60, color: "#3f5f9f" }, { text: "FOREVER", x: 540, y: 1572, fontSize: 60, color: "#3f5f9f" },
      { text: "{{eventName}}", x: 540, y: 1862, fontSize: 46, color: "#3f5f9f" }, { text: "{{eventDate}}", x: 540, y: 1912, fontSize: 32, color: "#3f5f9f" },
    ] as Txt[],
  };
};

// ---------- FRAME C: Burgundy 3 Foto (landscape 6x4) ----------
const creamP = ["#efe0cd", "#f6ecdd", "#fffaf0", "#cdb59b"];
const sprigContent = (o = .95) => (
  `<g opacity="${o}">${leaf(0, 0, 150, -20, "#e8dcc6", "#cdb9a0")}${leaf(10, 0, 130, 30, "#efe5d2", "#cdb9a0")}${leaf(-10, 10, 120, -70, "#e3d5bd", "#cdb9a0")}${leaf(0, 0, 110, 70, "#e8dcc6", "#cdb9a0")}</g>${peony(10, 0, 62, 0, creamP)}${peony(-70, 60, 40, 30, creamP)}${peony(84, 56, 34, -20, creamP, .95)}`);
const sprig = (x: number, y: number, rot: number, s = 1) => use("sp", x, y, false, s, rot);
const frameC = () => {
  const W = 1500, H = 1000, sl: Slot[] = [0, 1, 2].map((i) => ({ x: 60 + i * 470, y: 70, width: 440, height: 640 }));
  const bg = doc(W, H, `<rect width="${W}" height="${H}" fill="#8e3d55"/><rect width="${W}" height="${H}" fill="#a04b66" opacity=".35"/><rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="#e8cfbf" stroke-width="2" opacity=".7"/>` +
    `<path d="M60 748H1440" stroke="#e8cfbf" stroke-width="1.6" opacity=".6"/>` + spark(120, 840, 14, "#f3dcc9", .8) + spark(1380, 840, 14, "#f3dcc9", .8));
  const ov = doc(W, H, def("sp", sprigContent()) + sl.map((s) => `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="none" stroke="#8e3d55" stroke-width="12"/><rect x="${s.x + 4}" y="${s.y + 4}" width="${s.width - 8}" height="${s.height - 8}" fill="none" stroke="#e8cfbf" stroke-width="2"/>`).join("") +
    sprig(110, 130, 30, 1.5) + G("translate(1500 0) scale(-1 1)", sprig(110, 130, 30, 1.5)) +
    sprig(30, 1000, -35, .85) + G("translate(1500 0) scale(-1 1)", sprig(30, 1000, -35, .85)));
  return { id: "frame-burgundy-3foto", name: "Burgundy Floral · 3 Foto", width: W, height: H, bg, ov, slots: sl,
    texts: [
      { text: "The Wedding Of", x: 750, y: 792, fontSize: 40, color: "#f3dcc9" }, { text: "{{eventName}}", x: 750, y: 880, fontSize: 84, color: "#fff3e4" },
      { text: "{{location}}", x: 210, y: 945, align: "left", fontSize: 38, color: "#f3dcc9" }, { text: "{{eventDate}}", x: 1290, y: 945, align: "right", fontSize: 38, color: "#f3dcc9" },
    ] as Txt[] };
};

// ---------- FRAME D: Blush Blue Garden (portrait 4x6) ----------
const gardenContent = () => (
  [leaf(-20, 0, 150, -130, "#7fa8a0", "#b9d3cd"), leaf(0, 20, 150, 10, "#8fb4b0", "#b9d3cd"), leaf(-60, 40, 130, 150, "#7fa8a0", "#b9d3cd"), leaf(20, -10, 130, -60, "#9ec0bb", "#cfe2de"),
    hydrangea(-60, -20, 60, ["#9bb7d6", "#bdd0e6", "#7e9fca", "#5d7fae"]), peony(30, 10, 78, 10, ["#f4b3b8", "#f8cdd0", "#fde6e4", "#d98c94"]), peony(-30, 78, 54, -20, ["#f7c8c8", "#fbdcdc", "#fff0ee", "#e0a0a6"]), hydrangea(80, 70, 40), forgetmenot(-110, 50, 18, "#8fb0e0"), forgetmenot(90, -40, 16, "#8fb0e0")].join(""));
const gardenCluster = (x: number, y: number, rot: number, s: number) => use("gc", x, y, false, s, rot);
const frameD = () => {
  const W = 1080, H = 1620, sl: Slot = { x: 140, y: 130, width: 800, height: 1120 };
  const bokeh = Array.from({ length: 16 }, () => `<circle cx="${n(rnd() * W)}" cy="${n(rnd() * H)}" r="${n(30 + rnd() * 60)}" fill="#fff" opacity="${n(.25 + rnd() * .3)}" filter="url(#bl)"/>`).join("");
  const bg = doc(W, H, `<rect width="${W}" height="${H}" fill="#dde9f3"/><rect width="${W}" height="${H}" fill="#cfdfee" opacity=".5"/>${bokeh}<rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/><rect x="110" y="100" width="860" height="1180" fill="#f2f7fb" stroke="#9db7d3" stroke-width="3"/>` + spark(900, 1300, 16, "#fff") + spark(160, 1420, 12, "#fff"));
  const ov = doc(W, H, def("gc", gardenContent()) + `<rect x="${sl.x - 18}" y="${sl.y - 18}" width="${sl.width + 36}" height="${sl.height + 36}" fill="none" stroke="#6f8fb5" stroke-width="12" stroke-dasharray="0 14" stroke-linecap="round"/><rect x="${sl.x - 6}" y="${sl.y - 6}" width="${sl.width + 12}" height="${sl.height + 12}" fill="none" stroke="#4f6f96" stroke-width="5"/><rect x="${sl.x + 4}" y="${sl.y + 4}" width="${sl.width - 8}" height="${sl.height - 8}" fill="none" stroke="#fff" stroke-width="2" opacity=".8"/>` +
    gardenCluster(150, 140, 0, 1) + gardenCluster(930, 1250, 180, 1.05) + spark(930, 200, 14, "#fff") + spark(120, 1250, 12, "#fff"));
  return { id: "frame-blush-garden", name: "Blush Blue Garden · 1 Foto", width: W, height: H, bg, ov, slots: [sl],
    texts: [
      { text: "{{location}}", x: 540, y: 78, fontSize: 36, color: "#3c5f7e" }, { text: "{{eventName}}", x: 540, y: 1420, fontSize: 70, color: "#2f4b66" },
      { text: "{{eventDate}}", x: 540, y: 1490, fontSize: 38, color: "#3c5f7e" },
    ] as Txt[] };
};

// ---------- FRAME E: Roses & Sparkles (landscape 6x4, 1 besar + 3 kecil) ----------
const frameE = () => {
  const W = 1500, H = 1000;
  const sl: Slot[] = [{ x: 50, y: 50, width: 650, height: 490 }, { x: 50, y: 600, width: 450, height: 330 }, { x: 525, y: 600, width: 450, height: 330 }, { x: 1000, y: 600, width: 450, height: 330 }];
  const bokeh = Array.from({ length: 26 }, () => `<circle cx="${n(rnd() * W)}" cy="${n(rnd() * H)}" r="${n(14 + rnd() * 46)}" fill="#fff" opacity="${n(.3 + rnd() * .5)}" filter="url(#bl)"/>`).join("");
  const peach = ["#f1c3a8", "#f6d6c0", "#fbe9da", "#d9a487"];
  const roses = Array.from({ length: 9 }, (_, i) => rose(i * 190 + 40, 985, 90, i * 40, peach)).join("");
  const bg = doc(W, H, `<rect width="${W}" height="${H}" fill="#f6efe4"/><rect width="${W}" height="${H}" fill="#fff" opacity=".4"/>${bokeh}${roses}`);
  const frames = sl.map((s) => `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="none" stroke="#fffaf0" stroke-width="12"/><rect x="${s.x - 4}" y="${s.y - 4}" width="${s.width + 8}" height="${s.height + 8}" fill="none" stroke="${GOLD}" stroke-width="3"/>`).join("");
  const corner = (x: number, y: number, m: string) => G(`translate(${x} ${y}) scale(${m})`, `<g fill="none" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"><path d="M0 0V60M0 0H60"/><path d="M14 14C40 14 60 34 56 58C52 76 30 74 32 58C34 48 46 50 46 58"/></g>`);
  const ov = doc(W, H, frames + flourish(1075, 570, .85) + corner(1440, 24, "-1 1") + corner(715, 24, "1 1") +
    [[1380, 120, 18], [780, 500, 14], [1330, 500, 12], [1180, 60, 14]].map(([a, b, c]) => spark(a, b, c, "#fff7d6")).join("") + spark(560, 585, 14, "#fff7d6"));
  return { id: "frame-roses-sparkles", name: "Roses & Sparkles · 4 Foto", width: W, height: H, bg, ov, slots: sl,
    texts: [
      { text: "{{eventName}}", x: 1075, y: 250, fontSize: 96, color: "#a47d3a" }, { text: "HAPPILY EVER AFTER", x: 1075, y: 350, fontSize: 46, color: "#b0894a" },
      { text: "{{eventDate}}", x: 1075, y: 420, fontSize: 40, color: "#b39b78" }, { text: "{{location}}", x: 1075, y: 475, fontSize: 36, color: "#b39b78" },
    ] as Txt[] };
};

const FRAMES = [frameA(), frameB(), frameC(), frameD(), frameE()];

async function main() {
  if (process.env.DUMP_DIR) {
    fs.mkdirSync(process.env.DUMP_DIR, { recursive: true });
    for (const f of FRAMES) { fs.writeFileSync(path.join(process.env.DUMP_DIR, `${f.id}.bg.svg`), f.bg); fs.writeFileSync(path.join(process.env.DUMP_DIR, `${f.id}.ov.svg`), f.ov); }
    return;
  }
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  for (const f of FRAMES) {
    const data = { name: f.name, width: f.width, height: f.height, background: b64(f.bg), overlay: b64(f.ov), textConfig: { photoSlots: f.slots, texts: f.texts } };
    await prisma.template.upsert({ where: { id: f.id }, update: data, create: { id: f.id, ...data } });
    console.log("Frame siap:", f.name);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
