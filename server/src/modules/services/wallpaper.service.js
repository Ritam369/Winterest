import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../../common/config/cloudinary.js';
import Wallpaper from '../models/wallpaper.model.js';
import ApiError from '../../common/utils/api-error.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'winterest',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    resource_type: 'image',
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

const getOrientation = (width, height) => {
  if (width > height) return 'landscape';
  if (height > width) return 'portrait';
  return 'square';
};

const normalizeTags = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((t) => t.trim().toLowerCase()).filter(Boolean);
  // handle comma-separated string from form-data
  return raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
};

export const createWallpaper = async (file, body) => {
  // multer-storage-cloudinary v4 only gives path (url) and filename (public_id)
  // fetch full metadata from Cloudinary to get width, height, format
  const publicId = file.filename;
  const result = await cloudinary.api.resource(publicId, { resource_type: 'image' });

  const { width, height, format, secure_url } = result;
  const tags = normalizeTags(body.tags);
  const orientation = getOrientation(width, height);

  const wallpaper = await Wallpaper.create({
    cloudinaryId: publicId,
    url: secure_url,
    width,
    height,
    orientation,
    format,
    tags,
  });

  return wallpaper;
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
