import { Router } from 'express';
import * as wallpaperController from '../controllers/wallpaper.controller.js';
import apiKeyMiddleware from '../../common/middleware/apiKey.js';

const router = Router();

// Returns a signed upload signature so the client can upload directly to Cloudinary.
// Protected so only you can trigger uploads.
router.get('/sign', apiKeyMiddleware, wallpaperController.getSignature);

router.get('/', wallpaperController.getWallpapers);

// Accepts JSON metadata from the client after it has uploaded directly to Cloudinary.
// { public_id, secure_url, width, height, format, tags? }
router.post('/', apiKeyMiddleware, wallpaperController.uploadWallpaper);

router.delete('/:id', apiKeyMiddleware, wallpaperController.removeWallpaper);
router.patch('/:id/click', wallpaperController.trackClick);
router.patch('/:id/download', wallpaperController.trackDownload);

export default router;
