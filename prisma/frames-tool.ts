/**
 * Alat audit & edit frame (Template) dari terminal.
 *
 *   npx tsx prisma/frames-tool.ts list
 *   npx tsx prisma/frames-tool.ts delete-broken
 *   npx tsx prisma/frames-tool.ts delete <id> [<id> ...]
 *   npx tsx prisma/frames-tool.ts show <id>
 *   npx tsx prisma/frames-tool.ts set-slots <id> '<json>'
 *   npx tsx prisma/frames-tool.ts rename <id> "Nama Baru"
 */
import { PrismaClient } from "@prisma/client";
import { createInterface } from "node:readline/promises";

const MAX_SLOTS = 4; // batas aplikasi (photo-session.tsx memakai Math.min(4, ...))
type Slot = { x: number; y: number; width: number; height: number };
const prisma = new PrismaClient();

function slotsOf(textConfig: unknown): Slot[] {
  const raw = (textConfig as { photoSlots?: unknown } | null)?.photoSlots;
  return Array.isArray(raw) ? (raw as Slot[]) : [];
}

function overlap(a: Slot, b: Slot) {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? (w * h) / Math.min(a.width * a.height, b.width * b.height) : 0;
}

function problems(t: { width: number; height: number; overlay: string | null; textConfig: unknown }) {
  const slots = slotsOf(t.textConfig);
  const issues: string[] = [];
  let broken = false;
  if (!slots.length) { issues.push("tanpa slot foto"); broken = true; }
  if (slots.length > MAX_SLOTS) { issues.push(`${slots.length} slot (maks ${MAX_SLOTS})`); broken = true; }
  if (!t.overlay) { issues.push("tanpa overlay PNG"); broken = true; }
  const frameArea = t.width * t.height;
  slots.forEach((s, i) => {
    if (s.width * s.height < frameArea * 0.015) issues.push(`slot ${i + 1} terlalu kecil`);
    if (s.width * s.height > frameArea * 0.6) issues.push(`slot ${i + 1} terlalu besar`);
    if (s.x + s.width > t.width + 1 || s.y + s.height > t.height + 1) issues.push(`slot ${i + 1} keluar frame`);
  });
  for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
    if (overlap(slots[i], slots[j]) > 0.2) issues.push(`slot ${i + 1} & ${j + 1} tumpang tindih`);
  }
  return { slots, issues, broken };
}

async function confirm(question: string) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} (ketik "ya" untuk lanjut): `)).trim().toLowerCase();
  rl.close();
  return answer === "ya";
}

async function list() {
  const templates = await prisma.template.findMany({ orderBy: { name: "asc" } });
  const pad = (v: string | number, n: number) => String(v).padEnd(n);
  console.log(`${pad("STATUS", 8)}${pad("ID", 38)}${pad("NAMA", 28)}${pad("UKURAN", 11)}SLOT  CATATAN`);
  let bad = 0;
  for (const t of templates) {
    const { slots, issues, broken } = problems(t);
    if (broken) bad++;
    console.log(`${pad(broken ? "RUSAK" : issues.length ? "CEK" : "ok", 8)}${pad(t.id, 38)}${pad(t.name, 28)}${pad(`${t.width}x${t.height}`, 11)}${pad(slots.length, 6)}${issues.join("; ")}`);
  }
  console.log(`\nTotal ${templates.length} frame, ${bad} rusak.`);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "list") return list();

  if (cmd === "show") {
    const t = await prisma.template.findUnique({ where: { id: rest[0] ?? "" } });
    if (!t) return console.error("Frame tidak ditemukan. Cek ID dengan: list");
    console.log(JSON.stringify({ id: t.id, name: t.name, width: t.width, height: t.height, textConfig: t.textConfig }, null, 2));
    return;
  }

  if (cmd === "delete-broken") {
    const bad = (await prisma.template.findMany()).filter((t) => problems(t).broken);
    if (!bad.length) return console.log("Tidak ada frame rusak.");
    bad.forEach((t) => console.log(`- ${t.id}  ${t.name}  (${problems(t).issues.join("; ")})`));
    if (!(await confirm(`\nHapus ${bad.length} frame di atas?`))) return console.log("Dibatalkan.");
    const r = await prisma.template.deleteMany({ where: { id: { in: bad.map((t) => t.id) } } });
    return console.log(`${r.count} frame dihapus.`);
  }

  if (cmd === "delete") {
    if (!rest.length) return console.error("Pemakaian: delete <id> [<id> ...]");
    const found = await prisma.template.findMany({ where: { id: { in: rest } } });
    found.forEach((t) => console.log(`- ${t.id}  ${t.name}`));
    if (!found.length) return console.log("Tidak ada yang cocok.");
    if (!(await confirm(`\nHapus ${found.length} frame di atas?`))) return console.log("Dibatalkan.");
    const r = await prisma.template.deleteMany({ where: { id: { in: found.map((t) => t.id) } } });
    return console.log(`${r.count} frame dihapus.`);
  }

  if (cmd === "set-slots") {
    const [id, json] = rest;
    if (!id || !json) return console.error(`Pemakaian: set-slots <id> '[{"x":0,"y":0,"width":100,"height":100}]'`);
    const slots = JSON.parse(json) as Slot[];
    const valid = Array.isArray(slots) && slots.length >= 1 && slots.length <= MAX_SLOTS &&
      slots.every((s) => [s.x, s.y, s.width, s.height].every((n) => Number.isFinite(n)) && s.width > 0 && s.height > 0);
    if (!valid) return console.error(`Slot tidak valid: harus 1-${MAX_SLOTS} objek dengan x, y, width, height berupa angka.`);
    const t = await prisma.template.findUnique({ where: { id } });
    if (!t) return console.error("Frame tidak ditemukan. Cek ID dengan: list");
    const textConfig = { ...((t.textConfig as object | null) ?? {}), photoSlots: slots };
    await prisma.template.update({ where: { id }, data: { textConfig } });
    return console.log(`Slot "${t.name}" diperbarui (${slots.length} slot).`);
  }

  if (cmd === "rename") {
    const [id, name] = rest;
    if (!id || !name) return console.error(`Pemakaian: rename <id> "Nama Baru"`);
    await prisma.template.update({ where: { id }, data: { name } });
    return console.log("Nama diperbarui.");
  }

  console.log("Perintah: list | show <id> | delete-broken | delete <id>... | set-slots <id> '<json>' | rename <id> \"Nama\"");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
