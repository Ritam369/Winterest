import cloudinary from '../../common/config/cloudinary.js';
import Wallpaper from '../models/wallpaper.model.js';
import ApiError from '../../common/utils/api-error.js';

// ─── Signed Upload ────────────────────────────────────────────────────────────
// The browser (or Requestly) calls GET /api/wallpapers/sign to get a signature,
// then uploads the file directly to Cloudinary (bypassing our server entirely).
// This sidesteps Vercel's 4.5 MB request body limit.

export const generateSignature = () => {
  const timestamp = Math.round(Date.now() / 1000);
  const params = { folder: 'winterest', timestamp };

  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET
  );

  return {
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder: 'winterest',
  };
};

// ─── Create (metadata only) ───────────────────────────────────────────────────
// After the direct upload succeeds, the caller POSTs the Cloudinary result
// fields to our server so we can persist them in MongoDB.

const getOrientation = (width, height) => {
  if (width > height) return 'landscape';
  if (height > width) return 'portrait';
  return 'square';
};

const normalizeTags = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((t) => t.trim().toLowerCase()).filter(Boolean);
  return raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
};

export const createWallpaper = async (body) => {
  const { public_id, secure_url, width, height, format, tags } = body;

  if (!public_id || !secure_url || !width || !height || !format) {
    throw ApiError.badRequest(
      'Missing required fields: public_id, secure_url, width, height, format'
    );
  }

  const orientation = getOrientation(Number(width), Number(height));

  return Wallpaper.create({
    cloudinaryId: public_id,
    url: secure_url,
    width: Number(width),
    height: Number(height),
    orientation,
    format,
    tags: normalizeTags(tags),
  });
};

// ─── Other operations ─────────────────────────────────────────────────────────

export const getAllWallpapers = async () => {
  return Wallpaper.find().sort({ createdAt: -1 }).lean();
};

export const deleteWallpaper = async (id) => {
  const wallpaper = await Wallpaper.findById(id);
  if (!wallpaper) throw ApiError.notFound('Wallpaper not found');
  await cloudinary.uploader.destroy(wallpaper.cloudinaryId);
  await wallpaper.deleteOne();
};

export const incrementClicks = async (id) => {
  const wallpaper = await Wallpaper.findByIdAndUpdate(
    id,
    { $inc: { clicks: 1 } },
    { new: true }
  ).lean();
  if (!wallpaper) throw ApiError.notFound('Wallpaper not found');
  return wallpaper;
};

export const incrementDownloads = async (id) => {
  const wallpaper = await Wallpaper.findByIdAndUpdate(
    id,
    { $inc: { downloads: 1 } },
    { new: true }
  ).lean();
  if (!wallpaper) throw ApiError.notFound('Wallpaper not found');
  return wallpaper;
};
