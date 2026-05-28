import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

// DB
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
};
app.use(async (req, res, next) => {
  try { await connectDB(); next(); } catch (err) { next(err); }
});

// Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Model
const wallpaperSchema = new mongoose.Schema(
  {
    cloudinaryId: { type: String, required: true },
    url: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    orientation: { type: String, enum: ['landscape', 'portrait', 'square'], required: true },
    format: { type: String, required: true },
    tags: { type: [String], default: [] },
    clicks: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
  },
  { timestamps: true }
);
wallpaperSchema.index({ tags: 1 });
const Wallpaper = mongoose.models.Wallpaper || mongoose.model('Wallpaper', wallpaperSchema);

// Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) cb(null, true);
    else cb(new Error('Only jpg, png and webp files are allowed'));
  },
});

// Helpers
const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'winterest', resource_type: 'image' },
      (error, result) => { if (error) reject(error); else resolve(result); }
    );
    stream.end(buffer);
  });

const getOrientation = (w, h) => w > h ? 'landscape' : h > w ? 'portrait' : 'square';

const normalizeTags = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((t) => t.trim().toLowerCase()).filter(Boolean);
  return raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
};

const apiKeyMiddleware = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_SECRET_KEY)
    return res.status(403).json({ success: false, message: 'Forbidden' });
  next();
};

// Routes
app.get('/api/wallpapers', async (req, res, next) => {
  try {
    const wallpapers = await Wallpaper.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: wallpapers, message: 'Wallpapers fetched successfully' });
  } catch (err) { next(err); }
});

app.post('/api/wallpapers', apiKeyMiddleware, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided' });
    const result = await uploadToCloudinary(req.file.buffer);
    const { public_id, secure_url, width, height, format } = result;
    const wallpaper = await Wallpaper.create({
      cloudinaryId: public_id,
      url: secure_url,
      width, height,
      orientation: getOrientation(width, height),
      format,
      tags: normalizeTags(req.body.tags),
    });
    res.status(201).json({ success: true, data: wallpaper, message: 'Wallpaper uploaded successfully' });
  } catch (err) { next(err); }
});

app.delete('/api/wallpapers/:id', apiKeyMiddleware, async (req, res, next) => {
  try {
    const wallpaper = await Wallpaper.findById(req.params.id);
    if (!wallpaper) return res.status(404).json({ success: false, message: 'Wallpaper not found' });
    await cloudinary.uploader.destroy(wallpaper.cloudinaryId);
    await wallpaper.deleteOne();
    res.status(204).send();
  } catch (err) { next(err); }
});

app.patch('/api/wallpapers/:id/click', async (req, res, next) => {
  try {
    const wallpaper = await Wallpaper.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } }, { new: true }).lean();
    if (!wallpaper) return res.status(404).json({ success: false, message: 'Wallpaper not found' });
    res.json({ success: true, data: { clicks: wallpaper.clicks }, message: 'Click tracked' });
  } catch (err) { next(err); }
});

app.patch('/api/wallpapers/:id/download', async (req, res, next) => {
  try {
    const wallpaper = await Wallpaper.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } }, { new: true }).lean();
    if (!wallpaper) return res.status(404).json({ success: false, message: 'Wallpaper not found' });
    res.json({ success: true, data: { downloads: wallpaper.downloads }, message: 'Download tracked' });
  } catch (err) { next(err); }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

export default app;
