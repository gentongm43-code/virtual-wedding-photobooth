import { notFound } from "next/navigation";
import InvitationPage from "@/components/invitation/invitation-page";
import { getGuestEvent } from "@/lib/guest-event";

export const dynamic = "force-dynamic";

export default async function InvitationRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getGuestEvent(slug);
  if (!event) notFound();
  return <InvitationPage eventId={event.eventId} eventName={event.eventName} eventDate={event.eventDate} location={event.location} coverImage={event.coverImage} logo={event.logo} invitation={event.invitation} />;
}
