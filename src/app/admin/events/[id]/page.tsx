import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import EventForm from "@/components/admin/event-form";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import GuestAccess from "@/components/admin/guest-access";
import { getPublicEventUrl } from "@/lib/event-url";

export default async function EditEventPage({ params }: PageProps<"/admin/events/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [event, templates] = await Promise.all([
    prisma.event.findUnique({ where: { id }, include: { invitation: true, _count: { select: { photos: true, videos: true, voiceNotes: true, messages: true } } } }),
    prisma.template.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!event) notFound();

  const stats = [
    { label: "Foto", value: event._count.photos, href: `/admin/events/${id}/photos` },
    { label: "Video", value: event._count.videos, href: `/admin/events/${id}/videos` },
    { label: "Voice", value: event._count.voiceNotes, href: `/admin/events/${id}/voice-notes` },
    { label: "Ucapan", value: event._count.messages, href: "/admin/messages" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 py-7 sm:px-8 lg:py-10">
      <Link href="/admin/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6a8fa9]"><ArrowLeft size={15} /> Daftar event</Link>

      <header className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-serif text-3xl tracking-tight text-[#2b3a46] sm:text-4xl">{event.name}</h1>
          <p className="mt-1.5 text-sm text-[#7d9db4]">
            {event.date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${event.active ? "bg-[#eaf5ed] text-[#4c8a5a]" : "bg-[#edf2f0] text-[#7d9db4]"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${event.active ? "bg-[#5ea66a]" : "bg-[#9eb6bb]"}`} />
            {event.active ? "Aktif" : "Nonaktif"}
          </span>
          <Link href={`/event/${event.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Lihat halaman tamu" className="grid h-9 w-9 place-items-center rounded-xl border border-[#d2dee0] text-[#52758e]"><ExternalLink size={15} /></Link>
        </div>
      </header>

      <nav className="mt-5 grid grid-cols-4 gap-2">
        {stats.map(({ label, value, href }) => (
          <Link key={label} href={href} className="rounded-2xl border border-[#dbe4e0] bg-[#f8faf9] px-2 py-3 text-center transition hover:border-[#a4bbbf] hover:bg-[#f1f4f2]">
            <p className="font-serif text-xl leading-tight text-[#2b3a46]">{value}</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[#95afc2]">{label}</p>
          </Link>
        ))}
      </nav>

      <GuestAccess eventId={event.id} eventCode={event.eventCode} eventUrl={getPublicEventUrl(event.slug)} />

      <section className="mt-5 rounded-3xl border border-[#dbe4e0] bg-[#f8faf9] p-4 shadow-[0_10px_30px_rgba(71,102,124,0.05)] sm:p-6">
        <EventForm templates={templates} initial={{ ...event, date: event.date.toISOString().slice(0, 10) }} />
      </section>
    </div>
  );
}
