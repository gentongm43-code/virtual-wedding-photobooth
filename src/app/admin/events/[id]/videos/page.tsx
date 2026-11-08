import Link from "next/link";
import { notFound } from "next/navigation";
import MediaGallery from "@/components/admin/media-gallery";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage/storage";

export default async function EventVideosPage({ params }: PageProps<"/admin/events/[id]/videos">) {
  await requireAdmin();
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, include: { videos: { orderBy: { createdAt: "desc" } } } });
  if (!event) notFound();
  return <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 lg:px-12"><Link href={`/admin/events/${id}`} className="text-sm font-medium text-[#789ab2]">← Kembali ke event</Link><h1 className="mt-5 font-serif text-4xl">{event.name} · Videos</h1><div className="mt-8 rounded-2xl border border-[#dce4e0] bg-white p-5 sm:p-7"><MediaGallery kind="video" items={event.videos.map((video) => ({ id: video.id, url: storage.getFileUrl(video.url, video.mimeType), downloadUrl: `/api/videos/${video.id}/file`, createdAt: video.createdAt.toISOString(), durationMs: video.durationMs, mimeType: video.mimeType, size: video.size, eventName: event.name }))} /></div></div>;
}
