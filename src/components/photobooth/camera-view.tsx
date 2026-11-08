"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { getPhotoFilterCss, type PhotoFilter } from "@/lib/image/photo-filter";
import { tuneCameraTrack } from "@/lib/camera-tuning";
import { STORY_RATIO, useCameraZoom } from "@/lib/camera-zoom";
import ZoomControl from "./zoom-control";

export type FacingMode = "user" | "environment";

export type CameraErrorCode =
  | "unsupported"
  | "permission-denied"
  | "insecure-context"
  | "unavailable"
  | "security"
  | "timeout"
  | "unknown";

export type CameraDiagnostics = {
  protocol: string;
  hostname: string;
  secureContext: boolean;
  mediaDevices: boolean;
  getUserMedia: boolean;
};

export type CameraViewHandle = {
  captureFrame: () => Promise<Blob>;
  setTorch: (on: boolean) => Promise<boolean>;
  getDimensions: () => { width: number; height: number; ratio: number } | null;
};

type CameraViewProps = {
  active: boolean;
  facingMode: FacingMode;
  filter?: PhotoFilter;
  mirror?: boolean;
  onReady: (dimensions: { width: number; height: number; ratio: number }) => void;
  onError: (code: CameraErrorCode) => void;
  onDiagnostics: (diagnostics: CameraDiagnostics) => void;
};

function getErrorCode(error: unknown): CameraErrorCode {
  const name = error instanceof DOMException
    ? error.name
    : error && typeof error === "object" && "name" in error && typeof error.name === "string"
      ? error.name
      : "";
  if (name) {
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "permission-denied";
    }
    if (name === "SecurityError") return "security";
    if (
      name === "NotFoundError" ||
      name === "NotReadableError" ||
      name === "AbortError" ||
      name === "OverconstrainedError"
    ) {
      return "unavailable";
    }
    if (name === "TypeError") return "unsupported";
  }
  return "unknown";
}

