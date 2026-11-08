"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { DEFAULT_TEMPLATE } from "@/lib/image/template-config";

type TemplateRecord = {
  id?: string;
  name?: string | null;
  width?: number | null;
  height?: number | null;
  background?: string | null;
  overlay?: string | null;
  logo?: string | null;
  textConfig?: unknown;
};

const inputClass = "mt-1.5 w-full rounded-xl border border-[#d2dee0] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#88a6bb]";
const labelClass = "block text-[13px] font-medium text-[#4e7088]";
const hintClass = "block text-[11px] font-normal text-[#95afc2]";

export default function TemplateForm({ template }: { template?: TemplateRecord | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const config = template?.textConfig && typeof template.textConfig === "object" ? template.textConfig : { photoSlots: DEFAULT_TEMPLATE.photoSlots, texts: DEFAULT_TEMPLATE.texts };
  const defaultConfig = JSON.stringify(config, null, 2);
  const isEditing = Boolean(template?.id);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setSaved(false);
    try {
      JSON.parse(String(form.get("textConfig") ?? ""));
    } catch {
      setAdvanced(true);
      setError("Konfigurasi JSON tidak valid. Perbaiki di bagian Lanjutan.");
      return;
    }

    setSaving(true);
    const method = isEditing ? "PUT" : "POST";
    if (isEditing) form.set("id", template!.id!);
    const response = await fetch("/api/admin/templates", { method, body: form });
    setSaving(false);
    if (response.ok) {
      setError("");
      setSaved(true);
      if (!isEditing) formEl.reset();
      router.refresh();
      return;
    }
    const payload = await response.json().catch(() => ({}));
    setError(payload.error || "Template gagal disimpan.");
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <label className={`${labelClass} col-span-2`}>Nama template<input required name="name" defaultValue={template?.name ?? ""} className={inputClass} placeholder="Warm Editorial" /></label>
        <label className={labelClass}>Lebar (px)<input required name="width" type="number" inputMode="numeric" defaultValue={String(template?.width ?? 1080)} className={inputClass} /></label>
        <label className={labelClass}>Tinggi (px)<input required name="height" type="number" inputMode="numeric" defaultValue={String(template?.height ?? 1350)} className={inputClass} /></label>
      </div>

      <div className="space-y-3 rounded-2xl border border-[#e2eae6] bg-[#f7f9f8] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a8fa9]">Gambar (URL)</p>
        <label className={labelClass}>Background<span className={hintClass}>Kanvas final</span><input name="background" type="url" defaultValue={template?.background ?? ""} className={inputClass} placeholder="https://..." /></label>
        <label className={labelClass}>Overlay dekorasi<span className={hintClass}>Border / ornamen</span><input name="overlay" type="url" defaultValue={template?.overlay ?? ""} className={inputClass} placeholder="https://..." /></label>
        <label className={labelClass}>Logo<span className={hintClass}>Opsional</span><input name="logo" type="url" defaultValue={template?.logo ?? ""} className={inputClass} placeholder="https://..." /></label>
      </div>

      <details open={advanced} onToggle={(event) => setAdvanced(event.currentTarget.open)} className="group rounded-2xl border border-[#e0e7e3] bg-[#f8faf9]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-sm font-semibold text-[#2b3a46]">Lanjutan: slot foto &amp; teks</span>
            <span className="block text-xs text-[#8aa7bc]">Konfigurasi JSON, sudah terisi nilai bawaan.</span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-[#95afc2] transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-[#e4eae7] px-4 py-4">
          <label className={labelClass}>Photo slots &amp; teks<span className={hintClass}>Pakai <code>photoSlots</code> untuk area foto, dan <code>{"{{eventName}}"}</code> untuk teks dinamis.</span>
            <textarea name="textConfig" defaultValue={defaultConfig} rows={12} className="mt-1.5 w-full rounded-xl border border-[#d2dee0] bg-white px-3 py-3 font-mono text-xs leading-5 outline-none focus:border-[#88a6bb]" />
          </label>
        </div>
      </details>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {saved && !error && <p className="rounded-xl bg-[#eaf5ed] px-4 py-3 text-sm text-[#4c8a5a]">Template berhasil disimpan.</p>}
      <button disabled={saving} className="w-full rounded-xl bg-[#2b3a46] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#3d5264] disabled:opacity-60">{saving ? "Menyimpan..." : isEditing ? "Simpan perubahan" : "Simpan template"}</button>
    </form>
  );
}
