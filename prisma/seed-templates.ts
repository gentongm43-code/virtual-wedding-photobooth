import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const b64 = (s: string) => `data:image/svg+xml;base64,${Buffer.from(s).toString("base64")}`;
const svg = (defs: string, body: string) => `<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1350' viewBox='0 0 1080 1350'><defs>${defs}</defs>${body}</svg>`;
const rect = (x: number, y: number, w: number, h: number, s: string, sw = 1, extra = "") => `<rect x='${x}' y='${y}' width='${w}' height='${h}' fill='none' stroke='${s}' stroke-width='${sw}' ${extra}/>`;
const kawung = (id: string, c: string) => `<pattern id='${id}' width='48' height='48' patternUnits='userSpaceOnUse'><g fill='none' stroke='${c}' stroke-width='1.3'><ellipse cx='24' cy='12' rx='7' ry='12'/><ellipse cx='24' cy='36' rx='7' ry='12'/><ellipse cx='12' cy='24' rx='12' ry='7'/><ellipse cx='36' cy='24' rx='12' ry='7'/></g><circle cx='24' cy='24' r='2.2' fill='${c}'/></pattern>`;
const parang = (id: string, c: string) => `<pattern id='${id}' width='40' height='40' patternUnits='userSpaceOnUse' patternTransform='rotate(-35)'><path d='M0 20Q10 6 20 20T40 20' fill='none' stroke='${c}' stroke-width='1.4'/></pattern>`;
const ceplok = (id: string, c: string) => `<pattern id='${id}' width='60' height='60' patternUnits='userSpaceOnUse'><path d='M30 4L56 30L30 56L4 30Z' fill='none' stroke='${c}' stroke-width='1.6'/><path d='M30 16L44 30L30 44L16 30Z' fill='none' stroke='${c}' stroke-width='1.2'/><circle cx='30' cy='30' r='3' fill='${c}'/><circle cx='0' cy='0' r='3' fill='${c}'/><circle cx='60' cy='0' r='3' fill='${c}'/><circle cx='0' cy='60' r='3' fill='${c}'/><circle cx='60' cy='60' r='3' fill='${c}'/></pattern>`;
const divider = (y: number, c: string) => `<g stroke='${c}' stroke-width='1.6'><path d='M230 ${y}H480'/><path d='M600 ${y}H850'/></g><path d='M540 ${y - 10}l10 10 -10 10 -10 -10z' fill='${c}'/>`;
const flips: [number, number, number, number][] = [[1, 1, 0, 0], [-1, 1, 1080, 0], [1, -1, 0, 1350], [-1, -1, 1080, 1350]];
const corners = (inner: (c: string) => string, ox: number, oy: number) => flips.map(([sx, sy, fx, fy]) => `<g transform='translate(${fx === 0 ? ox : fx - ox} ${fy === 0 ? oy : fy - oy}) scale(${sx} ${sy})'>${inner("")}</g>`).join("");

const gold = "#d4af6a";
const ornament = `<g fill='none' stroke='${gold}' stroke-width='2.5'><path d='M0 60V16Q0 0 16 0H60'/><path d='M14 46V30Q14 14 30 14H46' stroke-width='1.2'/><path d='M70 0l9 9 -9 9 -9 -9z M0 70l9 9 -9 9 -9 -9z' fill='${gold}' stroke='none'/><circle cx='30' cy='30' r='5' fill='${gold}' stroke='none'/></g>`;
const gunungan = `<g transform='translate(540 1042) scale(.55)' fill='none' stroke='${gold}' stroke-width='2'><path d='M0 -44C16 -20 34 -2 34 28H-34C-34 -2 -16 -20 0 -44Z'/><path d='M0 -16V28'/><path d='M0 -4Q14 4 0 14Q-14 4 0 -4Z' fill='${gold}'/></g>`;
const keraton = svg(
  parang("p", gold) + `<linearGradient id='g' x1='0' y1='1000' x2='0' y2='1200' gradientUnits='userSpaceOnUse'><stop offset='0' stop-color='#000'/><stop offset='1' stop-color='#fff'/></linearGradient><mask id='m' maskUnits='userSpaceOnUse' x='0' y='0' width='1080' height='1350'><rect width='1080' height='1350' fill='url(#g)'/></mask>`,
  `<rect width='1080' height='1350' fill='#16110c'/><rect x='20' y='1000' width='1040' height='330' fill='url(#p)' opacity='.35' mask='url(#m)'/>` + rect(24, 24, 1032, 1302, gold, 3) + rect(42, 42, 996, 1266, gold, 1, "opacity='.7'") + corners(() => ornament, 62, 62) + rect(80, 110, 920, 880, gold, 3) + rect(72, 102, 936, 896, gold, 1, "opacity='.7'") + divider(1040, gold) + gunungan);

