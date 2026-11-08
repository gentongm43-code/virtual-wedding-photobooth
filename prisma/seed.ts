import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { createEventWithGeneratedCode, normalizeEventCode } from "../src/lib/event-code";
import { invitationDefaults } from "../src/lib/invitation-content";

const prisma = new PrismaClient();

function svgData(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const PHOTOBOOTH_TEMPLATES = [
  {
    id: "default-wedding-template",
    name: "Sogan Klasik",
    width: 1080,
    height: 1350,
    background: svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><defs><pattern id="k" width="48" height="48" patternUnits="userSpaceOnUse"><g fill="none" stroke="#a8834a" stroke-width="1.1"><ellipse cx="24" cy="12" rx="7" ry="12"/><ellipse cx="24" cy="36" rx="7" ry="12"/><ellipse cx="12" cy="24" rx="12" ry="7"/><ellipse cx="36" cy="24" rx="12" ry="7"/></g><circle cx="24" cy="24" r="2.2" fill="#a8834a"/></pattern><linearGradient id="fg" x1="0" y1="1040" x2="0" y2="1190" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient><mask id="f" maskUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1350"><rect width="1080" height="1350" fill="url(#fg)"/></mask></defs><rect width="1080" height="1350" fill="#f6eee0"/><rect x="60" y="1040" width="960" height="262" fill="url(#k)" opacity=".4" mask="url(#f)"/><rect x="28" y="28" width="1024" height="1294" rx="14" fill="none" stroke="#a8834a" stroke-width="3"/><rect x="45" y="45" width="990" height="1260" rx="8" fill="none" stroke="#d6bf93" stroke-width="1"/><circle cx="75" cy="75" r="16" fill="none" stroke="#a8834a" stroke-width="2"/><path d="M75 67l6 8 -6 8 -6 -8z" fill="#a8834a"/><circle cx="1005" cy="75" r="16" fill="none" stroke="#a8834a" stroke-width="2"/><path d="M1005 67l6 8 -6 8 -6 -8z" fill="#a8834a"/><circle cx="75" cy="1275" r="16" fill="none" stroke="#a8834a" stroke-width="2"/><path d="M75 1267l6 8 -6 8 -6 -8z" fill="#a8834a"/><circle cx="1005" cy="1275" r="16" fill="none" stroke="#a8834a" stroke-width="2"/><path d="M1005 1267l6 8 -6 8 -6 -8z" fill="#a8834a"/><g stroke="#a8834a" stroke-width="1.5"><path d="M300 1052H514"/><path d="M566 1052H780"/></g><path d="M540 1043l9 9 -9 9 -9 -9z" fill="#a8834a"/></svg>`),
    textConfig: {
      photoArea: { x: 70, y: 105, width: 940, height: 900, fit: "cover" },
      decorations: ["batik-kawung-fade", "gold-medallions"],
      texts: [
        { text: "{{eventName}}", x: 540, y: 1120, align: "center", fontSize: 48, color: "#3d2b1f" },
        { text: "{{eventDate}}", x: 540, y: 1180, align: "center", fontSize: 32, color: "#6b4b36" },
        { text: "{{location}}", x: 540, y: 1230, align: "center", fontSize: 26, color: "#8c7260" },
      ],
    },
  },
  {
    id: "botanical-garden-template",
    name: "Kawung Emas",
    width: 1080,
    height: 1350,
    background: svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><defs><pattern id="k" width="48" height="48" patternUnits="userSpaceOnUse"><g fill="none" stroke="#a8834a" stroke-width="1.2"><ellipse cx="24" cy="12" rx="7" ry="12"/><ellipse cx="24" cy="36" rx="7" ry="12"/><ellipse cx="12" cy="24" rx="12" ry="7"/><ellipse cx="36" cy="24" rx="12" ry="7"/></g><circle cx="24" cy="24" r="2.2" fill="#a8834a"/></pattern></defs><rect width="1080" height="1350" fill="#f2e8d5"/><rect x="28" y="28" width="1024" height="70" fill="url(#k)" opacity=".6"/><rect x="28" y="1262" width="1024" height="60" fill="url(#k)" opacity=".6"/><g stroke="#a8834a" stroke-width="1.5"><path d="M28 98H1052"/><path d="M28 1262H1052"/></g><rect x="28" y="28" width="1024" height="1294" fill="none" stroke="#a8834a" stroke-width="3"/><rect x="40" y="40" width="1000" height="1270" fill="none" stroke="#d6bf93" stroke-width="1"/></svg>`),
    textConfig: {
      photoArea: { x: 78, y: 120, width: 924, height: 870, fit: "cover" },
      decorations: ["kawung-bands", "double-frame"],
      texts: [
        { text: "{{eventName}}", x: 540, y: 1095, align: "center", fontSize: 48, color: "#3d2b1f" },
        { text: "{{eventDate}}", x: 540, y: 1155, align: "center", fontSize: 32, color: "#6b4b36" },
        { text: "{{location}}", x: 540, y: 1210, align: "center", fontSize: 26, color: "#8c7260" },
      ],
    },
  },
  {
    id: "champagne-classic-template",
    name: "Parang Halus",
    width: 1080,
    height: 1350,
    background: svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><path d="M0 20Q10 6 20 20T40 20" fill="none" stroke="#a8834a" stroke-width="1.3"/></pattern><linearGradient id="fg" x1="0" y1="1030" x2="0" y2="1170" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient><mask id="f" maskUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1350"><rect width="1080" height="1350" fill="url(#fg)"/></mask></defs><rect width="1080" height="1350" fill="#f8f0e1"/><rect x="45" y="1030" width="990" height="270" fill="url(#p)" opacity=".5" mask="url(#f)"/><rect x="25" y="25" width="1030" height="1300" fill="none" stroke="#a8834a" stroke-width="3"/><rect x="42" y="42" width="996" height="1266" fill="none" stroke="#d6bf93" stroke-width="1"/><circle cx="75" cy="75" r="16" fill="none" stroke="#a8834a" stroke-width="2"/><path d="M75 67l6 8 -6 8 -6 -8z" fill="#a8834a"/><circle cx="1005" cy="75" r="16" fill="none" stroke="#a8834a" stroke-width="2"/><path d="M1005 67l6 8 -6 8 -6 -8z" fill="#a8834a"/><circle cx="75" cy="1275" r="16" fill="none" stroke="#a8834a" stroke-width="2"/><path d="M75 1267l6 8 -6 8 -6 -8z" fill="#a8834a"/><circle cx="1005" cy="1275" r="16" fill="none" stroke="#a8834a" stroke-width="2"/><path d="M1005 1267l6 8 -6 8 -6 -8z" fill="#a8834a"/></svg>`),
    textConfig: {
      photoArea: { x: 92, y: 115, width: 896, height: 865, fit: "cover" },
      decorations: ["parang-wave", "corner-medallions"],
      texts: [
        { text: "{{eventName}}", x: 540, y: 1095, align: "center", fontSize: 50, color: "#3d2b1f" },
        { text: "{{eventDate}}", x: 540, y: 1160, align: "center", fontSize: 32, color: "#8a6a40" },
        { text: "{{location}}", x: 540, y: 1215, align: "center", fontSize: 26, color: "#a0825a" },
      ],
    },
  },
  {
    id: "romantic-polaroid-template",
    name: "Lurik Hangat",
    width: 1080,
    height: 1350,
    background: svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><defs><pattern id="l" width="30" height="40" patternUnits="userSpaceOnUse"><rect x="2" width="3" height="40" fill="#6b4b36" opacity=".6"/><rect x="9" width="1.5" height="40" fill="#a8834a"/><rect x="14" width="1.5" height="40" fill="#a8834a"/><rect x="21" width="5" height="40" fill="#d9c4a0"/></pattern></defs><rect width="1080" height="1350" fill="#f5ebdc"/><rect x="0" y="0" width="1080" height="130" fill="url(#l)"/><rect x="0" y="1290" width="1080" height="60" fill="url(#l)"/><g stroke="#a8834a" stroke-width="2"><path d="M0 130H1080"/><path d="M0 1290H1080"/></g><rect x="60" y="150" width="960" height="890" rx="20" fill="#fffaf0" stroke="#d6bf93" stroke-width="2"/></svg>`),
    textConfig: {
      photoArea: { x: 105, y: 170, width: 870, height: 785, fit: "cover" },
      decorations: ["lurik-stripes", "polaroid-card"],
      texts: [
        { text: "{{eventName}}", x: 540, y: 1105, align: "center", fontSize: 50, color: "#3d2b1f" },
        { text: "{{eventDate}}", x: 540, y: 1165, align: "center", fontSize: 32, color: "#6b4b36" },
        { text: "{{location}}", x: 540, y: 1215, align: "center", fontSize: 26, color: "#8c7260" },
      ],
    },
  },
  {
    id: "modern-minimal-template",
    name: "Gunungan Minimal",
    width: 1080,
    height: 1350,
    background: svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><defs></defs><rect width="1080" height="1350" fill="#f8f4ec"/><rect x="38" y="38" width="1004" height="1274" fill="none" stroke="#6b4b36" stroke-width="1.5"/><rect x="52" y="52" width="976" height="1246" fill="none" stroke="#d6bf93" stroke-width="1"/><g fill="none" stroke="#a8834a" stroke-width="2"><path d="M540 1040C556 1064 574 1084 574 1112H506C506 1084 524 1064 540 1040Z"/><path d="M540 1068V1112" stroke-width="1.5"/></g><path d="M540 1086l7 9 -7 9 -7 -9z" fill="#a8834a"/><g stroke="#a8834a" stroke-width="1.5"><path d="M250 1112H490"/><path d="M590 1112H830"/></g></svg>`),
    textConfig: {
      photoArea: { x: 82, y: 92, width: 916, height: 930, fit: "cover" },
      decorations: ["gunungan-ornament", "minimal-frame"],
      texts: [
        { text: "{{eventName}}", x: 540, y: 1170, align: "center", fontSize: 48, color: "#3d2b1f" },
        { text: "{{eventDate}}", x: 540, y: 1225, align: "center", fontSize: 31, color: "#6b4b36" },
        { text: "{{location}}", x: 540, y: 1270, align: "center", fontSize: 25, color: "#8c7260" },
      ],
    },
  },
];

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@momenkita.id";
  const password = process.env.ADMIN_PASSWORD ?? "ubah-password-ini";
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash: await hash(password, 12), name: "Admin Momen Kita" },
  });
  for (const template of PHOTOBOOTH_TEMPLATES) {
    await prisma.template.upsert({
      where: { id: template.id },
      update: { name: template.name, width: template.width, height: template.height, background: template.background, textConfig: template.textConfig },
      create: template,
    });
  }
  const template = PHOTOBOOTH_TEMPLATES[0];
  const eventData = {
      name: "Putri & Mahfud",
      date: new Date("2026-11-15T00:00:00.000Z"),
      location: "Temanggung",
      description: "Terima kasih telah menjadi bagian dari hari istimewa kami.",
      primaryColor: "#2b2927",
      secondaryColor: "#e6cdbd",
      templateId: template.id,
      active: true,
      photoLimit: 3,
      saveOriginal: true,
      allowVideo: true,
      videoDuration: 30,
      allowVoiceNote: true,
      voiceNoteDuration: 60,
      allowMessage: true,
      allowPublicGallery: true,
      slug: "putri-mahfud",
    };
  const existingEvent = await prisma.event.findUnique({ where: { slug: eventData.slug } });
  if (existingEvent) {
    await prisma.event.update({ where: { id: existingEvent.id }, data: { ...eventData, eventCode: normalizeEventCode(eventData.name) } });
  } else {
    await createEventWithGeneratedCode(eventData);
  }
  const seededEvent = await prisma.event.findUniqueOrThrow({ where: { slug: eventData.slug } });
  await prisma.invitationContent.upsert({
    where: { eventId: seededEvent.id },
    update: { data: { ...invitationDefaults, location: eventData.location, coupleName: eventData.name } },
    create: { eventId: seededEvent.id, data: { ...invitationDefaults, location: eventData.location, coupleName: eventData.name } },
  });
  console.log(`Admin siap: ${email}`);
}

main().finally(() => prisma.$disconnect());
