/**
 * Impor massal frame PNG (lubang foto transparan) menjadi Template.
 *
 * Pakai:
 *   npx tsx prisma/import-templates.ts <folder-png>            # simpan ke database
 *   npx tsx prisma/import-templates.ts <folder-png> --dry <out>  # hanya uji + render preview ke folder <out>
 *
 * - Lubang foto dideteksi otomatis dari area transparan.
 * - Lembar 2x6 yang berisi 2 strip kembar otomatis dipotong jadi 1 strip.
 * - Frame dengan lebih dari 4 slot foto dilewati (batas aplikasi 4 foto).
 * - Aman dijalankan ulang: template yang sama diperbarui, bukan digandakan.
 */
import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

type Box = { x: number; y: number; width: number; height: number };
const MAX_SLOTS = 4;

function components(width: number, height: number, test: (i: number) => boolean) {
  const label = new Int32Array(width * height);
  const boxes: (Box & { area: number })[] = [];
  const stack = new Int32Array(width * height);
  let next = 0;
  for (let start = 0; start < width * height; start++) {
    if (label[start] || !test(start)) continue;
    next++;
    let sp = 0;
    stack[sp++] = start;
    label[start] = next;
    let minX = width, minY = height, maxX = 0, maxY = 0, area = 0;
    while (sp) {
      const i = stack[--sp];
      const x = i % width, y = (i / width) | 0;
      area++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (x > 0 && !label[i - 1] && test(i - 1)) { label[i - 1] = next; stack[sp++] = i - 1; }
      if (x < width - 1 && !label[i + 1] && test(i + 1)) { label[i + 1] = next; stack[sp++] = i + 1; }
      if (y > 0 && !label[i - width] && test(i - width)) { label[i - width] = next; stack[sp++] = i - width; }
      if (y < height - 1 && !label[i + width] && test(i + width)) { label[i + width] = next; stack[sp++] = i + width; }
    }
    boxes.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, area });
  }
  return boxes;
}

function sortSlots(slots: Box[]) {
  return [...slots].sort((a, b) => (Math.abs(a.y - b.y) < 80 ? a.x - b.x : a.y - b.y));
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function analyse(file: string) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let { width, height } = info;
  const alpha = (i: number) => data[i * 4 + 3];
  const minArea = width * height * 0.02;
  let holes: Box[] = components(width, height, (i) => alpha(i) < 128)
    .filter((b) => b.area > minArea)
    .map(({ x, y, width: w, height: h }) => ({ x, y, width: w, height: h }));

  // Lembar dengan 2 strip kembar (kiri & kanan) -> potong jadi 1 strip.
  let cropWidth = width;
  const half = width / 2;
  const left = holes.filter((h) => h.x + h.width / 2 < half);
  const right = holes.filter((h) => h.x + h.width / 2 >= half);
  const twin = holes.length >= 2 && left.length === right.length &&
    left.every((l) => right.some((r) => Math.abs(r.x - l.x - half) <= 10 && Math.abs(r.y - l.y) <= 10 && Math.abs(r.width - l.width) <= 12 && Math.abs(r.height - l.height) <= 12));
  if (twin) { holes = left; cropWidth = Math.round(half); }

  const slots = sortSlots(holes);
  // Kotak label putih kosong (tempat nama acara).
  const whites = components(cropWidth, height, (i) => {
    const px = (((i / cropWidth) | 0) * width + (i % cropWidth)) * 4;
    return data[px + 3] === 255 && data[px] >= 248 && data[px + 1] >= 248 && data[px + 2] >= 248;
  }).filter((b) => b.area > width * height * 0.012 && b.area / (b.width * b.height) > 0.8 && b.width > b.height * 0.8 && b.width < cropWidth * 0.9);
  const label = whites.sort((a, b) => b.area - a.area)[0] ?? null;
  return { width: cropWidth, height, slots, label, twin, data, fullWidth: width };
}

function describe(name: string) {
  const m = name.match(/^(\d+x\d+)\s+(\d+)(\(1\))?$/i);
  return m ? { size: m[1], num: m[2], variant: m[3] ? "B" : "A" } : { size: name, num: "", variant: "" };
}


