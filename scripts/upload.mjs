#!/usr/bin/env node
/**
 * upload.mjs — Add a wallpaper to Winterest in one command.
 *
 * Usage:
 *   node --env-file=.env scripts/upload.mjs <image-path> [tags]
 *
 * Examples:
 *   pnpm upload ./photo.jpg
 *   pnpm upload ./photo.png "nature,mountains,dark"
 *
 * Files ≤ 10 MB are uploaded as-is (no quality loss).
 * Files > 10 MB are compressed locally with sharp before uploading,
 * starting at quality 90 and stepping down by 5 until the file fits,
 * stopping at a floor of 75 to preserve visible quality.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────
const MAX_BYTES    = 10 * 1024 * 1024; // 10 MB — Cloudinary free tier limit
const QUALITY_START = 90;              // first compression attempt
const QUALITY_STEP  = 5;              // step down by this each iteration
const QUALITY_FLOOR = 75;             // never go below this

const API_BASE = process.env.UPLOAD_API_BASE ?? 'http://localhost:3000';
const API_KEY  = process.env.API_SECRET_KEY;

if (!API_KEY) {
  console.error('API_SECRET_KEY is not set in your .env file.');
  process.exit(1);
}

// ─── Args ─────────────────────────────────────────────────────────────────────
const [,, imagePath, tags = ''] = process.argv;

if (!imagePath) {
  console.error('Usage: pnpm upload <image-path> [tags]');
  console.error('Example: pnpm upload ./photo.jpg "nature,dark"');
  process.exit(1);
}

const absolutePath = path.resolve(imagePath);
if (!fs.existsSync(absolutePath)) {
  console.error(`File not found: ${absolutePath}`);
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const log  = (emoji, msg) => console.log(`${emoji}  ${msg}`);
const mb   = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

async function fetchJSON(url, options = {}) {
  const res  = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${json.message ?? JSON.stringify(json)}`);
  }
  return json;
}

// ─── Compression ─────────────────────────────────────────────────────────────
/**
 * If the file is within the limit, returns the raw buffer unchanged.
 * Otherwise recursively compresses (quality 90 → 85 → 80 … → 75) until it fits.
 * PNG files are converted to JPEG for compression since PNG is lossless
 * and can't be meaningfully quality-compressed.
 */
async function prepareBuffer(filePath) {
  const raw      = fs.readFileSync(filePath);
  const ext      = filePath.split('.').pop().toLowerCase();
  const isPng    = ext === 'png';

  if (raw.length <= MAX_BYTES) {
    log('📦', `File is ${mb(raw.length)} — no compression needed.`);
    return { buffer: raw, mimeType: isPng ? 'image/png' : 'image/jpeg', wasCompressed: false };
  }

  log('⚙️ ', `File is ${mb(raw.length)} — exceeds 10 MB, compressing locally...`);

  // PNG → JPEG conversion + quality compression
  // JPEG → JPEG quality compression
  const outputFormat = 'jpeg'; // always output jpeg for compression
  let quality = QUALITY_START;

  while (quality >= QUALITY_FLOOR) {
    const compressed = await sharp(raw)
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    log(
      '   ',
      `quality ${quality} → ${mb(compressed.length)}${compressed.length <= MAX_BYTES ? ' ✓' : ' (still too large)'}`
    );

    if (compressed.length <= MAX_BYTES) {
      return { buffer: compressed, mimeType: 'image/jpeg', wasCompressed: true, quality };
    }

    quality -= QUALITY_STEP;
  }

  // Reached the floor and still too large — upload anyway and let Cloudinary reject
  // (this would be an extreme edge case, e.g. a 100 MB file)
  const fallback = await sharp(raw).jpeg({ quality: QUALITY_FLOOR, mozjpeg: true }).toBuffer();
  log('⚠️ ', `Could not get below 10 MB at quality ${QUALITY_FLOOR}. Attempting upload anyway (${mb(fallback.length)}).`);
  return { buffer: fallback, mimeType: 'image/jpeg', wasCompressed: true, quality: QUALITY_FLOOR };
}

// ─── Step 1: Get signature ────────────────────────────────────────────────────
log('🔐', 'Getting upload signature...');
const { data: sig } = await fetchJSON(`${API_BASE}/api/wallpapers/sign`, {
  headers: { 'x-api-key': API_KEY },
});

// ─── Step 2: Prepare file (compress if needed) ───────────────────────────────
const { buffer, mimeType, wasCompressed, quality } = await prepareBuffer(absolutePath);

if (wasCompressed) {
  log('✅', `Compressed to ${mb(buffer.length)} at quality ${quality}.`);
}

// ─── Step 3: Upload directly to Cloudinary ───────────────────────────────────
log('☁️ ', `Uploading ${path.basename(absolutePath)} to Cloudinary...`);

const form = new FormData();
form.append('file',      new Blob([buffer], { type: mimeType }), path.basename(absolutePath));
form.append('api_key',   sig.apiKey);
form.append('timestamp', String(sig.timestamp));
form.append('signature', sig.signature);
form.append('folder',    sig.folder);

const cloudinaryRes  = await fetch(
  `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
  { method: 'POST', body: form }
);
const cloudinaryData = await cloudinaryRes.json();

if (!cloudinaryRes.ok || cloudinaryData.error) {
  console.error('Cloudinary upload failed:', cloudinaryData.error?.message ?? cloudinaryData);
  process.exit(1);
}

const { public_id, secure_url, width, height, format } = cloudinaryData;
log('✅', `Uploaded: ${secure_url}`);

// ─── Step 4: Save metadata to DB ─────────────────────────────────────────────
log('💾', 'Saving to database...');
const { data: wallpaper } = await fetchJSON(`${API_BASE}/api/wallpapers`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
  body: JSON.stringify({ public_id, secure_url, width, height, format, tags }),
});

log('🎉', 'Done! Wallpaper saved.');
console.log(`   ID:   ${wallpaper._id}`);
console.log(`   URL:  ${wallpaper.url}`);
console.log(`   Tags: ${wallpaper.tags.join(', ') || '(none)'}`);
console.log(`   Size: ${width}×${height} (${format})`);
