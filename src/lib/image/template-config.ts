export type PhotoArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TemplateText = {
  text: string;
  x: number;
  y: number;
  align?: "left" | "center" | "right";
  fontSize?: number;
  color?: string;
  fontFamily?: string;
};

export type TemplateConfig = {
  width?: number;
  height?: number;
  background?: string | null;
  overlay?: string | null;
  logo?: string | null;
  photoSlots?: PhotoArea[];
  /** Legacy single-slot key retained for existing saved templates. */
  photoArea?: PhotoArea;
  texts?: TemplateText[];
};

export type NormalizedTemplateConfig = {
  width: number;
  height: number;
  background: string | null;
  overlay: string | null;
  logo: string | null;
  photoSlots: PhotoArea[];
  texts: TemplateText[];
};

const WEDDING_FRAME_BACKGROUND = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDgwIiBoZWlnaHQ9IjEzNTAiIHZpZXdCb3g9IjAgMCAxMDgwIDEzNTAiPjxkZWZzPjxwYXR0ZXJuIGlkPSJrIiB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2E4ODM0YSIgc3Ryb2tlLXdpZHRoPSIxLjEiPjxlbGxpcHNlIGN4PSIyNCIgY3k9IjEyIiByeD0iNyIgcnk9IjEyIi8+PGVsbGlwc2UgY3g9IjI0IiBjeT0iMzYiIHJ4PSI3IiByeT0iMTIiLz48ZWxsaXBzZSBjeD0iMTIiIGN5PSIyNCIgcng9IjEyIiByeT0iNyIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjI0IiByeD0iMTIiIHJ5PSI3Ii8+PC9nPjxjaXJjbGUgY3g9IjI0IiBjeT0iMjQiIHI9IjIuMiIgZmlsbD0iI2E4ODM0YSIvPjwvcGF0dGVybj48bGluZWFyR3JhZGllbnQgaWQ9ImZnIiB4MT0iMCIgeTE9IjEwNDAiIHgyPSIwIiB5Mj0iMTE5MCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzAwMCIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2ZmZiIvPjwvbGluZWFyR3JhZGllbnQ+PG1hc2sgaWQ9ImYiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjAiIHk9IjAiIHdpZHRoPSIxMDgwIiBoZWlnaHQ9IjEzNTAiPjxyZWN0IHdpZHRoPSIxMDgwIiBoZWlnaHQ9IjEzNTAiIGZpbGw9InVybCgjZmcpIi8+PC9tYXNrPjwvZGVmcz48cmVjdCB3aWR0aD0iMTA4MCIgaGVpZ2h0PSIxMzUwIiBmaWxsPSIjZjZlZWUwIi8+PHJlY3QgeD0iNjAiIHk9IjEwNDAiIHdpZHRoPSI5NjAiIGhlaWdodD0iMjYyIiBmaWxsPSJ1cmwoI2spIiBvcGFjaXR5PSIuNCIgbWFzaz0idXJsKCNmKSIvPjxyZWN0IHg9IjI4IiB5PSIyOCIgd2lkdGg9IjEwMjQiIGhlaWdodD0iMTI5NCIgcng9IjE0IiBmaWxsPSJub25lIiBzdHJva2U9IiNhODgzNGEiIHN0cm9rZS13aWR0aD0iMyIvPjxyZWN0IHg9IjQ1IiB5PSI0NSIgd2lkdGg9Ijk5MCIgaGVpZ2h0PSIxMjYwIiByeD0iOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDZiZjkzIiBzdHJva2Utd2lkdGg9IjEiLz48Y2lyY2xlIGN4PSI3NSIgY3k9Ijc1IiByPSIxNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYTg4MzRhIiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNNzUgNjdsNiA4IC02IDggLTYgLTh6IiBmaWxsPSIjYTg4MzRhIi8+PGNpcmNsZSBjeD0iMTAwNSIgY3k9Ijc1IiByPSIxNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYTg4MzRhIiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTAwNSA2N2w2IDggLTYgOCAtNiAtOHoiIGZpbGw9IiNhODgzNGEiLz48Y2lyY2xlIGN4PSI3NSIgY3k9IjEyNzUiIHI9IjE2IiBmaWxsPSJub25lIiBzdHJva2U9IiNhODgzNGEiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik03NSAxMjY3bDYgOCAtNiA4IC02IC04eiIgZmlsbD0iI2E4ODM0YSIvPjxjaXJjbGUgY3g9IjEwMDUiIGN5PSIxMjc1IiByPSIxNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYTg4MzRhIiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTAwNSAxMjY3bDYgOCAtNiA4IC02IC04eiIgZmlsbD0iI2E4ODM0YSIvPjxnIHN0cm9rZT0iI2E4ODM0YSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIGQ9Ik0zMDAgMTA1Mkg1MTQiLz48cGF0aCBkPSJNNTY2IDEwNTJINzgwIi8+PC9nPjxwYXRoIGQ9Ik01NDAgMTA0M2w5IDkgLTkgOSAtOSAtOXoiIGZpbGw9IiNhODgzNGEiLz48L3N2Zz4=";

