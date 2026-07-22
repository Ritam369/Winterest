import multer from 'multer';
import cloudinary from '../../common/config/cloudinary.js';
import Wallpaper from '../models/wallpaper.model.js';
import ApiError from '../../common/utils/api-error.js';

// Store the upload in memory; we stream the raw buffer straight to Cloudinary.
// Cloudinary handles compression/optimisation via eager transformations, so we
// no longer need the sharp native binary (which is incompatible with Vercel).
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) cb(null, true);
    else cb(new Error('Only jpg, png and webp files are allowed'));
  },
});

/**
 * Streams a buffer to Cloudinary.
 * Uses Cloudinary's `quality: auto` and `fetch_format: auto` to keep file
 * sizes reasonable without a local compression step.
 */
const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'winterest',
        resource_type: 'image',
        // Let Cloudinary apply automatic quality/format optimisation
        quality: 'auto',
        fetch_format: 'auto',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });

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

export const createWallpaper = async (file, body) => {
  const result = await uploadToCloudinary(file.buffer);
  const { public_id, secure_url, width, height, format } = result;

  const tags = normalizeTags(body.tags);
  const orientation = getOrientation(width, height);

  return Wallpaper.create({
    cloudinaryId: public_id,
    url: secure_url,
    width,
    height,
    orientation,
    format,
    tags,
  });
};

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
