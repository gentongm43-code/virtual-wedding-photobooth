import * as QRCode from "qrcode";
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getPublicEventUrl } from "@/lib/event-url";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return new NextResponse("Tidak terautentikasi.", { status: 401 });
  const event = await prisma.event.findUnique({ where: { id: (await params).id }, select: { slug: true } });
  if (!event) return new NextResponse("Event tidak ditemukan.", { status: 404 });
  const searchParams = new URL(request.url).searchParams;
  const format = searchParams.get("format") === "svg" ? "svg" : "png";
  const qrOptions = { errorCorrectionLevel: "H" as const, margin: 4, width: 1024, color: { dark: "#293743", light: "#ffffff" } };
  const url = getPublicEventUrl(event.slug, new URL(request.url).origin);
  const disposition = searchParams.get("download") === "1" ? "attachment" : "inline";
  if (format === "svg") {
    const svg = await QRCode.toString(url, { ...qrOptions, type: "svg" });
    return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": `${disposition}; filename="event-${event.slug}.svg"` } });
  }
  const png = await QRCode.toBuffer(url, qrOptions);
  return new NextResponse(png as unknown as BodyInit, { headers: { "Content-Type": "image/png", "Content-Disposition": `${disposition}; filename="event-${event.slug}.png"` } });
}
