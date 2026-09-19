// Regenerates every raster app icon from assets/branding/{icon,logo}.svg.
// Usage: npm i --no-save @resvg/resvg-js && node scripts/branding/generate-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const branding = join(root, 'assets', 'branding');
const images = join(root, 'assets', 'images');

const GREEN = '#25E38A';
const iconSvg = readFileSync(join(branding, 'icon.svg'), 'utf8');
const glyphPath = readFileSync(join(branding, 'logo.svg'), 'utf8').match(/<path[^>]* d="([^"]+)"/)[1];

const render = (svg, size, file) => {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(join(images, file), png);
  console.log(`${file} ${size}x${size} ${png.length} B`);
};

// Glyph (270x270 design space) centred on a 1024 canvas at `fraction` of its width.
const glyphOnCanvas = (fill, fraction, defs = '') => {
  const scale = (1024 * fraction) / 270;
  const offset = (1024 - 270 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
${defs}<path transform="translate(${offset} ${offset}) scale(${scale})" fill-rule="evenodd" clip-rule="evenodd" d="${glyphPath}" fill="${fill}"/></svg>`;
};
const darkGradient = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#1C2915"/><stop offset="1" stop-color="#083F25"/></linearGradient></defs>\n`;

// Store/iOS icon: full-bleed square, the OS applies its own mask.
const squareIcon = iconSvg.replace(' rx="61"', '');
render(squareIcon, 1024, 'icon.png');
render(iconSvg, 96, 'favicon.png');

// Android adaptive icon: glyph inside the 66/108 safe zone over a solid brand background.
render(glyphOnCanvas('url(#g)', 0.5, darkGradient), 1024, 'android-icon-foreground.png');
render(glyphOnCanvas('#000000', 0.5), 1024, 'android-icon-monochrome.png');

// Splash: brand-green glyph, padded so the Android 12 circular mask never clips it.
render(glyphOnCanvas(GREEN, 0.62), 1024, 'splash-icon.png');
