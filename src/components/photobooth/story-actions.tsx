"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, Share2 } from "lucide-react";
import type { PreviewTemplate } from "./photo-preview";
import { configFromTemplateRecord, fitTemplateText, normalizeTemplate, resolveTemplateText } from "@/lib/image/template-config";
import { getPhotoFilterCss, type PhotoFilter } from "@/lib/image/photo-filter";

type Shot = { blob: Blob; filter: PhotoFilter };
type Props = { photos: Shot[]; template: PreviewTemplate | null; eventName: string; eventDate: string; location?: string | null };

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

async function buildFrame(p: Props) {
  const config = p.template ? configFromTemplateRecord(p.template) : normalizeTemplate();
  const { width, height, photoSlots, texts } = config;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia.");
  if (document.fonts?.ready) await document.fonts.ready;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ecf0ee";
  ctx.fillRect(0, 0, width, height);

  const [bg, logo, overlay] = await Promise.all([config.background, config.logo, config.overlay].map((v) => (v ? loadImage(v) : Promise.resolve(null))));
  if (bg) cover(ctx, bg, 0, 0, width, height);

  const urls = p.photos.map((shot) => URL.createObjectURL(shot.blob));
  try {
    const imgs = await Promise.all(urls.map(loadImage));
    const canFilter = "filter" in ctx;
    imgs.forEach((img, i) => {
      const slot = photoSlots[i];
      if (!img || !slot) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(slot.x, slot.y, slot.width, slot.height);
      ctx.clip();
      if (canFilter) ctx.filter = getPhotoFilterCss(p.photos[i].filter);
      cover(ctx, img, slot.x, slot.y, slot.width, slot.height);
      ctx.restore();
    });
  } finally {
    urls.forEach((u) => URL.revokeObjectURL(u));
  }

  if (logo) {
    const s = Math.min((width * 0.8) / logo.naturalWidth, (height * 0.12) / logo.naturalHeight, 1);
    const lw = logo.naturalWidth * s;
    ctx.drawImage(logo, (width - lw) / 2, height * 0.015, lw, logo.naturalHeight * s);
  }
  const vars = { eventName: p.eventName, eventDate: p.eventDate, location: p.location ?? "" };
  for (const item of texts) {
    const resolved = resolveTemplateText(item.text, vars);
    const fit = fitTemplateText(item, resolved, width);
    ctx.fillStyle = item.color ?? "#2c3b48";
    ctx.font = `600 ${fit.fontSize}px ${item.fontFamily ?? "Arial"}`;
    ctx.textAlign = fit.align === "left" ? "left" : fit.align === "right" ? "right" : "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(resolved, item.x, item.y);
  }
  if (overlay) ctx.drawImage(overlay, 0, 0, width, height);
  return canvas;
}

function buildStory(frame: HTMLCanvasElement) {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#ebf0ee");
  g.addColorStop(0.55, "#d4dfe1");
  g.addColorStop(1, "#adc2c6");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.42, W);
  glow.addColorStop(0, "rgba(246,249,248,.7)");
  glow.addColorStop(1, "rgba(246,249,248,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const top = 260, bottom = 380;
  const maxW = 940, maxH = H - top - bottom;
  const scale = Math.min(maxW / frame.width, maxH / frame.height);
  const w = frame.width * scale, h = frame.height * scale;
  const x = (W - w) / 2, y = top + (maxH - h) / 2;
  ctx.save();
  ctx.shadowColor = "rgba(42,57,69,.35)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#fff";
  ctx.fillRect(x - 14, y - 14, w + 28, h + 28);
  ctx.restore();
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(frame, x, y, w, h);
  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("gagal"))), "image/jpeg", 0.95));

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function detectCanShare() {
  try {
    const f = new File([new Blob(["x"], { type: "image/jpeg" })], "a.jpg", { type: "image/jpeg" });
    return Boolean(navigator.canShare?.({ files: [f] }));
  } catch {
    return false;
  }
}

const subscribeNoop = () => () => {};

export default function StoryActions(props: Props) {
  const canShare = useSyncExternalStore(subscribeNoop, detectCanShare, () => false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const base = props.eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "foto";

  async function run(kind: "share" | "story" | "orig") {
    if (busy || !props.photos.length) return;
    setBusy(kind);
    setMsg("");
    try {
      const frame = await buildFrame(props);
      const blob = await toBlob(kind === "orig" ? frame : buildStory(frame));
      const name = `${base}-${kind === "orig" ? "bingkai" : "story"}.jpg`;
      if (kind === "share") {
        const file = new File([blob], name, { type: "image/jpeg" });
        try {
          await navigator.share({ files: [file], title: props.eventName });
        } catch (error) {
          if ((error as DOMException)?.name !== "AbortError") save(blob, name);
        }
      } else {
        save(blob, name);
        setMsg("Foto disimpan. Cek galeri atau folder Unduhan di HP Anda.");
      }
    } catch {
      setMsg("Gambar belum bisa disiapkan. Silakan coba lagi.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mt-6 grid gap-2.5">
      {canShare && (
        <button type="button" onClick={() => void run("share")} disabled={Boolean(busy)} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#9cb4c6] to-[#688da8] text-sm font-semibold text-white shadow-lg shadow-[#688da8]/30 transition active:scale-[.98] disabled:opacity-60">
          <Share2 size={17} /> {busy === "share" ? "Menyiapkan..." : "Bagikan ke Instagram Story"}
        </button>
      )}
      <button type="button" onClick={() => void run("story")} disabled={Boolean(busy)} className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#93aec1] bg-[#f8faf9] text-sm font-semibold text-[#52758e] transition active:scale-[.98] disabled:opacity-60">
        <Download size={17} /> {busy === "story" ? "Menyiapkan..." : "Simpan Foto (Format Story)"}
      </button>
      <button type="button" onClick={() => void run("orig")} disabled={Boolean(busy)} className="text-xs font-semibold text-[#789ab2] underline underline-offset-4">
        {busy === "orig" ? "Menyiapkan..." : "Simpan ukuran asli bingkai"}
      </button>
      {msg && <p className="text-center text-xs text-[#7e9eb5]">{msg}</p>}
    </div>
  );
}
