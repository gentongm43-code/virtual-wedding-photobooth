"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { invitationDefaults, invitationFields, mergeInvitationContent } from "@/lib/invitation-content";

type TemplateOption = { id: string; name: string };
type EventInitial = { id: string; name: string; slug: string; date: string; location: string | null; description: string | null; coverImage: string | null; logo: string | null; primaryColor: string | null; secondaryColor: string | null; templateId: string | null; photoLimit: number; allowVideo: boolean; videoDuration: number; allowVoiceNote: boolean; voiceNoteDuration: number; allowMessage: boolean; allowPublicGallery: boolean; saveOriginal: boolean; active: boolean; invitation?: { data: unknown } | null };

type Tab = "umum" | "undangan" | "photobooth";
const tabs: { id: Tab; label: string }[] = [
  { id: "umum", label: "Umum" },
  { id: "undangan", label: "Undangan" },
  { id: "photobooth", label: "Photobooth" },
];

const inputClass = "mt-1.5 w-full rounded-xl border border-[#d2dee0] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#88a6bb]";
const labelClass = "block text-[13px] font-medium text-[#4e7088]";
const cleanValue = (value?: string) => { const text = value ?? ""; return text.includes("picsum.photos") || /assets\/images\/(cowo|cewe)\.webp$/.test(text) ? "" : text; };

const groups: { title: string; keys: string[] }[] = [
  { title: "Cover & sambutan", keys: ["weddingTitle", "coupleName", "quote", "dateLabel", "guestMessage"] },
  { title: "Acara", keys: ["weddingDate", "location", "mapUrl", "akadTime", "receptionTime", "dressCode"] },
  { title: "Mempelai pria", keys: ["groomName", "groomRole", "groomFather", "groomMother", "groomAddress", "groomPhoto"] },
  { title: "Mempelai wanita", keys: ["brideName", "brideRole", "brideFather", "brideMother", "brideAddress", "bridePhoto"] },
  { title: "Ayat & turut mengundang", keys: ["verseTitle", "verseOne", "verseOneSource", "verseTwo", "verseTwoSource", "turutMengundang"] },
  { title: "Kisah cinta", keys: ["storyTitle", "storyOne", "storyTwo", "storyThree"] },
  { title: "Hadiah", keys: ["giftTitle", "bankName", "bankAccount", "bankHolder", "giftHolder", "giftPhone"] },
  { title: "Galeri foto", keys: ["galleryOne", "galleryTwo", "galleryThree", "galleryFour", "galleryFive", "gallerySix"] },
  { title: "Musik & penutup", keys: ["audioUrl", "closingMessage"] },
];

const urlHints: Record<string, string> = {
  groomPhoto: "Contoh: https://link-foto-mempelai-pria.jpg (boleh dikosongkan)",
  bridePhoto: "Contoh: https://link-foto-mempelai-wanita.jpg (boleh dikosongkan)",
  mapUrl: "Contoh: https://maps.app.goo.gl/xxxx (boleh dikosongkan)",
  audioUrl: "Contoh: https://link-musik.mp3 (boleh dikosongkan)",
};
const urlHint = (key: string) => urlHints[key] ?? (key.startsWith("gallery") ? "Contoh: https://link-foto-galeri.jpg (boleh dikosongkan)" : "https://... (boleh dikosongkan)");

const fieldMap = new Map<string, { label: string; type: string }>(
  invitationFields.map(([key, label, type]) => [key as string, { label: label as string, type: type as string }]),
);
const groupedKeys = new Set(groups.flatMap((group) => group.keys));
const leftoverKeys = invitationFields.map(([key]) => key as string).filter((key) => !groupedKeys.has(key));
const allGroups = leftoverKeys.length ? [...groups, { title: "Lainnya", keys: leftoverKeys }] : groups;

