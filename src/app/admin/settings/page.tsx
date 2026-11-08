import { requireAdmin } from "@/lib/auth";

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 sm:px-10 lg:px-12">
      <p className="text-sm text-[#789ab2]">Workspace</p>
      <h1 className="mt-2 font-serif text-4xl">Settings</h1>
      <div className="mt-8 rounded-2xl border border-[#dce4e0] bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Aplikasi</h2>
        <p className="mt-2 text-sm leading-6 text-[#6188a4]">
          Pengaturan tampilan dan media setiap event dikelola dari halaman
          Events agar perubahan langsung berlaku pada undangan publik.
        </p>
      </div>
    </div>
  );
}
