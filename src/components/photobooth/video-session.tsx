"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, SwitchCamera } from "lucide-react";
import FilterCarousel from "./filter-carousel";
import { GuestBackButton } from "./guest-ui";
import { createBoomerangVideo, type GuestMediaRecording } from "./guest-media-panel";
import { DEFAULT_PHOTO_FILTER, getPhotoFilterCss, PHOTO_FILTER_OPTIONS, type PhotoFilter } from "@/lib/image/photo-filter";

type Facing = "user" | "environment";
type State = "starting" | "ready" | "countdown" | "recording" | "processing" | "error";

const MAX_VIDEO_SECONDS = 120;
const RATIO = 3 / 4;
const RING = 2 * Math.PI * 44;

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const clock = (ms: number) => { const total = Math.floor(ms / 1000); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`; };
const limitLabel = (seconds: number) => seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} menit` : `${seconds} detik`;

function pickMime() {
  return ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm", "video/mp4"].find((type) => {
    try { return MediaRecorder.isTypeSupported(type); } catch { return false; }
  }) ?? "";
}

function describeError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "Izin kamera diperlukan. Izinkan akses kamera dan mikrofon di browser, lalu coba lagi.";
  if (name === "NotFoundError") return "Kamera tidak ditemukan pada perangkat ini.";
  if (name === "NotReadableError" || name === "AbortError") return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.";
  return "Kamera tidak dapat digunakan saat ini.";
}