function ToggleRow({ name, label, hint, defaultChecked }: { name: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-[#e0e7e3] bg-[#f8faf9] px-4 py-3.5">
      <span>
        <span className="block text-sm font-medium text-[#2b3a46]">{label}</span>
        <span className="block text-xs text-[#8aa7bc]">{hint}</span>
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-5 w-5 shrink-0 accent-[#88a6bb]" />
    </label>
  );
}

export default function EventForm({ templates, initial }: { templates: TemplateOption[]; initial?: EventInitial }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [tab, setTab] = useState<Tab>("umum");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const invitation = mergeInvitationContent(initial?.invitation?.data ?? invitationDefaults);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    // Fields on hidden tabs / closed sections cannot show native errors, so reveal the first invalid one.
    const invalid = formEl.querySelector<HTMLInputElement>(":invalid");
    if (invalid) {
      const panel = invalid.closest<HTMLElement>("[data-tab]");
      if (panel?.dataset.tab) setTab(panel.dataset.tab as Tab);
      invalid.closest("details")?.setAttribute("open", "");
      requestAnimationFrame(() => { invalid.focus(); invalid.reportValidity(); });
      return;
    }
    setSaving(true);
    setError("");
    const form = new FormData(formEl);
    const response = await fetch(initial ? `/api/admin/events/${initial.id}` : "/api/admin/events", { method: initial ? "PATCH" : "POST", body: form });
    if (response.ok) router.push("/admin/events");
    else { const data = await response.json().catch(() => ({})); setError(data.error ?? "Event gagal disimpan."); setSaving(false); }
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[#e9eeec] p-1" role="tablist">
        {tabs.map(({ id, label }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${tab === id ? "bg-white text-[#2b3a46] shadow-sm" : "text-[#7d9db4]"}`}>
            {label}
          </button>
        ))}
      </div>

      <div data-tab="umum" hidden={tab !== "umum"} className="mt-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Nama event<input name="name" required defaultValue={initial?.name} className={inputClass} placeholder="Nama pasangan" /></label>
          <label className={labelClass}>Slug (link tamu)<input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required={Boolean(initial)} defaultValue={initial?.slug} className={inputClass} placeholder="putri-mahfud" />
            {!initial && <span className="mt-1 block text-xs font-normal text-[#8eaabe]">Kosongkan agar dibuat otomatis dari nama.</span>}
          </label>
          <label className={labelClass}>Tanggal<input name="date" required type="date" defaultValue={initial?.date} className={inputClass} /></label>
          <label className={labelClass}>Lokasi<input name="location" defaultValue={initial?.location ?? ""} className={inputClass} placeholder="Kota / venue" /></label>
          <label className={`${labelClass} sm:col-span-2`}>Deskripsi undangan<textarea name="description" defaultValue={initial?.description ?? ""} rows={3} className={inputClass} placeholder="Cerita singkat untuk tamu" /></label>
          <label className={labelClass}>URL cover / foto photobooth<input name="coverImage" type="url" defaultValue={initial?.coverImage ?? ""} className={inputClass} placeholder="https://..." /></label>
          <label className={labelClass}>URL logo<input name="logo" type="url" defaultValue={initial?.logo ?? ""} className={inputClass} placeholder="https://..." /></label>
          <label className={labelClass}>Warna utama<input name="primaryColor" type="color" defaultValue={initial?.primaryColor ?? "#293743"} className="mt-1.5 h-11 w-full cursor-pointer rounded-xl border border-[#d2dee0] bg-white p-1" /></label>
          <label className={labelClass}>Warna sekunder<input name="secondaryColor" type="color" defaultValue={initial?.secondaryColor ?? "#c9d7da"} className="mt-1.5 h-11 w-full cursor-pointer rounded-xl border border-[#d2dee0] bg-white p-1" /></label>
        </div>
      </div>

      <div data-tab="undangan" hidden={tab !== "undangan"} className="mt-5 space-y-2.5">
        <p className="px-1 text-xs text-[#8aa7bc]">Ketuk bagian untuk membuka dan mengedit isinya.</p>
        {allGroups.map(({ title, keys }, index) => {
          const filled = keys.filter((key) => cleanValue(invitation[key]).trim()).length;
          return (
            <details key={title} open={index === 0 || undefined} className="group rounded-2xl border border-[#e0e7e3] bg-[#f8faf9]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-semibold text-[#2b3a46]">{title}</span>
                <span className="flex items-center gap-2 text-xs text-[#95afc2]">{filled}/{keys.length} terisi<ChevronDown size={16} className="transition group-open:rotate-180" /></span>
              </summary>
              <div className="grid gap-4 border-t border-[#e4eae7] px-4 py-4 sm:grid-cols-2">
                {keys.map((key) => {
                  const field = fieldMap.get(key);
                  if (!field) return null;
                  return (
                    <label key={key} className={`${labelClass} ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
                      {field.label}
                      {field.type === "textarea" ? (
                        <textarea name={`invitation_${key}`} defaultValue={invitation[key] ?? ""} rows={3} placeholder="Opsional" className={inputClass} />
                      ) : (
                        <input name={`invitation_${key}`} type={field.type === "url" ? "text" : field.type} inputMode={field.type === "url" ? "url" : undefined} defaultValue={cleanValue(invitation[key])} placeholder={field.type === "url" ? urlHint(key) : "Opsional"} className={inputClass} />
                      )}
                    </label>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>

      <div data-tab="photobooth" hidden={tab !== "photobooth"} className="mt-5 space-y-3">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Template frame<select name="templateId" defaultValue={initial?.templateId ?? ""} className={inputClass}><option value="">Tanpa template</option>{templates.map((template) => <option value={template.id} key={template.id}>{template.name}</option>)}</select></label>
          <label className={labelClass}>Jumlah foto<select name="photoLimit" defaultValue={String(initial?.photoLimit ?? 1)} className={inputClass}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} foto</option>)}</select></label>
        </div>
        <Link href="/admin/templates" className="inline-flex w-fit rounded-xl border border-[#d2dee0] px-3 py-2 text-xs font-semibold text-[#638aa6]">Kelola frame →</Link>

        <div className="rounded-2xl border border-[#e0e7e3] bg-[#f8faf9] px-4 py-3.5">
          <label className="flex items-center justify-between gap-4">
            <span><span className="block text-sm font-medium text-[#2b3a46]">Izinkan video</span><span className="block text-xs text-[#8aa7bc]">Tamu bisa merekam video singkat.</span></span>
            <input type="checkbox" name="allowVideo" defaultChecked={initial?.allowVideo ?? true} className="h-5 w-5 shrink-0 accent-[#88a6bb]" />
          </label>
          <div className="mt-3 flex items-center gap-2 text-xs text-[#7e9eb5]">Durasi maksimal <input name="videoDuration" type="number" min="1" max="120" defaultValue={initial?.videoDuration ?? 120} className="w-20 rounded-lg border border-[#d2dee0] px-3 py-2 text-sm text-[#2b3a46]" aria-label="Durasi video (detik)" /> detik</div>
        </div>
        <div className="rounded-2xl border border-[#e0e7e3] bg-[#f8faf9] px-4 py-3.5">
          <label className="flex items-center justify-between gap-4">
            <span><span className="block text-sm font-medium text-[#2b3a46]">Izinkan voice note</span><span className="block text-xs text-[#8aa7bc]">Tamu bisa merekam pesan suara.</span></span>
            <input type="checkbox" name="allowVoiceNote" defaultChecked={initial?.allowVoiceNote ?? true} className="h-5 w-5 shrink-0 accent-[#88a6bb]" />
          </label>
          <div className="mt-3 flex items-center gap-2 text-xs text-[#7e9eb5]">Durasi maksimal <input name="voiceNoteDuration" type="number" min="1" max="600" defaultValue={initial?.voiceNoteDuration ?? 60} className="w-20 rounded-lg border border-[#d2dee0] px-3 py-2 text-sm text-[#2b3a46]" aria-label="Durasi voice note (detik)" /> detik</div>
        </div>
        <ToggleRow name="allowMessage" label="Izinkan ucapan" hint="Tamu bisa menulis ucapan." defaultChecked={Boolean(initial?.allowMessage)} />
        <ToggleRow name="allowPublicGallery" label="Galeri publik" hint="Tamu bisa melihat galeri event." defaultChecked={initial?.allowPublicGallery ?? true} />
        <ToggleRow name="saveOriginal" label="Simpan original" hint="Simpan file asli tanpa kompresi." defaultChecked={Boolean(initial?.saveOriginal)} />
        <ToggleRow name="active" label="Event aktif" hint="Event yang tampil untuk tamu." defaultChecked={initial?.active ?? true} />
      </div>

      <div className="sticky bottom-20 z-10 mt-6 md:bottom-4">
        {error && <p className="mb-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button disabled={saving} className="w-full rounded-xl bg-[#2b3a46] px-4 py-3.5 font-semibold text-white shadow-[0_8px_24px_rgba(43,58,70,0.25)] transition hover:bg-[#3d5264] disabled:opacity-60">{saving ? "Menyimpan..." : initial ? "Simpan perubahan" : "Simpan event"}</button>
      </div>
    </form>
  );
}
