import { Router } from 'express';
import * as wallpaperController from '../controllers/wallpaper.controller.js';
import apiKeyMiddleware from '../../common/middleware/apiKey.js';

const router = Router();

// Sign endpoint — protected, used by the upload script
router.get('/sign', apiKeyMiddleware, wallpaperController.getSignature);

// Full-DB tag search — GET /api/wallpapers/search?q=nature
router.get('/search', wallpaperController.searchWallpapers);

// Paginated listing — GET /api/wallpapers?page=1&limit=20
router.get('/', wallpaperController.getWallpapers);

// Save metadata after direct Cloudinary upload
router.post('/', apiKeyMiddleware, wallpaperController.uploadWallpaper);

router.delete('/:id', apiKeyMiddleware, wallpaperController.removeWallpaper);
router.patch('/:id/click', wallpaperController.trackClick);
router.patch('/:id/download', wallpaperController.trackDownload);

export default router;
