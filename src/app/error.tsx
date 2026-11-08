"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { if (process.env.NODE_ENV === "development") console.error(error); }, [error]);
  return <main className="grid min-h-screen place-items-center bg-[#f8faf9] px-6 text-center text-[#293743]"><div><h1 className="font-serif text-4xl">Terjadi kesalahan saat memuat halaman</h1><div className="mt-7 flex justify-center gap-3"><button onClick={reset} className="rounded-xl bg-[#293743] px-5 py-3 text-sm font-semibold text-white">Coba lagi</button><Link href="/" className="rounded-xl border border-[#cddadd] bg-white px-5 py-3 text-sm font-semibold">Beranda</Link></div></div></main>;
}
