/**
 * Impor massal frame PNG (lubang foto transparan) menjadi Template.
 *
 * Pakai:
 *   npx tsx prisma/import-templates.ts <folder-png>              # simpan ke database
 *   npx tsx prisma/import-templates.ts <folder-png> --dry <out>  # hanya uji + render preview ke folder <out>
 */
import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

export type Box = { x: number; y: number; width: number; height: number };
type Comp = Box & { area: number };
export type TextItem = { text: string; x: number; y: number; align: "center"; fontSize: number; color: string };
export type BuiltTemplate = {
  id: string;
  name: string;
  width: number;
  height: number;
  slots: Box[];
  labels: Box[];
  texts: TextItem[];
  overlayPng: Buffer;
  note: string;
};

export const MAX_SLOTS = 6;

function components(width: number, height: number, test: (i: number) => boolean): Comp[] {
  const label = new Uint8Array(width * height);
  const boxes: Comp[] = [];
  const stack = new Int32Array(width * height);
  for (let start = 0; start < width * height; start++) {
    if (label[start] || !test(start)) continue;
    let sp = 0;
    stack[sp++] = start;
    label[start] = 1;
    let minX = width, minY = height, maxX = 0, maxY = 0, area = 0;
    while (sp) {
      const i = stack[--sp];
      const x = i % width, y = (i / width) | 0;
      area++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && !label[i - 1] && test(i - 1)) { label[i - 1] = 1; stack[sp++] = i - 1; }
      if (x < width - 1 && !label[i + 1] && test(i + 1)) { label[i + 1] = 1; stack[sp++] = i + 1; }
      if (y > 0 && !label[i - width] && test(i - width)) { label[i - width] = 1; stack[sp++] = i - width; }
      if (y < height - 1 && !label[i + width] && test(i + width)) { label[i + width] = 1; stack[sp++] = i + width; }
    }
    boxes.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, area });
  }
  return boxes;
}

function erode(mask: Uint8Array, w: number, h: number, k: number): Uint8Array {
  const r = k >> 1;
  const W = w + 1;
  const sat = new Int32Array(W * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += mask[y * w + x];
      sat[(y + 1) * W + x + 1] = sat[y * W + x + 1] + row;
    }
  }
  const out = new Uint8Array(w * h);
  for (let y = r; y < h - r; y++) {
    for (let x = r; x < w - r; x++) {
      const sum = sat[(y + r + 1) * W + x + r + 1] - sat[(y - r) * W + x + r + 1] - sat[(y + r + 1) * W + x - r] + sat[(y - r) * W + x - r];
      if (sum === k * k) out[y * w + x] = 1;
    }
  }
  return out;
}

