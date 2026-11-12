import sharp from "sharp";
import type { OverlayOptions } from "sharp";
import { storage } from "@/lib/storage/storage";
import {
  DEFAULT_TEMPLATE,
  fitTemplateText,
  normalizeTemplate,
  resolveTemplateText,
  type TemplateConfig,
} from "@/lib/image/template-config";
import { applyPhotoFilter, normalizePhotoFilter, type PhotoFilter } from "@/lib/image/photo-filter";
export type { PhotoArea, TemplateText } from "@/lib/image/template-config";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Server (Railway) tidak punya font sistem -> teks jadi kotak. Pakai font bundel di ./fonts
function setupFonts() {
  try {
    const dir = path.join(process.cwd(), "fonts");
    if (!fs.existsSync(dir)) return;
    const conf = path.join(os.tmpdir(), "wedding-fonts.conf");
    const cache = path.join(os.tmpdir(), "wedding-fontcache");
    fs.writeFileSync(conf, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><include ignore_missing="yes">/etc/fonts/fonts.conf</include><dir>${dir}</dir><cachedir>${cache}</cachedir><alias binding="same"><family>Arial</family><prefer><family>Liberation Sans</family></prefer></alias><alias><family>sans-serif</family><prefer><family>Liberation Sans</family></prefer></alias></fontconfig>`);
    process.env.FONTCONFIG_FILE = conf;
  } catch {}
}
setupFonts();

export type ProcessPhotoInput = {
  original: Buffer;
  template: TemplateConfig;
  variables: { eventName: string; eventDate: string; location: string };
  photoIndex?: number;
  filter?: PhotoFilter | string | null;
};

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

async function assetBuffer(reference: string | null | undefined) {
  if (!reference) return null;
  if (reference.startsWith("data:")) {
    const separator = reference.indexOf(",");
    if (separator < 0) return null;
    const metadata = reference.slice(0, separator);
    const payload = reference.slice(separator + 1);
    return metadata.includes(";base64")
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload));
  }
  if (reference.startsWith("/api/files?key=")) {
    return storage.readFile(decodeURIComponent(reference.slice("/api/files?key=".length)));
  }
  if (reference.startsWith("https://") || reference.startsWith("http://")) {
    const response = await fetch(reference, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const data = await response.arrayBuffer();
    if (data.byteLength > 15 * 1024 * 1024) return null;
    return Buffer.from(data);
  }
  return null;
}

export async function processPhoto({ original, template, variables, photoIndex, filter }: ProcessPhotoInput) {
  const config = normalizeTemplate({ ...DEFAULT_TEMPLATE, ...template });
  const { width, height, photoSlots } = config;
  const photoFilter = normalizePhotoFilter(typeof filter === "string" ? filter : null);
  const rotated = sharp(original).rotate();
  const composites: OverlayOptions[] = [];
  const area = photoSlots[Math.min(Math.max(photoIndex ?? 0, 0), photoSlots.length - 1)];
  if (area) {
    const image = await applyPhotoFilter(rotated.clone(), photoFilter)
      .resize(area.width, area.height, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();
    composites.push({ input: image, left: area.x, top: area.y });
  }
  const background = await assetBuffer(config.background);
  const logo = await assetBuffer(config.logo);
  const overlay = await assetBuffer(config.overlay);
  if (background) {
    composites.unshift({
      input: await sharp(background).resize(width, height, { fit: "cover" }).png().toBuffer(),
      left: 0,
      top: 0,
    });
  }
  if (logo) {
    const logoImage = await sharp(logo)
      .resize(Math.round(width * 0.8), Math.round(height * 0.12), { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    const logoMetadata = await sharp(logoImage).metadata();
    composites.push({
      input: logoImage,
      left: Math.max(0, Math.round((width - (logoMetadata.width ?? 0)) / 2)),
      top: Math.round(height * 0.015),
    });
  }
  if (config.texts.length) {
    const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${config.texts.map((item) => {
      const resolved = resolveTemplateText(item.text, variables);
      const fit = fitTemplateText(item, resolved, width);
      const anchor = fit.align === "left" ? "start" : fit.align === "right" ? "end" : "middle";
      return `<text x="${item.x}" y="${item.y}" text-anchor="${anchor}" fill="${escapeXml(item.color ?? "#2c3b48")}" font-family="${escapeXml(item.fontFamily ?? "Arial")}" font-size="${fit.fontSize}" font-weight="600">${escapeXml(resolved)}</text>`;
    }).join("")}</svg>`;
    composites.push({ input: Buffer.from(textSvg), left: 0, top: 0 });
  }
  if (overlay) {
    composites.push({
      input: await sharp(overlay).resize(width, height, { fit: "fill" }).png().toBuffer(),
      left: 0,
      top: 0,
    });
  }
  const base = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ecf0ee"/></svg>`);
  return sharp(base).composite(composites).jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toBuffer();
}
