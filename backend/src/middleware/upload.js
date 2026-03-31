const multer = require('multer');
const { ApiError } = require('../utils/apiError');

const AVATAR_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const RESOURCE_ALLOWED_TYPES = new Set([
  ...AVATAR_ALLOWED_TYPES,
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!AVATAR_ALLOWED_TYPES.has(file.mimetype)) {
      cb(new ApiError(400, 'Avatar file type not supported. Use JPG, PNG, or WEBP.'));
      return;
    }
    cb(null, true);
  },
});

const resourceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!RESOURCE_ALLOWED_TYPES.has(file.mimetype)) {
      cb(new ApiError(400, 'Resource file type not supported.'));
      return;
    }
    cb(null, true);
  },
});

const withUpload = (middleware) => (req, res, next) => {
  middleware(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof ApiError) {
      next(err);
      return;
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(new ApiError(400, 'Uploaded file exceeds size limit.'));
        return;
      }
      next(new ApiError(400, err.message));
      return;
    }

    next(new ApiError(400, 'Failed to process file upload.'));
  });
};

module.exports = {
  uploadAvatar: withUpload(avatarUpload.single('file')),
  uploadResourceFile: withUpload(resourceUpload.single('file')),
};
