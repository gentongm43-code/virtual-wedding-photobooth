"use client";

import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { if (process.env.NODE_ENV === "development") console.error(error); }, [error]);
  return <main className="grid min-h-screen place-items-center bg-[#f3f6f4] px-6 text-center text-[#293743]"><div><h1 className="font-serif text-4xl">Terjadi kesalahan pada dashboard</h1><p className="mt-3 text-sm text-[#7e9eb5]">Silakan coba muat ulang halaman.</p><button onClick={reset} className="mt-7 rounded-xl bg-[#293743] px-5 py-3 text-sm font-semibold text-white">Coba lagi</button></div></main>;
}
