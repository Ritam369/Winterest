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

export const getWallpapers = async (req, res, next) => {
  try {
    const wallpapers = await wallpaperService.getAllWallpapers();
    ApiResponse.ok(res, 'Wallpapers fetched successfully', wallpapers);
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
