// Converts a Cloudinary URL to an ImageKit URL for faster CDN delivery.
// The original Cloudinary URL is kept in the DB and used for downloads —
// only the display URLs shown in <img> tags go through ImageKit.
//
// Cloudinary URL format:
//   https://res.cloudinary.com/<cloud_name>/image/upload/<transforms>/v<version>/<folder>/<file>
//
// ImageKit URL format (with Cloudinary as Web Folder origin, base: https://res.cloudinary.com):
//   https://ik.imagekit.io/ritamsaha/<cloud_name>/image/upload/<file>?tr=<transforms>

const IMAGEKIT_BASE = 'https://ik.imagekit.io/ritamsaha';
const CLOUDINARY_BASE = 'https://res.cloudinary.com';

/**
 * @param {string} cloudinaryUrl  - The raw Cloudinary URL stored in MongoDB
 * @param {string} [transforms]   - ImageKit transformation string e.g. "w-800,q-80,f-auto"
 * @returns {string} ImageKit delivery URL
 */
export const toImageKitUrl = (cloudinaryUrl, transforms = '') => {
  if (!cloudinaryUrl?.startsWith(CLOUDINARY_BASE)) return cloudinaryUrl;

  // Strip the Cloudinary base to get the path: /<cloud_name>/image/upload/...
  const path = cloudinaryUrl.slice(CLOUDINARY_BASE.length);

  const url = `${IMAGEKIT_BASE}${path}`;
  return transforms ? `${url}?tr=${transforms}` : url;
};

// ─── Preset helpers ────────────────────────────────────────────────────────────

// Card view: resize to 800px wide, auto quality, auto format (WebP where supported)
export const cardUrl = (cloudinaryUrl) =>
  toImageKitUrl(cloudinaryUrl, 'w-800,q-80,f-auto');

// Modal view: full resolution, just auto format for faster delivery
export const modalUrl = (cloudinaryUrl) =>
  toImageKitUrl(cloudinaryUrl, 'q-90,f-auto');
