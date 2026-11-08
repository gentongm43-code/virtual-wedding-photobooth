import { ChevronDown, Plus } from "lucide-react";
import TemplateForm from "@/components/admin/template-form";
import { PhotoPreview, type PreviewTemplate } from "@/components/photobooth/photo-preview";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { configFromTemplateRecord } from "@/lib/image/template-config";

export default async function TemplatesPage() {
  await requireAdmin();
  const [templates, activeEvent] = await Promise.all([
    prisma.template.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { events: true } } } }),
    prisma.event.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" }, select: { name: true, date: true, location: true } }),
  ]);
  const previewEvent = activeEvent ?? { name: "Preview event", date: new Date(), location: null };

  return (
    <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8 lg:py-10">
      <header>
        <p className="text-sm text-[#6a8fa9]">{templates.length} template</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight text-[#2b3a46] sm:text-4xl">Template Frame</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7d9db4]">Frame photo booth yang dipakai di picker, kamera, preview, dan hasil akhir.</p>
      </header>

      <details className="group mt-6 rounded-3xl border border-[#dbe4e0] bg-[#f8faf9] shadow-[0_10px_30px_rgba(71,102,124,0.05)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#88a6bb] text-white"><Plus size={18} /></span>
            <span>
              <span className="block text-sm font-semibold text-[#2b3a46]">Template baru</span>
              <span className="block text-xs text-[#8aa7bc]">Atur kanvas, gambar, dan slot foto</span>
            </span>
          </span>
          <ChevronDown size={18} className="shrink-0 text-[#95afc2] transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-[#e4eae7] px-5 pb-5">
          <TemplateForm />
        </div>
      </details>

      <section className="mt-8">
        <h2 className="px-1 text-xs font-bold uppercase tracking-[0.18em] text-[#92aeb4]">Frame tersedia</h2>
        {templates.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-[#dbe4e0] bg-[#f8faf9] p-8 text-center text-sm text-[#7d9db4]">Belum ada template. Buat yang pertama di atas.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {templates.map((template) => {
              const config = configFromTemplateRecord(template);
              const preview: PreviewTemplate = { id: template.id, name: template.name, width: template.width, height: template.height, background: template.background ? `/api/templates/${template.id}/preview?v=${template.background.length}` : null, overlay: template.overlay, logo: template.logo, textConfig: { photoSlots: config.photoSlots, texts: config.texts } };
              const used = template._count.events;
              return (
                <article key={template.id} style={{ contentVisibility: "auto", containIntrinsicSize: "0 340px" }} className="overflow-hidden rounded-2xl border border-[#dbe4e0] bg-[#f8faf9] shadow-[0_6px_20px_rgba(71,102,124,0.04)]">
                  <div className="bg-[#e9eeec] p-2.5">
                    <PhotoPreview template={preview} eventName={previewEvent.name} eventDate={previewEvent.date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })} location={previewEvent.location} />
                  </div>
                  <div className="px-3.5 py-3">
                    <h3 className="truncate text-sm font-semibold text-[#2b3a46]">{template.name}</h3>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-[#8aa7bc]">
                      <span>{template.width}×{template.height}</span>
                      <span className={`inline-flex items-center gap-1 font-semibold ${used ? "text-[#4c8a5a]" : "text-[#95afc2]"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${used ? "bg-[#5ea66a]" : "bg-[#b5c8cb]"}`} />
                        {used ? `${used} event` : "Siap dipakai"}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
