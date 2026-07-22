#!/usr/bin/env node
/**
 * upload.mjs — Add a wallpaper to Winterest in one command.
 *
 * Usage:
 *   node scripts/upload.mjs <image-path> [tags]
 *
 * Examples:
 *   node scripts/upload.mjs ./photo.jpg
 *   node scripts/upload.mjs ./photo.jpg "nature,mountains,dark"
 *
 * Requires the .env file at the project root.
 * Requires Node 18+.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// ─── Load .env from project root ─────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../.env') });

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = process.env.UPLOAD_API_BASE ?? 'http://localhost:3000';
const API_KEY  = process.env.API_SECRET_KEY;

if (!API_KEY) {
  console.error('API_SECRET_KEY is not set in your .env file.');
  process.exit(1);
}

// ─── Args ─────────────────────────────────────────────────────────────────────
const [,, imagePath, tags = ''] = process.argv;

if (!imagePath) {
  console.error('Usage: node scripts/upload.mjs <image-path> [tags]');
  console.error('Example: node scripts/upload.mjs ./photo.jpg "nature,dark"');
  process.exit(1);
}

const absolutePath = path.resolve(imagePath);
if (!fs.existsSync(absolutePath)) {
  console.error(`File not found: ${absolutePath}`);
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const log = (emoji, msg) => console.log(`${emoji}  ${msg}`);

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${json.message ?? JSON.stringify(json)}`);
  }
  return json;
}

// ─── Step 1: Get signature ────────────────────────────────────────────────────
log('🔐', 'Getting upload signature...');
const { data: sig } = await fetchJSON(`${API_BASE}/api/wallpapers/sign`, {
  headers: { 'x-api-key': API_KEY },
});

// ─── Step 2: Upload directly to Cloudinary ───────────────────────────────────
log('☁️ ', `Uploading ${path.basename(absolutePath)} to Cloudinary...`);

// Use native FormData + Blob (Node 18+)
const fileBuffer = fs.readFileSync(absolutePath);
const mimeType   = absolutePath.match(/\.png$/i) ? 'image/png'
                 : absolutePath.match(/\.webp$/i) ? 'image/webp'
                 : 'image/jpeg';

const form = new FormData();
form.append('file',      new Blob([fileBuffer], { type: mimeType }), path.basename(absolutePath));
form.append('api_key',   sig.apiKey);
form.append('timestamp', String(sig.timestamp));
form.append('signature', sig.signature);
form.append('folder',    sig.folder);

const cloudinaryRes = await fetch(
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

// ─── Step 3: Save metadata to DB ─────────────────────────────────────────────
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
