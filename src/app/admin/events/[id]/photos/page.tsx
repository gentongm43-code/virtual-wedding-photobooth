import Link from "next/link";
import { notFound } from "next/navigation";
import PhotoGallery from "@/components/admin/photo-gallery";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage/storage";
import { requireAdmin } from "@/lib/auth";

export default async function EventPhotosPage({ params }: PageProps<"/admin/events/[id]/photos">) {
  await requireAdmin();
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, include: { photos: { orderBy: { createdAt: "desc" } } } });
  if (!event) notFound();
  return <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 lg:px-12"><Link href={`/admin/events/${id}`} className="text-sm font-medium text-[#789ab2]">← Kembali ke event</Link><h1 className="mt-5 font-serif text-4xl">{event.name} · Photos</h1><div className="mt-8 rounded-2xl border border-[#dce4e0] bg-white p-5 sm:p-7"><PhotoGallery photos={event.photos.map((photo) => ({ id: photo.id, finalUrl: storage.getFileUrl(photo.finalUrl), originalUrl: photo.originalUrl ? storage.getFileUrl(photo.originalUrl) : null, createdAt: photo.createdAt.toISOString() }))} /></div></div>;
}
