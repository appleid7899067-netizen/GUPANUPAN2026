import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const fav = new URL('./src/favicons/', root);
const shots = new URL('./src/screenshots/', root);

fs.mkdirSync(fav, { recursive: true });
fs.mkdirSync(shots, { recursive: true });

const iconSvg = (size, maskable = false) => {
  const pad = maskable ? Math.round(size * 0.18) : Math.round(size * 0.08);
  const r = Math.round(size * 0.22);
  const inner = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${r}" fill="#171c24"/>
    <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${Math.round(inner*0.18)}" fill="#8b5cf6"/>
    <path d="M${size*.30} ${size*.62} L${size*.44} ${size*.38} L${size*.58} ${size*.62} L${size*.70} ${size*.38}" fill="none" stroke="#fff" stroke-width="${Math.max(4,size*.075)}" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
};

for (const [name, size, mask] of [
  ['icon-192.png',192,false], ['icon-512.png',512,false],
  ['maskable-192.png',192,true], ['maskable-512.png',512,true]
]) {
  const file = new URL(name, fav);
  if (!fs.existsSync(file)) await sharp(Buffer.from(iconSvg(size, mask))).png().toFile(file.pathname);
}

const screenshotSvg = (w,h,dark) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${dark ? '#171c24' : '#f7f7fb'}"/>
  <rect x="${w*.055}" y="${h*.09}" width="${w*.89}" height="${h*.80}" rx="${Math.min(w,h)*.035}" fill="${dark ? '#202734' : '#ffffff'}"/>
  <circle cx="${w*.10}" cy="${h*.15}" r="${Math.min(w,h)*.018}" fill="#8b5cf6"/>
  <rect x="${w*.15}" y="${h*.13}" width="${w*.28}" height="${Math.min(w,h)*.035}" rx="10" fill="${dark ? '#dbe4f0' : '#252b35'}"/>
  <rect x="${w*.10}" y="${h*.27}" width="${w*.42}" height="${h*.045}" rx="12" fill="${dark ? '#3a4556' : '#e8eaf0'}"/>
  <rect x="${w*.10}" y="${h*.36}" width="${w*.34}" height="${h*.045}" rx="12" fill="${dark ? '#303b4b' : '#eef0f5'}"/>
  <rect x="${w*.58}" y="${h*.23}" width="${w*.29}" height="${h*.48}" rx="18" fill="${dark ? '#11161e' : '#f3f4f8'}"/>
</svg>`;

for (const [name,w,h,dark] of [
  ['desktop-light.png',1280,720,false], ['desktop-dark.png',1280,720,true],
  ['mobile-light.png',720,1280,false], ['mobile-dark.png',720,1280,true]
]) {
  const file = new URL(name, shots);
  if (!fs.existsSync(file)) await sharp(Buffer.from(screenshotSvg(w,h,dark))).png().toFile(file.pathname);
}


const heroScreenshots = [
  ['deck.webp', 'deck'], ['form.webp', 'form'], ['game.webp', 'game'],
  ['landing.webp', 'landing'], ['portfolio.webp', 'portfolio'],
  ['prototype.webp', 'prototype'], ['saas.webp', 'saas'],
  ['software.webp', 'software'], ['ui.webp', 'ui'],
];
const comparisonScreenshots = {
  'best-ai-app-builder': ['base44','bolt','bubble','glide','lovable','puter','replit','v0'],
  'best-ai-website-builder': ['10web','durable','framer','godaddy','hostinger','jimdo','puter','squarespace','webflow','wix'],
};
const webpSvg = (label) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700">
  <rect width="1200" height="700" rx="28" fill="#171c24"/>
  <rect x="32" y="32" width="1136" height="636" rx="22" fill="#202734"/>
  <rect x="70" y="78" width="360" height="34" rx="10" fill="#8b5cf6"/>
  <rect x="70" y="150" width="760" height="28" rx="10" fill="#3a4556"/>
  <rect x="70" y="204" width="620" height="28" rx="10" fill="#303b4b"/>
  <rect x="70" y="290" width="1060" height="280" rx="20" fill="#11161e"/>
  <text x="70" y="620" fill="#dbe4f0" font-family="Arial,sans-serif" font-size="28">${label}</text>
</svg>`;

for (const [name, label] of heroScreenshots) {
  const file = new URL(name, shots);
  if (!fs.existsSync(file)) await sharp(Buffer.from(webpSvg(label))).webp().toFile(file.pathname);
}
for (const [dir, names] of Object.entries(comparisonScreenshots)) {
  const folder = new URL(`./${dir}/`, shots);
  fs.mkdirSync(folder, { recursive: true });
  for (const name of names) {
    const file = new URL(`${name}.webp`, folder);
    if (!fs.existsSync(file)) await sharp(Buffer.from(webpSvg(`${dir}: ${name}`))).webp().toFile(file.pathname);
  }
}

console.log('PWA assets ready');