export const DEFAULT_TEMPLATE: NormalizedTemplateConfig = {
  width: 1080,
  height: 1350,
  background: WEDDING_FRAME_BACKGROUND,
  overlay: null,
  logo: null,
  photoSlots: [{ x: 70, y: 105, width: 940, height: 900 }],
  texts: [
    { text: "{{eventName}}", x: 540, y: 1120, align: "center", fontSize: 48, color: "#2d3c49" },
    { text: "{{eventDate}}", x: 540, y: 1180, align: "center", fontSize: 32, color: "#4a6980" },
    { text: "{{location}}", x: 540, y: 1230, align: "center", fontSize: 26, color: "#6b90aa" },
  ],
};

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizeTemplate(template?: TemplateConfig | null): NormalizedTemplateConfig {
  const width = Math.max(100, Math.round(finiteNumber(template?.width, DEFAULT_TEMPLATE.width)));
  const height = Math.max(100, Math.round(finiteNumber(template?.height, DEFAULT_TEMPLATE.height)));
  const configuredSlots = template?.photoSlots?.length
    ? template.photoSlots
    : template?.photoArea
      ? [template.photoArea]
      : DEFAULT_TEMPLATE.photoSlots;
  const photoSlots = configuredSlots.map((area) => {
    const x = Math.min(width - 1, Math.max(0, Math.round(finiteNumber(area.x, DEFAULT_TEMPLATE.photoSlots[0].x))));
    const y = Math.min(height - 1, Math.max(0, Math.round(finiteNumber(area.y, DEFAULT_TEMPLATE.photoSlots[0].y))));
    return {
      x,
      y,
      width: Math.min(width - x, Math.max(1, Math.round(finiteNumber(area.width, DEFAULT_TEMPLATE.photoSlots[0].width)))),
      height: Math.min(height - y, Math.max(1, Math.round(finiteNumber(area.height, DEFAULT_TEMPLATE.photoSlots[0].height)))),
    };
  });
  const texts = Array.isArray(template?.texts)
    ? template.texts.filter((item) => item && typeof item.text === "string")
    : [];

  return {
    width,
    height,
    background: template?.background ?? DEFAULT_TEMPLATE.background,
    overlay: template?.overlay ?? DEFAULT_TEMPLATE.overlay,
    logo: template?.logo ?? DEFAULT_TEMPLATE.logo,
    photoSlots,
    texts: texts.length ? texts : DEFAULT_TEMPLATE.texts,
  };
}

export function configFromTemplateRecord(record: {
  width: number;
  height: number;
  background: string | null;
  overlay: string | null;
  logo: string | null;
  textConfig: unknown;
}): NormalizedTemplateConfig {
  const nested = typeof record.textConfig === "object" && record.textConfig !== null && !Array.isArray(record.textConfig)
    ? record.textConfig as TemplateConfig
    : {};
  return normalizeTemplate({
    ...nested,
    width: record.width,
    height: record.height,
    background: record.background,
    overlay: record.overlay,
    logo: record.logo,
  });
}

export function resolveTemplateText(text: string, variables: { eventName: string; eventDate: string; location: string }) {
  return text
    .replaceAll("{{eventName}}", variables.eventName)
    .replaceAll("{{eventDate}}", variables.eventDate)
    .replaceAll("{{location}}", variables.location);
}

export function fitTemplateText(item: TemplateText, text: string, templateWidth: number) {
  const align = item.align ?? "center";
  const floor = templateWidth * 0.024;
  const base = Math.max(item.fontSize ?? 32, floor);
  const margin = templateWidth * 0.06;
  const room =
    align === "left" ? templateWidth - item.x - margin
    : align === "right" ? item.x - margin
    : 2 * (Math.min(item.x, templateWidth - item.x) - margin);
  const estimated = Math.max(1, text.length) * base * 0.58;
  const fontSize = estimated > room && room > 0 ? Math.max(base * 0.5, (base * room) / estimated) : base;
  return { fontSize: Math.round(fontSize * 10) / 10, align };
}
