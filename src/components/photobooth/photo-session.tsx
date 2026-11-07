"use client";

/* Blob URLs are local camera previews and cannot use next/image optimization. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  SwitchCamera,
} from "lucide-react";
import CameraView, {
  CameraDiagnostics,
  CameraErrorCode,
  CameraViewHandle,
  FacingMode,
} from "./camera-view";
import { GuestButton, GuestBackButton, SuccessMark } from "./guest-ui";
import CameraSettingsSheet from "./camera-settings";
import FilterCarousel from "./filter-carousel";
import { PhotoPreview, type PreviewTemplate } from "./photo-preview";
import { DEFAULT_PHOTO_FILTER, getPhotoFilterCss, normalizePhotoFilter, PHOTO_FILTER_OPTIONS, type PhotoFilter } from "@/lib/image/photo-filter";
import { configFromTemplateRecord, resolveTemplateText } from "@/lib/image/template-config";

type PhotoSessionProps = {
  eventId: string;
  eventName: string;
  eventDate: string;
  location?: string | null;
  defaultPhotoCount?: number;
  templateId?: string | null;
  selectedTemplate?: PreviewTemplate | null;
  sessionId?: string | null;
  onSessionCreated?: (id: string) => void;
  onBack?: () => void;
  onComplete?: (id: string, photos: CapturedPhoto[]) => void;
};

type SessionState =
  | "permission"
  | "ready"
  | "countdown"
  | "capturing"
  | "preview"
  | "finished"
  | "error";

export type CapturedPhoto = {
  id: string;
  blob: Blob;
  url: string;
  filter: PhotoFilter;
};

const errorMessages: Record<CameraErrorCode, string> = {
  "permission-denied":
    "Camera permission diperlukan untuk menggunakan photobooth. Silakan izinkan akses kamera di browser.",
  "insecure-context":
    "Kamera membutuhkan koneksi HTTPS untuk digunakan dari alamat jaringan ini. Buka aplikasi melalui HTTPS untuk menggunakan kamera.",
  unavailable: "Kamera tidak tersedia pada perangkat ini.",
  security: "Browser memblokir kamera karena halaman ini tidak memiliki izin keamanan yang diperlukan.",
  timeout: "Kamera belum merespons. Kemungkinan permission diblokir browser atau kamera sedang digunakan aplikasi lain.",
  unsupported:
    "Browser ini belum mendukung kamera. Gunakan Chrome atau Safari terbaru.",
  unknown: "Kamera tidak dapat digunakan saat ini. Coba tutup aplikasi lain yang sedang memakai kamera.",
};

const wait = (duration: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, duration));

function CameraFrameOverlay({
  slotIndex = 0,
  template,
  eventName,
  eventDate,
  location,
}: {
  template: PreviewTemplate | null;
  slotIndex?: number;
  eventName: string;
  eventDate: string;
  location?: string | null;
}) {
  const config = template ? configFromTemplateRecord(template) : configFromTemplateRecord({
    width: 1080,
    height: 1350,
    background: null,
    overlay: null,
    logo: null,
    textConfig: null,
  });
  const { width, height, photoSlots, texts } = config;
  const photoArea = photoSlots[Math.min(slotIndex, photoSlots.length - 1)];
  const variables = { eventName, eventDate, location: location ?? "" };
  const position = (value: number, total: number) => `${(value / total) * 100}%`;
  const right = photoArea.x + photoArea.width;
  const bottom = photoArea.y + photoArea.height;
  const outsideSlot = [
    { left: 0, top: 0, width: 100, height: (photoArea.y / height) * 100 },
    { left: 0, top: (photoArea.y / height) * 100, width: (photoArea.x / width) * 100, height: (photoArea.height / height) * 100 },
    { left: (right / width) * 100, top: (photoArea.y / height) * 100, width: ((width - right) / width) * 100, height: (photoArea.height / height) * 100 },
    { left: 0, top: (bottom / height) * 100, width: 100, height: ((height - bottom) / height) * 100 },
  ].filter((segment) => segment.width > 0 && segment.height > 0);
  const assetOutsideSlot = (source: string) => outsideSlot.map((segment, index) => (
    <span key={index} className="pointer-events-none absolute overflow-hidden" style={{ left: `${segment.left}%`, top: `${segment.top}%`, width: `${segment.width}%`, height: `${segment.height}%` }}>
      <img src={source} alt="" className="absolute max-w-none object-fill" style={{ width: `${10000 / segment.width}%`, height: `${10000 / segment.height}%`, left: `-${segment.left * 100 / segment.width}%`, top: `-${segment.top * 100 / segment.height}%` }} />
    </span>
  ));

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${width} / ${height}`, containerType: "inline-size" }}>
      {config.background && assetOutsideSlot(config.background)}
      {config.overlay && assetOutsideSlot(config.overlay)}
      <div
        className="pointer-events-none absolute border border-white/45"
        style={{
          left: position(photoArea.x, width),
          top: position(photoArea.y, height),
          width: position(photoArea.width, width),
          height: position(photoArea.height, height),
        }}
      >
        <span className="absolute -left-px -top-px h-7 w-7 border-l-2 border-t-2 border-[#f1e6d3]/85" />
        <span className="absolute -right-px -top-px h-7 w-7 border-r-2 border-t-2 border-[#f1e6d3]/85" />
        <span className="absolute -bottom-px -left-px h-7 w-7 border-b-2 border-l-2 border-[#f1e6d3]/85" />
        <span className="absolute -bottom-px -right-px h-7 w-7 border-b-2 border-r-2 border-[#f1e6d3]/85" />
      </div>
      {config.logo && <img src={config.logo} alt="" className="pointer-events-none absolute left-1/2 top-[1.5%] max-h-[12%] max-w-[80%] -translate-x-1/2 object-contain opacity-90" />}
      {texts.map((item, index) => (
        <span
          key={`${item.text}-${index}`}
          className="pointer-events-none absolute whitespace-nowrap font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,.55)]"
          style={{
            left: position(item.x, width),
            top: position(item.y, height),
            transform: `${item.align === "left" ? "translate(0, -100%)" : item.align === "right" ? "translate(-100%, -100%)" : "translate(-50%, -100%)"}`,
            color: item.color ?? "#fff",
            fontFamily: item.fontFamily ?? "Arial",
            fontSize: `clamp(0.45rem, ${(item.fontSize ?? 32) / width * 100}cqw, 2rem)`,
            textAlign: item.align ?? "center",
          }}
        >
          {resolveTemplateText(item.text, variables)}
        </span>
      ))}
    </div>
  );
}

function SlotGuide({ template, slotIndex }: { template: PreviewTemplate | null; slotIndex: number }) {
  const { photoSlots } = configFromTemplateRecord(template ?? { width: 1080, height: 1350, background: null, overlay: null, logo: null, textConfig: null });
  const slot = photoSlots[Math.min(slotIndex, photoSlots.length - 1)];
  const ratio = slot.width / slot.height;
  return (
    <div key={slotIndex} className="guide-in relative" style={{ aspectRatio: String(ratio), width: "min(95vw, calc(52vh * " + ratio + "))", boxShadow: "0 0 0 100vmax rgba(12,10,9,.72)", borderRadius: 18, outline: "1px solid rgba(230,205,189,.55)" }}>
      <span className="absolute -left-px -top-px h-8 w-8 rounded-tl-[18px] border-l-2 border-t-2 border-[#f1e6d3]" />
      <span className="absolute -right-px -top-px h-8 w-8 rounded-tr-[18px] border-r-2 border-t-2 border-[#f1e6d3]" />
      <span className="absolute -bottom-px -left-px h-8 w-8 rounded-bl-[18px] border-b-2 border-l-2 border-[#f1e6d3]" />
      <span className="absolute -bottom-px -right-px h-8 w-8 rounded-br-[18px] border-b-2 border-r-2 border-[#f1e6d3]" />
    </div>
  );
}

export default function PhotoSession({
  eventDate,
  eventName,
  location,
  defaultPhotoCount = 3,
  sessionId: initialSessionId = null,
  onBack,
  onComplete,
  selectedTemplate = null,
}: PhotoSessionProps) {
  const cameraRef = useRef<CameraViewHandle>(null);
  const [state, setState] = useState<SessionState>("permission");
  const [selectedPhotoCount] = useState(
    Math.min(4, Math.max(1, selectedTemplate ? configFromTemplateRecord(selectedTemplate).photoSlots.length : defaultPhotoCount)),
  );
  const [currentPhoto, setCurrentPhoto] = useState(1);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [activeCamera, setActiveCamera] = useState<FacingMode>("user");
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilter>(DEFAULT_PHOTO_FILTER);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [flashOn, setFlashOn] = useState(true);
  const [ringLight, setRingLight] = useState(false);
  const [timerSecs, setTimerSecs] = useState(3);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const [errorCode, setErrorCode] = useState<CameraErrorCode | null>(null);
  const [sessionId] = useState<string | null>(initialSessionId);
  const [diagnostics, setDiagnostics] = useState<CameraDiagnostics | null>(null);
  const handleCameraReady = useCallback(() => {
    setState((current) => current === "permission" ? "ready" : current);
  }, []);

  const clearPhotos = useCallback(() => {
    setCapturedPhotos((photos) => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.url));
      return [];
    });
  }, []);

  useEffect(() => clearPhotos, [clearPhotos]);

  const handleStart = () => {
    clearPhotos();
    setCurrentPhoto(1);
    setErrorCode(null);
    setState("permission");
  };

  const handleCameraError = useCallback((code: CameraErrorCode) => {
    setErrorCode(code);
    setState("error");
  }, []);

  const handleDiagnostics = useCallback((value: CameraDiagnostics) => {
    setDiagnostics(value);
  }, []);

  const takePhoto = async () => {
    if (state !== "ready" || !cameraRef.current) return;
    setState("countdown");
    
    for (let number = timerSecs; number > 0; number -= 1) {
      setCountdown(number);
      await wait(900);
    }
    setCountdown(null);
    setState("capturing");
    try {
      const blob = await cameraRef.current.captureFrame();
      void cameraRef.current?.setTorch(false);
      const photo = { id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob), filter: normalizePhotoFilter(selectedFilter) };
      if (flashOn) setFlash(true);
      setCapturedPhotos((photos) => [...photos, photo]);
      await wait(320);
      setFlash(false);
      if (currentPhoto >= selectedPhotoCount) {
        setState("preview");
      } else {
        setCurrentPhoto((photo) => photo + 1);
        setState("ready");
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error(error);
      setErrorCode("unknown");
      setState("error");
    }
  };

  if (state === "preview" || state === "finished") {
    return <main className="min-h-screen bg-[#fbf5ec] px-5 py-10 text-[#3d2b1f]"><div className="mx-auto max-w-lg"><div className="text-center"><SuccessMark /><h1 className="mt-6 font-serif text-4xl">Foto Anda telah siap</h1><p className="mt-2 text-sm text-[#7b6556]">Periksa hasil foto sebelum dikirim ke galeri pernikahan.</p></div>    <div className="result-in relative mx-auto mt-8 w-full max-w-[390px] overflow-hidden rounded-[1.25rem] border border-[#dcc39a] bg-white p-2 shadow-lg shadow-[#7b6556]/15"><PhotoPreview photoUrls={capturedPhotos.map((photo) => photo.url)} template={selectedTemplate} eventName={eventName} eventDate={eventDate} location={location} imageFilter={getPhotoFilterCss(capturedPhotos[0]?.filter ?? selectedFilter)} /><span className="absolute bottom-4 right-4 grid h-7 w-7 place-items-center rounded-full bg-[#6b4b36] text-sm font-bold text-white shadow-md" aria-label="Berhasil">✓</span></div>{state === "preview" ? <div className="mx-auto mt-6 grid w-full max-w-[390px] gap-3 font-sans sm:mt-8"><GuestButton type="button" variant="secondary" onClick={handleStart} className="flex h-[56px] w-full items-center justify-center gap-2 rounded-full border border-[#a8834a] bg-[#fbf5ec] px-5 text-[15px] font-semibold text-[#3d2b1f] shadow-sm hover:bg-[#fff1de]"><RefreshCw size={20} /> <span>Ulangi Pengambilan</span></GuestButton><GuestButton type="button" disabled={!sessionId} onClick={() => { setState("finished"); if (sessionId) onComplete?.(sessionId, capturedPhotos); }} className="flex h-[56px] w-full items-center justify-center gap-2 rounded-full border border-[#a8834a]/70 bg-[#3d2b1f] px-5 text-[15px] font-semibold text-white shadow-lg shadow-[#3d2b1f]/20 hover:bg-[#493a31]"><Check size={20} /> <span>Lanjutkan</span> <ArrowRight size={19} className="text-[#e6c08f]" /></GuestButton></div> : <p className="mt-8 text-center text-sm text-[#7b6556]">Sesi selesai.</p>}</div></main>;  }

  if (state === "error") {
    return <main className="grid min-h-screen place-items-center bg-[#fbf5ec] px-6 text-[#3d2b1f]"><div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl shadow-[#c4b1a5]/20"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f8e9e3] text-[#a56f5a]"><Camera size={20} /></span><h1 className="mt-5 font-serif text-3xl">Kamera belum siap</h1><p className="mt-3 text-sm leading-6 text-[#7b6556]">{errorCode ? errorMessages[errorCode] : errorMessages.unknown}</p>{process.env.NODE_ENV === "development" && diagnostics && <div className="mt-5 rounded-xl bg-[#fbf8f5] p-3 text-left text-xs leading-5 text-[#7b6556]"><p>Protocol: {diagnostics.protocol.toUpperCase()}</p><p>Secure context: {diagnostics.secureContext ? "YES" : "NO"}</p><p>MediaDevices: {diagnostics.mediaDevices ? "AVAILABLE" : "UNAVAILABLE"}</p><p>getUserMedia: {diagnostics.getUserMedia ? "AVAILABLE" : "UNAVAILABLE"}</p></div>}<button type="button" onClick={handleStart} className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3d2b1f] px-5 py-4 font-semibold text-white"><RotateCcw size={17} /> Coba lagi</button></div></main>;
  }

  return (
    <main onTouchStart={(e) => { const t = e.touches[0]; swipeStart.current = settingsOpen || (e.target as HTMLElement).closest("[data-noswipe]") ? null : { x: t.clientX, y: t.clientY }; }} onTouchEnd={(e) => { const st = swipeStart.current; swipeStart.current = null; if (!st || state !== "ready") return; const t = e.changedTouches[0]; const dx = t.clientX - st.x; const dy = t.clientY - st.y; if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return; const i = PHOTO_FILTER_OPTIONS.findIndex((o) => o.value === selectedFilter); const next = PHOTO_FILTER_OPTIONS[Math.min(PHOTO_FILTER_OPTIONS.length - 1, Math.max(0, i + (dx < 0 ? 1 : -1)))]; if (next) setSelectedFilter(next.value); }} className="fixed inset-0 overflow-hidden bg-[#151413] text-white" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <CameraView ref={cameraRef} active={state === "permission" || state === "ready" || state === "countdown" || state === "capturing"} facingMode={activeCamera} filter={selectedFilter} mirror={mirror} onReady={handleCameraReady} onError={handleCameraError} onDiagnostics={handleDiagnostics} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45" />
      <div className="pointer-events-none absolute inset-0 z-[1] grid place-items-center pt-[8rem] pb-[16rem]"><SlotGuide template={selectedTemplate} slotIndex={currentPhoto - 1} /></div>
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-5 py-5 sm:px-8"><GuestBackButton onClick={() => onBack?.()} /><div className="text-center"><p className="max-w-[220px] truncate font-serif text-lg tracking-wide">{eventName}</p><p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-[#f1e6d3]/80">Foto {currentPhoto} dari {selectedPhotoCount}</p></div><span className="h-11 w-11" aria-hidden="true" /></header>
      <div className="absolute left-1/2 top-1/2 z-10 w-full -translate-x-1/2 -translate-y-1/2 px-8 text-center">{state === "permission" && <p className="text-sm text-white/80">Menyiapkan kamera</p>}{countdown !== null && <span key={countdown} className="count-pop font-serif text-[9rem] leading-none drop-shadow-2xl">{countdown}</span>}{state === "capturing" && <p className="text-sm font-semibold uppercase tracking-[0.25em]">Tahan sebentar</p>}</div>
      <div className="absolute bottom-[12.75rem] left-0 right-0 z-10"><FilterCarousel value={selectedFilter} onChange={setSelectedFilter} /></div>
      <footer className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-6 pt-4 sm:px-8"><p className="mb-3 text-center text-xs text-white/75">Tekan tombol bulat untuk memotret · geser layar untuk ganti filter</p><div className="mb-5 flex items-center justify-center gap-2">{Array.from({ length: selectedPhotoCount }, (_, index) => <span key={index} className={`h-1.5 flex-1 max-w-16 rounded-full ${index < capturedPhotos.length ? "bg-[#f1e6d3]" : "bg-white/25"}`} />)}</div><div className="flex items-center justify-between"><button type="button" onClick={() => setActiveCamera((camera) => camera === "user" ? "environment" : "user")} disabled={state !== "ready"} className="flex w-20 flex-col items-center gap-1.5 text-center text-[11px] font-semibold leading-tight text-white transition active:scale-95 disabled:opacity-40" aria-label="Putar kamera depan atau belakang"><span className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-black/45 backdrop-blur"><SwitchCamera size={20} /></span>Putar Kamera</button><div className="hidden">{capturedPhotos.slice(-2).map((photo) =>       <img key={photo.id} src={photo.url} alt="" style={{ filter: getPhotoFilterCss(photo.filter) }} className="thumb-in h-12 w-9 rounded-lg bg-black object-contain opacity-80" />)}</div><button disabled={state !== "ready"} onClick={() => void takePhoto()} className="grid h-20 w-20 place-items-center rounded-full border-4 border-[#f1e6d3] bg-white text-[#3d2b1f] shadow-[0_0_0_7px_rgba(230,205,189,.28),0_14px_30px_rgba(0,0,0,.5)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Ambil foto"><span className="grid h-14 w-14 place-items-center rounded-full border-2 border-[#3d2b1f]"><Camera size={23} fill="currentColor" /></span></button><button type="button" onClick={() => setSettingsOpen(true)} disabled={state !== "ready"} className="flex w-20 flex-col items-center gap-1.5 text-center text-[11px] font-semibold leading-tight text-white transition active:scale-95 disabled:opacity-40" aria-label="Pengaturan kamera"><span className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-black/45 backdrop-blur"><SlidersHorizontal size={20} /></span>Pengaturan</button></div></footer>
      {ringLight && <div className="pointer-events-none absolute inset-0 z-[2]" style={{ boxShadow: "inset 0 0 0 26px rgba(255,246,230,.94), inset 0 0 90px 30px rgba(255,236,200,.55)" }} />}{settingsOpen && <CameraSettingsSheet onClose={() => setSettingsOpen(false)} camera={activeCamera} onCamera={setActiveCamera} mirror={mirror} onMirror={setMirror} flash={flashOn} onFlash={setFlashOn} ring={ringLight} onRing={setRingLight} timer={timerSecs} onTimer={setTimerSecs} />}{flash && <div className="flash-pop pointer-events-none absolute inset-0 z-20 bg-white" />}
    </main>
  );
}
