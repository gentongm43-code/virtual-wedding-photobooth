"use client";

/* Authenticated QR image is served dynamically and should not be optimized or cached by next/image. */
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Copy, Download, Files, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = { eventId: string; eventCode: string; eventUrl: string };

export default function GuestAccess({ eventId, eventCode, eventUrl }: Props) {
  const router = useRouter();
  const [code, setCode] = useState(eventCode);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`${label} disalin.`);
    } catch {
      setStatus("Gagal menyalin. Silakan salin secara manual.");
    }
  }

  async function regenerate() {
    if (!window.confirm("Regenerasi kode event? Kode lama tidak akan bisa digunakan lagi.")) return;
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch(`/api/admin/events/${eventId}/regenerate-code`, { method: "POST" });
      const result = (await response.json()) as { eventCode?: string; error?: string };
      if (!response.ok || !result.eventCode) throw new Error(result.error);
      setCode(result.eventCode);
      setStatus("Kode event berhasil diganti.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error && error.message ? error.message : "Kode gagal diganti.");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    if (!window.confirm("Duplikat event ini? Event baru akan memiliki slug dan kode yang berbeda.")) return;
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch(`/api/admin/events/${eventId}/duplicate`, { method: "POST" });
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error);
      router.push(`/admin/events/${result.id}`);
    } catch (error) {
      setStatus(error instanceof Error && error.message ? error.message : "Event gagal diduplikat.");
      setBusy(false);
    }
  }

  const iconButton = "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#d2dee0] text-[#52758e] transition hover:bg-[#f1f4f2]";
  const smallButton = "inline-flex items-center gap-2 rounded-xl border border-[#d2dee0] px-3.5 py-2.5 text-xs font-semibold text-[#52758e] transition hover:bg-[#f1f4f2] disabled:opacity-50";

  return (
    <section className="mt-5 rounded-3xl border border-[#dbe4e0] bg-[#f8faf9] p-5 shadow-[0_10px_30px_rgba(71,102,124,0.05)]">
      <h2 className="font-serif text-xl text-[#2b3a46]">Bagikan ke tamu</h2>
      <div className="mt-4 flex gap-4">
        {/* The authenticated route returns a high-resolution image for download or display. */}
        <img src={`/api/admin/events/${eventId}/qr?format=png`} alt={`QR code untuk ${code}`} className="h-28 w-28 shrink-0 rounded-2xl border border-[#e0e7e3] bg-white p-2 sm:h-32 sm:w-32" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#95afc2]">Kode event</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-words rounded-xl bg-[#f0f3f2] px-3 py-2 font-mono text-sm font-bold tracking-wider text-[#2b3a46]">{code}</code>
              <button type="button" onClick={() => void copy(code, "Kode")} className={iconButton} aria-label="Salin kode event"><Copy size={15} /></button>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#95afc2]">Link tamu</p>
            <div className="mt-1 flex items-center gap-2">
              <input readOnly value={eventUrl} className="min-w-0 flex-1 rounded-xl border border-[#d2dee0] bg-white px-3 py-2.5 text-xs text-[#6188a4]" />
              <button type="button" onClick={() => void copy(eventUrl, "Link")} className={iconButton} aria-label="Salin link event"><Copy size={15} /></button>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`/api/admin/events/${eventId}/qr?format=png&download=1`} download className="inline-flex items-center gap-2 rounded-xl bg-[#2b3a46] px-3.5 py-2.5 text-xs font-semibold text-white"><Download size={14} /> PNG</a>
        <a href={`/api/admin/events/${eventId}/qr?format=svg&download=1`} download className={smallButton}><Download size={14} /> SVG</a>
        <button type="button" onClick={() => void regenerate()} disabled={busy} className={smallButton}><RefreshCw size={14} /> {busy ? "Mengganti..." : "Kode baru"}</button>
        <button type="button" onClick={() => void duplicate()} disabled={busy} className={smallButton}><Files size={14} /> Duplikat</button>
      </div>
      {status && <p role="status" className="mt-3 text-sm text-[#6188a4]">{status}</p>}
    </section>
  );
}