const CameraView = forwardRef<CameraViewHandle, CameraViewProps>(
  function CameraView({ active, facingMode, filter = "natural", mirror = true, onReady, onError, onDiagnostics }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mirrorRef = useRef(mirror);
    const facingRef = useRef(facingMode);
    mirrorRef.current = mirror;
    facingRef.current = facingMode;
    const streamRef = useRef<MediaStream | null>(null);
    const [videoReady, setVideoReady] = useState(false);
    const zoomApi = useCameraZoom();
    const digitalRef = zoomApi.digitalRef;

    useImperativeHandle(ref, () => ({
      async captureFrame() {
        const video = videoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight) {
          throw new Error("Camera belum siap.");
        }

        const canvas = document.createElement("canvas");
        // Ukuran cerita Instagram 9:16, dipotong dari tengah, sesuai zoom digital
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const baseW = STORY_RATIO > vw / vh ? vw : vh * STORY_RATIO;
        const baseH = STORY_RATIO > vw / vh ? vw / STORY_RATIO : vh;
        const zoom = digitalRef.current;
        const sw = baseW / zoom;
        const sh = baseH / zoom;
        const outScale = Math.min(1, 1920 / sh);
        canvas.width = Math.round(sw * outScale);
        canvas.height = Math.round(sh * outScale);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas tidak tersedia.");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        if (facingRef.current === "user" && mirrorRef.current) {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        context.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);

        const probe = document.createElement("canvas");
        probe.width = 16;
        probe.height = 16;
        const probeCtx = probe.getContext("2d");
        probeCtx?.drawImage(canvas, 0, 0, 16, 16);
        const px = probeCtx?.getImageData(0, 0, 16, 16).data;
        if (px) {
          let sum = 0;
          for (let i = 0; i < px.length; i += 4) sum += px[i] + px[i + 1] + px[i + 2];
          if (sum / ((px.length / 4) * 3) < 3) throw new Error("Frame kamera kosong.");
        }
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.95),
        );
        if (!blob) throw new Error("Foto gagal dibuat.");
        return blob;
      },
      async setTorch(on: boolean) {
        const track = streamRef.current?.getVideoTracks()[0];
        try {
          await track?.applyConstraints({ advanced: [{ torch: on }] } as unknown as MediaTrackConstraints);
          return Boolean(track);
        } catch {
          return false;
        }
      },
      getDimensions() {
        const video = videoRef.current;
        if (!video?.videoWidth || !video.videoHeight) return null;
        return { width: video.videoWidth, height: video.videoHeight, ratio: video.videoWidth / video.videoHeight };
      },
    }), []);

    useEffect(() => {
      let cancelled = false;
      const videoElement = videoRef.current;
      setVideoReady(false);

      const stopStream = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
      };

      if (!active) {
        stopStream();
        return () => undefined;
      }

      const diagnostics: CameraDiagnostics = {
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        secureContext: window.isSecureContext,
        mediaDevices: Boolean(navigator.mediaDevices),
        getUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
      };
      onDiagnostics(diagnostics);

      if (!window.isSecureContext) {
        onError("insecure-context");
        return () => undefined;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        onError("unsupported");
        return () => undefined;
      }

      const timeout = window.setTimeout(() => {
        if (!cancelled) {
          stopStream();
          onError("timeout");
        }
      }, 12000);
      let metadataTimeout: number | undefined;
      let metadataHandler: (() => void) | undefined;

      navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 2560 },
              height: { ideal: 1440 },
              frameRate: { ideal: 30 },
            },
        })
        .then((stream) => {
          window.clearTimeout(timeout);
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          streamRef.current = stream;
          tuneCameraTrack(stream);
          zoomApi.attach(stream);
          const video = videoRef.current;
          if (!video) return;
          video.srcObject = stream;
          metadataTimeout = window.setTimeout(() => {
            if (!cancelled && !video.videoWidth) {
              stopStream();
              onError("timeout");
            }
          }, 12000);
          metadataHandler = () => {
            if (metadataTimeout) window.clearTimeout(metadataTimeout);
            if (cancelled || !video.videoWidth || !video.videoHeight) return;
            setVideoReady(true);
            onReady({
              width: video.videoWidth,
              height: video.videoHeight,
              ratio: video.videoWidth / video.videoHeight,
            });
          };
          video.addEventListener("loadedmetadata", metadataHandler, { once: true });
          void video.play().catch((error: unknown) => {
            window.clearTimeout(metadataTimeout);
            if (!cancelled) onError(getErrorCode(error));
          });
        })
        .catch((error: unknown) => {
          window.clearTimeout(timeout);
          if (metadataTimeout) window.clearTimeout(metadataTimeout);
          if (!cancelled) {
            if (process.env.NODE_ENV === "development") console.error(error);
            onError(getErrorCode(error));
          }
        });

      return () => {
        cancelled = true;
        window.clearTimeout(timeout);
        if (metadataTimeout) window.clearTimeout(metadataTimeout);
        if (videoElement && metadataHandler) videoElement.removeEventListener("loadedmetadata", metadataHandler);
        stopStream();
      };
    }, [active, facingMode, onDiagnostics, onError, onReady]);

    const previewFilter = getPhotoFilterCss(filter);

    return (
      <>
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-black"
          style={{ aspectRatio: "9 / 16", width: "min(100vw, calc(100dvh * 9 / 16))" }}
        >
          <div className="absolute inset-0" style={{ transform: `scale(${zoomApi.digital})` }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ filter: previewFilter }}
              className={`absolute inset-0 h-full w-full object-cover ${facingMode === "user" && mirror ? "-scale-x-100" : ""} ${videoReady ? "opacity-100" : "opacity-0"}`}
            />
          </div>
        </div>
        <div data-noswipe className="absolute inset-x-0 bottom-[18.5rem] z-20 flex justify-center">
          <ZoomControl options={zoomApi.options} value={zoomApi.zoom} onChange={zoomApi.change} />
        </div>
      </>
    );
  },
);

export default CameraView;
