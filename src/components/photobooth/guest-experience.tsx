"use client";

/* Event cover and logo URLs are administrator-configured external assets. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type CSSProperties, type UIEvent } from "react";
import { ArrowRight, Camera, ChevronRight, Heart, Mic, Pencil, Video } from "lucide-react";
import Link from "next/link";
import PhotoSession, { type CapturedPhoto } from "./photo-session";
import GuestMediaPanel, { type GuestMediaItem, type GuestMediaRecording } from "./guest-media-panel";
import VideoSession from "./video-session";
import { GuestButton, SelectedMark } from "./guest-ui";
import WelcomeCard from "./welcome-card";
import FrameScreen from "./frame-screen";
import ChoiceScreen from "./choice-screen";
import { PhotoPreview, type PreviewTemplate } from "./photo-preview";

export type GuestMode = "photo" | "video" | "voice" | "text";
type VideoGuestbookMode = "normal" | "boomerang" | "live-photo";
function pairNames(inv: Record<string, string> | undefined, eventName: string) {
  const bride = inv?.brideName?.trim() ?? "";
  const groom = inv?.groomName?.trim() ?? "";
  if (bride || groom) return { bride, groom };
  const [first = "", second = ""] = (inv?.coupleName?.trim() || eventName).split("&").map((part) => part.trim());
  return { bride: first, groom: second };
}

type Step = "invitation" | "photobooth-start" | "main-choice" | "frame" | "video-mode" | "video-camera" | "memory" | "photo" | "media" | "done";
export type GuestExperienceProps = {
  eventId: string; eventName: string; eventDate: string; location?: string | null;
  description?: string | null; coverImage?: string | null; logo?: string | null;
  primaryColor?: string | null; secondaryColor?: string | null;
  defaultPhotoCount: number; allowVideo: boolean; videoDuration: number;
  templateId?: string | null;
  frames: PreviewTemplate[];
  allowVoiceNote: boolean; voiceNoteDuration: number; allowMessage: boolean;
  initialStep?: Step;
  invitation?: Record<string, string>;
};

const FRAME_SAMPLE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1000'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23d8b9a8'/%3E%3Cstop offset='.52' stop-color='%23f1ded1'/%3E%3Cstop offset='1' stop-color='%238e6f63'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='1000' fill='url(%23g)'/%3E%3Cellipse cx='250' cy='430' rx='150' ry='220' fill='%23f8eee8' fill-opacity='.72'/%3E%3Cellipse cx='560' cy='400' rx='160' ry='240' fill='%232b2927' fill-opacity='.2'/%3E%3Ccircle cx='350' cy='260' r='115' fill='%23fff8f3' fill-opacity='.55'/%3E%3C/svg%3E";

function GuestExperience(props: GuestExperienceProps) {
  const [step, setStepState] = useState<Step>(props.initialStep ?? "invitation");
  const setStep = (nextStep: Step) => {
    const target = step === "main-choice" && nextStep === "invitation" ? "photobooth-start" : nextStep;
    if (target !== step) window.history.pushState({ gstep: target }, "");
    setStepState(target);
  };
  useEffect(() => {
    window.history.replaceState({ gstep: step }, "");
    const onPop = (e: PopStateEvent) => { const next = e.state?.gstep as Step | undefined; if (next) setStepState(next); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [mainMode, setMainMode] = useState<"photo" | "video" | null>(null);
  const [selectedVideoMode, setSelectedVideoMode] = useState<VideoGuestbookMode>("normal");
  const [videoRecording, setVideoRecording] = useState<GuestMediaRecording | null>(null);
  const [photoCount, setPhotoCount] = useState(Math.min(4, Math.max(1, props.defaultPhotoCount)));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedFrameId, setSelectedFrameId] = useState(props.templateId);
  const [memoryText, setMemoryText] = useState("");
  const [memoryRecording, setMemoryRecording] = useState<GuestMediaRecording | null>(null);
  const [memoryRecordingActive, setMemoryRecordingActive] = useState(false);
  const [memorySeconds, setMemorySeconds] = useState(0);
  const memoryRecorderRef = useRef<MediaRecorder | null>(null);
  const memoryStreamRef = useRef<MediaStream | null>(null);
  const memoryChunksRef = useRef<Blob[]>([]);
  const memoryStartedRef = useRef(0);
  const memoryTimerRef = useRef<number | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const frameCarouselRef = useRef<HTMLDivElement>(null);
  const style = { "--primary": props.primaryColor || "#2d3c49", "--secondary": props.secondaryColor || "#dee6e2" } as CSSProperties;

  async function createSession() {
    if (sessionId) return sessionId;
    const response = await fetch(`/api/events/${props.eventId}/sessions`, { method: "POST" });
    if (!response.ok) throw new Error("Sesi gagal dibuat.");
    const session = (await response.json()) as { id: string };
    setSessionId(session.id);
    return session.id;
  }
  async function beginMainChoice() {
    if (!mainMode || starting) return;
    setStarting(true);
    try { await createSession(); setStep(mainMode === "photo" ? "frame" : "video-mode"); }
    catch { setError("Sesi belum siap. Periksa koneksi lalu coba lagi."); }
    finally { setStarting(false); }
  }
  useEffect(() => () => {
    if (memoryTimerRef.current) window.clearInterval(memoryTimerRef.current);
    memoryStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (memoryRecording) URL.revokeObjectURL(memoryRecording.url);
  }, [memoryRecording]);
  function startMemoryRecording() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return;
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
    if (!mimeType) return;
    void navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      memoryStreamRef.current = stream;
      memoryChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      memoryRecorderRef.current = recorder;
      memoryStartedRef.current = Date.now();
      setMemoryRecordingActive(true);
      setMemorySeconds(0);
      recorder.ondataavailable = (event) => { if (event.data.size) memoryChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        if (memoryTimerRef.current) window.clearInterval(memoryTimerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        memoryStreamRef.current = null;
        memoryRecorderRef.current = null;
        setMemoryRecordingActive(false);
        const durationMs = Math.max(1, Date.now() - memoryStartedRef.current);
        const blob = new Blob(memoryChunksRef.current, { type: mimeType });
        setMemoryRecording((current) => {
          if (current) URL.revokeObjectURL(current.url);
          return { mode: "voice", blob, mimeType, durationMs, url: URL.createObjectURL(blob) };
        });
      };
      recorder.start(250);
      memoryTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - memoryStartedRef.current) / 1000);
        setMemorySeconds(elapsed);
        if (elapsed >= props.voiceNoteDuration && recorder.state === "recording") recorder.stop();
      }, 250);
    }).catch(() => undefined);
  }
  function stopMemoryRecording() {
    if (memoryRecorderRef.current?.state === "recording") memoryRecorderRef.current.stop();
  }
  function continueMemory() {
    const items: GuestMediaItem[] = [];
    if (memoryRecording) items.push({ mode: "voice", recording: memoryRecording });
    if (memoryText.trim()) items.push({ mode: "text", text: memoryText.trim() });
    setStep("media");
  }
  function selectFrame(frameId: string) {
    setSelectedFrameId(frameId);
    frameCarouselRef.current?.querySelector<HTMLElement>(`[data-frame-id="${frameId}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
  function syncFrameFromScroll(event: UIEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    const center = container.scrollLeft + container.clientWidth / 2;
    let closestId = "";
    let closestDistance = Number.POSITIVE_INFINITY;
    container.querySelectorAll<HTMLElement>("[data-frame-id]").forEach((card) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(center - cardCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestId = card.dataset.frameId ?? "";
      }
    });
    if (closestId) setSelectedFrameId(closestId);
  }
  const memoryItems: GuestMediaItem[] = [
    ...(memoryRecording ? [{ mode: "voice" as const, recording: memoryRecording }] : []),
    ...(memoryText.trim() ? [{ mode: "text" as const, text: memoryText.trim() }] : []),
  ];
  const optionalModes = memoryItems.map((item) => item.mode);
  const mediaModes = mainMode === "video" ? ["video", ...optionalModes] as ("video" | "voice" | "text")[] : optionalModes;

  if (step === "photo") return <PhotoSession {...props} defaultPhotoCount={photoCount} selectedTemplate={props.frames.find((frame) => frame.id === selectedFrameId) ?? null} sessionId={sessionId} onSessionCreated={setSessionId} onBack={() => setStep("frame")} onComplete={(id, photos) => { setSessionId(id); setPendingPhotos(photos); setStep("memory"); }} />;
  if (step === "video-camera") return <VideoSession eventName={props.eventName} maxSeconds={selectedVideoMode === "boomerang" ? Math.max(1, Math.min(3, Math.floor(props.videoDuration / 2))) : Math.min(120, props.videoDuration)} boomerang={selectedVideoMode === "boomerang"} onBack={() => setStep("video-mode")} onComplete={(recording) => { setVideoRecording(recording); setStep("media"); }} />;
  if (step === "media") return <GuestMediaPanel {...props} selectedModes={mainMode === "video" ? ["video"] : mediaModes} initialItems={mainMode === "video" ? (videoRecording ? [{ mode: "video", recording: videoRecording }] : []) : memoryItems} startInReview={mainMode === "photo" || (mainMode === "video" && Boolean(videoRecording))} pendingPhotos={pendingPhotos} selectedFrameId={selectedFrameId} selectedTemplate={props.frames.find((frame) => frame.id === selectedFrameId) ?? null} sessionId={sessionId} onBack={() => { if (mainMode === "video") { setVideoRecording(null); setStep("video-camera"); } else setStep("memory"); }} videoCaptureMode={mainMode === "video" ? selectedVideoMode : "normal"} />;
  if (step === "done") return <main className="wedding-page grid min-h-screen place-items-center px-6 text-[#2d3c49]"><div className="wedding-panel wedding-rise w-full max-w-md rounded-[2rem] p-7 text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#2d3c49] text-[#f2f5f3]"><Heart size={28} fill="currentColor" /></span><h1 className="mt-7 font-serif text-5xl">Terima kasih</h1><p className="mt-4 text-sm leading-7 text-[#5b839f]">Kenangan Anda telah tersimpan dengan baik.</p><div className="mt-8 grid gap-3"><Link href={`/event/${props.eventId}/gallery`} className="wedding-button rounded-2xl px-5 py-4 text-sm font-semibold">Lihat Galeri Kenangan</Link><GuestButton type="button" variant="secondary" onClick={() => { setStep("invitation"); setMainMode(null); setMemoryText(""); setMemoryRecording(null); setSessionId(null); }} className="w-full">Kembali ke Undangan</GuestButton></div></div></main>;

  if (step === "invitation") return <WelcomeCard title={props.invitation?.weddingTitle || "The Wedding Of"} bride={pairNames(props.invitation, props.eventName).bride} groom={pairNames(props.invitation, props.eventName).groom} date={props.invitation?.dateLabel || props.eventDate} location={props.location} quote={props.invitation?.quote || "Setiap kisah cinta punya rumahnya sendiri."} onStart={() => setStep("main-choice")} />;
  if ((step as string) === "invitation-old") return <main className="wedding-page relative min-h-[100svh] min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-transparent text-[#2d3c49]" style={{ ...style, minHeight: "100svh" }}>{props.coverImage ? <img src={props.coverImage} alt={`Foto ${props.eventName}`} className="absolute inset-0 h-full w-full object-cover object-[center_32%] opacity-35" /> : null}<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(235,240,238,.88),rgba(235,240,238,.52)_35%,rgba(235,240,238,.92))]" /> <div className="relative mx-auto flex min-h-[100svh] min-h-[100dvh] max-w-lg flex-col justify-between px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))] sm:px-10"><header className="flex items-center gap-2 text-sm font-semibold tracking-wide text-[#2d3c49]">{props.logo ? <img src={props.logo} alt="Photobooth Pawiwahan" className="h-8 max-w-32 object-contain" /> : <><Heart size={16} fill="currentColor" className="text-[#6f93ac]" /> Photobooth Pawiwahan</>}</header><div className="wedding-panel wedding-rise rounded-[2rem] p-6 text-center sm:p-8"><p className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6f93ac] sm:tracking-[0.3em]">{props.invitation?.weddingTitle || "Undangan digital"}</p><h1 className="mt-4 font-serif text-[clamp(44px,12vw,68px)] font-normal leading-[1.02] tracking-[-.01em] text-[#2d3c49]">{props.invitation?.coupleName || props.eventName}</h1><div className="wedding-divider mx-auto mt-5"><span /><i>✦</i><span /></div><p className="mt-4 font-serif text-lg italic leading-8 text-[#5b839f]">“{props.invitation?.quote || "Matur nuwun sampun rawuh"}”</p><p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#5b839f] sm:tracking-[0.22em]">{props.invitation?.dateLabel || props.eventDate}{props.location && ` · ${props.location}`}</p><div className="mt-5 grid gap-2 text-sm text-[#5b839f]"><p>{props.invitation?.groomRole || "Putra"} dari Bapak {props.invitation?.groomFather || "keluarga mempelai"} dan Ibu {props.invitation?.groomMother || "keluarga mempelai"}</p><p className="font-semibold text-[#2d3c49]">{props.invitation?.groomName || "Mempelai pria"} &amp; {props.invitation?.brideName || "Mempelai wanita"}</p><p>{props.invitation?.brideRole || "Putri"} dari Bapak {props.invitation?.brideFather || "keluarga mempelai"} dan Ibu {props.invitation?.brideMother || "keluarga mempelai"}</p></div>{props.description && <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.6] text-[#5b839f]">{props.description}</p>}<button type="button" onClick={() => setStep("main-choice")} className="wedding-button mx-auto mt-7 flex h-[56px] w-full max-w-[520px] items-center justify-center gap-2 rounded-full border-0 px-6 text-base font-semibold transition active:scale-[.98]"><Heart size={17} fill="currentColor" /> <span>Mulai</span> <ArrowRight size={19} /></button></div><p className="text-center font-serif text-lg italic text-[#5b839f]">Matur nuwun sampun rawuh</p></div></main>;

  if (step === "main-choice") return <ChoiceScreen allowVideo={props.allowVideo} mode={mainMode} onMode={setMainMode} starting={starting} error={error} onBack={() => setStep("invitation")} onNext={() => void beginMainChoice()} />;
  if ((step as string) === "main-choice-old") return <main className="relative min-h-[100svh] min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-transparent px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4 text-[#2d3c49] sm:px-6 sm:py-6"><div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true"><div className="absolute inset-4 rounded-[2rem] border border-[#6f93ac]/15" /><span className="absolute left-5 top-24 h-12 w-12 border-l border-t border-[#6f93ac]/20" /><span className="absolute right-5 top-28 h-12 w-12 border-r border-t border-[#6f93ac]/20" /><span className="absolute bottom-20 left-5 h-12 w-12 border-b border-l border-[#6f93ac]/20" /><span className="absolute bottom-16 right-5 h-12 w-12 border-b border-r border-[#6f93ac]/20" /><span className="absolute left-[18%] top-[38%] text-[10px] text-[#6f93ac]/35">✦</span><span className="absolute right-[16%] top-[54%] text-[10px] text-[#6f93ac]/35">✦</span><div className="absolute inset-0 opacity-[.035] [background-image:radial-gradient(#8d7565_0.6px,transparent_0.6px)] [background-size:9px_9px]" /></div><div className="guest-fade relative z-10 mx-auto flex max-w-lg flex-col"><button type="button" onClick={() => setStep("invitation")} aria-label="Kembali ke undangan" className="grid h-10 w-10 place-items-center rounded-full border border-[#cedadd] bg-white/90 text-[#2d3c49] shadow-sm transition active:scale-95">←</button><div className="wedding-rise mt-8 text-center sm:mt-10"><p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#6f93ac]">Photobooth Pawiwahan</p><h1 className="mt-4 font-serif text-[clamp(38px,11vw,54px)] font-normal leading-[1.05] tracking-[-.01em] text-[#2d3c49]">Abadikan Kenangan</h1><div className="wedding-divider mx-auto mt-5"><span /><i>✦</i><span /></div><p className="mx-auto mt-5 max-w-xs text-[15px] leading-7 text-[#5b839f]">Pilih cara untuk berbagi kenangan dan ucapan Anda bersama kami.</p></div><div className="mt-6 grid gap-3 sm:mt-8">{[{ value: "photo" as const, icon: Camera, title: "Foto", text: "Abadikan beberapa pose dengan bingkai pernikahan pilihan Anda" }, ...(props.allowVideo ? [{ value: "video" as const, icon: Video, title: "Video", text: "Rekam video, boomerang, atau foto live dari momen terbaik Anda" }] : [])].map((item) => { const Icon = item.icon; const selected = mainMode === item.value; return <button type="button" key={item.value} onClick={() => setMainMode(item.value)} className={`relative z-10 flex min-h-[120px] items-center gap-4 overflow-hidden rounded-[1.5rem] border p-4 text-left shadow-sm transition active:scale-[.98] sm:min-h-[132px] sm:p-5 ${selected ? "border-[#6f93ac] bg-[#ecf1ee] text-[#2d3c49] shadow-md" : "border-[#cedadd] bg-white/95"}`}><span className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${selected ? "bg-[#9fb8bd] text-[#2d3c49]" : "bg-[#dee6e2] text-[#6f93ac]"}`}><Icon size={24} /></span><span className="min-w-0 flex-1"><strong className="block text-lg">{item.title}</strong><small className={`mt-1 block max-w-[230px] leading-6 ${selected ? "text-[#5b839f]" : "text-[#5b839f]"}`}>{item.text}</small></span><ChevronRight className={selected ? "text-[#9fb8bd]" : "text-[#91acc0]"} /></button>; })}</div>{error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<GuestButton type="button" disabled={!mainMode || starting} onClick={() => void beginMainChoice()} className="relative z-10 mt-6 flex h-[56px] w-full items-center justify-center gap-2 rounded-full bg-[#4a6980] text-white shadow-lg shadow-[#5b839f]/20 hover:bg-[#344655]">{starting ? "Menyiapkan..." : "Lanjut"} <ArrowRight size={18} /></GuestButton></div></main>;

  if (step === "photobooth-start") return <WelcomeCard title={props.invitation?.weddingTitle || "The Wedding Of"} bride={pairNames(props.invitation, props.eventName).bride} groom={pairNames(props.invitation, props.eventName).groom} date={props.invitation?.dateLabel || props.eventDate} location={props.location} quote={props.invitation?.quote || "Setiap kisah cinta punya rumahnya sendiri."} onStart={() => setStep("main-choice")} />;
  if ((step as string) === "photobooth-start-old") return <main className="fixed inset-0 h-[100svh] max-h-[100svh] overflow-hidden bg-transparent px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-[calc(20px+env(safe-area-inset-top))] text-[#2d3c49]" style={style}>
    <img src="/references/photobooth-background.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
    <div className="guest-fade relative mx-auto flex h-full max-w-3xl flex-col">
      <header className="flex items-center px-2 text-sm tracking-[0.04em] sm:px-4">
        <span className="flex items-center gap-2 font-medium"><Heart size={17} fill="currentColor" /> Photobooth Pawiwahan</span>
      </header>
      <section className="flex min-h-0 flex-1 items-center justify-center py-4 sm:py-6">
        <div className="w-full max-w-[610px] rounded-[2rem] bg-[#f2f5f3]/85 px-7 py-7 text-center shadow-[0_1.5rem_3rem_rgba(66,89,108,.1)] backdrop-blur-[2px] sm:px-14 sm:py-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#2d3c49]">{props.invitation?.weddingTitle || "The Wedding Of"}</p>
          <h1 className="mt-6 font-serif text-[clamp(2.8rem,9vw,5.5rem)] font-medium leading-[.9] tracking-[-0.035em] text-[#2d3c49]">{pairNames(props.invitation, props.eventName).bride}</h1>
          <p className="my-2 font-serif text-4xl font-light text-[#6f93ac]">&amp;</p>
          <h2 className="font-serif text-[clamp(2.8rem,9vw,5.5rem)] font-medium leading-[.9] tracking-[-0.035em] text-[#2d3c49]">{pairNames(props.invitation, props.eventName).groom}</h2>
          <div className="mx-auto my-6 h-px w-8 bg-[#4a6980]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#2d3c49]">{props.invitation?.dateLabel || props.eventDate}</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-[#2d3c49]">{props.location}</p>
          <p className="mx-auto mt-7 max-w-sm font-serif text-lg italic leading-7 text-[#2d3c49]">“{props.invitation?.quote || "Setiap kisah cinta punya rumahnya sendiri."}”</p>
          <button type="button" onClick={() => setStep("main-choice")} className="mx-auto mt-7 flex h-14 w-full max-w-[360px] items-center justify-center gap-5 rounded-full bg-[#4a6980] px-6 font-serif text-lg tracking-[0.04em] text-white shadow-lg shadow-[#5b839f]/20 transition hover:bg-[#668ca7] active:scale-[.98]"><Heart size={18} fill="currentColor" /> Mulai <ArrowRight size={20} /></button>
        </div>
      </section>
      <p className="pb-2 text-center font-serif text-lg italic text-[#2d3c49]">Matur nuwun sampun rawuh</p>
    </div>
  </main>;

  if (step === "frame") {
    return <FrameScreen frames={props.frames} selectedId={selectedFrameId} carouselRef={frameCarouselRef} onSelect={selectFrame} onScroll={syncFrameFromScroll} sampleUrl={props.coverImage ?? FRAME_SAMPLE} eventName={props.eventName} eventDate={props.eventDate} location={props.location} onBack={() => setStep("main-choice")} onNext={() => setStep("photo")} />;
  }

  if (step === "video-mode") {
    const videoOptions: { value: VideoGuestbookMode; label: string; description: string; status: string; available: boolean }[] = [
      { value: "normal", label: "Video biasa", description: `Rekam video hingga ${props.videoDuration >= 60 && props.videoDuration % 60 === 0 ? `${props.videoDuration / 60} menit` : `${props.videoDuration} detik`} dengan suara.`, status: "Tersedia", available: true },
      { value: "boomerang", label: "Boomerang", description: `Rekam hingga ${Math.max(1, Math.min(3, Math.floor(props.videoDuration / 2)))} detik, lalu diputar maju-mundur untuk loop yang berkesan.`, status: "Eksperimen", available: true },
    ];
    return <main className="relative min-h-screen overflow-hidden bg-[#212d36] px-5 py-10 text-[#e8eeeb]"><img src="/references/batik-tl.svg" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute left-0 top-0 w-[48vw] max-w-[340px] opacity-60" /><img src="/references/batik-br.svg" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute bottom-0 right-0 w-[48vw] max-w-[340px] opacity-60" /><div className="guest-fade relative z-10 mx-auto max-w-lg"><button type="button" onClick={() => setStep("main-choice")} className="text-sm font-semibold text-[#dee6e2]">← Kembali</button><p className="mt-10 text-xs font-semibold uppercase tracking-[0.3em] text-[#9fb8bd]">Pesan Video</p><h1 className="mt-4 font-serif text-5xl font-semibold text-[#e8eeeb]">Abadikan Kenangan</h1><div className="mt-5 flex items-center gap-3 text-[#9fb8bd]"><span className="h-px w-12 bg-[#9fb8bd]/60" /><svg viewBox="0 0 40 52" className="h-9 w-7 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M20 3C26 14 33 22 33 36H7C7 22 14 14 20 3Z" /><path d="M20 16V36" /><path d="M20 24l4 5-4 5-4-5z" fill="currentColor" stroke="none" /></svg><span className="h-px flex-1 bg-gradient-to-r from-[#9fb8bd]/60 to-transparent" /></div><p className="mt-5 text-sm leading-7 text-[#e8eeeb]/70">Pilih cara merekam ucapan dan doa restu untuk kedua mempelai.</p><div className="mt-9 grid gap-3">{videoOptions.map((option) => { const selected = selectedVideoMode === option.value; return <button type="button" key={option.value} onClick={() => setSelectedVideoMode(option.value)} className={`rounded-2xl border p-5 text-left transition ${selected ? "border-[#9fb8bd] bg-[#9fb8bd]/12 shadow-lg shadow-black/20" : "border-[#9fb8bd]/20 bg-white/5 opacity-85"}`}><div className="flex items-center justify-between gap-3"><div><strong className="block font-serif text-2xl font-semibold">{option.label}</strong><span className="mt-1 block text-sm text-[#e8eeeb]/60">{option.description}</span></div>{option.available ? <span className="inline-flex rounded-full bg-[#9fb8bd]/20 px-3 py-1 text-[10px] font-semibold text-[#b8cace]">{option.status}</span> : <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-white/45">{option.status}</span>}</div></button>; })}</div>{error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<GuestButton type="button" onClick={() => {
      if (selectedVideoMode === "live-photo") {
        setError("Foto Live belum didukung di perangkat ini.");
        return;
      }
      setError("");
      setStep("video-camera");
    }} variant="secondary" className="mt-8 w-full border-[#9fb8bd] bg-gradient-to-b from-[#acc1c6] to-[#97b1c3] text-[#2d3c49]">Lanjut</GuestButton><p className="mt-4 text-center text-xs text-[#e8eeeb]/45">Mode video memakai format recorder yang didukung perangkat Anda.</p></div></main>;
  }

  return <main className="relative min-h-[100svh] min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#f2f5f3] px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 text-[#2d3c49] sm:px-6 sm:pt-6">
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full border border-[#6f93ac]/15" />
      <div className="absolute -bottom-20 -left-16 h-40 w-40 rounded-full border border-[#6f93ac]/10" />
      <span className="absolute right-[18%] top-[22%] text-xs text-[#6f93ac]/35">✦</span>
      <span className="absolute left-[15%] bottom-[28%] text-[10px] text-[#6f93ac]/30">✦</span>
      <div className="absolute inset-0 opacity-[.035] [background-image:radial-gradient(#8d7565_0.6px,transparent_0.6px)] [background-size:10px_10px]" />
    </div>
    <div className="guest-fade relative z-10 mx-auto flex max-w-lg flex-col">
      <button type="button" onClick={() => setStep(mainMode === "video" ? "video-mode" : "frame")} aria-label="Kembali ke langkah sebelumnya" className="grid h-10 w-10 place-items-center rounded-full border border-[#cedadd] bg-white/90 text-[#2d3c49] shadow-sm transition active:scale-95">←</button>
      <div className="mt-1 text-center">
        <p className="font-serif text-base italic leading-none text-[#5b839f]">Setelah {mainMode === "video" ? "video" : "foto"}</p>
        <h1 className="mt-1 font-serif text-[21px] font-normal leading-tight text-[#2d3c49]">Tinggalkan pesan untuk kedua mempelai <span className="text-[#6f93ac]">♡</span></h1>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-[#5b839f]">Pesan Anda akan menjadi kenangan berharga bagi kami.</p>
      </div>
      {mainMode === "photo" && pendingPhotos.length > 0 && (() => { const t = props.frames.find((frame) => frame.id === selectedFrameId) ?? null; const ratio = t ? t.width / t.height : 0.8; return <section className="mx-auto mt-3" style={{ width: `min(40%, ${Math.round(130 * ratio)}px)` }}><div className="relative overflow-hidden rounded-[1.1rem] border-4 border-white bg-white p-1.5 shadow-lg shadow-[#5b839f]/15"><PhotoPreview photoUrls={pendingPhotos.map((photo) => photo.url)} template={t} eventName={props.eventName} eventDate={props.eventDate} location={props.location} /><span className="absolute bottom-3 right-3 grid h-6 w-6 place-items-center rounded-full bg-[#4a6980] text-xs font-bold text-white shadow-md">✓</span></div></section>; })()}
      {props.allowVoiceNote && <section className="mt-3 rounded-[1.25rem] border border-[#cedadd] bg-white/90 p-4 shadow-sm">
        <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#dee6e2] text-[#5b839f]"><Mic size={21} /></span><div><h2 className="text-sm font-semibold">Voice Note <span className="text-xs font-normal text-[#5b839f]">Opsional</span></h2><p className="mt-0.5 text-xs text-[#5b839f]">Titipkan pesan suara untuk kedua mempelai</p></div></div>
        {memoryRecordingActive ? <div className="mt-5"><div className="flex items-center justify-between text-sm font-semibold text-[#6389a5]"><span className="guest-pulse h-2.5 w-2.5 rounded-full bg-red-400" /> <span>{String(memorySeconds).padStart(2, "0")}s</span></div><div className="mt-3 flex h-8 items-center justify-center gap-1">{Array.from({ length: 22 }, (_, index) => <span key={index} className="w-1 rounded-full bg-[#4a6980]" style={{ height: `${10 + ((index * 7) % 20)}px` }} />)}</div><button type="button" onClick={stopMemoryRecording} className="mt-4 w-full rounded-full bg-[#2d3c49] px-4 py-3 text-sm font-semibold text-white">Stop</button></div> : memoryRecording ? <div className="mt-5 flex items-center gap-3"><button type="button" onClick={() => { const audio = document.getElementById("memory-voice-preview") as HTMLAudioElement | null; void audio?.play(); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#4a6980] text-white">▶</button><audio id="memory-voice-preview" src={memoryRecording.url} className="min-w-0 flex-1" controls /><button type="button" onClick={startMemoryRecording} className="text-xs font-semibold text-[#5b839f]">Rekam lagi</button></div> : <button type="button" onClick={startMemoryRecording} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-[#6f93ac] bg-[#f2f5f3] px-4 py-2.5 text-xs font-semibold text-[#2d3c49]"><Mic size={18} /> Ketuk untuk merekam pesan suara</button>}
      </section>}
      {props.allowMessage && <section className="mt-3 rounded-[1.25rem] border border-[#cedadd] bg-white/90 p-4 shadow-sm">
        <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#dee6e2] text-[#5b839f]"><Pencil size={20} /></span><div><h2 className="text-sm font-semibold">Teks Pesan <span className="text-xs font-normal text-[#5b839f]">Opsional</span></h2><p className="mt-0.5 text-xs text-[#5b839f]">Tuliskan ucapan dan doa terbaik Anda</p></div></div>
        <textarea value={memoryText} onChange={(event) => setMemoryText(event.target.value)} rows={3} maxLength={500} placeholder="Tuliskan pesan Anda di sini..." className="mt-3 w-full resize-none rounded-xl border border-[#cedadd] bg-[#f2f5f3] p-3 text-sm outline-none focus:border-[#6f93ac]" /><p className="mt-1 text-right text-xs text-[#5b839f]">{memoryText.length} / 500</p>
      </section>}
      <GuestButton type="button" onClick={continueMemory} disabled={memoryRecordingActive} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#2d3c49] bg-[#2d3c49] font-sans text-base font-semibold tracking-normal text-white shadow-lg shadow-[#2d3c49]/15 hover:bg-[#384c5b]">Lanjut <ArrowRight size={18} /></GuestButton>
    </div>
  </main>;
}

export default function GuestExperienceThemed(props: GuestExperienceProps) {
  useEffect(() => { document.body.classList.add("guest-theme"); return () => document.body.classList.remove("guest-theme"); }, []);
  return <GuestExperience {...props} primaryColor="#2d3c49" secondaryColor="#9fb8bd" />;
}