function growRect(white: Uint8Array, w: number, h: number, cx: number, cy: number, tol = 0.004): Box {
  let x0 = cx - 1, x1 = cx + 2, y0 = cy - 1, y1 = cy + 2;
  const col = (x: number, a: number, b: number) => { let s = 0; for (let y = a; y < b; y++) s += white[y * w + x]; return s; };
  const row = (y: number, a: number, b: number) => { let s = 0; for (let x = a; x < b; x++) s += white[y * w + x]; return s; };
  let changed = true;
  while (changed) {
    changed = false;
    if (x0 > 0 && col(x0 - 1, y0, y1) >= (y1 - y0) * (1 - tol)) { x0--; changed = true; }
    if (x1 < w && col(x1, y0, y1) >= (y1 - y0) * (1 - tol)) { x1++; changed = true; }
    if (y0 > 0 && row(y0 - 1, x0, x1) >= (x1 - x0) * (1 - tol)) { y0--; changed = true; }
    if (y1 < h && row(y1, x0, x1) >= (x1 - x0) * (1 - tol)) { y1++; changed = true; }
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

function intersection(a: Box, b: Box) {
  const ix = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const iy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return ix > 0 && iy > 0 ? ix * iy : 0;
}

function detectLabels(data: Buffer | Uint8Array, fullWidth: number, height: number, x0: number, sw: number): Box[] {
  const n = sw * height;
  const white = new Uint8Array(n);
  const ink = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < sw; x++) {
      const p = (y * fullWidth + x0 + x) * 4;
      if (data[p + 3] !== 255) continue;
      const m = Math.min(data[p], data[p + 1], data[p + 2]);
      if (m >= 248) white[y * sw + x] = 1;
      else if (m < 235) ink[y * sw + x] = 1;
    }
  }

  const found: Box[] = [];

  for (const d of components(sw, height, (i) => ink[i] === 1)) {
    if (d.width < 8 || d.width > 90 || d.height > 8) continue;
    const ax = Math.max(0, d.x - 14), bx = Math.min(sw, d.x + d.width + 14);
    const ay = Math.max(0, d.y - 14), by = Math.min(height, d.y + d.height + 14);
    let whiteCount = 0;
    for (let y = ay; y < by; y++) for (let x = ax; x < bx; x++) whiteCount += white[y * sw + x];
    const inside = d.width * d.height;
    if ((whiteCount + inside) / ((bx - ax) * (by - ay)) < 0.97) continue;
    for (let y = d.y - 1; y <= d.y + d.height; y++) for (let x = d.x - 1; x <= d.x + d.width; x++) {
      if (x >= 0 && x < sw && y >= 0 && y < height) white[y * sw + x] = 1;
    }
    const rect = growRect(white, sw, height, d.x + (d.width >> 1), d.y + (d.height >> 1));
    if (rect.width >= 150 && rect.height >= 40 && rect.width < sw * 0.97) found.push(rect);
  }

  const eroded = erode(white, sw, height, 9);
  for (const c of components(sw, height, (i) => eroded[i] === 1)) {
    if (c.area <= sw * height * 0.0015) continue;
    if (c.area / (c.width * c.height) <= 0.9) continue;
    if (c.width < c.height * 0.5 || c.width >= sw * 0.95 || c.height <= 30) continue;
    const rect: Box = {
      x: Math.max(0, c.x - 4), y: Math.max(0, c.y - 4),
      width: Math.min(sw, c.width + 8), height: Math.min(height, c.height + 8),
    };
    const dupe = found.some((f) => intersection(f, rect) / Math.min(f.width * f.height, rect.width * rect.height) > 0.5);
    if (!dupe) found.push(rect);
  }

  return found.sort((a, b) => (Math.abs(a.y - b.y) < 40 ? a.x - b.x : a.y - b.y));
}

function sortSlots(slots: Box[]) {
  return [...slots].sort((a, b) => (Math.abs(a.y - b.y) < 80 ? a.x - b.x : a.y - b.y));
}

function clipSlot(slot: Box, labels: Box[]): Box {
  let s = { ...slot };
  for (const l of labels) {
    const pad = 6;
    const box = { x: l.x - pad, y: l.y - pad, width: l.width + pad * 2, height: l.height + pad * 2 };
    if (!intersection(s, box)) continue;
    const options: Box[] = [
      { x: s.x, y: s.y, width: s.width, height: box.y - s.y },
      { x: s.x, y: box.y + box.height, width: s.width, height: s.y + s.height - (box.y + box.height) },
      { x: s.x, y: s.y, width: box.x - s.x, height: s.height },
      { x: box.x + box.width, y: s.y, width: s.x + s.width - (box.x + box.width), height: s.height },
    ].filter((o) => o.width > 0 && o.height > 0);
    if (!options.length) continue;
    s = options.sort((a, b) => b.width * b.height - a.width * a.height)[0];
  }
  return s;
}

function buildTexts(labels: Box[], stripW: number, stripH: number): TextItem[] {
  const NAME = "#4a4a4a", DATE = "#6b6b6b";
  const item = (text: string, x: number, y: number, fs: number, color: string): TextItem =>
    ({ text, x: Math.round(x), y: Math.round(y), align: "center", fontSize: Math.round(fs), color });

  if (!labels.length) {
    const fs = Math.round(stripW * 0.055);
    return [item("{{eventName}}", stripW / 2, stripH - stripH * 0.04, fs, NAME)];
  }

  const cx = (l: Box) => l.x + l.width / 2;
  const cy = (l: Box) => l.y + l.height / 2;

  if (labels.length >= 2) {
    const [a, b] = labels;
    const fsName = Math.min((a.width * 0.88) / (15 * 0.58), a.height * 0.45);
    const fsDate = Math.min((b.width * 0.88) / (17 * 0.58), b.height * 0.3);
    return [
      item("{{eventName}}", cx(a), cy(a) + fsName * 0.35, fsName, NAME),
      item("{{eventDate}}", cx(b), cy(b) + fsDate * 0.35, fsDate, DATE),
    ];
  }

  const l = labels[0];
  if (l.height < 150) {
    const fs = Math.min((l.width * 0.88) / (15 * 0.58), l.height * 0.62);
    return [item("{{eventName}}", cx(l), cy(l) + fs * 0.35, fs, NAME)];
  }
  const fsName = Math.min((l.width * 0.88) / (15 * 0.58), l.height * 0.39);
  const fsDate = fsName * 0.65;
  const gap = fsName * 0.45;
  const block = 0.72 * fsName + gap + 0.72 * fsDate;
  const y1 = cy(l) - block / 2 + 0.72 * fsName;
  const y2 = y1 + gap + 0.72 * fsDate;
  return [item("{{eventName}}", cx(l), y1, fsName, NAME), item("{{eventDate}}", cx(l), y2, fsDate, DATE)];
}

