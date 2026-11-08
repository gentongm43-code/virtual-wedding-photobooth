import MediaGallery from "@/components/admin/media-gallery";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage/storage";

export default async function AdminVoiceNotesPage() {
  await requireAdmin();
  const notes = await prisma.voiceNote.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { event: { select: { name: true } } } });
  return <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 lg:px-12"><p className="text-sm text-[#789ab2]">Workspace</p><h1 className="mt-2 font-serif text-4xl">Voice notes</h1><p className="mt-2 text-sm text-[#7e9eb5]">Pesan suara dari semua event.</p><div className="mt-8 rounded-2xl border border-[#dce4e0] bg-white p-5 sm:p-7"><MediaGallery kind="voice-note" items={notes.map((note) => ({ id: note.id, url: storage.getFileUrl(note.url, note.mimeType), downloadUrl: `/api/voice-notes/${note.id}/file`, createdAt: note.createdAt.toISOString(), durationMs: note.durationMs, mimeType: note.mimeType, size: note.size, eventName: note.event.name }))} /></div></div>;
}
