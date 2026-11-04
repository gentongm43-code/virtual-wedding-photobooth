"use client";

/* Invitation media URLs are administrator-configured external assets. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CalendarDays, ExternalLink, Heart, MapPin, Music2 } from "lucide-react";
import type { GuestExperienceProps } from "@/components/photobooth/guest-experience";

type Props = Pick<GuestExperienceProps, "eventId" | "eventName" | "eventDate" | "location" | "coverImage" | "logo" | "invitation">;

const media = (value?: string) => {
  const url = value?.trim();
  if (!url || url.includes("picsum.photos") || /assets\/images\/(cowo|cewe)\.webp$/.test(url)) return "";
  return url.startsWith("./") ? url.slice(1) : url;
};

function Portrait({ src }: { src?: string }) {
  const url = media(src);
  return url ? <img src={url} alt="" className="mx-auto mb-5 h-40 w-40 rounded-full border-4 border-white object-cover shadow-md" /> : null;
}

function TextBlock({ value }: { value?: string }) {
  if (!value?.trim()) return null;
  return <p className="whitespace-pre-line text-sm leading-7 text-[#756d67]">{value}</p>;
}

export default function InvitationPage({ eventId, eventName, eventDate, location, coverImage, logo, invitation }: Props) {
  const content = invitation ?? {};
  const coupleName = content.coupleName || eventName;
  const dateLabel = content.dateLabel || eventDate;
  const mapUrl = content.mapUrl?.trim();
  const audioUrl = content.audioUrl?.trim();
  const gallery = [content.galleryOne, content.galleryTwo, content.galleryThree, content.galleryFour, content.galleryFive, content.gallerySix].map(media).filter(Boolean);

  return (
    <main className="wedding-page min-h-screen overflow-x-hidden text-[#5e4737]">
      <section className="relative flex min-h-[100svh] items-end overflow-hidden px-6 pb-16 pt-10 sm:px-10">
        {coverImage ? <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" /> : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,238,227,.38),rgba(248,238,227,.88)_65%,#f8eee3)]" />
        <div className="relative mx-auto w-full max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a77943]">{content.weddingTitle || "The Wedding Of"}</p>
          {logo ? <img src={logo} alt="" className="mx-auto mt-8 h-16 max-w-40 object-contain" /> : <Heart className="mx-auto mt-8 text-[#b98b5a]" size={34} fill="currentColor" />}
          <h1 className="mt-6 font-serif text-[clamp(3.5rem,13vw,7rem)] leading-[.9] tracking-[-.04em]">{coupleName}</h1>
          <p className="mx-auto mt-6 max-w-xl font-serif text-xl italic text-[#8d7565]">“{content.quote || "Momen untuk dikenang"}”</p>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#8d7565]">{dateLabel}</p>
          <Link href="#undangan" className="wedding-button mx-auto mt-9 inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-semibold">Buka undangan <span aria-hidden="true">↓</span></Link>
        </div>
      </section>

      <div id="undangan" className="mx-auto grid max-w-4xl gap-6 px-5 pb-16 pt-10 sm:px-8">
        <section className="wedding-panel rounded-[2rem] p-6 text-center sm:p-10">
          <p className="text-sm leading-7 text-[#756d67]">{content.guestMessage || "Dengan penuh rasa syukur, kami mengundang Anda untuk hadir di hari bahagia kami."}</p>
          <h2 className="mt-5 font-serif text-4xl">Assalamualaikum</h2>
          <p className="mt-4 text-sm leading-7 text-[#756d67]">Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk berkenan hadir di acara pernikahan kami.</p>
        </section>

        <section className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="wedding-panel rounded-[2rem] p-6 text-center">
            <Portrait src={content.groomPhoto} /><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b98b5a]">Mempelai pria</p>
            <h2 className="mt-3 font-serif text-4xl">{content.groomName || "Mempelai pria"}</h2>
            {(content.groomFather || content.groomMother) && <p className="mt-3 text-sm leading-6 text-[#756d67]">{content.groomRole || "Putra"} dari {content.groomFather && `Bapak ${content.groomFather}`}{content.groomFather && content.groomMother && " dan "}{content.groomMother && `Ibu ${content.groomMother}`}</p>}
            <TextBlock value={content.groomAddress} />
          </div>
          <span className="mx-auto font-serif text-5xl italic text-[#b98b5a]">&amp;</span>
          <div className="wedding-panel rounded-[2rem] p-6 text-center">
            <Portrait src={content.bridePhoto} /><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b98b5a]">Mempelai wanita</p>
            <h2 className="mt-3 font-serif text-4xl">{content.brideName || "Mempelai wanita"}</h2>
            {(content.brideFather || content.brideMother) && <p className="mt-3 text-sm leading-6 text-[#756d67]">{content.brideRole || "Putri"} dari {content.brideFather && `Bapak ${content.brideFather}`}{content.brideFather && content.brideMother && " dan "}{content.brideMother && `Ibu ${content.brideMother}`}</p>}
            <TextBlock value={content.brideAddress} />
          </div>
        </section>

        {(content.verseOne || content.verseTwo) && <section className="wedding-panel rounded-[2rem] p-6 text-center sm:p-10"><h2 className="font-serif text-3xl">{content.verseTitle}</h2><div className="mt-6 grid gap-4 sm:grid-cols-2">{content.verseOne && <blockquote className="rounded-2xl bg-[#fffaf2] p-5 text-sm italic leading-7">{content.verseOne}<footer className="mt-3 text-xs not-italic text-[#b98b5a]">{content.verseOneSource}</footer></blockquote>}{content.verseTwo && <blockquote className="rounded-2xl bg-[#fffaf2] p-5 text-sm italic leading-7">{content.verseTwo}<footer className="mt-3 text-xs not-italic text-[#b98b5a]">{content.verseTwoSource}</footer></blockquote>}</div></section>}

        {(content.storyOne || content.storyTwo || content.storyThree) && <section className="wedding-panel rounded-[2rem] p-6 sm:p-10"><h2 className="text-center font-serif text-3xl">{content.storyTitle || "Kisah cinta"}</h2><div className="mt-6 grid gap-5 sm:grid-cols-3">{[content.storyOne, content.storyTwo, content.storyThree].map((story, index) => story ? <div key={index} className="rounded-2xl bg-[#fffaf2] p-5"><span className="text-xs font-semibold text-[#b98b5a]">0{index + 1}</span><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#756d67]">{story}</p></div> : null)}</div></section>}

        {gallery.length > 0 && (
          <section className="wedding-panel rounded-[2rem] p-6 sm:p-10">
            <h2 className="text-center font-serif text-3xl">Galeri</h2>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((url, index) => <img key={`${url}-${index}`} src={url} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />)}
            </div>
          </section>
        )}

        <section className="wedding-panel rounded-[2rem] p-6 text-center sm:p-10">
          <h2 className="font-serif text-3xl">Detail acara</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#fffaf2] p-5"><CalendarDays className="mx-auto text-[#b98b5a]" /><p className="mt-3 font-semibold">{dateLabel}</p><p className="mt-2 text-sm leading-6 text-[#756d67]">Akad: {content.akadTime || "—"}<br />Resepsi: {content.receptionTime || "—"}</p></div>
            <div className="rounded-2xl bg-[#fffaf2] p-5"><MapPin className="mx-auto text-[#b98b5a]" /><p className="mt-3 font-semibold">{location || "Lokasi acara"}</p><p className="mt-2 text-sm leading-6 text-[#756d67]">{content.dressCode || ""}</p>{mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#8a6449] px-4 py-2 text-sm font-semibold text-white">Lihat Google Maps <ExternalLink size={14} /></a> : null}</div>
          </div>
        </section>

        {(content.bankName || content.bankAccount || content.giftHolder) && <section className="wedding-panel rounded-[2rem] p-6 text-center sm:p-10"><h2 className="font-serif text-3xl">{content.giftTitle || "Love Gift"}</h2><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-[#fffaf2] p-5 text-sm leading-7">{content.bankName && <p className="font-semibold">{content.bankName}</p>}{content.bankAccount && <p>{content.bankAccount}</p>}{content.bankHolder && <p>a.n. {content.bankHolder}</p>}</div>{content.giftHolder && <div className="rounded-2xl bg-[#fffaf2] p-5 text-sm leading-7"><p className="font-semibold">{content.giftHolder}</p>{content.giftPhone && <p>{content.giftPhone}</p>}</div>}</div></section>}

        {content.turutMengundang && <section className="text-center"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#b98b5a]">Turut mengundang</p><p className="mx-auto mt-3 max-w-2xl whitespace-pre-line text-sm leading-7 text-[#756d67]">{content.turutMengundang}</p></section>}
        <section className="rounded-[2rem] bg-[#5e4737] p-8 text-center text-[#fffaf2] sm:p-12"><Heart className="mx-auto text-[#d7b07a]" size={28} fill="currentColor" /><p className="mx-auto mt-5 max-w-2xl whitespace-pre-line text-sm leading-7 text-[#f8eee3]">{content.closingMessage}</p><Link href={`/event/${encodeURIComponent(eventId)}`} className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#d7b07a] px-6 py-3 text-sm font-semibold text-[#5e4737]">Buka Photo Booth <span aria-hidden="true">→</span></Link></section>
        {audioUrl ? <div className="flex items-center justify-center gap-3 text-sm text-[#756d67]"><Music2 size={16} /><audio controls src={audioUrl} className="h-8 max-w-[260px]" /></div> : null}
      </div>
    </main>
  );
}
