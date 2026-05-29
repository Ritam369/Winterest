import ApiError from '../utils/api-error.js';

const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return next(ApiError.badRequest('File size exceeds the 10MB limit. Please upload a smaller image or compress the current one!'));
  }

  console.error(err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
};

export default errorHandler;
