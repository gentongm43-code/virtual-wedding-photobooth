import MediaGallery from "@/components/admin/media-gallery";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage/storage";

export default async function AdminVideosPage() {
  await requireAdmin();
  const videos = await prisma.video.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { event: { select: { name: true } } } });
  return <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 lg:px-12"><p className="text-sm text-[#789ab2]">Workspace</p><h1 className="mt-2 font-serif text-4xl">Videos</h1><p className="mt-2 text-sm text-[#7e9eb5]">Video guestbook dari semua event.</p><div className="mt-8 rounded-2xl border border-[#dce4e0] bg-white p-5 sm:p-7"><MediaGallery kind="video" items={videos.map((video) => ({ id: video.id, url: storage.getFileUrl(video.url, video.mimeType), downloadUrl: `/api/videos/${video.id}/file`, createdAt: video.createdAt.toISOString(), durationMs: video.durationMs, mimeType: video.mimeType, size: video.size, eventName: video.event.name }))} /></div></div>;
}
