/* Gallery media URLs are served through the existing storage abstraction. */
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage/storage";
import EventGallery from "@/components/event-gallery";

export default async function EventGalleryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<{ filter?: string }> }) {
  const { slug } = await params;
  const filter = (await searchParams)?.filter ?? "all";
  const event = await prisma.event.findUnique({
    where: { slug },
    include: { photos: { orderBy: { createdAt: "desc" } }, videos: { orderBy: { createdAt: "desc" } }, voiceNotes: { orderBy: { createdAt: "desc" } }, messages: { orderBy: { createdAt: "desc" } } },
  });
  if (!event) notFound();
  if (!event.active) return <main className="grid min-h-screen place-items-center bg-[#f1f4f2] px-6 text-center"><p>Event sedang tidak tersedia.</p></main>;
  if (!event.allowPublicGallery) return <main className="grid min-h-screen place-items-center bg-[#f1f4f2] px-6 text-center"><p>Galeri untuk event ini tidak tersedia untuk publik.</p></main>;
  const memories = new Map<string, {
    id: string;
    eventId: string;
    guestSessionId: string | null;
    photos: { id: string; url: string; createdAt: string }[];
    videos: { id: string; url: string; durationMs: number | null; createdAt: string }[];
    voiceNotes: { id: string; url: string; durationMs: number | null; createdAt: string }[];
    messages: { id: string; content: string; name: string | null; createdAt: string }[];
    createdAt: string;
    guestName: string | null;
  }>();
  const getMemory = (sessionId: string | null, fallbackId: string) => {
    const key = `${event.id}:${sessionId ?? `standalone-${fallbackId}`}`;
    let memory = memories.get(key);
    if (!memory) {
      memory = { id: key, eventId: event.id, guestSessionId: sessionId, photos: [], videos: [], voiceNotes: [], messages: [], createdAt: new Date().toISOString(), guestName: null };
      memories.set(key, memory);
    }
    return memory;
  };
  for (const photo of event.photos) {
    const memory = getMemory(photo.sessionId, photo.id);
    memory.photos.push({ id: photo.id, url: storage.getFileUrl(photo.finalUrl), createdAt: photo.createdAt.toISOString() });
    if (photo.createdAt < new Date(memory.createdAt)) memory.createdAt = photo.createdAt.toISOString();
  }
  for (const video of event.videos) {
    const memory = getMemory(video.sessionId, video.id);
    memory.videos.push({ id: video.id, url: storage.getFileUrl(video.url, video.mimeType), durationMs: video.durationMs, createdAt: video.createdAt.toISOString() });
    if (video.createdAt < new Date(memory.createdAt)) memory.createdAt = video.createdAt.toISOString();
  }
  for (const voice of event.voiceNotes) {
    const memory = getMemory(voice.sessionId, voice.id);
    memory.voiceNotes.push({ id: voice.id, url: storage.getFileUrl(voice.url, voice.mimeType), durationMs: voice.durationMs, createdAt: voice.createdAt.toISOString() });
    if (voice.createdAt < new Date(memory.createdAt)) memory.createdAt = voice.createdAt.toISOString();
  }
  for (const message of event.messages) {
    const memory = getMemory(message.sessionId, message.id);
    memory.messages.push({ id: message.id, content: message.content, name: message.name, createdAt: message.createdAt.toISOString() });
    memory.guestName ||= message.name;
    if (message.createdAt < new Date(memory.createdAt)) memory.createdAt = message.createdAt.toISOString();
  }
  return <EventGallery eventName={event.name} slug={event.slug} initialFilter={filter} memories={[...memories.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())} />;
}
