import GuestExperienceClient from "@/components/photobooth/guest-experience-client";
import { getGuestEvent } from "@/lib/guest-event";

export const dynamic = "force-dynamic";

export default async function Home() {
  const event = await getGuestEvent();
  if (!event) {
    return (
      <main className="grid min-h-[100svh] place-items-center bg-[#eef2f0] px-6 text-center text-[#405668]">
        <div>
          <h1 className="font-serif text-3xl">Wedding Photobooth</h1>
          <p className="mt-3 text-sm">Belum ada event aktif. Buat atau aktifkan event dari halaman admin.</p>
        </div>
      </main>
    );
  }
  return <GuestExperienceClient {...event} initialStep="photobooth-start" />;
}
