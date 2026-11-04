import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PublicGalleryPage({ searchParams }: { searchParams?: Promise<{ filter?: string }> }) {
  const filter = (await searchParams)?.filter;
  const filterMap: Record<string, string> = { photos: "photo", videos: "video", voice: "voice", messages: "message" };
  const suffix = filter && filterMap[filter] ? `?filter=${filterMap[filter]}` : "";
  const event = await prisma.event.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" }, select: { slug: true } });
  if (!event) notFound();
  redirect(`/event/${encodeURIComponent(event.slug)}/gallery${suffix}`);
}
