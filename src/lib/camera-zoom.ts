import { useCallback, useRef, useState } from "react";

export const STORY_RATIO = 9 / 16;

export type ZoomRange = { hardware: boolean; min: number; max: number };

export function readZoomRange(stream: MediaStream): ZoomRange {
  const track = stream.getVideoTracks()[0];
  const caps = (typeof track?.getCapabilities === "function" ? track.getCapabilities() : {}) as unknown as { zoom?: { min: number; max: number } };
  if (caps.zoom && typeof caps.zoom.max === "number" && caps.zoom.max > (caps.zoom.min ?? 1)) {
    return { hardware: true, min: caps.zoom.min, max: caps.zoom.max };
  }
  return { hardware: false, min: 1, max: 3 };
}

export function zoomPresets(range: ZoomRange): number[] {
  const presets = [0.5, 1, 2, 3, 5].filter((z) => z >= range.min - 0.001 && z <= range.max + 0.001);
  return presets.includes(1) ? presets : [1];
}

// Mengembalikan faktor zoom digital (1 = zoom ditangani langsung oleh kamera).
export async function applyZoom(stream: MediaStream, range: ZoomRange, zoom: number): Promise<number> {
  const track = stream.getVideoTracks()[0];
  if (range.hardware && track) {
    try {
      await track.applyConstraints({ advanced: [{ zoom }] } as unknown as MediaTrackConstraints);
      return 1;
    } catch { /* lanjut ke zoom digital */ }
  }
  return Math.max(1, zoom);
}

export function useCameraZoom() {
  const [options, setOptions] = useState<number[]>([1]);
  const [zoom, setZoom] = useState(1);
  const [digital, setDigital] = useState(1);
  const digitalRef = useRef(1);
  const rangeRef = useRef<ZoomRange>({ hardware: false, min: 1, max: 3 });
  const streamRef = useRef<MediaStream | null>(null);

  const attach = useCallback((stream: MediaStream) => {
    streamRef.current = stream;
    const range = readZoomRange(stream);
    rangeRef.current = range;
    digitalRef.current = 1;
    setOptions(zoomPresets(range));
    setZoom(1);
    setDigital(1);
  }, []);

  const change = useCallback(async (value: number) => {
    setZoom(value);
    const stream = streamRef.current;
    if (!stream) return;
    const next = await applyZoom(stream, rangeRef.current, value);
    digitalRef.current = next;
    setDigital(next);
  }, []);

  return { options, zoom, digital, digitalRef, attach, change };
}
