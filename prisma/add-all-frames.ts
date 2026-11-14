import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

type Slot = { x: number; y: number; width: number; height: number };

function detectSlots(rgba: Buffer, w: number, h: number): Slot[] {
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = rgba[i * 4 + 3] < 25 ? 1 : 0;
  const seen = new Uint8Array(w * h);
  const slots: Slot[] = [];
  const stack: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || seen[start]) continue;
    let minX = w, minY = h, maxX = 0, maxY = 0, area = 0;
    stack.push(start); seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w, y = (p / w) | 0;
      area++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (x > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
      if (x < w - 1 && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && mask[p - w] && !seen[p - w]) { seen[p - w] = 1; stack.push(p - w); }
      if (y < h - 1 && mask[p + w] && !seen[p + w]) { seen[p + w] = 1; stack.push(p + w); }
    }
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    if (bw < w * 0.08 || bh < h * 0.05) continue;
    if (area / (bw * bh) < 0.8) continue;
    slots.push({ x: minX, y: minY, width: bw, height: bh });
  }
  const rowTol = h * 0.03;
  slots.sort((a, b) => (Math.abs(a.y - b.y) < rowTol ? a.x - b.x : a.y - b.y));
  return slots;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const dir = args.find((a) => !a.startsWith("--")) ?? "/root/PNG";
  const files = fs.readdirSync(dir)
    .filter((f) => /\.png$/i.test(f) && !/\(\d+\)\.png$/i.test(f))
    .sort();
  let prisma: any = null;
  if (!dry) { const { PrismaClient } = await import("@prisma/client"); prisma = new PrismaClient(); }
  for (const f of files) {
    const file = path.join(dir, f);
    const name = "Frame " + f.replace(/\.png$/i, "");
    const meta = await sharp(file).metadata();
    const width = Math.min(meta.width ?? 1080, 1080);
    const resized = sharp(file).ensureAlpha().resize({ width });
    const { data, info } = await resized.clone().raw().toBuffer({ resolveWithObject: true });
    const height = info.height;
    const slots = detectSlots(data, width, height);
    console.log(`${name}: ${width}x${height}, ${slots.length} slot`, JSON.stringify(slots));
    if (!slots.length) { console.log("  -> dilewati: tidak ada area transparan"); continue; }
    if (dry) continue;
    const buf = await resized.clone().webp({ quality: 92, alphaQuality: 100 }).toBuffer();
    const white = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#fff"/></svg>`;
    const payload = {
      name, width, height,
      background: `data:image/svg+xml;base64,${Buffer.from(white).toString("base64")}`,
      overlay: `data:image/webp;base64,${buf.toString("base64")}`,
      textConfig: { photoSlots: slots, texts: [{ text: " ", x: 0, y: 0 }] },
    };
    const id = "png-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await prisma.template.upsert({ where: { id }, update: payload, create: { id, ...payload } });
    console.log("  -> tersimpan");
  }
  if (prisma) await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
