import Link from "next/link";
import EventForm from "@/components/admin/event-form";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export default async function NewEventPage() {
  await requireAdmin();
  const templates = await prisma.template.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <div className="mx-auto max-w-4xl px-6 py-8 sm:px-10 lg:px-12"><Link href="/admin/events" className="text-sm font-medium text-[#789ab2]">← Kembali ke events</Link><h1 className="mt-5 font-serif text-4xl">Buat event baru</h1><p className="mt-2 text-sm text-[#7e9eb5]">Siapkan ruang digital untuk tamu berbagi momen.</p><div className="mt-8 rounded-2xl border border-[#dce4e0] bg-white p-6 sm:p-8"><EventForm templates={templates} /></div></div>;
}
