import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import connectDB from './common/config/db.js';
import wallpaperRoutes from './modules/routes/wallpaper.routes.js';
import errorHandler from './common/middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

app.use('/api/wallpapers', wallpaperRoutes);
app.use(errorHandler);

await connectDB();

export default app;
