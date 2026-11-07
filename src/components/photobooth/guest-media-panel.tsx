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
  videoCaptureMode?: "normal" | "boomerang" | "live-photo";
};
type Item = GuestMediaItem;

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

async function createBoomerangVideo(blob: Blob, knownSeconds: number): Promise<{ blob: Blob; mimeType: string; durationMs: number }> {
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement === "undefined") {
    throw new Error("Boomerang tidak didukung di browser ini.");
  }
  const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
  if (!mimeType || !("captureStream" in HTMLCanvasElement.prototype)) {
    throw new Error("Boomerang tidak didukung di browser ini.");
  }
  const objectUrl = URL.createObjectURL(blob);
  const source = document.createElement("video");
  source.src = objectUrl;
  source.muted = true;
  source.playsInline = true;
  source.preload = "auto";

  try {
    await new Promise<void>((resolve, reject) => {
      source.onloadedmetadata = () => resolve();
      source.onerror = () => reject(new Error("Gagal memuat video untuk boomerang."));
    });

    const sourceSeconds = Number.isFinite(source.duration) && source.duration > 0 ? source.duration : knownSeconds;
    if (!Number.isFinite(sourceSeconds) || sourceSeconds <= 0) {
      throw new Error("Durasi video tidak valid.");
    }

    const width = source.videoWidth || 720;
    const height = source.videoHeight || 1280;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas tidak didukung.");

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    const totalSeconds = Math.max(sourceSeconds * 2, 1.5);
    const startTime = performance.now();

    const finalResult = await new Promise<{ blob: Blob; durationMs: number }>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => reject(new Error("Perekaman boomerang gagal."));
      recorder.onstop = () => resolve({
        blob: new Blob(chunks, { type: mimeType }),
        durationMs: Math.max(800, Math.round(totalSeconds * 1000)),
      });
      recorder.start(250);

      const render = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed >= totalSeconds) {
          recorder.stop();
          return;
        }

        const playhead = elapsed <= sourceSeconds ? elapsed : Math.max(0, totalSeconds - elapsed);
        if (Math.abs(source.currentTime - playhead) > 0.08) source.currentTime = playhead;
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(render);
      };

      void source.play().catch(() => {
        recorder.stop();
        reject(new Error("Autoplay boomerang dibatasi browser."));
      });
      requestAnimationFrame(render);
    });

    return { blob: finalResult.blob, mimeType, durationMs: finalResult.durationMs };
  } finally {
    source.pause();
    source.src = "";
    URL.revokeObjectURL(objectUrl);
  }
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
  const livePreviewRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const itemsRef = useRef<Item[]>([]);

  const boomerangSeconds = Math.max(1, Math.min(3, Math.floor(videoDuration / 2)));
  const videoLimit = videoCaptureMode === "boomerang" ? boomerangSeconds : videoDuration;

  const options: { mode: Mode; label: string; description: string; enabled: boolean }[] = [
    { mode: "video", label: "Video", description: `Maks. ${videoLimit} detik`, enabled: allowVideo },
    { mode: "voice", label: "Voice note", description: `Maks. ${voiceNoteDuration} detik`, enabled: allowVoiceNote },
    { mode: "text", label: "Text", description: "Ucapan tertulis", enabled: allowMessage },
  ];
  const activeMode = selectedModes[activeIndex];
  const activeOption = options.find((option) => option.mode === activeMode);
  const activeItem = items.find((item) => item.mode === activeMode);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => () => {
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
    void streamPromise.then((stream) => {
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      startedRef.current = Date.now();
      setRecordingMode(mode);
      setRecording(true);
      setSeconds(0);
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { setError("Rekaman gagal. Silakan coba lagi."); stopRecording(); };
      recorder.onstop = () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        setRecordingMode(null);
        recorderRef.current = null;
        const limitSeconds = mode === "video" ? videoLimit : voiceNoteDuration;
        const durationMs = Math.min(Math.max(1, Date.now() - startedRef.current), limitSeconds * 1000);
        const baseBlob = new Blob(chunksRef.current, { type: mimeType });

        void (async () => {
          try {
            let finalBlob = baseBlob;
            let finalMimeType = mimeType;
            let finalDurationMs = durationMs;

            if (mode === "video" && videoCaptureMode === "boomerang") {
              const boomerang = await createBoomerangVideo(baseBlob, durationMs / 1000);
              finalBlob = boomerang.blob;
              finalMimeType = boomerang.mimeType;
              finalDurationMs = boomerang.durationMs;
            }

            updateItem(mode, { recording: { mode, blob: finalBlob, mimeType: finalMimeType, durationMs: finalDurationMs, url: URL.createObjectURL(finalBlob) } });
          } catch {
            setError("Boomerang belum didukung di perangkat ini.");
            updateItem(mode, { recording: { mode, blob: baseBlob, mimeType, durationMs, url: URL.createObjectURL(baseBlob) } });
          }
        })();
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

  const style = { "--primary": "#1c3359", "--secondary": "#e9eff7" } as CSSProperties;
  return <main className="wedding-page relative min-h-screen overflow-hidden bg-[#fbf5ec] px-5 py-8 text-[#1c3359] sm:px-6 sm:py-10" style={style}>
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      <div className="absolute -right-12 -top-8 h-48 w-48 rotate-12 rounded-[45%] border-2 border-[#b98b4f]/20" />
      <div className="absolute right-4 top-10 text-5xl text-[#d8b68a]/35">❀</div><div className="absolute right-16 top-24 text-3xl text-[#b99b77]/30">✦</div>
      <div className="absolute -bottom-14 -left-12 h-44 w-44 -rotate-12 rounded-[45%] border-2 border-[#b98b4f]/15" />
      <div className="absolute bottom-14 left-5 text-5xl text-[#d8b68a]/30">❀</div><div className="absolute bottom-28 right-8 text-2xl text-[#b99b77]/25">✦</div>
    </div>
    <div className="wedding-panel guest-fade relative z-10 mx-auto max-w-lg rounded-[2rem] p-6 sm:p-10">
      {stage === "success" ? <div className="text-center">
        <div className="relative mx-auto w-fit"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#3c5a85] text-white shadow-xl shadow-[#b98b4f]/25"><Heart size={30} fill="currentColor" /></span><span className="absolute -right-7 top-2 text-xl text-[#b98b4f]">✦</span><span className="absolute -left-7 bottom-2 text-sm text-[#b98b4f]">✦</span></div>
        <h1 className="mt-4 font-serif text-[clamp(2.2rem,9vw,3rem)] font-normal leading-[1.05] tracking-[-.01em] text-[#1c3359]">Terima kasih</h1>
        <div className="mx-auto mt-3 flex max-w-[250px] items-center gap-3 text-[#b98b4f]"><span className="h-px flex-1 bg-[#dcc39a]" /><span className="text-sm">♥</span><span className="h-px flex-1 bg-[#dcc39a]" /></div>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#5a6c8c]">Kenangan Anda telah menjadi bagian<br />dari cerita <strong className="font-serif text-lg font-normal text-[#1c3359]">{eventName}</strong></p>
        <section className="relative mt-4 flex items-center gap-3 rounded-[1.25rem] border border-[#dcc39a] bg-[#fbf5ec] p-3 text-left shadow-sm">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ead7bd] text-[#a67a40]">✓</span><div><h2 className="font-semibold text-[#1c3359]">Foto berhasil tersimpan!</h2><p className="mt-1 text-xs leading-5 text-[#5a6c8c]">Foto dan pesan Anda telah ditambahkan ke galeri kenangan acara.</p></div><span className="absolute right-3 top-3 text-sm text-[#b98b4f]">✦</span>
        </section>
        {pendingPhotos.length > 0 && <div className="mx-auto mt-5 w-[min(46vw,160px)] rotate-[-3deg] bg-white p-3 pb-5 shadow-xl shadow-[#5a6c8c]/20"><SuccessPhoto photos={pendingPhotos} template={selectedTemplate} eventName={eventName} eventDate={eventDate} location={location} /><p className="mt-3 text-center font-serif text-lg italic text-[#8c6e52]">Terima kasih! ♡</p></div>}
        <div className="mx-auto mt-8 flex max-w-[250px] items-center gap-3 text-[#b98b4f]"><span className="h-px flex-1 bg-[#dcc39a]" /><span className="text-sm">♥</span><span className="h-px flex-1 bg-[#dcc39a]" /></div>
        <p className="mt-5 text-sm leading-6 text-[#5a6c8c]">Terima kasih telah berbagi momen<br />istimewa bersama kami.</p>
        {pendingPhotos.length > 0 && <StoryActions photos={pendingPhotos} template={selectedTemplate} eventName={eventName} eventDate={eventDate} location={location} />}
        <Link href={`/event/${eventId}/gallery`} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1c3359] px-5 text-sm font-semibold text-white shadow-lg shadow-[#1c3359]/20">Lihat Galeri Kenangan <span className="text-[#e6c08f]">→</span></Link>
        <div className="my-5 flex items-center gap-3 text-xs text-[#5a6c8c]"><span className="h-px flex-1 bg-[#d5dde9]" /><span>atau</span><span className="h-px flex-1 bg-[#d5dde9]" /></div>
        <button type="button" onClick={onBack} className="flex h-14 w-full items-center justify-center gap-2 rounded-full border border-[#b98b4f] bg-[#fbf5ec] px-5 text-sm font-semibold text-[#1c3359]"><RefreshCw size={17} /> Ulangi Pengambilan</button>
      </div> : <>
        <button type="button" onClick={() => stage === "review" ? setStage("compose") : onBack()} className="flex items-center gap-2 text-sm font-medium text-[#5a6c8c]"><ArrowLeft size={16} /> Kembali</button>
        <h1 className="mt-8 font-serif text-4xl">{stage === "compose" ? activeOption?.label : "Kenangan Anda"}</h1>
        <p className="mt-3 text-sm leading-6 text-[#5a6c8c]">{stage === "compose" ? `Pilihan ${activeIndex + 1} dari ${selectedModes.length}: ${activeOption?.label ?? ""}` : "Tidak ada yang terkirim sebelum Anda menekan Kirim Semua."}</p>
        {stage === "compose" && activeMode && <div className="mt-8 rounded-2xl border border-[#d5dde9] p-4">
          {activeMode === "text" ? <><input value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={100} placeholder="Nama (opsional)" className="mb-3 w-full border-b border-[#d5dde9] pb-2 outline-none" /><textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} maxLength={500} placeholder="Tuliskan ucapan untuk kedua mempelai..." className="w-full resize-none outline-none" /><p className="mt-2 text-right text-xs text-[#5a6c8c]">{text.length} / 500</p></> : activeItem?.recording ? <div className="flex items-center justify-between text-sm font-semibold"><span>{activeOption?.label} siap direview</span><button type="button" onClick={() => startRecording(activeMode)} className="text-[#5a6c8c]">Rekam lagi</button></div> : <button type="button" onClick={() => startRecording(activeMode)} className="flex w-full items-center gap-3 text-left font-semibold">{activeMode === "video" ? <Video size={19} /> : <Mic size={19} />} Rekam {activeOption?.label}</button>}
        </div>}
        {recordingMode === "video" && recording && <video ref={livePreviewRef} autoPlay muted playsInline className="mt-4 max-h-64 w-full rounded-xl bg-black object-contain" />}
        {recording && <div className="mt-5 rounded-[1.5rem] bg-[#1c3359] p-5 text-center text-sm font-semibold text-white shadow-lg"><div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-[#e9eff7]"><span className="guest-pulse h-2.5 w-2.5 rounded-full bg-red-400" /> REC</div><div className="mt-3 font-serif text-3xl">{String(seconds).padStart(2, "0")}s <span className="text-sm font-sans text-white/45">/ {recordingMode === "video" ? videoLimit : voiceNoteDuration}s</span></div><div className="mt-4 flex h-8 items-center justify-center gap-1">{Array.from({ length: 18 }, (_, index) => <span key={index} className="w-1 rounded-full bg-[#e9eff7]" style={{ height: `${10 + ((index * 7) % 20)}px` }} />)}</div><button type="button" onClick={stopRecording} className="mt-4 min-h-12 rounded-full bg-white px-8 text-sm font-semibold text-[#1c3359] active:scale-95">Stop</button></div>}
        {stage === "compose" && <GuestButton type="button" disabled={recording} onClick={continueCurrent} className="mt-8 w-full">{activeMode === "text" || activeIndex === selectedModes.length - 1 ? "Tinjau semua" : "Berikutnya"}</GuestButton>}
        {(stage === "review" || stage === "sending") && <><div className="mt-8 grid gap-4">{pendingPhotos.map((photo) => <div key={photo.id} className={`rounded-[1.5rem] border p-3 shadow-sm ${failedPhotos.includes(photo.id) ? "border-red-300 bg-red-50" : "border-[#d5dde9] bg-white"}`}><PhotoPreview photoUrl={photo.url} template={selectedTemplate} eventName={eventName} eventDate={eventDate} location={location} imageFilter={photo.filter ? getPhotoFilterCss(photo.filter) : "none"} /><p className="mt-2 text-xs text-[#5a6c8c]">{uploadedPhotos.includes(photo.id) ? "Siap dikirim" : failedPhotos.includes(photo.id) ? "Gagal dikirim" : "Menunggu dikirim"}</p></div>)}{items.map((item) => <div key={item.mode} className={`rounded-[1.5rem] border p-5 shadow-sm ${failed.includes(item.mode) ? "border-red-300 bg-red-50" : "border-[#d5dde9] bg-white"}`}>{item.mode === "text" ? <><p className="font-serif text-xl leading-8">“{item.text}”</p>{guestName && <p className="mt-3 text-xs text-[#5a6c8c]">— {guestName}</p>}</> : item.recording && <>{item.mode === "video" ? <video controls playsInline src={item.recording.url} className="max-h-56 w-full rounded-xl bg-black object-contain" /> : <audio controls src={item.recording.url} className="w-full" />}<p className="mt-3 text-xs text-[#5a6c8c]">{failed.includes(item.mode) ? "Gagal dikirim" : "Siap dikirim"}</p></>}</div>)}</div>{error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<button type="button" disabled={stage === "sending"} onClick={() => void sendAll()} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1c3359] px-5 py-4 font-semibold text-white disabled:opacity-50">{stage === "sending" ? "Mengirim..." : failed.length || failedPhotos.length ? <><RefreshCw size={17} /> Kirim ulang yang gagal</> : <><Send size={17} /> Kirim Semua</>}</button></>}
        {error && stage === "compose" && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </>}
    </div>
  </main>;
}
