import { readFile, stat } from 'node:fs/promises';

const publicFile = (name) => new URL(`../public/${name}`, import.meta.url);

function assert(condition, message) {
  if (!condition) throw new Error(`PWA asset verification failed: ${message}`);
}

function readPngDimensions(buffer, label) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert(buffer.length >= 24 && buffer.subarray(0, 8).equals(signature), `${label} is not a valid PNG file`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const manifest = JSON.parse(await readFile(publicFile('manifest.webmanifest'), 'utf8'));
const icons = Array.isArray(manifest.icons) ? manifest.icons : [];

for (const expected of [
  { src: '/kaira-icon-192.png', sizes: '192x192', width: 192, height: 192 },
  { src: '/kaira-icon-512.png', sizes: '512x512', width: 512, height: 512 },
]) {
  const entry = icons.find((icon) => icon.src === expected.src);
  assert(entry, `manifest is missing ${expected.src}`);
  assert(entry.sizes === expected.sizes, `${expected.src} must declare ${expected.sizes}`);
  assert(entry.type === 'image/png', `${expected.src} must declare image/png`);
  assert(String(entry.purpose ?? 'any').split(/\\s+/).includes('any'), `${expected.src} must support the any purpose`);
  const image = await readFile(publicFile(expected.src.slice(1)));
  const dimensions = readPngDimensions(image, expected.src);
  assert(dimensions.width === expected.width && dimensions.height === expected.height,
    `${expected.src} dimensions are ${dimensions.width}x${dimensions.height}, expected ${expected.width}x${expected.height}`);
}

const maskable = icons.find((icon) => icon.src === '/kaira-maskable.svg');
assert(maskable && maskable.type === 'image/svg+xml' && String(maskable.purpose).split(/\\s+/).includes('maskable'),
  'manifest must declare the separate maskable SVG icon');
const maskableSvg = await readFile(publicFile('kaira-maskable.svg'), 'utf8');
assert(maskableSvg.includes('<svg') && maskableSvg.includes('viewBox="0 0 180 180"'),
  'maskable SVG must be a valid scalable Kaira mark');

const shareCard = await readFile(publicFile('kaira-social-preview.png'));
const shareDimensions = readPngDimensions(shareCard, 'kaira-social-preview.png');
assert(shareDimensions.width === 1200 && shareDimensions.height === 630,
  'social preview must be 1200x630');
assert(shareCard.length <= 1024 * 1024, 'social preview must remain at or below 1 MiB');

const worker = await readFile(publicFile('sw.js'), 'utf8');
for (const asset of ['kaira-icon-192.png', 'kaira-icon-512.png', 'kaira-maskable.svg']) {
  assert(worker.includes(asset), `service worker must precache ${asset}`);
}
assert(/kaira-africa-shell-v\\d+/.test(worker), 'service worker must declare a versioned shell cache');

console.log('PWA assets verified: manifest, 192/512 PNG icons, maskable SVG, social preview, and service-worker precache.');
