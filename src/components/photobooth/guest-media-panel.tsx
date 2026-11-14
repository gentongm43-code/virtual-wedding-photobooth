"use client";

/* Captured media uses runtime blob/external URLs that are not suitable for next/image. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowLeft, Heart, Mic, RefreshCw, Send, Video } from "lucide-react";
import Link from "next/link";
import type { GuestMode } from "./guest-experience";
import { GuestButton } from "./guest-ui";
import type { CapturedPhoto } from "./photo-session";
import { PhotoPreview, type PreviewTemplate } from "./photo-preview";
import { getPhotoFilterCss } from "@/lib/image/photo-filter";

type Mode = Exclude<GuestMode, "photo">;
export type GuestMediaRecording = { mode: "video" | "voice"; blob: Blob; url: string; mimeType: string; durationMs: number };
export type GuestMediaItem = { mode: Mode; recording?: GuestMediaRecording; text?: string };
type Props = {
  eventId: string;
  eventName: string;
  eventDate: string;
  location?: string | null;
  sessionId: string | null;
  onBack: () => void;
  selectedModes: Mode[];
  pendingPhotos?: CapturedPhoto[];
  selectedFrameId?: string | null;
  selectedTemplate?: PreviewTemplate | null;
  allowVideo: boolean;
  videoDuration: number;
  allowVoiceNote: boolean;
  voiceNoteDuration: number;
  allowMessage: boolean;
  initialItems?: GuestMediaItem[];
  startInReview?: boolean;
  videoCaptureMode?: "normal" | "live-photo";
};
type Item = GuestMediaItem;

async function createFlippedStream(source: MediaStream, rafRef: { current: number }): Promise<MediaStream> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream(source.getVideoTracks());
  await Promise.race([video.play(), new Promise((resolve) => window.setTimeout(resolve, 3000))]);
  if (!video.videoWidth) await new Promise<void>((resolve) => { video.onloadedmetadata = () => resolve(); window.setTimeout(resolve, 2000); });
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas tidak tersedia.");
  const draw = () => {
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();
    rafRef.current = requestAnimationFrame(draw);
  };
  draw();
  const output = canvas.captureStream(30);
  source.getAudioTracks().forEach((track) => output.addTrack(track));
  return output;
}

function mimeFor(mode: "video" | "voice") {
  const types = mode === "video"
    ? ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm", "video/mp4"]
    : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return types.find((type) => {
    try {
      return MediaRecorder.isTypeSupported(type);
    } catch {
      return false;
    }
  }) ?? "";
}

function SuccessPhoto({ photos, template, eventName, eventDate, location }: { photos: { blob: Blob }[]; template: Parameters<typeof PhotoPreview>[0]["template"]; eventName: string; eventDate: string; location?: string | null }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    const made = photos.map((photo) => URL.createObjectURL(photo.blob));
    queueMicrotask(() => {
      if (!cancelled) setUrls(made);
    });
    return () => {
      cancelled = true;
      made.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photos]);
  if (!urls.length) return null;
  return <PhotoPreview photoUrls={urls} template={template} eventName={eventName} eventDate={eventDate} location={location} />;
}

import StoryActions from "./story-actions";

export default function GuestMediaPanel({
  eventId,
  eventName,
  eventDate,
  location,
  sessionId,
  onBack,
  selectedModes,
  pendingPhotos = [],
  selectedFrameId = null,
  selectedTemplate = null,
  allowVideo,
  videoDuration,
  allowVoiceNote,
  voiceNoteDuration,
  allowMessage,
  initialItems = [],
  startInReview = false,
  videoCaptureMode = "normal",
}: Props) {
  const [stage, setStage] = useState<"compose" | "review" | "sending" | "success">(startInReview || (pendingPhotos.length && !selectedModes.length) ? "review" : "compose");
  const [activeIndex, setActiveIndex] = useState(0);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [text, setText] = useState("");
  const [guestName, setGuestName] = useState("");
  const [recordingMode, setRecordingMode] = useState<"video" | "voice" | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState<Mode[]>([]);
  const [failedPhotos, setFailedPhotos] = useState<string[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [sentItems, setSentItems] = useState<Mode[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const [flipVideo, setFlipVideo] = useState(true);
  const flipRef = useRef(true);
  flipRef.current = flipVideo;
  const livePreviewRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const itemsRef = useRef<Item[]>([]);

  const videoLimit = videoDuration;

  const options: { mode: Mode; label: string; description: string; enabled: boolean }[] = [
    { mode: "video", label: "Video", description: videoLimit >= 60 && videoLimit % 60 === 0 ? `Maks. ${videoLimit / 60} menit` : `Maks. ${videoLimit} detik`, enabled: allowVideo },
    { mode: "voice", label: "Voice note", description: `Maks. ${voiceNoteDuration} detik`, enabled: allowVoiceNote },
    { mode: "text", label: "Text", description: "Ucapan tertulis", enabled: allowMessage },
  ];
  const activeMode = selectedModes[activeIndex];
  const activeOption = options.find((option) => option.mode === activeMode);
  const activeItem = items.find((item) => item.mode === activeMode);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("video-flip");
      if (saved !== null) setFlipVideo(saved === "1");
    } catch { /* abaikan */ }
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    rawStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (timerRef.current) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    itemsRef.current.forEach((item) => {
      if (item.recording) URL.revokeObjectURL(item.recording.url);
    });
  }, []);

  useEffect(() => {
    if (!livePreviewRef.current) return;
    livePreviewRef.current.srcObject = recordingMode === "video" && recording ? streamRef.current : null;
    if (recordingMode === "video" && recording) void livePreviewRef.current.play().catch(() => undefined);
  }, [recording, recordingMode]);

  function updateItem(mode: Mode, update: Partial<Item>) {
    setItems((current) => [...current.filter((item) => item.mode !== mode), { mode, ...update }]);
  }

  function startRecording(mode: "video" | "voice") {
    setError("");
    if (!window.isSecureContext) {
      setError("Perekaman hanya bisa digunakan melalui HTTPS. Buka link Cloudflare atau localhost.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Browser ini tidak menyediakan akses kamera atau mikrofon.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("Browser ini belum mendukung perekaman video.");
      return;
    }
    const mimeType = mimeFor(mode);
    if (!mimeType) {
      setError("Format rekaman tidak didukung browser ini.");
      return;
    }
    const streamPromise = new Promise<MediaStream>((resolve, reject) => {
      let settled = false;
      const timeout = window.setTimeout(() => { settled = true; reject(new Error("timeout")); }, 12000);
      const constraints: MediaStreamConstraints = mode === "video"
        ? { video: { facingMode: "user" }, audio: true }
        : { video: false, audio: true };
      void navigator.mediaDevices.getUserMedia(constraints).catch((reason: unknown) => {
        // Some phones have a working camera but no accessible microphone. Video-only
        // capture is still useful and avoids blocking the guest completely.
        if (mode !== "video") throw reason;
        return navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      }).then((stream) => {
        window.clearTimeout(timeout);
        if (settled) stream.getTracks().forEach((track) => track.stop());
        else { settled = true; resolve(stream); }
      }).catch((reason: unknown) => {
        window.clearTimeout(timeout);
        if (!settled) { settled = true; reject(reason); }
      });
    });
    void streamPromise.then(async (stream) => {
      let recordStream: MediaStream = stream;
      rawStreamRef.current = stream;
      if (mode === "video" && flipRef.current && stream.getVideoTracks().length) {
        try { recordStream = await createFlippedStream(stream, rafRef); } catch { recordStream = stream; }
      }
      streamRef.current = recordStream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(recordStream, { mimeType });
      recorderRef.current = recorder;
      startedRef.current = Date.now();
      setRecordingMode(mode);
      setRecording(true);
      setSeconds(0);
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { setError("Rekaman gagal. Silakan coba lagi."); stopRecording(); };
      recorder.onstop = () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
        cancelAnimationFrame(rafRef.current);
        stream.getTracks().forEach((track) => track.stop());
        rawStreamRef.current = null;
        streamRef.current = null;
        setRecording(false);
        setRecordingMode(null);
        recorderRef.current = null;
        const limitSeconds = mode === "video" ? videoLimit : voiceNoteDuration;
        const durationMs = Math.min(Math.max(1, Date.now() - startedRef.current), limitSeconds * 1000);
        const baseBlob = new Blob(chunksRef.current, { type: mimeType });

        updateItem(mode, { recording: { mode, blob: baseBlob, mimeType, durationMs, url: URL.createObjectURL(baseBlob) } });
      };
      recorder.start(250);
      const maxSeconds = mode === "video" ? videoLimit : voiceNoteDuration;
      timerRef.current = window.setInterval(() => {
        const elapsedMs = Date.now() - startedRef.current;
        setSeconds(Math.min(maxSeconds, Math.floor(elapsedMs / 1000)));
        if (elapsedMs >= maxSeconds * 1000 && recorder.state === "recording") recorder.stop();
      }, 100);
    }).catch((reason: unknown) => {
      setError(reason instanceof Error && reason.message === "timeout"
        ? "Perangkat tidak merespons dalam 12 detik."
        : reason instanceof DOMException && reason.name === "NotAllowedError"
          ? "Izin kamera atau mikrofon ditolak. Izinkan akses di browser lalu tekan Rekam lagi."
          : reason instanceof DOMException && reason.name === "NotFoundError"
            ? "Kamera tidak ditemukan. Pastikan kamera tidak sedang dipakai aplikasi lain."
            : reason instanceof DOMException && reason.name === "NotReadableError"
              ? "Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi."
              : "Kamera tidak dapat digunakan pada perangkat ini.");
    });
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function continueCurrent() {
    if (activeMode === "text") {
      if (!text.trim()) {
        setError("Tulis ucapan terlebih dahulu.");
        return;
      }
      updateItem("text", { text: text.trim() });
    } else if (!activeItem?.recording) {
      setError(`Lengkapi ${activeOption?.label ?? "kiriman"} terlebih dahulu.`);
      return;
    }
    setError("");
    if (activeIndex < selectedModes.length - 1) {
      setActiveIndex((index) => index + 1);
    } else {
      setItems((current) => activeMode === "text"
        ? [...current.filter((item) => item.mode !== "text"), { mode: "text", text: text.trim() }]
        : current);
      setStage("review");
    }
  }

  async function sendAll() {
    if (!sessionId || stage === "sending") return;
    setStage("sending");
    setError("");
    const failures: Mode[] = [];
    const photoFailures: string[] = [];
    for (const photo of pendingPhotos) {
      if (uploadedPhotos.includes(photo.id)) continue;
      try {
        const form = new FormData();
        form.append("file", photo.blob, `${photo.id}.jpg`);
        form.append("sessionId", sessionId);
        form.append("filter", photo.filter ?? "natural");
        if (selectedFrameId) form.append("templateId", selectedFrameId);
        const response = await fetch(`/api/events/${eventId}/photos`, { method: "POST", body: form });
        if (!response.ok) photoFailures.push(photo.id);
        else setUploadedPhotos((current) => [...current, photo.id]);
      } catch {
        photoFailures.push(photo.id);
      }
    }
    for (const item of items) {
      if (sentItems.includes(item.mode)) continue;
      try {
        const form = new FormData();
        form.append("sessionId", sessionId);
        let url = "";
        if (item.mode === "text") {
          form.append("content", item.text ?? "");
          form.append("name", guestName.trim());
          url = `/api/events/${eventId}/messages`;
        } else if (item.recording) {
          form.append("file", item.recording.blob, `guest-${item.mode}.webm`);
          form.append("durationMs", String(item.recording.durationMs));
          url = `/api/events/${eventId}/${item.mode === "video" ? "videos" : "voice-notes"}`;
        } else {
          continue;
        }
        const response = await fetch(url, { method: "POST", body: form });
        if (!response.ok) failures.push(item.mode);
        else setSentItems((current) => [...current, item.mode]);
      } catch {
        failures.push(item.mode);
      }
    }
    if (failures.length || photoFailures.length) {
      setFailed(failures);
      setFailedPhotos(photoFailures);
      setError(`${failures.length + photoFailures.length} kiriman gagal. Periksa koneksi lalu coba lagi.`);
      setStage("review");
    } else {
      setFailed([]);
      await fetch(`/api/events/${eventId}/sessions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      setStage("success");
    }
  }

  const style = { "--primary": "#2d3c49", "--secondary": "#dee6e2" } as CSSProperties;
  return <main className="wedding-page relative flex min-h-[100svh] items-center overflow-hidden bg-[#f2f5f3] px-5 py-8 text-[#2d3c49] sm:px-6 sm:py-10" style={style}>
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      <div className="absolute -right-12 -top-8 h-48 w-48 rotate-12 rounded-[45%] border-2 border-[#6f93ac]/20" />
      <div className="absolute right-4 top-10 text-5xl text-[#a3babf]/35">❀</div><div className="absolute right-16 top-24 text-3xl text-[#96b0c3]/30">✦</div>
      <div className="absolute -bottom-14 -left-12 h-44 w-44 -rotate-12 rounded-[45%] border-2 border-[#6f93ac]/15" />
      <div className="absolute bottom-14 left-5 text-5xl text-[#a3babf]/30">❀</div><div className="absolute bottom-28 right-8 text-2xl text-[#96b0c3]/25">✦</div>
    </div>
    <div className="wedding-panel guest-fade relative z-10 mx-auto w-full max-w-lg rounded-[2rem] p-6 sm:p-10">
      {stage === "success" ? <div className="text-center">
        <div className="relative mx-auto w-fit"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#4a6980] text-white shadow-xl shadow-[#6f93ac]/25"><Heart size={30} fill="currentColor" /></span><span className="absolute -right-7 top-2 text-xl text-[#6f93ac]">✦</span><span className="absolute -left-7 bottom-2 text-sm text-[#6f93ac]">✦</span></div>
        <h1 className="mt-4 font-serif text-[clamp(2.2rem,9vw,3rem)] font-normal leading-[1.05] tracking-[-.01em] text-[#2d3c49]">Matur Nuwun</h1>
        <div className="mx-auto mt-3 flex max-w-[250px] items-center gap-3 text-[#6f93ac]"><span className="h-px flex-1 bg-[#afc3c7]" /><span className="text-sm">♥</span><span className="h-px flex-1 bg-[#afc3c7]" /></div>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#5b839f]">Kenangan Anda telah menjadi bagian<br />dari cerita <strong className="font-serif text-lg font-normal text-[#2d3c49]">{eventName}</strong></p>
        <section className="relative mt-4 flex items-center gap-3 rounded-[1.25rem] border border-[#afc3c7] bg-[#f2f5f3] p-3 text-left shadow-sm">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ccd9db] text-[#678da8]">✓</span><div><h2 className="font-semibold text-[#2d3c49]">Foto berhasil tersimpan!</h2><p className="mt-1 text-xs leading-5 text-[#5b839f]">Foto dan pesan Anda telah ditambahkan ke galeri kenangan acara.</p></div><span className="absolute right-3 top-3 text-sm text-[#6f93ac]">✦</span>
        </section>
        {pendingPhotos.length > 0 && <div className="mx-auto mt-5 w-[min(46vw,160px)] rotate-[-3deg] bg-white p-3 pb-5 shadow-xl shadow-[#5b839f]/20"><SuccessPhoto photos={pendingPhotos} template={selectedTemplate} eventName={eventName} eventDate={eventDate} location={location} /><p className="mt-3 text-center font-serif text-lg italic text-[#6289a5]">Terima kasih! ♡</p></div>}
        <div className="mx-auto mt-8 flex max-w-[250px] items-center gap-3 text-[#6f93ac]"><span className="h-px flex-1 bg-[#afc3c7]" /><span className="text-sm">♥</span><span className="h-px flex-1 bg-[#afc3c7]" /></div>
        <p className="mt-5 text-sm leading-6 text-[#5b839f]">Terima kasih telah berbagi momen<br />istimewa bersama kami.</p>
        {pendingPhotos.length > 0 && <StoryActions photos={pendingPhotos} template={selectedTemplate} eventName={eventName} eventDate={eventDate} location={location} />}
        <Link href={`/event/${eventId}/gallery`} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2d3c49] px-5 text-sm font-semibold text-white shadow-lg shadow-[#2d3c49]/20">Lihat Galeri Kenangan <span className="text-[#aec3c7]">→</span></Link>
        <div className="my-5 flex items-center gap-3 text-xs text-[#5b839f]"><span className="h-px flex-1 bg-[#cedadd]" /><span>atau</span><span className="h-px flex-1 bg-[#cedadd]" /></div>
        <button type="button" onClick={onBack} className="flex h-14 w-full items-center justify-center gap-2 rounded-full border border-[#6f93ac] bg-[#f2f5f3] px-5 text-sm font-semibold text-[#2d3c49]"><RefreshCw size={17} /> Ulangi Pengambilan</button>
      </div> : <>
        <button type="button" onClick={() => stage === "review" ? setStage("compose") : onBack()} className="flex items-center gap-2 text-sm font-medium text-[#5b839f]"><ArrowLeft size={16} /> Kembali</button>
        <h1 className="mt-8 font-serif text-4xl">{stage === "compose" ? activeOption?.label : "Kenangan Anda"}</h1>
        <p className="mt-3 text-sm leading-6 text-[#5b839f]">{stage === "compose" ? [selectedModes.length > 1 ? `Langkah ${activeIndex + 1} dari ${selectedModes.length}` : null, activeOption?.description].filter(Boolean).join(" · ") : "Tidak ada yang terkirim sebelum Anda menekan Kirim Semua."}</p>
        {stage === "compose" && activeMode && <div className="mt-6 rounded-3xl border border-[#cedadd] bg-white p-4 shadow-sm">
          {activeMode === "text" ? <><input value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={100} placeholder="Nama (opsional)" className="mb-3 w-full border-b border-[#cedadd] pb-2 outline-none" /><textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} maxLength={500} placeholder="Tuliskan ucapan untuk kedua mempelai..." className="w-full resize-none outline-none" /><p className="mt-2 text-right text-xs text-[#5b839f]">{text.length} / 500</p></> : activeItem?.recording ? <div className="flex items-center justify-between text-sm font-semibold"><span>{activeOption?.label} siap direview</span><button type="button" onClick={() => startRecording(activeMode)} className="text-[#5b839f]">Rekam lagi</button></div> : <button type="button" onClick={() => startRecording(activeMode)} className="flex w-full flex-col items-center gap-3 py-5 text-center font-semibold active:scale-[.98]"><span className="grid h-16 w-16 place-items-center rounded-full bg-[#2d3c49] text-white shadow-lg shadow-[#2d3c49]/20">{activeMode === "video" ? <Video size={26} /> : <Mic size={26} />}</span><span className="text-lg">Rekam {activeOption?.label}</span><span className="text-xs font-normal text-[#5b839f]">Ketuk untuk mulai merekam</span></button>}
        </div>}
        {activeMode === "video" && !recording && !activeItem?.recording && <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#cedadd] bg-white px-4 py-3 text-sm text-[#2d3c49]"><span>Balik video<span className="block text-xs text-[#5b839f]">Matikan jika hasil terlihat mirror</span></span><span className="relative inline-flex shrink-0"><input type="checkbox" checked={flipVideo} onChange={(event) => { setFlipVideo(event.target.checked); try { window.localStorage.setItem("video-flip", event.target.checked ? "1" : "0"); } catch { /* abaikan */ } }} className="peer sr-only" /><span className="h-7 w-12 rounded-full bg-[#bbccd0] transition peer-checked:bg-[#4a6980] peer-focus-visible:ring-2 peer-focus-visible:ring-[#6f93ac]" /><span className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" /></span></label>}
        {recordingMode === "video" && recording && <video ref={livePreviewRef} autoPlay muted playsInline className="mt-4 max-h-64 w-full rounded-xl bg-black object-contain" />}
        {recording && <div className="mt-5 rounded-[1.5rem] bg-[#2d3c49] p-5 text-center text-sm font-semibold text-white shadow-lg"><div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-[#dee6e2]"><span className="guest-pulse h-2.5 w-2.5 rounded-full bg-red-400" /> REC</div><div className="mt-3 font-serif text-3xl">{String(seconds).padStart(2, "0")}s <span className="text-sm font-sans text-white/45">/ {recordingMode === "video" ? videoLimit : voiceNoteDuration}s</span></div><div className="mt-4 flex h-8 items-center justify-center gap-1">{Array.from({ length: 18 }, (_, index) => <span key={index} className="w-1 rounded-full bg-[#dee6e2]" style={{ height: `${10 + ((index * 7) % 20)}px` }} />)}</div><button type="button" onClick={stopRecording} className="mt-4 min-h-12 rounded-full bg-white px-8 text-sm font-semibold text-[#2d3c49] active:scale-95">Stop</button></div>}
        {stage === "compose" && <GuestButton type="button" disabled={recording || (activeMode !== "text" && !activeItem?.recording)} onClick={continueCurrent} className="mt-6 w-full">{activeMode === "text" || activeIndex === selectedModes.length - 1 ? "Tinjau semua" : "Berikutnya"}</GuestButton>}
        {(stage === "review" || stage === "sending") && <><div className="mt-8 grid gap-4">{pendingPhotos.length > 0 && <div className={`rounded-[1.5rem] border p-3 shadow-sm ${failedPhotos.length ? "border-red-300 bg-red-50" : "border-[#d5dde9] bg-white"}`}><PhotoPreview photoUrls={pendingPhotos.map((photo) => photo.url)} imageFilters={pendingPhotos.map((photo) => photo.filter ? getPhotoFilterCss(photo.filter) : "none")} template={selectedTemplate} eventName={eventName} eventDate={eventDate} location={location} /><p className="mt-2 text-xs text-[#5a6c8c]">{pendingPhotos.every((photo) => uploadedPhotos.includes(photo.id)) ? "Siap dikirim" : failedPhotos.length ? "Gagal dikirim" : "Menunggu dikirim"}</p></div>}{items.map((item) => <div key={item.mode} className={`rounded-[1.5rem] border p-5 shadow-sm ${failed.includes(item.mode) ? "border-red-300 bg-red-50" : "border-[#cedadd] bg-white"}`}>{item.mode === "text" ? <><p className="font-serif text-xl leading-8">“{item.text}”</p>{guestName && <p className="mt-3 text-xs text-[#5b839f]">— {guestName}</p>}</> : item.recording && <>{item.mode === "video" ? <video controls playsInline src={item.recording.url} className="max-h-56 w-full rounded-xl bg-black object-contain" /> : <audio controls src={item.recording.url} className="w-full" />}<p className="mt-3 text-xs text-[#5b839f]">{failed.includes(item.mode) ? "Gagal dikirim" : "Siap dikirim"}</p></>}</div>)}</div>{error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<button type="button" disabled={stage === "sending"} onClick={() => void sendAll()} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2d3c49] px-5 py-4 font-semibold text-white disabled:opacity-50">{stage === "sending" ? "Mengirim..." : failed.length || failedPhotos.length ? <><RefreshCw size={17} /> Kirim ulang yang gagal</> : <><Send size={17} /> Kirim Semua</>}</button></>}
        {error && stage === "compose" && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </>}
    </div>
  </main>;
}
