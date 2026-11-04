import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { eventCreateSchema, describeIssues } from "@/lib/validation";
import { createEventWithGeneratedCode, generateUniqueEventSlug } from "@/lib/event-code";
import { invitationFields, mergeInvitationContent } from "@/lib/invitation-content";
import { prisma } from "@/lib/prisma";


function eventFormValues(form: FormData) {
  const raw = Object.fromEntries(form.entries()) as Record<string, FormDataEntryValue>;
  if (!String(raw.name ?? "").trim()) raw.name = String(form.get("invitation_coupleName") ?? "").trim();
  return raw;
}

function readInvitation(form: FormData) {
  const values = Object.fromEntries(invitationFields.map(([key]) => [`${key}`, String(form.get(`invitation_${key}`) ?? "")]));
  return mergeInvitationContent(values);
}

export async function POST(request: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const form = await request.formData();
  const parsed = eventCreateSchema.safeParse(eventFormValues(form));
  if (!parsed.success) return NextResponse.json({ error: describeIssues(parsed.error) }, { status: 400 });
  try {
    const event = await createEventWithGeneratedCode({ ...parsed.data, slug: parsed.data.slug || await generateUniqueEventSlug(parsed.data.name), location: parsed.data.location || null, description: parsed.data.description || null, coverImage: parsed.data.coverImage || null, logo: parsed.data.logo || null, primaryColor: parsed.data.primaryColor || null, secondaryColor: parsed.data.secondaryColor || null, templateId: parsed.data.templateId || null });
    await prisma.invitationContent.create({ data: { eventId: event.id, data: { ...readInvitation(form), location: parsed.data.location || "" } } });
    return NextResponse.json({ id: event.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) return NextResponse.json({ error: "Slug event sudah digunakan." }, { status: 409 });
    throw error;
  }
}