export function describe(name: string) {
  const m = name.match(/^(\d+x\d+)\s+(\d+)(\(1\))?$/i);
  return m ? { size: m[1], num: m[2], variant: m[3] ? "B" : "A" } : { size: name, num: "", variant: "" };
}

export function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function buildTemplates(file: string): Promise<{ templates: BuiltTemplate[]; skipped: string[] }> {
  const base = path.basename(file, ".png");
  const info = describe(base);
  const { data, info: img } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = img.width, H = img.height;
  const alpha = (i: number) => data[i * 4 + 3];

  const minArea = W * H * 0.02;
  const holes: Box[] = components(W, H, (i) => alpha(i) < 128)
    .filter((c) => c.area > minArea)
    .map(({ x, y, width, height }) => ({ x, y, width, height }));

  const half = Math.floor(W / 2);
  const crosses = holes.some((h) => h.x < half && h.x + h.width > half);
  type Strip = { x0: number; sw: number; side: "" | "Kiri" | "Kanan"; slots: Box[] };
  let strips: Strip[] = [{ x0: 0, sw: W, side: "", slots: holes }];
  if (W < H && holes.length >= 2 && !crosses) {
    const left = holes.filter((h) => h.x + h.width / 2 < half);
    const right = holes.filter((h) => h.x + h.width / 2 >= half);
    const twin = left.length > 0 && left.length === right.length &&
      left.every((l) => right.some((r) => Math.abs(r.x - l.x - half) <= 10 && Math.abs(r.y - l.y) <= 10 && Math.abs(r.width - l.width) <= 12 && Math.abs(r.height - l.height) <= 12));
    if (twin) strips = [{ x0: 0, sw: half, side: "", slots: left }];
    else {
      strips = [];
      if (left.length) strips.push({ x0: 0, sw: half, side: "Kiri", slots: left });
      if (right.length) strips.push({ x0: half, sw: W - half, side: "Kanan", slots: right.map((r) => ({ ...r, x: r.x - half })) });
    }
  }

  const templates: BuiltTemplate[] = [];
  const skipped: string[] = [];
  for (const strip of strips) {
    const tag = `${base}${strip.side ? " " + strip.side : ""}`;
    if (!strip.slots.length) { skipped.push(`${tag}: tidak ada lubang foto transparan`); continue; }
    if (strip.slots.length > MAX_SLOTS) { skipped.push(`${tag}: ${strip.slots.length} slot foto (maksimal ${MAX_SLOTS})`); continue; }

    const labels = detectLabels(data, W, H, strip.x0, strip.sw);
    for (const l of labels) {
      for (let y = l.y; y < l.y + l.height; y++) for (let x = l.x; x < l.x + l.width; x++) data[(y * W + strip.x0 + x) * 4 + 3] = 0;
    }
    const slots = sortSlots(strip.slots).map((s) => clipSlot(s, labels));
    const texts = buildTexts(labels, strip.sw, H);

    const png = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
      .extract({ left: strip.x0, top: 0, width: strip.sw, height: H })
      .png({ palette: true, quality: 85, effort: 8 })
      .toBuffer();

    const label = `${info.size}${info.num ? ` ${info.num}${info.variant === "B" ? "B" : ""}` : ""}${strip.side ? ` ${strip.side}` : ""}`;
    templates.push({
      id: `import-${slug(base)}${strip.side ? `-${strip.side.toLowerCase()}` : ""}`,
      name: `${label} · ${slots.length} Foto`,
      width: strip.sw,
      height: H,
      slots,
      labels,
      texts,
      overlayPng: png,
      note: `${strip.sw}x${H}, ${slots.length} slot, ${labels.length} label${strip.side ? `, ${strip.side.toLowerCase()}` : ""}${strip.sw < W && !strip.side ? ", strip kembar dipotong" : ""}`,
    });
  }
  return { templates, skipped };
}

