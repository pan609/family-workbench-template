import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import QRCode from 'qrcode';

assert.ok(process.env.INSTALL_URL, 'INSTALL_URL is required; do not invent a placeholder phone URL');
const url = process.env.INSTALL_URL;
const parsed = new URL(url);
assert.equal(parsed.protocol, 'https:', 'install URL must use HTTPS');
assert.notEqual(parsed.hostname, 'localhost', 'localhost is not a phone delivery URL');
if (isIP(parsed.hostname)) {
  assert.equal(
    /^(?:127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(parsed.hostname),
    false,
    'loopback and private IPs are not personal phone delivery URLs',
  );
}

const qr = await QRCode.toDataURL(url, { width: 280, margin: 2, errorCorrectionLevel: 'M' });
assert.match(qr, /^data:image\/png;base64,/, 'QR code must be a PNG data URL');

const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
for (const expected of ['192x192', '512x512']) {
  assert.equal(manifest.icons.some((icon) => icon.sizes === expected), true, `manifest missing ${expected} icon`);
}
assert.equal(manifest.icons.some((icon) => icon.purpose === 'maskable'), true, 'manifest missing maskable icon');

console.log(JSON.stringify({ status: 'LINK_ARTIFACT_READY_NOT_VERIFIED', installUrl: url, qrPng: true, manifestIcons: true }));
