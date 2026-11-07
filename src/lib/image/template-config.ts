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

const WEDDING_FRAME_BACKGROUND = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1080' height='1350' viewBox='0 0 1080 1350'%3E%3Crect width='1080' height='1350' fill='%23f7eee7'/%3E%3Crect x='28' y='28' width='1024' height='1294' rx='18' fill='none' stroke='%23b99a72' stroke-width='3'/%3E%3Crect x='45' y='45' width='990' height='1260' rx='12' fill='none' stroke='%23d9bd91' stroke-width='1'/%3E%3Cg fill='none' stroke='%23b99a72' stroke-width='4'%3E%3Cpath d='M45 155V45h110M1035 155V45H925M45 1195v110h110M1035 1195v110H925'/%3E%3C/g%3E%3Cg fill='%23b99a72'%3E%3Ccircle cx='75' cy='75' r='9'/%3E%3Ccircle cx='1005' cy='75' r='9'/%3E%3Ccircle cx='75' cy='1275' r='9'/%3E%3Ccircle cx='1005' cy='1275' r='9'/%3E%3C/g%3E%3Cpath d='M0 1150 Q270 1050 540 1150 T1080 1150 V1350 H0Z' fill='%23ead8c8' fill-opacity='.75'/%3E%3C/svg%3E";

export const DEFAULT_TEMPLATE: NormalizedTemplateConfig = {
  width: 1080,
  height: 1350,
  background: WEDDING_FRAME_BACKGROUND,
  overlay: null,
  logo: null,
  photoSlots: [{ x: 70, y: 105, width: 940, height: 900 }],
  texts: [
    { text: "{{eventName}}", x: 540, y: 1120, align: "center", fontSize: 48, color: "#332b27" },
    { text: "{{eventDate}}", x: 540, y: 1180, align: "center", fontSize: 32, color: "#725f53" },
    { text: "{{location}}", x: 540, y: 1230, align: "center", fontSize: 26, color: "#8d786b" },
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