async function main() {
  const WHITE_PIXEL = `data:image/png;base64,${(await sharp({ create: { width: 1, height: 1, channels: 3, background: "#ffffff" } }).png().toBuffer()).toString("base64")}`;
  const args = process.argv.slice(2);
  const dir = args[0];
  const dryIndex = args.indexOf("--dry");
  const dryOut = dryIndex >= 0 ? args[dryIndex + 1] : null;
  if (!dir) { console.error("Pemakaian: npx tsx prisma/import-templates.ts <folder-png> [--dry <folder-preview>]"); process.exit(1); }

  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.toLowerCase().endsWith(".png") ? [path.join(d, e.name)] : []);
  const files = walk(dir).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!files.length) { console.error("Tidak ada file .png di folder itu."); process.exit(1); }

  const prisma = dryOut ? null : new (await import("@prisma/client")).PrismaClient();
  const processPhotoWithSlot = dryOut ? (await import("../src/lib/image/process-photo")).processPhotoWithSlot : null;
  if (dryOut) mkdirSync(dryOut, { recursive: true });
  let imported = 0, skipped = 0;

  for (const file of files) {
    const base = path.basename(file, ".png");
    const info = describe(base);
    const { width, height, slots, label, twin, data, fullWidth } = await analyse(file);
    const tag = `${base}`;
    if (!slots.length) { console.log(`LEWATI  ${tag}: tidak ada lubang foto transparan`); skipped++; continue; }
    if (slots.length > MAX_SLOTS) { console.log(`LEWATI  ${tag}: ${slots.length} slot foto (maksimal ${MAX_SLOTS})`); skipped++; continue; }

    // Kosongkan (transparan) kotak label putih supaya teks nama acara terlihat di bawah lapisan frame.
    if (label) {
      for (let y = label.y; y < label.y + label.height; y++) for (let x = label.x; x < label.x + label.width; x++) {
        const px = (y * fullWidth + x) * 4;
        if (data[px + 3] === 255 && data[px] >= 248 && data[px + 1] >= 248 && data[px + 2] >= 248) data[px + 3] = 0;
      }
    }
    let image = sharp(data, { raw: { width: fullWidth, height, channels: 4 } });
    if (twin) image = image.extract({ left: 0, top: 0, width, height });
    const png = await image.png({ palette: true, quality: 85, effort: 8 }).toBuffer();
    const overlay = `data:image/png;base64,${png.toString("base64")}`;

    let texts: { text: string; x: number; y: number; align: "center"; fontSize: number; color: string }[];
    if (label) {
      const fs = Math.round(Math.min(label.width * 0.065, label.height * 0.2));
      const cx = Math.round(label.x + label.width / 2), cy = Math.round(label.y + label.height / 2);
      texts = [
        { text: "{{eventName}}", x: cx, y: Math.round(cy - fs * 0.1), align: "center", fontSize: fs, color: "#4a4a4a" },
        { text: "{{eventDate}}", x: cx, y: Math.round(cy + fs * 1.1), align: "center", fontSize: Math.round(fs * 0.75), color: "#6b6b6b" },
      ];
    } else {
      texts = [{ text: " ", x: 0, y: 0, align: "center", fontSize: 12, color: "#ffffff" }];
    }
    const name = `${info.size}${info.num ? ` ${info.num}${info.variant}` : ""} · ${slots.length} Foto`;
    const id = `import-${slug(base)}`;
    const textConfig = { photoSlots: slots, texts };

    if (prisma) {
      await prisma.template.upsert({
        where: { id },
        update: { name, width, height, background: WHITE_PIXEL, overlay, logo: null, textConfig },
        create: { id, name, width, height, background: WHITE_PIXEL, overlay, logo: null, textConfig },
      });
    } else if (processPhotoWithSlot && dryOut) {
      const sample = await sharp({ create: { width: 900, height: 900, channels: 3, background: { r: 120, g: 160, b: 210 } } })
        .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"><circle cx="450" cy="380" r="220" fill="#f3d9c4"/><rect x="0" y="650" width="900" height="250" fill="#7a5c4a"/></svg>`) }])
        .jpeg().toBuffer();
      let previous: Buffer[] = [];
      let out: Buffer = Buffer.alloc(0);
      for (let index = 0; index < slots.length; index++) {
        const result = await processPhotoWithSlot({
          original: sample, template: { width, height, background: WHITE_PIXEL, overlay, logo: null, photoSlots: slots, texts },
          variables: { eventName: "Putri & Mahfud", eventDate: "15 November 2026", location: "Temanggung" }, photoIndex: index, previousSlots: previous,
        });
        out = result.final;
        if (result.slot) previous = [...previous, result.slot];
      }
      writeFileSync(path.join(dryOut, `${slug(base)}.jpg`), out);
    }
    console.log(`${prisma ? "OK     " : "UJI OK "} ${tag} -> "${name}" (${width}x${height}, ${slots.length} slot${twin ? ", strip kembar dipotong" : ""}${label ? ", teks di label" : ""})`);
    imported++;
  }
  console.log(`\nSelesai: ${imported} template ${prisma ? "diimpor" : "lolos uji"}, ${skipped} dilewati.`);
  await prisma?.$disconnect();
}

main().catch((error) => { console.error(error); process.exit(1); });
