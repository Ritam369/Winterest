import ApiError from '../utils/api-error.js';

const apiKeyMiddleware = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_SECRET_KEY) {
    return next(ApiError.forbidden('Invalid or missing API key'));
  }
  next();
};

export default apiKeyMiddleware;
