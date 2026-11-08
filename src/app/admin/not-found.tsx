import Link from "next/link";

export default function AdminNotFound() {
  return <main className="grid min-h-screen place-items-center bg-[#f3f6f4] px-6 text-center text-[#293743]"><div><h1 className="font-serif text-4xl">Halaman admin tidak ditemukan</h1><Link href="/admin/dashboard" className="mt-7 inline-flex rounded-xl bg-[#293743] px-5 py-3 text-sm font-semibold text-white">Kembali ke dashboard</Link></div></main>;
}
