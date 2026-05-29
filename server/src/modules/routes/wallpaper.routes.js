import { Router } from 'express';
import * as wallpaperController from '../controllers/wallpaper.controller.js';
import { upload } from '../services/wallpaper.service.js';
import apiKeyMiddleware from '../../common/middleware/apiKey.js';

const router = Router();

router.get('/', wallpaperController.getWallpapers);
router.post('/', apiKeyMiddleware, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}, wallpaperController.uploadWallpaper);
router.delete('/:id', apiKeyMiddleware, wallpaperController.removeWallpaper);
router.patch('/:id/click', wallpaperController.trackClick);
router.patch('/:id/download', wallpaperController.trackDownload);

export default router;
