import Link from "next/link";

export default function EventNotFound() {
  return <main className="grid min-h-screen place-items-center bg-[#f1f4f2] px-6 text-center text-[#293743]"><div><h1 className="font-serif text-4xl">Event tidak ditemukan</h1><p className="mt-3 text-sm text-[#7e9eb5]">Tautan event mungkin sudah tidak berlaku.</p><Link href="/" className="mt-7 inline-flex rounded-xl bg-[#293743] px-5 py-3 text-sm font-semibold text-white">Kembali ke Beranda</Link></div></main>;
}
