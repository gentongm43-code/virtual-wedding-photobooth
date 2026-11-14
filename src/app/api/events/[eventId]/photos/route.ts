import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { processPhotoWithSlot } from "@/lib/image/process-photo";
import { configFromTemplateRecord, normalizeTemplate } from "@/lib/image/template-config";
import { storage } from "@/lib/storage/storage";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function contentTypeFor(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const form = await request.formData();
  const file = form.get("file");
  const sessionId = form.get("sessionId");
  const templateId = form.get("templateId");
  const filter = form.get("filter");
  if (!(file instanceof File) || typeof sessionId !== "string") return NextResponse.json({ error: "File dan session wajib diisi." }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Ukuran foto maksimal 10 MB." }, { status: 413 });
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Format foto harus JPEG, PNG, atau WebP." }, { status: 415 });
  const event = await prisma.event.findFirst({ where: { OR: [{ id: eventId }, { slug: eventId }], active: true }, include: { template: true } });
  const session = await prisma.guestSession.findUnique({ where: { id: sessionId } });
  if (!event || !session || session.eventId !== event.id || session.status !== "ACTIVE") return NextResponse.json({ error: "Sesi foto tidak valid." }, { status: 403 });
  const input = Buffer.from(await file.arrayBuffer());
  if (contentTypeFor(input) !== file.type) return NextResponse.json({ error: "Isi file bukan gambar yang valid." }, { status: 415 });
  let originalKey: string | null = null;
  let finalKey: string | null = null;
  let slotKey: string | null = null;
  try {
    const template = typeof templateId === "string" && templateId
      ? await prisma.template.findUnique({ where: { id: templateId } })
      : event.template;
    if (typeof templateId === "string" && templateId && !template) {
      return NextResponse.json({ error: "Template foto tidak valid." }, { status: 400 });
    }
    const metadata = await sharp(input).metadata();
    if (!metadata.width || !metadata.height) throw new Error("Invalid image dimensions.");
    const original = await sharp(input).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    const templateConfig = template ? configFromTemplateRecord(template) : normalizeTemplate({});
    const slotCount = templateConfig.photoSlots.length;
    // Template multi-slot: foto berikutnya digabung ke foto sesi yang belum penuh.
    const existing = slotCount > 1
      ? await prisma.photo.findFirst({ where: { sessionId, eventId: event.id, slotCount }, orderBy: { createdAt: "desc" } })
      : null;
    const target = existing && existing.slotUrls.length > 0 && existing.slotUrls.length < slotCount ? existing : null;
    if (!target) {
      const photoCount = await prisma.photo.count({ where: { sessionId, eventId: event.id } });
      if (photoCount >= event.photoLimit) return NextResponse.json({ error: "Batas foto untuk sesi ini sudah tercapai." }, { status: 429 });
    }
    const slotIndex = target ? target.slotUrls.length : 0;
    originalKey = event.saveOriginal ? await storage.uploadFile({ data: original, contentType: "image/jpeg", extension: "jpg" }) : null;
    const previousSlots = target ? await Promise.all(target.slotUrls.map((key) => storage.readFile(key))) : [];
    const { final, slot } = await processPhotoWithSlot({
      original,
      template: templateConfig,
      photoIndex: slotIndex,
      previousSlots,
      filter: typeof filter === "string" ? filter : null,
      variables: { eventName: event.name, eventDate: event.date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }), location: event.location ?? "" },
    });
    finalKey = await storage.uploadFile({ data: final, contentType: "image/jpeg", extension: "jpg" });
    if (slotCount > 1 && slot) slotKey = await storage.uploadFile({ data: slot, contentType: "image/png", extension: "png" });
    let photo;
    if (target) {
      const oldFinal = target.finalUrl;
      photo = await prisma.photo.update({
        where: { id: target.id },
        data: { finalUrl: finalKey, slotUrls: slotKey ? [...target.slotUrls, slotKey] : target.slotUrls, originalUrl: target.originalUrl ?? originalKey },
      });
      await storage.deleteFile(oldFinal).catch(() => undefined);
      if (target.originalUrl && originalKey) { await storage.deleteFile(originalKey).catch(() => undefined); originalKey = null; }
    } else {
      photo = await prisma.photo.create({ data: { eventId: event.id, sessionId, originalUrl: originalKey, finalUrl: finalKey, slotCount, slotUrls: slotKey ? [slotKey] : [] } });
    }
    return NextResponse.json({ id: photo.id, originalUrl: originalKey ? storage.getFileUrl(originalKey) : null, finalUrl: storage.getFileUrl(finalKey) }, { status: 201 });
  } catch (error) {
    if (originalKey) await storage.deleteFile(originalKey);
    if (finalKey) await storage.deleteFile(finalKey);
    if (slotKey) await storage.deleteFile(slotKey);
    if (process.env.NODE_ENV === "development") console.error(error);
    return NextResponse.json({ error: "Foto gagal diproses. Silakan coba lagi." }, { status: 500 });
  }
}
