import fs from "node:fs";
import sharp from "sharp";

async function main() {
  const [file, name, slotsArg, textsArg] = process.argv.slice(2);
  if (!file || !fs.existsSync(file)) { console.error("File PNG tidak ditemukan:", file); process.exit(1); }
  const img = sharp(file);
  const meta = await img.metadata();
  const width = Math.min(meta.width ?? 1080, 1080);
  const buf = await img.resize({ width }).webp({ quality: 92, alphaQuality: 100 }).toBuffer();
  const height = (await sharp(buf).metadata()).height ?? 1620;
  console.log(`Ukuran frame setelah diperkecil: ${width} x ${height}`);
  if (!name || !slotsArg) { console.log("Tambahkan nama dan slots foto untuk menyimpan."); return; }
  const photoSlots = JSON.parse(slotsArg);
  const texts = textsArg ? JSON.parse(textsArg) : [{ text: " ", x: 0, y: 0 }];
  const white = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#fff"/></svg>`;
  const data = {
    name, width, height,
    background: `data:image/svg+xml;base64,${Buffer.from(white).toString("base64")}`,
    overlay: `data:image/webp;base64,${buf.toString("base64")}`,
    textConfig: { photoSlots, texts },
  };
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const id = "png-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await prisma.template.upsert({ where: { id }, update: data, create: { id, ...data } });
  console.log("Frame tersimpan:", name);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
