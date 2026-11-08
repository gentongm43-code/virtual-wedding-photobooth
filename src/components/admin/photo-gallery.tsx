"use client";

/* Gallery previews use local/API URLs and need native image loading. */
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

type GalleryPhoto = { id: string; finalUrl: string; originalUrl: string | null; createdAt: string };

export default function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const [items, setItems] = useState(photos);
  async function remove(photo: GalleryPhoto) {
    if (!window.confirm("Hapus foto ini?")) return;
    const response = await fetch(`/api/photos/${photo.id}`, { method: "DELETE" });
    if (response.ok) { setItems((current) => current.filter((item) => item.id !== photo.id)); setSelected(null); }
  }
  if (items.length === 0) return <p className="rounded-xl bg-[#f7f9f8] p-8 text-center text-sm text-[#7e9eb5]">Belum ada foto final.</p>;
  return <><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{items.map((photo) => <button key={photo.id} onClick={() => setSelected(photo)} className="group overflow-hidden rounded-2xl bg-[#e4eae7] text-left"><img src={photo.finalUrl} alt="Foto tamu" className="aspect-[3/4] w-full object-cover transition duration-300 group-hover:scale-105" /></button>)}</div>{selected && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5" onClick={() => setSelected(null)}><div className="max-h-[90vh] max-w-lg rounded-2xl bg-white p-3" onClick={(event) => event.stopPropagation()}><img src={selected.finalUrl} alt="Preview foto" className="max-h-[70vh] w-full rounded-xl object-contain" /><div className="grid grid-cols-2 gap-2 p-2"><a href={`/api/photos/${selected.id}/file?kind=final`} className="rounded-xl bg-[#293743] px-3 py-3 text-center text-sm font-semibold text-white">Download final</a>{selected.originalUrl && <a href={`/api/photos/${selected.id}/file?kind=original`} className="rounded-xl border border-[#cddadd] px-3 py-3 text-center text-sm font-semibold">Original</a>}<button onClick={() => void remove(selected)} className="col-span-2 rounded-xl bg-red-50 px-3 py-3 text-sm font-semibold text-red-700">Hapus foto</button></div></div></div>}</>;
}
