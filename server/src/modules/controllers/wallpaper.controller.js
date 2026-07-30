import * as wallpaperService from '../services/wallpaper.service.js';
import ApiResponse from '../../common/utils/api-response.js';
import ApiError from '../../common/utils/api-error.js';

export const getSignature = (req, res, next) => {
  try {
    const data = wallpaperService.generateSignature();
    ApiResponse.ok(res, 'Signature generated', data);
  } catch (err) {
    next(err);
  }
};

// GET /api/wallpapers?page=1&limit=20
export const getWallpapers = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const result = await wallpaperService.getWallpapersPaginated(page, limit);
    ApiResponse.ok(res, 'Wallpapers fetched successfully', result);
  } catch (err) {
    next(err);
  }
};

// GET /api/wallpapers/search?q=nature
export const searchWallpapers = async (req, res, next) => {
  try {
    const q = (req.query.q ?? '').trim();
    if (!q) return ApiResponse.ok(res, 'Search results', []);
    const wallpapers = await wallpaperService.searchWallpapersByTag(q);
    ApiResponse.ok(res, 'Search results', wallpapers);
  } catch (err) {
    next(err);
  }
};

// Accepts JSON body with Cloudinary metadata after a direct browser→Cloudinary upload:
// { public_id, secure_url, width, height, format, tags? }
export const uploadWallpaper = async (req, res, next) => {
  try {
    const wallpaper = await wallpaperService.createWallpaper(req.body);
    ApiResponse.created(res, 'Wallpaper uploaded successfully', wallpaper);
  } catch (err) {
    next(err);
  }
};

export const removeWallpaper = async (req, res, next) => {
  try {
    await wallpaperService.deleteWallpaper(req.params.id);
    ApiResponse.noContent(res);
  } catch (err) {
    next(err);
  }
};

export const trackClick = async (req, res, next) => {
  try {
    const wallpaper = await wallpaperService.incrementClicks(req.params.id);
    ApiResponse.ok(res, 'Click tracked', { clicks: wallpaper.clicks });
  } catch (err) {
    next(err);
  }
};

export const trackDownload = async (req, res, next) => {
  try {
    const wallpaper = await wallpaperService.incrementDownloads(req.params.id);
    ApiResponse.ok(res, 'Download tracked', { downloads: wallpaper.downloads });
  } catch (err) {
    next(err);
  }
};
