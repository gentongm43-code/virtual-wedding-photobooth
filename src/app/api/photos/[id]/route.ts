import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage/storage";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const photo = await prisma.photo.findUnique({ where: { id: (await params).id } });
  if (!photo) return NextResponse.json({ error: "Foto tidak ditemukan." }, { status: 404 });
  await prisma.photo.delete({ where: { id: photo.id } });
  await Promise.all([photo.originalUrl ? storage.deleteFile(photo.originalUrl) : Promise.resolve(), storage.deleteFile(photo.finalUrl), ...photo.slotUrls.map((key) => storage.deleteFile(key))]);
  return NextResponse.json({ ok: true });
}