function sortKey(file: string) {
  const d = describe(path.basename(file, ".png"));
  const [a, b] = d.size.split("x").map(Number);
  return [a || 0, b || 0, Number(d.num) || 0, d.variant === "B" ? 1 : 0];
}

async function main() {
  const WHITE_PIXEL = `data:image/png;base64,${(await sharp({ create: { width: 1, height: 1, channels: 3, background: "#ffffff" } }).png().toBuffer()).toString("base64")}`;
  const args = process.argv.slice(2);
  const dir = args[0];
  const dryIndex = args.indexOf("--dry");
  const dryOut = dryIndex >= 0 ? args[dryIndex + 1] : null;
  if (!dir) { console.error("Pemakaian: npx tsx prisma/import-templates.ts <folder-png> [--dry <folder-preview>]"); process.exit(1); }

  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.toLowerCase().endsWith(".png") ? [path.join(d, e.name)] : []);
  const files = walk(dir).sort((a, b) => {
    const ka = sortKey(a), kb = sortKey(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return a.localeCompare(b);
  });
  if (!files.length) { console.error("Tidak ada file .png di folder itu."); process.exit(1); }

  const prisma = dryOut ? null : new (await import("@prisma/client")).PrismaClient();
  const processPhotoWithSlot = dryOut ? (await import("../src/lib/image/process-photo")).processPhotoWithSlot : null;
  if (dryOut) mkdirSync(dryOut, { recursive: true });
  let imported = 0, skipped = 0;

  for (const file of files) {
    const result = await buildTemplates(file);
    for (const s of result.skipped) { console.log(`LEWATI  ${s}`); skipped++; }
    for (const t of result.templates) {
      const overlay = `data:image/png;base64,${t.overlayPng.toString("base64")}`;
      const textConfig = { photoSlots: t.slots, texts: t.texts };
      if (prisma) {
        await prisma.template.upsert({
          where: { id: t.id },
          update: { name: t.name, width: t.width, height: t.height, background: WHITE_PIXEL, overlay, logo: null, textConfig },
          create: { id: t.id, name: t.name, width: t.width, height: t.height, background: WHITE_PIXEL, overlay, logo: null, textConfig },
        });
      } else if (processPhotoWithSlot && dryOut) {
        const sample = await sharp({ create: { width: 900, height: 900, channels: 3, background: { r: 120, g: 160, b: 210 } } })
          .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"><circle cx="450" cy="380" r="220" fill="#f3d9c4"/><rect x="0" y="650" width="900" height="250" fill="#7a5c4a"/></svg>`) }])
          .jpeg().toBuffer();
        let previous: Buffer[] = [];
        let out: Buffer = Buffer.alloc(0);
        for (let index = 0; index < t.slots.length; index++) {
          const r = await processPhotoWithSlot({
            original: sample, template: { width: t.width, height: t.height, background: WHITE_PIXEL, overlay, logo: null, photoSlots: t.slots, texts: t.texts },
            variables: { eventName: "Putri & Mahfud", eventDate: "15 November 2026", location: "Temanggung" }, photoIndex: index, previousSlots: previous,
          });
          out = r.final;
          if (r.slot) previous = [...previous, r.slot];
        }
        writeFileSync(path.join(dryOut, `${t.id}.jpg`), out);
      }
      console.log(`${prisma ? "OK     " : "UJI OK "} ${t.id} -> "${t.name}" (${t.note})`);
      imported++;
    }
  }
  console.log(`\nSelesai: ${imported} template ${prisma ? "diimpor" : "lolos uji"}, ${skipped} dilewati.`);
  await prisma?.$disconnect();
}

if (!process.env.FRAME_IMPORT_NO_MAIN) main().catch((error) => { console.error(error); process.exit(1); });
