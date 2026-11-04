import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { GuestExperienceProps } from "@/components/photobooth/guest-experience";
import type { PreviewTemplate } from "@/components/photobooth/photo-preview";
import { configFromTemplateRecord } from "@/lib/image/template-config";
import { mergeInvitationContent } from "@/lib/invitation-content";

async function withDatabaseRetry<T>(query: () => Promise<T>): Promise<T> {
  try {
    return await query();
  } catch (error) {
    const isConnectionError =
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P1001");
    if (!isConnectionError) throw error;
    await new Promise((resolve) => setTimeout(resolve, 500));
    return query();
  }
}

async function getFrames(): Promise<PreviewTemplate[]> {
  const rawFrames = await withDatabaseRetry(() => prisma.template.findMany({
    select: { id: true, name: true, width: true, height: true, background: true, overlay: true, logo: true, textConfig: true },
    orderBy: { createdAt: "asc" },
  }));

  return rawFrames.map((frame): PreviewTemplate => {
    const config = configFromTemplateRecord(frame);
    return {
      ...frame,
      textConfig: { photoSlots: config.photoSlots, texts: config.texts },
    };
  });
}

export async function getGuestEvent(slug?: string): Promise<GuestExperienceProps | null> {
  const event = await withDatabaseRetry(() => slug
    ? prisma.event.findUnique({ where: { slug }, include: { invitation: true } })
    : prisma.event.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" }, include: { invitation: true } }));

  if (!event || !event.active) return null;

  return {
    eventId: event.slug,
    eventName: event.name,
    eventDate: event.date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
    location: event.location,
    description: event.description,
    coverImage: event.coverImage,
    logo: event.logo,
    primaryColor: event.primaryColor,
    secondaryColor: event.secondaryColor,
    templateId: event.templateId,
    frames: await getFrames(),
    allowMessage: event.allowMessage,
    defaultPhotoCount: event.photoLimit,
    allowVideo: event.allowVideo,
    videoDuration: event.videoDuration,
    allowVoiceNote: event.allowVoiceNote,
    voiceNoteDuration: event.voiceNoteDuration,
    invitation: mergeInvitationContent(event.invitation?.data),
  };
}
