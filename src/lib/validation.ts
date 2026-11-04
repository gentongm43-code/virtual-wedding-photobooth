import { z } from "zod";

const checkbox = (defaultValue = false) => z.preprocess(
  (value) => value === undefined ? defaultValue : value === true || value === "true" || value === "on",
  z.boolean(),
);

const emptyTo = (fallback: unknown) => (value: unknown) => value === undefined || value === null || String(value).trim() === "" ? fallback : value;
const intField = (fallback: number, min: number, max: number) => z.preprocess(emptyTo(fallback), z.coerce.number().int().min(min).max(max));

export const fieldLabels: Record<string, string> = {
  name: "Nama event", slug: "Slug", date: "Tanggal", location: "Lokasi", description: "Deskripsi",
  coverImage: "URL cover", logo: "URL logo", primaryColor: "Warna utama", secondaryColor: "Warna sekunder",
  photoLimit: "Jumlah foto", videoDuration: "Durasi video", voiceNoteDuration: "Durasi voice note",
};

export function describeIssues(error: z.ZodError) {
  const names = [...new Set(error.issues.map((issue) => fieldLabels[String(issue.path[0])] ?? String(issue.path[0] ?? "data")))];
  return `Periksa kembali data event (tab Umum/Photobooth): ${names.join(", ")}.`;
}

export const eventSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  date: z.coerce.date(),
  location: z.string().trim().max(180).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  coverImage: z.string().trim().max(2000).optional().or(z.literal("")),
  logo: z.string().trim().max(2000).optional().or(z.literal("")),
  primaryColor: z.string().trim().regex(/^#[0-9a-f]{6}$/i).optional().or(z.literal("")),
  secondaryColor: z.string().trim().regex(/^#[0-9a-f]{6}$/i).optional().or(z.literal("")),
  templateId: z.string().trim().max(100).optional().or(z.literal("")),
  photoLimit: intField(1, 1, 4),
  allowVideo: checkbox(true),
  videoDuration: intField(30, 1, 300),
  allowVoiceNote: checkbox(true),
  voiceNoteDuration: intField(60, 1, 600),
  allowMessage: checkbox(),
  allowPublicGallery: checkbox(true),
  saveOriginal: checkbox(),
  active: checkbox(true),
});

export const eventCreateSchema = eventSchema.extend({
  slug: eventSchema.shape.slug.optional().or(z.literal("")),
});

export type EventInput = z.infer<typeof eventSchema>;
