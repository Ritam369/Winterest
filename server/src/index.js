import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import wallpaperRoutes from './modules/routes/wallpaper.routes.js';
import errorHandler from './common/middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
};

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api/wallpapers', wallpaperRoutes);
app.use(errorHandler);

export default app;
