import multer from 'multer';
import ApiError from '../utils/api-error.js';

const errorHandler = (err, req, res, next) => {

  console.error("Error caught in middleware:", err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const multerErr = ApiError.badRequest('File size exceeds the 10MB limit. Please upload a smaller image or compress the current one!');
      return res.status(multerErr.statusCode).json({ success: false, message: multerErr.message });
    }
    // Handle other Multer errors (e.g., LIMIT_UNEXPECTED_FILE if the field name is wrong)
    const badReq = ApiError.badRequest(err.message);
    return res.status(badReq.statusCode).json({ success: false, message: badReq.message });
  }

  // 4. Handle Express Payload Too Large or Aborted Requests
  if (err.type === 'entity.too.large' || err.code === 'ECONNABORTED') {
      const payloadErr = ApiError.badRequest('The upload was aborted or the payload is too large.');
      return res.status(payloadErr.statusCode).json({ success: false, message: payloadErr.message });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
};

export default errorHandler;
