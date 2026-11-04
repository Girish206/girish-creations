// Draws the Girish Creations logo and writes every logo file in public/logo:
// the mark (hexagon G and C, code glyph, pixels, orbit), the name lockups for
// light and dark backgrounds, the PWA icons and the favicon. Run with
// `npm run logo` after changing a colour or the shape.
//
// The name is outlined Montserrat Bold (logo-text-paths.json), so the SVGs
// need no font. Shapes are on the grid the logo was traced on: the mark spans
// roughly x 90–970, y 100–650.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import ico from "sharp-ico";

const OUT = resolve(import.meta.dirname, "../public/logo");
const TEXT = JSON.parse(readFileSync(resolve(import.meta.dirname, "logo-text-paths.json"), "utf8"));

// Keep in step with --brand-* in src/styles/brand.css.
const VIOLET_LIGHT = "#a78bfa";
const VIOLET = "#7c3aed";
const INDIGO = "#6366f1";
const CYAN = "#22d3ee";
const CYAN_DEEP = "#06b6d4";
const NAVY = "#0d0f2e";

const path = (points) => `M${points.map((p) => p.join(" ")).join("L")}Z`;

const G = path([
  [402, 112], [580, 212], [500, 260], [402, 212], [278, 282], [278, 440], [385, 510], [470, 455], [470, 405],
  [385, 447], [372, 435], [372, 365], [470, 305], [565, 360], [565, 510], [375, 605], [185, 490], [185, 225],
]);
const C = path([
  [725, 165], [780, 195], [780, 228], [820, 228], [885, 265], [820, 305], [735, 262], [650, 312], [650, 478],
  [735, 530], [885, 455], [885, 545], [725, 640], [525, 530], [525, 285],
]);
const ORBIT =
  "M165 480C100 520 90 590 190 622C330 660 700 560 950 345C965 315 935 295 900 283C945 305 935 340 890 365C680 500 330 600 200 595C130 585 115 530 165 480Z";

// Light and shade on each face, so it reads as folded metal on any background.
const light = (points, opacity) => `<path d="${path(points)}" fill="#fff" fill-opacity="${opacity}"/>`;
const shade = (points, opacity) => `<path d="${path(points)}" fill="${NAVY}" fill-opacity="${opacity}"/>`;

const G_FACES =
  light([[185, 225], [402, 112], [402, 212], [278, 282], [278, 440], [185, 490]], 0.14) +
  light([[402, 112], [580, 212], [500, 260], [402, 212]], 0.3) +
  shade([[185, 490], [278, 440], [385, 510], [375, 605]], 0.22) +
  light([[385, 510], [470, 455], [565, 510], [375, 605]], 0.06) +
  shade([[470, 305], [565, 360], [565, 510], [470, 455]], 0.14) +
  light([[372, 365], [470, 305], [470, 405], [385, 447]], 0.26);

const C_FACES =
  light([[725, 165], [735, 262], [650, 312], [525, 285]], 0.2) +
  shade([[820, 228], [885, 265], [820, 305]], 0.22) +
  shade([[525, 285], [650, 312], [650, 478], [525, 530]], 0.12) +
  light([[525, 530], [650, 478], [735, 530], [725, 640]], 0.14) +
  shade([[735, 530], [885, 455], [885, 545], [725, 640]], 0.18);

const CODE = "M727 360L690 385L727 410M775 345L745 425M790 360L827 385L790 410";
const PIXELS = [[832, 112], [788, 147], [832, 180]]
  .map(([x, y]) => `<rect x="${x}" y="${y}" width="35" height="35" fill="${CYAN}"/>`)
  .join("");

const DEFS =
  `<linearGradient id="gc-g" gradientUnits="userSpaceOnUse" x1="185" y1="112" x2="565" y2="605"><stop offset="0" stop-color="${VIOLET_LIGHT}"/><stop offset="1" stop-color="${VIOLET}"/></linearGradient>` +
  `<linearGradient id="gc-c" gradientUnits="userSpaceOnUse" x1="885" y1="165" x2="525" y2="640"><stop offset="0" stop-color="${CYAN}"/><stop offset="1" stop-color="${INDIGO}"/></linearGradient>` +
  `<linearGradient id="gc-o" gradientUnits="userSpaceOnUse" x1="110" y1="600" x2="950" y2="300"><stop offset="0" stop-color="${CYAN_DEEP}"/><stop offset="1" stop-color="${CYAN}"/></linearGradient>` +
  `<clipPath id="gc-gc"><path d="${G}"/></clipPath><clipPath id="gc-cc"><path d="${C}"/></clipPath>` +
  // Transparent gaps where the orbit crosses the letters and where G meets C,
  // so the mark works on any background colour.
  `<mask id="gc-m1" maskUnits="userSpaceOnUse" x="0" y="0" width="1100" height="760"><rect width="1100" height="760" fill="#fff"/><path d="${ORBIT}" fill="#000" stroke="#000" stroke-width="20"/></mask>` +
  `<mask id="gc-m2" maskUnits="userSpaceOnUse" x="0" y="0" width="1100" height="760"><rect width="1100" height="760" fill="#fff"/><path d="${ORBIT}" fill="#000" stroke="#000" stroke-width="20"/><path d="${G}" fill="#000" stroke="#000" stroke-width="30" stroke-linejoin="round"/></mask>`;

