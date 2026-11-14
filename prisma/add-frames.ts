import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const T = [
  { id: "frame-blue-forever", name: "Our Blue Forever (2 Foto)", height: 1911,
    slots: [{ x: 162, y: 213, width: 756, height: 529 }, { x: 162, y: 769, width: 756, height: 529 }],
    ty: 1800, ink: ["#2b4a86", "#3d5a96", "#5a74a8"] },
  { id: "frame-forever-begins", name: "Forever Begins Here (2 Foto)", height: 1940,
    slots: [{ x: 191, y: 259, width: 698, height: 499 }, { x: 191, y: 782, width: 698, height: 499 }],
    ty: 1842, ink: ["#8a6a2a", "#9a7a35", "#b09050"] },
];

async function main() {
  for (const t of T) {
    const data = {
      name: t.name, width: 1080, height: t.height,
      textConfig: {
        photoSlots: t.slots,
        texts: [
          { text: "{{eventName}}", x: 540, y: t.ty,      align: "center", fontSize: 44, color: t.ink[0] },
          { text: "{{eventDate}}", x: 540, y: t.ty + 46, align: "center", fontSize: 28, color: t.ink[1] },
          { text: "{{location}}",  x: 540, y: t.ty + 82, align: "center", fontSize: 22, color: t.ink[2] },
        ],
      },
    };
    await prisma.template.upsert({ where: { id: t.id }, update: data, create: { id: t.id, ...data } });
    console.log("OK:", t.name);
  }
}
main().finally(() => prisma.$disconnect());
