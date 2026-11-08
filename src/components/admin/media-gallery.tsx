"use client";

import { useState } from "react";

type MediaItem = { id: string; url: string; downloadUrl: string; createdAt: string; durationMs: number | null; mimeType: string; size: number; eventName?: string };

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaGallery({ items, kind }: { items: MediaItem[]; kind: "video" | "voice-note" }) {
  const [media, setMedia] = useState(items);
  async function remove(item: MediaItem) {
    if (!window.confirm(`Hapus ${kind === "video" ? "video" : "voice note"} ini?`)) return;
    const response = await fetch(`/${kind === "video" ? "api/videos" : "api/voice-notes"}/${item.id}`, { method: "DELETE" });
    if (response.ok) setMedia((current) => current.filter((entry) => entry.id !== item.id));
  }
  if (!media.length) return <p className="rounded-xl bg-[#f7f9f8] p-8 text-center text-sm text-[#7e9eb5]">Belum ada {kind === "video" ? "video" : "voice note"}.</p>;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{media.map((item) => <article key={item.id} className="rounded-2xl border border-[#e4eae7] bg-[#f7f9f8] p-3"><div className="overflow-hidden rounded-xl bg-black">{kind === "video" ? <video controls preload="metadata" src={item.url} className="aspect-video w-full" /> : <audio controls preload="metadata" src={item.url} className="w-full" />}</div><div className="mt-3 space-y-1 text-xs text-[#7e9eb5]">{item.eventName && <p className="font-semibold text-[#293743]">{item.eventName}</p>}<p>{new Date(item.createdAt).toLocaleString("id-ID")}</p><p>{item.mimeType} · {formatSize(item.size)}{item.durationMs ? ` · ${Math.round(item.durationMs / 1000)} detik` : ""}</p></div><div className="mt-3 grid grid-cols-2 gap-2"><a href={item.downloadUrl} className="rounded-lg bg-[#293743] px-3 py-2 text-center text-xs font-semibold text-white">Download</a><button onClick={() => void remove(item)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Hapus</button></div></article>)}</div>;
}