const SHAPES =
  `<g mask="url(#gc-m2)"><path d="${C}" fill="url(#gc-c)" stroke="url(#gc-c)" stroke-width="8" stroke-linejoin="round"/><g clip-path="url(#gc-cc)">${C_FACES}</g></g>` +
  `<g mask="url(#gc-m1)"><path d="${G}" fill="url(#gc-g)" stroke="url(#gc-g)" stroke-width="8" stroke-linejoin="round"/><g clip-path="url(#gc-gc)">${G_FACES}</g></g>`;
const SWOOSH = `<path d="${ORBIT}" fill="url(#gc-o)"/>`;

const MARK = `${SHAPES}<path d="${CODE}" fill="none" stroke="url(#gc-c)" stroke-width="12"/>${PIXELS}${SWOOSH}`;
// Below about 64px the code glyph and pixels turn to mush, so small icons drop them.
const MARK_SMALL = SHAPES + SWOOSH;

// The mark centred in a square, optionally on a coloured plate.
function square({ background, radius = 0, fill = 0.92, small = false } = {}) {
  const k = +((512 * fill) / 880).toFixed(4);
  const dx = +(256 - 530 * k).toFixed(2);
  const dy = +(256 - 375 * k).toFixed(2);
  const plate = background ? `<rect width="512" height="512" rx="${radius}" fill="${background}"/>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Girish Creations">` +
    `<defs>${DEFS}</defs>${plate}<g transform="translate(${dx} ${dy}) scale(${k})">${small ? MARK_SMALL : MARK}</g></svg>`
  );
}

function lockup({ ink, rule, stops }) {
  const [a, b, c] = stops;
  const name = `<linearGradient id="gc-n" gradientUnits="userSpaceOnUse" x1="1088" y1="0" x2="2075" y2="0"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="80 90 2005 570" role="img" aria-label="Girish Creations">` +
    `<defs>${DEFS}${name}</defs>${MARK}` +
    `<rect x="1022" y="225" width="4" height="300" fill="${rule}"/>` +
    `<path d="${TEXT.girish}" fill="${ink}"/><path d="${TEXT.creations}" fill="url(#gc-n)"/></svg>\n`
  );
}

const png = (source, size) => sharp(Buffer.from(source), { density: 300 }).resize(size, size).png({ compressionLevel: 9 });

const mark = square();
writeFileSync(resolve(OUT, "logo.svg"), mark + "\n");
await png(mark, 512).toFile(resolve(OUT, "logo.png"));

writeFileSync(
  resolve(OUT, "logo-wordmark-light.svg"),
  lockup({ ink: NAVY, rule: "#b9bdd3", stops: ["#6d28d9", "#4338ca", "#0e7490"] }),
);
writeFileSync(
  resolve(OUT, "logo-wordmark-dark.svg"),
  lockup({ ink: "#f5f3fb", rule: "#4a4d78", stops: ["#a78bfa", "#818cf8", "#22d3ee"] }),
);

// App icons sit on navy so they hold up on any launcher wallpaper. A maskable
// icon must keep its content inside the central 80% circle.
const icon = square({ background: NAVY, radius: 112, fill: 0.9 });
const smallIcon = square({ background: NAVY, radius: 112, fill: 0.96, small: true });
for (const size of [192, 512]) await png(icon, size).toFile(resolve(OUT, `pwa-${size}x${size}.png`));
await png(smallIcon, 64).toFile(resolve(OUT, "pwa-64x64.png"));
await png(square({ background: NAVY, fill: 0.74 }), 512).toFile(resolve(OUT, "maskable-icon-512x512.png"));
await png(square({ background: NAVY, fill: 0.9 }), 180).toFile(resolve(OUT, "apple-touch-icon-180x180.png"));

await ico.sharpsToIco([png(smallIcon, 48)], resolve(OUT, "favicon.ico"), { sizes: [48], resizeOptions: {} });
