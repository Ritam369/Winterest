import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import wallpaperRoutes from '../server/src/modules/routes/wallpaper.routes.js';
import errorHandler from '../server/src/common/middleware/errorHandler.js';

const app = express();

// On Vercel, frontend and backend share the same domain so CORS can be
// same-origin. CLIENT_URL env var is still supported for local dev.
app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  })
);

app.use(express.json());

// Reuse a single Mongoose connection across warm invocations
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