export default function VideoSession({ eventName, maxSeconds, boomerang = false, onBack, onComplete }: {
  eventName: string;
  maxSeconds: number;
  boomerang?: boolean;
  onBack: () => void;
  onComplete: (recording: GuestMediaRecording) => void;
}) {
  const limit = Math.min(MAX_VIDEO_SECONDS, maxSeconds);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const startedRef = useRef(0);
  const unmountedRef = useRef(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const [state, setState] = useState<State>("starting");
  const [facing, setFacing] = useState<Facing>("user");
  const [mirror, setMirror] = useState(true);
  const [filter, setFilter] = useState<PhotoFilter>(DEFAULT_PHOTO_FILTER);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const filterRef = useRef(filter);
  const mirrorRef = useRef(mirror);
  const facingRef = useRef(facing);
  filterRef.current = filter;
  mirrorRef.current = mirror;
  facingRef.current = facing;

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fail = (text: string) => { if (!cancelled) { setMessage(text); setState("error"); } };
    setState("starting");
    if (!window.isSecureContext) { fail("Kamera membutuhkan HTTPS atau localhost. Buka aplikasi lewat alamat HTTPS."); return undefined; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { fail("Browser ini belum mendukung perekaman video. Gunakan Chrome atau Safari terbaru."); return undefined; }
    const timeout = window.setTimeout(() => fail("Kamera belum merespons. Periksa izin browser lalu coba lagi."), 12000);
    const open = (audio: boolean) => navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio });
    open(true).catch(() => open(false)).then((stream) => {
      window.clearTimeout(timeout);
      if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.addEventListener("loadedmetadata", () => { if (!cancelled && video.videoWidth) setState("ready"); }, { once: true });
      void video.play().catch(() => undefined);
    }).catch((error: unknown) => { window.clearTimeout(timeout); fail(describeError(error)); });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [facing, attempt]);

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const startRecording = async () => {
    const stream = streamRef.current;
    const video = videoRef.current;
    if (state !== "ready" || !stream || !video?.videoWidth) return;
    const mimeType = pickMime();
    if (!mimeType) { setMessage("Format rekaman tidak didukung browser ini."); setState("error"); return; }
    setState("countdown");
    for (let n = 3; n > 0; n -= 1) {
      setCountdown(n);
      await wait(900);
      if (unmountedRef.current) return;
    }
    setCountdown(null);
    const sourceRatio = video.videoWidth / video.videoHeight;
    const sw = RATIO > sourceRatio ? video.videoWidth : video.videoHeight * RATIO;
    const sh = RATIO > sourceRatio ? video.videoWidth / RATIO : video.videoHeight;
    const sx = (video.videoWidth - sw) / 2;
    const sy = (video.videoHeight - sh) / 2;
    const scale = Math.min(1, 960 / sh);
    const width = Math.max(2, Math.round((sw * scale) / 2) * 2);
    const height = Math.max(2, Math.round((sh * scale) / 2) * 2);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) { setMessage("Canvas tidak tersedia di browser ini."); setState("error"); return; }
    const draw = () => {
      context.save();
      context.filter = getPhotoFilterCss(filterRef.current);
      if (facingRef.current === "user" && mirrorRef.current) { context.translate(width, 0); context.scale(-1, 1); }
      context.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
      context.restore();
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    const output = canvas.captureStream(30);
    stream.getAudioTracks().forEach((track) => output.addTrack(track));
    const recorder = new MediaRecorder(output, { mimeType, videoBitsPerSecond: 2_000_000, audioBitsPerSecond: 96_000 });
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
    recorder.onerror = () => stopRecording();
    recorder.onstop = () => {
      cancelAnimationFrame(rafRef.current);
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current = null;
      if (unmountedRef.current) return;
      const durationMs = Math.min(Math.max(1, Date.now() - startedRef.current), limit * 1000);
      const base = new Blob(chunksRef.current, { type: mimeType });
      setState("processing");
      void (async () => {
        let blob = base;
        let type = mimeType;
        let ms = durationMs;
        if (boomerang) {
          try {
            const result = await createBoomerangVideo(base, durationMs / 1000);
            blob = result.blob;
            type = result.mimeType;
            ms = result.durationMs;
          } catch { /* pakai video biasa */ }
        }
        if (unmountedRef.current) return;
        onComplete({ mode: "video", blob, mimeType: type, durationMs: ms, url: URL.createObjectURL(blob) });
      })();
    };
    startedRef.current = Date.now();
    setElapsedMs(0);
    setState("recording");
    recorder.start(1000);
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedRef.current;
      setElapsedMs(Math.min(limit * 1000, elapsed));
      if (elapsed >= limit * 1000 && recorder.state === "recording") recorder.stop();
    }, 200);
  };

  const recording = state === "recording";
  const ready = state === "ready";
  const progress = Math.min(1, elapsedMs / (limit * 1000));

  if (state === "error") {
    return <main className="grid min-h-[100svh] place-items-center bg-[#2a1d14] px-6 text-[#f6eee0]">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[.06] p-8 text-center">
        <h1 className="font-serif text-3xl">Kamera belum siap</h1>
        <p className="mt-3 text-sm leading-6 text-white/70">{message}</p>
        <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-[#f1e6d3] px-5 py-4 font-semibold text-[#3d2b1f]"><RotateCcw size={17} /> Coba lagi</button>
        <button type="button" onClick={onBack} className="mt-3 w-full py-2 text-sm text-white/60">Kembali</button>
      </div>
    </main>;
  }

  return <main
    onTouchStart={(event) => { const t = event.touches[0]; swipeStart.current = (event.target as HTMLElement).closest("[data-noswipe]") ? null : { x: t.clientX, y: t.clientY }; }}
    onTouchEnd={(event) => {
      const start = swipeStart.current;
      swipeStart.current = null;
      if (!start || state === "starting" || state === "processing") return;
      const t = event.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
      const index = PHOTO_FILTER_OPTIONS.findIndex((option) => option.value === filter);
      const next = PHOTO_FILTER_OPTIONS[Math.min(PHOTO_FILTER_OPTIONS.length - 1, Math.max(0, index + (dx < 0 ? 1 : -1)))];
      if (next) setFilter(next.value);
    }}
    className="fixed inset-0 flex flex-col overflow-hidden bg-[#151413] text-white"
    style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
  >
    <header className="relative z-10 flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
      <GuestBackButton onClick={onBack} />
      <div className="text-center">
        <p className="max-w-[220px] truncate font-serif text-lg tracking-wide">{eventName}</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-[#f1e6d3]/80">{boomerang ? "Boomerang" : "Video"} · maks. {limitLabel(limit)}</p>
      </div>
      <span className="h-11 w-11" aria-hidden="true" />
    </header>
    <div className="relative min-h-0 flex-1" style={{ containerType: "size" }}>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.5rem] bg-black ring-1 ring-white/15" style={{ width: "min(100cqw, 75cqh)", aspectRatio: "3 / 4" }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ filter: getPhotoFilterCss(filter) }} className={`absolute inset-0 h-full w-full object-cover ${facing === "user" && mirror ? "-scale-x-100" : ""} ${state === "starting" ? "opacity-0" : "opacity-100"}`} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/75 to-transparent" />
        {recording && <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/55 px-4 py-1.5 text-xs font-semibold tracking-[0.15em] backdrop-blur"><span className="guest-pulse h-2.5 w-2.5 rounded-full bg-red-400" /> REC {clock(elapsedMs)} / {clock(limit * 1000)}</div>}
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center px-6 text-center">
          {state === "starting" && <p className="text-sm text-white/80">Menyiapkan kamera</p>}
          {countdown !== null && <span key={countdown} className="count-pop font-serif text-[7rem] leading-none drop-shadow-2xl">{countdown}</span>}
          {state === "processing" && <p className="rounded-full bg-black/60 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em]">Memproses video…</p>}
        </div>
        <div className="absolute inset-x-0 bottom-2 z-10"><FilterCarousel value={filter} onChange={setFilter} /></div>
      </div>
    </div>
    <footer className="relative z-10 shrink-0 px-5 pb-5 pt-3">
      <p className="mb-3 text-center text-xs text-white/75">{recording ? "Ketuk tombol sekali lagi untuk berhenti" : boomerang ? "Hasilnya diputar maju-mundur · geser layar untuk ganti filter" : "Ketuk tombol untuk mulai merekam · geser layar untuk ganti filter"}</p>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setFacing((value) => value === "user" ? "environment" : "user")} disabled={!ready} aria-label="Putar kamera depan atau belakang" className="flex w-20 flex-col items-center gap-1.5 text-center text-[11px] font-semibold leading-tight transition active:scale-95 disabled:opacity-40">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-black/45 backdrop-blur"><SwitchCamera size={20} /></span>Putar Kamera
        </button>
        <button type="button" disabled={!ready && !recording} onClick={() => recording ? stopRecording() : void startRecording()} aria-label={recording ? "Hentikan rekaman" : "Mulai merekam"} className="relative grid h-20 w-20 place-items-center rounded-full transition active:scale-95 disabled:opacity-40">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="6" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="#f1e6d3" strokeWidth="6" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING * (1 - (recording ? progress : 0))} />
          </svg>
          <span className={`block bg-red-500 transition-all ${recording ? "h-7 w-7 rounded-md" : "h-14 w-14 rounded-full"}`} />
        </button>
        <button type="button" onClick={() => setMirror((value) => !value)} disabled={!ready || facing !== "user"} aria-pressed={mirror} aria-label="Balik cermin" className="flex w-20 flex-col items-center gap-1.5 text-center text-[11px] font-semibold leading-tight transition active:scale-95 disabled:opacity-40">
          <span className={`grid h-12 w-12 place-items-center rounded-full border backdrop-blur ${mirror ? "border-[#f1e6d3] bg-[#f1e6d3] text-[#3d2b1f]" : "border-white/20 bg-black/45"}`}>⇋</span>{facing === "user" ? (mirror ? "Mirror Aktif" : "Mirror Mati") : "Mirror"}
        </button>
      </div>
    </footer>
  </main>;
}
