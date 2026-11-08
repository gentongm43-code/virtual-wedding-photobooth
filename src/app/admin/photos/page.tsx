import PhotoGallery from "@/components/admin/photo-gallery";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage/storage";
import { requireAdmin } from "@/lib/auth";

export default async function AdminPhotosPage() {
  await requireAdmin();
  const photos = await prisma.photo.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 lg:px-12"><p className="text-sm text-[#789ab2]">Workspace</p><h1 className="mt-2 font-serif text-4xl">Photos</h1><p className="mt-2 text-sm text-[#7e9eb5]">Semua foto final dari event yang tersimpan.</p><div className="mt-8 rounded-2xl border border-[#dce4e0] bg-white p-5 sm:p-7"><PhotoGallery photos={photos.map((photo) => ({ id: photo.id, finalUrl: storage.getFileUrl(photo.finalUrl), originalUrl: photo.originalUrl ? storage.getFileUrl(photo.originalUrl) : null, createdAt: photo.createdAt.toISOString() }))} /></div></div>;
}
