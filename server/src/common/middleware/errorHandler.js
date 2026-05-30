import ApiError from '../utils/api-error.js';

const errorHandler = (err, req, res, next) => {
  console.error('Error caught in middleware:', err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  res.status(500).json({ success: false, message: 'Internal Server Error' });
};

export default errorHandler;
