import Link from "next/link";
import { notFound } from "next/navigation";
import EventForm from "@/components/admin/event-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function InvitationAdminPage() {
  await requireAdmin();
  const [event, templates] = await Promise.all([
    prisma.event.findFirst({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
      include: { invitation: true },
    }),
    prisma.template.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!event) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 sm:px-10 lg:px-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[#6a8fa9]">Workspace terpadu</p>
          <h1 className="mt-2 font-serif text-4xl">Undangan &amp; Photo Booth</h1>
          <p className="mt-2 text-sm text-[#7e9eb5]">Kelola isi undangan, tampilan event, dan fitur Wedding Photobooth dari formulir yang sama.</p>
        </div>
        <Link href={`/event/${event.slug}`} target="_blank" className="rounded-xl border border-[#cddadd] px-4 py-3 text-sm font-semibold text-[#638aa6]">Lihat undangan ↗</Link>
      </div>
      <div className="mt-8 rounded-2xl border border-[#dce4e0] bg-white p-6 sm:p-8">
        <EventForm templates={templates} initial={{ ...event, date: event.date.toISOString().slice(0, 10) }} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Link href={`/admin/events/${event.id}/photos`} className="rounded-2xl border border-[#dce4e0] bg-white p-4 text-sm font-semibold text-[#638aa6]">Kelola foto tamu →</Link>
        <Link href={`/admin/events/${event.id}/videos`} className="rounded-2xl border border-[#dce4e0] bg-white p-4 text-sm font-semibold text-[#638aa6]">Kelola video tamu →</Link>
        <Link href={`/admin/events/${event.id}/voice-notes`} className="rounded-2xl border border-[#dce4e0] bg-white p-4 text-sm font-semibold text-[#638aa6]">Kelola voice note →</Link>
      </div>
    </div>
  );
}
