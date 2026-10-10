// Generates the PWA icons from one SVG. Run: node scripts/make-icons.mjs
import sharp from "sharp";
import fs from "node:fs";

const mark = (scale) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#D7FF3D"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <path d="M356 186 A120 120 0 1 0 356 326" fill="none" stroke="#0A0A0B" stroke-width="56" stroke-linecap="round"/>
    <circle cx="262" cy="256" r="34" fill="#0A0A0B"/>
  </g>
</svg>`;

fs.mkdirSync("public/icons", { recursive: true });
const jobs = [
  ["icon-192.png", 192, 1],
  ["icon-512.png", 512, 1],
  ["maskable-512.png", 512, 0.72],
  ["apple-touch-icon.png", 180, 0.9],
];
for (const [name, size, scale] of jobs) {
  await sharp(Buffer.from(mark(scale))).resize(size, size).png().toFile(`public/icons/${name}`);
}
fs.writeFileSync("public/icons/icon.svg", mark(1).trim());
console.log("icons written");
