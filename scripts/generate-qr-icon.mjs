/**
 * Generate QR code SVG for https://www.goodlink.ai and save as icon asset.
 * Run: npm run generate-qr-icon
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'src', 'assets', 'qr-code-icon.svg');

const QRCode = require('qrcode/lib/server.js');
const url = 'https://www.goodlink.ai';

const svg = await QRCode.toString(url, {
  type: 'svg',
  margin: 0,
  width: 80,
  color: {
    dark: '#9ca3af',
    light: '#232f48',
  },
});

fs.writeFileSync(OUT, svg.trim(), 'utf8');
console.log('Written:', OUT);