const gr = "#2f5d3a", gd = "#b8923f";
const leaf = (x: number, y: number, r: number, s: number, c: string) => `<g transform='translate(${x} ${y}) rotate(${r}) scale(${s})'><path d='M0 0C30 -30 90 -30 130 0C90 30 30 30 0 0Z' fill='${c}' opacity='.9'/><path d='M6 0H122' stroke='#f4efdc' stroke-width='1.5' opacity='.8'/></g>`;
const janurG = `<path d='M0 0C80 10 140 60 160 150' fill='none' stroke='${gd}' stroke-width='3'/>` + [[20, 4, 20, .9], [55, 16, 35, .95], [88, 38, 52, .9], [112, 68, 66, .8], [132, 104, 78, .7]].map((l) => leaf(l[0], l[1], l[2], l[3], gr)).join("") + [[40, 22, -5, .7], [75, 40, 10, .65], [105, 70, 28, .6]].map((l) => leaf(l[0], l[1], l[2], l[3], "#4c7c53")).join("");
const janur = svg(kawung("k", gr), `<rect width='1080' height='1350' fill='#f4efdc'/>` + rect(28, 28, 1024, 1294, gr, 4) + rect(46, 46, 988, 1258, gd, 1.5) + corners(() => janurG, 56, 56) + rect(100, 130, 880, 860, gr, 3) + rect(92, 122, 896, 876, gd, 1) + `<rect x='46' y='1215' width='988' height='89' fill='url(#k)' opacity='.35'/>` + divider(1038, gd));

const br = "#8a5a2b";
const sogan = svg(ceplok("c1", "#e5c488") + ceplok("c2", br), `<rect width='1080' height='1350' fill='#b07a45'/><rect width='1080' height='1350' fill='url(#c1)' opacity='.55'/><rect x='40' y='40' width='1000' height='1270' fill='#f1e2bd' stroke='#5e3a1b' stroke-width='5'/>` + rect(58, 58, 964, 1234, br, 1.5) + rect(80, 90, 920, 900, "#5e3a1b", 3) + rect(72, 82, 936, 916, br, 1) + `<rect x='58' y='1235' width='964' height='57' fill='url(#c2)' opacity='.5'/>` + divider(1040, br));

const nv = "#1f2a44";
const quarter = (id: string, t: string) => `<g transform='${t}'><clipPath id='${id}'><rect width='340' height='340'/></clipPath><rect width='340' height='340' fill='url(#k)' opacity='.5' clip-path='url(#${id})'/></g>`;
const modern = svg(kawung("k", nv), `<rect width='1080' height='1350' fill='#faf6ee'/>` + quarter("a", "translate(0 0)") + quarter("b", "translate(1080 1350) scale(-1 -1)") + rect(38, 38, 1004, 1274, nv, 2) + rect(54, 54, 972, 1242, gd, 1) + `<rect x='110' y='110' width='860' height='880' fill='#faf6ee' stroke='${nv}' stroke-width='2'/>` + rect(100, 100, 880, 900, gd, 1) + divider(1045, gd));

const txt = (y: number, a: string, b: string, c: string) => [
  { text: "{{eventName}}", x: 540, y, align: "center", fontSize: 50, color: a },
  { text: "{{eventDate}}", x: 540, y: y + 60, align: "center", fontSize: 32, color: b },
  { text: "{{location}}", x: 540, y: y + 112, align: "center", fontSize: 26, color: c },
];
const T = [
  { id: "keraton-hitam-emas-template", name: "Keraton Hitam Emas", bg: keraton, area: { x: 80, y: 110, width: 920, height: 880 }, texts: txt(1130, "#f3e6c8", gold, "#b89a62") },
  { id: "janur-hijau-emas-template", name: "Janur Hijau Emas", bg: janur, area: { x: 100, y: 130, width: 880, height: 860 }, texts: txt(1115, "#24472c", gr, "#6a7a5c") },
  { id: "sido-mukti-sogan-template", name: "Sido Mukti Sogan", bg: sogan, area: { x: 80, y: 90, width: 920, height: 900 }, texts: txt(1120, "#4a2e14", "#6b4624", "#8a6a46") },
  { id: "batik-modern-template", name: "Batik Modern", bg: modern, area: { x: 110, y: 110, width: 860, height: 880 }, texts: txt(1130, nv, "#4a5470", "#7a6a45") },
];

async function main() {
  for (const t of T) {
    const data = { name: t.name, width: 1080, height: 1350, background: b64(t.bg), textConfig: { photoArea: t.area, texts: t.texts } };
    await prisma.template.upsert({ where: { id: t.id }, update: data, create: { id: t.id, ...data } });
    console.log(`Frame siap: ${t.name}`);
  }
}
main().finally(() => prisma.$disconnect());
