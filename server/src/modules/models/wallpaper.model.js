import mongoose from 'mongoose';

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

const Wallpaper = mongoose.model('Wallpaper', wallpaperSchema);
export default Wallpaper;
