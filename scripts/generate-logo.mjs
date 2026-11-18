// Draws the Girish Creations logo and writes every logo file in public/logo:
// the GC monogram, the name lockups for light and dark backgrounds, the PWA
// icons and the favicon. Run with `npm run logo` after changing a colour or
// the shape.
//
// The mark is a G ring and a C ring that overlap; the shared area is cut out
// (even-odd fill), so the mark is one flat colour and works on any background.
// It is drawn on a 0–100 grid and spans x 12–82.15, y 25–75.
//
// The name is outlined Montserrat Bold (logo-text-paths.json), so the SVGs
// need no font.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import ico from "sharp-ico";

const OUT = resolve(import.meta.dirname, "../public/logo");
const TEXT = JSON.parse(readFileSync(resolve(import.meta.dirname, "logo-text-paths.json"), "utf8"));

// Keep in step with --brand-* in src/styles/brand.css.
const GRAPHITE = "#17181C"; // --brand-navy
const GOLD = "#F5C66B"; // --brand-accent: the mark on graphite
const AMBER = "#D9901A"; // --brand-primary: the transparent logo, reads on light and dark
const AMBER_DEEP = "#9E6207"; // --brand-primary-deep: readable on white
const PORCELAIN = "#EFEEEA"; // the name on dark backgrounds

const G = "M37 25A25 25 0 1 0 62 50H50A13 13 0 1 1 37 37Z";
const C = "M82.15 33.93A25 25 0 1 0 82.15 66.07L72.96 58.36A13 13 0 1 1 72.96 41.64Z";
const MARK = (fill) => `<path fill-rule="evenodd" fill="${fill}" d="${G}${C}"/>`;

// Bounding box of the mark on its grid.
const X0 = 12;
const W = 70.15;
const CX = X0 + W / 2;
const CY = 50;

// The mark centred in a square, optionally on a rounded plate.
function square({ fill = GOLD, background, radius = 0, width = 0.78 } = {}) {
  const k = +((512 * width) / W).toFixed(4);
  const dx = +(256 - CX * k).toFixed(2);
  const dy = +(256 - CY * k).toFixed(2);
  const plate = background ? `<rect width="512" height="512" rx="${radius}" fill="${background}"/>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Girish Creations">` +
    `${plate}<g transform="translate(${dx} ${dy}) scale(${k})">${MARK(fill)}</g></svg>`
  );
}

// Mark at 7.2× (x 482–987, y 198–558), a thin rule, then the two-line name.
function lockup({ mark, ink, accent, rule }) {
  const k = 7.2;
  const tx = +(482 - X0 * k).toFixed(2);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="452 170 1648 416" role="img" aria-label="Girish Creations">` +
    `<g transform="translate(${tx} 18) scale(${k})">${MARK(mark)}</g>` +
    `<rect x="1022" y="225" width="4" height="300" fill="${rule}"/>` +
    `<path d="${TEXT.girish}" fill="${ink}"/><path d="${TEXT.creations}" fill="${accent}"/></svg>\n`
  );
}

const png = (source, size) => sharp(Buffer.from(source), { density: 300 }).resize(size, size).png({ compressionLevel: 9 });

// logo.svg / logo.png: the mark alone on a transparent background, in amber
// so it reads on both light and dark screens.
const mark = square({ fill: AMBER, width: 0.94 });
writeFileSync(resolve(OUT, "logo.svg"), mark + "\n");
await png(mark, 512).toFile(resolve(OUT, "logo.png"));

writeFileSync(resolve(OUT, "logo-wordmark-light.svg"), lockup({ mark: GRAPHITE, ink: GRAPHITE, accent: AMBER_DEEP, rule: "#D1CFC8" }));
writeFileSync(resolve(OUT, "logo-wordmark-dark.svg"), lockup({ mark: GOLD, ink: PORCELAIN, accent: GOLD, rule: "#3B3D43" }));

// App icons sit on a graphite tile so they hold up on any launcher wallpaper
// (phones fill a transparent icon with black or white). A maskable icon must
// keep its content inside the central 80% circle.
const tile = square({ background: GRAPHITE, radius: 112, width: 0.72 });
for (const size of [192, 512]) await png(tile, size).toFile(resolve(OUT, `pwa-${size}x${size}.png`));
const small = square({ background: GRAPHITE, radius: 112, width: 0.82 });
await png(small, 64).toFile(resolve(OUT, "pwa-64x64.png"));
await png(square({ background: GRAPHITE, width: 0.6 }), 512).toFile(resolve(OUT, "maskable-icon-512x512.png"));
await png(square({ background: GRAPHITE, width: 0.72 }), 180).toFile(resolve(OUT, "apple-touch-icon-180x180.png"));

// Browser tab icon: transparent, like logo.png.
await ico.sharpsToIco([png(square({ fill: AMBER, width: 0.96 }), 48)], resolve(OUT, "favicon.ico"), { sizes: [48], resizeOptions: {} });
