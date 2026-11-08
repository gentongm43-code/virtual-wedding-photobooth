import type { Sharp } from "sharp";

export type PhotoFilter =
  | "natural" | "warm" | "soft" | "golden" | "classic" | "bw"
  | "rose" | "champagne" | "film" | "vintage" | "dreamy" | "noir" | "bright" | "matte"
  | "clarendon" | "juno" | "lark" | "gingham" | "valencia" | "aden" | "nashville" | "moon" | "vivid" | "glow" | "peachy" | "pastel" | "cinematic" | "fresh" | "japan" | "retro" | "vlog";

export const PHOTO_FILTER_OPTIONS: Array<{ value: PhotoFilter; label: string }> = [
  { value: "natural", label: "Natural" },
  { value: "clarendon", label: "Clarendon" },
  { value: "juno", label: "Juno" },
  { value: "lark", label: "Lark" },
  { value: "gingham", label: "Gingham" },
  { value: "valencia", label: "Valencia" },
  { value: "aden", label: "Aden" },
  { value: "nashville", label: "Nashville" },
  { value: "moon", label: "Moon" },
  { value: "vivid", label: "Vivid" },
  { value: "glow", label: "Glow" },
  { value: "peachy", label: "Peachy" },
  { value: "pastel", label: "Pastel" },
  { value: "cinematic", label: "Cinematic" },
  { value: "fresh", label: "Fresh" },
  { value: "japan", label: "Japan" },
  { value: "retro", label: "Retro" },
  { value: "vlog", label: "Vlog" },
  { value: "bright", label: "Bright" },
  { value: "soft", label: "Soft" },
  { value: "dreamy", label: "Dreamy" },
  { value: "rose", label: "Rose" },
  { value: "warm", label: "Warm" },
  { value: "champagne", label: "Champagne" },
  { value: "golden", label: "Golden" },
  { value: "film", label: "Film" },
  { value: "vintage", label: "Vintage" },
  { value: "matte", label: "Matte" },
  { value: "classic", label: "Classic" },
  { value: "noir", label: "Noir" },
  { value: "bw", label: "B&W" },
];

export const DEFAULT_PHOTO_FILTER: PhotoFilter = "natural";

export const PHOTO_FILTER_WB_ID = "pb-wb-natural";
export const NATURAL_WB: [number, number, number] = [0.97, 1, 1.05];

type Spec = { wb?: [number, number, number]; b?: number; c?: number; s?: number; sepia?: number; hue?: number; gray?: boolean };

const SPECS: Record<PhotoFilter, Spec> = {
  natural: { wb: NATURAL_WB, b: 1.05, c: 1.04, s: 1.06 },
  warm: { b: 1.08, c: 1.08, sepia: 0.28, s: 1.2 },
  soft: { b: 1.04, c: 0.94, s: 0.9, sepia: 0.08 },
  golden: { b: 1.1, c: 1.12, sepia: 0.5, s: 1.35 },
  classic: { c: 1.12, s: 0.82, sepia: 0.12 },
  bw: { gray: true, c: 1.05 },
  rose: { b: 1.06, c: 0.98, s: 1.15, sepia: 0.08, hue: -8 },
  champagne: { b: 1.08, c: 0.96, sepia: 0.2, s: 1.05 },
  film: { b: 1.02, c: 1.18, s: 0.88, sepia: 0.15 },
  vintage: { c: 0.92, s: 0.75, sepia: 0.38 },
  dreamy: { b: 1.12, c: 0.88, s: 1.05, sepia: 0.06 },
  noir: { gray: true, c: 1.3, b: 0.95 },
  bright: { b: 1.14, c: 1.06, s: 1.1 },
  matte: { b: 1.02, c: 0.86, s: 0.85 },
  clarendon: { b: 1.05, c: 1.25, s: 1.35 },
  juno: { b: 1.05, c: 1.1, s: 1.4, sepia: 0.12, hue: -6 },
  lark: { b: 1.15, c: 0.95, s: 1.2 },
  gingham: { b: 1.06, c: 0.88, s: 0.8, hue: 6 },
  valencia: { b: 1.08, c: 1.05, sepia: 0.15, s: 1.1 },
  aden: { b: 1.15, c: 0.9, s: 0.85, hue: -15 },
  nashville: { b: 1.05, c: 1.15, sepia: 0.25, s: 1.2, hue: -12 },
  moon: { gray: true, c: 1.1, b: 1.1 },
  vivid: { b: 1.05, c: 1.2, s: 1.5 },
  glow: { b: 1.18, c: 0.9, s: 1.1, sepia: 0.05 },
  peachy: { b: 1.1, c: 0.95, s: 1.2, sepia: 0.15, hue: -10 },
  pastel: { b: 1.15, c: 0.85, s: 0.9, hue: -5 },
  cinematic: { b: 0.95, c: 1.25, s: 0.9, sepia: 0.1, hue: 8 },
  fresh: { b: 1.1, c: 1.05, s: 1.25 },
  japan: { b: 1.12, c: 0.9, s: 0.8, hue: 4 },
  retro: { b: 0.98, c: 1.1, s: 0.8, sepia: 0.45 },
  vlog: { b: 1.04, c: 1.12, s: 1.15 },
};

export function normalizePhotoFilter(value: string | null | undefined): PhotoFilter {
  return PHOTO_FILTER_OPTIONS.some((option) => option.value === value)
    ? value as PhotoFilter
    : DEFAULT_PHOTO_FILTER;
}

export function getPhotoFilterCss(filter: PhotoFilter): string {
  const p = SPECS[filter] ?? {};
  const parts: string[] = [];
  if (p.wb) parts.push(`url(#${PHOTO_FILTER_WB_ID})`);
  if (p.b) parts.push(`brightness(${p.b})`);
  if (p.c) parts.push(`contrast(${p.c})`);
  if (p.sepia) parts.push(`sepia(${p.sepia})`);
  if (p.s) parts.push(`saturate(${p.s})`);
  if (p.hue) parts.push(`hue-rotate(${p.hue}deg)`);
  if (p.gray) parts.push("grayscale(1)");
  return parts.length ? parts.join(" ") : "none";
}

type Matrix = [[number, number, number], [number, number, number], [number, number, number]];

export function applyPhotoFilter(pipeline: Sharp, filter: PhotoFilter): Sharp {
  const p = SPECS[filter];
  if (!p || !Object.keys(p).length) return pipeline;
  let out = pipeline;
  if (p.wb) out = out.recomb([[p.wb[0], 0, 0], [0, p.wb[1], 0], [0, 0, p.wb[2]]]);
  if (p.c && p.c !== 1) out = out.linear(p.c, 128 * (1 - p.c));
  if (p.sepia) {
    const a = p.sepia;
    const S = [[0.393, 0.769, 0.189], [0.349, 0.686, 0.168], [0.272, 0.534, 0.131]];
    const m = S.map((row, i) => row.map((v, j) => (i === j ? 1 - a : 0) + a * v)) as Matrix;
    out = out.recomb(m);
  }
  out = out.modulate({ brightness: p.b ?? 1, saturation: p.s ?? 1, hue: p.hue ?? 0 });
  if (p.gray) out = out.grayscale();
  return out;
}
