const BLUE = "#6f93ac", DEEP = "#2d3c49", TAUPE = "#b9a58e", MAUVE = "#b0607f", MIST = "#eef3f0";

type Slot = { x: number; y: number; width: number; height: number };

const lozenge = (cx: number, cy: number, r: number, fill: string) =>
  `<path d="M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z" fill="${fill}"/>`;

function slotFrame(s: Slot) {
  const x = s.x - 14, y = s.y - 14, w = s.width + 28, h = s.height + 28;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#fbfdfc" stroke="${TAUPE}" stroke-width="4"/>` +
    `<rect x="${x - 7}" y="${y - 7}" width="${w + 14}" height="${h + 14}" rx="12" fill="none" stroke="${BLUE}" stroke-width="1.6"/>` +
    [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([cx, cy]) => lozenge(cx, cy, 9, MAUVE)).join("");
}

function buildBackground(width: number, height: number, slots: Slot[], footerTop: number) {
  const gunungan = `<g transform="translate(${width / 2 - 38} 58) scale(.38 .36)"><path d="M100 4C116 48 178 92 178 172C178 244 142 294 100 297C58 294 22 244 22 172C22 92 84 48 100 4Z" fill="${TAUPE}" opacity=".75"/><g fill="none" stroke="${MIST}" stroke-width="5" stroke-linecap="round"><path d="M100 40V250"/><path d="M100 90C78 98 64 116 66 140"/><path d="M100 90C122 98 136 116 134 140"/><path d="M100 150C70 158 52 180 56 208"/><path d="M100 150C130 158 148 180 144 208"/></g></g>`;
  const corners = [[78, 78], [width - 78, 78], [78, height - 78], [width - 78, height - 78]]
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="16" fill="none" stroke="${BLUE}" stroke-width="2"/>${lozenge(cx, cy, 8, MAUVE)}`).join("");
  const mid = width / 2;
  const divider = `<g stroke="${BLUE}" stroke-width="1.6"><path d="M${mid - 250} ${footerTop}H${mid - 30}"/><path d="M${mid + 30} ${footerTop}H${mid + 250}"/></g>${lozenge(mid, footerTop, 11, MAUVE)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><pattern id="k" width="48" height="48" patternUnits="userSpaceOnUse"><g fill="none" stroke="${BLUE}" stroke-width="1.1"><ellipse cx="24" cy="12" rx="7" ry="12"/><ellipse cx="24" cy="36" rx="7" ry="12"/><ellipse cx="12" cy="24" rx="12" ry="7"/><ellipse cx="36" cy="24" rx="12" ry="7"/></g><circle cx="24" cy="24" r="2.2" fill="${BLUE}"/></pattern>` +
    `<pattern id="p" width="56" height="14" patternUnits="userSpaceOnUse"><path d="M0 7Q7 -1 14 7T28 7T42 7T56 7" fill="none" stroke="${BLUE}" stroke-width="1.8"/><path d="M0 11Q7 3 14 11T28 11T42 11T56 11" fill="none" stroke="${TAUPE}" stroke-width="1.1"/></pattern></defs>` +
    `<rect width="${width}" height="${height}" fill="${MIST}"/><rect width="${width}" height="${height}" fill="url(#k)" opacity=".22"/>` +
    `<rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="14" fill="none" stroke="${BLUE}" stroke-width="3"/>` +
    `<rect x="46" y="46" width="${width - 92}" height="${height - 92}" rx="8" fill="none" stroke="${TAUPE}" stroke-width="1.2"/>` +
    corners + gunungan + slots.map(slotFrame).join("") + divider +
    `<rect x="130" y="${height - 98}" width="${width - 260}" height="14" fill="url(#p)"/></svg>`;
}

function makeTemplate(id: string, name: string, width: number, slots: Slot[]) {
  const bottom = Math.max(...slots.map((s) => s.y + s.height));
  const footerTop = bottom + 70;
  const height = footerTop + 330;
  const mid = width / 2;
  return {
    id, name, width, height,
    background: `data:image/svg+xml;base64,${Buffer.from(buildBackground(width, height, slots, footerTop)).toString("base64")}`,
    textConfig: {
      photoSlots: slots,
      decorations: ["kawung", "gunungan", "tumpal", "ceplok"],
      texts: [
        { text: "{{eventName}}", x: mid, y: footerTop + 85, align: "center", fontSize: 52, color: DEEP },
        { text: "{{eventDate}}", x: mid, y: footerTop + 145, align: "center", fontSize: 32, color: "#4a6980" },
        { text: "{{location}}", x: mid, y: footerTop + 192, align: "center", fontSize: 26, color: "#6b90aa" },
      ],
    },
  };
}

export const KEJAWEN_TEMPLATES = [
  makeTemplate("kejawen-1-foto", "Kejawen · 1 Foto (Gunungan)", 1080, [{ x: 90, y: 210, width: 900, height: 1000 }]),
  makeTemplate("kejawen-2-foto", "Kejawen · 2 Foto (Kawung)", 1080, [
    { x: 80, y: 210, width: 430, height: 680 }, { x: 570, y: 210, width: 430, height: 680 },
  ]),
  makeTemplate("kejawen-3-foto", "Kejawen · 3 Foto (Parang)", 1080, [
    { x: 80, y: 210, width: 430, height: 740 }, { x: 570, y: 210, width: 430, height: 330 }, { x: 570, y: 620, width: 430, height: 330 },
  ]),
  makeTemplate("kejawen-4-foto", "Kejawen · 4 Foto (Ceplok)", 1080, [
    { x: 80, y: 210, width: 430, height: 560 }, { x: 570, y: 210, width: 430, height: 560 },
    { x: 80, y: 850, width: 430, height: 560 }, { x: 570, y: 850, width: 430, height: 560 },
  ]),
];

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  for (const t of KEJAWEN_TEMPLATES) {
    await prisma.template.upsert({
      where: { id: t.id },
      update: { name: t.name, width: t.width, height: t.height, background: t.background, textConfig: t.textConfig },
      create: t,
    });
    console.log("OK:", t.name);
  }
  await prisma.$disconnect();
}

main().catch((error) => { console.error(error); process.exit(1); });
