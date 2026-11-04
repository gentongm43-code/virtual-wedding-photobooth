import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventSchema, describeIssues } from "@/lib/validation";
import { updateEventWithGeneratedCode } from "@/lib/event-code";
import { invitationFields, mergeInvitationContent } from "@/lib/invitation-content";

async function authorized() { return Boolean(await getAdminUser()); }


function eventFormValues(form: FormData) {
  const raw = Object.fromEntries(form.entries()) as Record<string, FormDataEntryValue>;
  if (!String(raw.name ?? "").trim()) raw.name = String(form.get("invitation_coupleName") ?? "").trim();
  return raw;
}

function readInvitation(form: FormData) {
  const values = Object.fromEntries(invitationFields.map(([key]) => [`${key}`, String(form.get(`invitation_${key}`) ?? "")]));
  return mergeInvitationContent(values);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorized())) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const { id } = await params;
  const form = await request.formData();
  const parsed = eventSchema.safeParse(eventFormValues(form));
  if (!parsed.success) return NextResponse.json({ error: describeIssues(parsed.error) }, { status: 400 });
  const current = await prisma.event.findUniqueOrThrow({ where: { id }, select: { name: true, eventCode: true } });
  const event = await updateEventWithGeneratedCode(id, { ...parsed.data, location: parsed.data.location || null, description: parsed.data.description || null, coverImage: parsed.data.coverImage || null, logo: parsed.data.logo || null, primaryColor: parsed.data.primaryColor || null, secondaryColor: parsed.data.secondaryColor || null, templateId: parsed.data.templateId || null }, current);
  await prisma.invitationContent.upsert({ where: { eventId: id }, update: { data: { ...readInvitation(form), location: parsed.data.location || "" } }, create: { eventId: id, data: { ...readInvitation(form), location: parsed.data.location || "" } } });
  return NextResponse.json({ id: event.id });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorized())) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  await prisma.event.delete({ where: { id: (await params).id } });
  return NextResponse.json({ ok: true });
}
