const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_ROOT = process.env.UPLOAD_DIR || 'uploads';
const MAX_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 5) * 1024 * 1024;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function makeStorage(subfolder) {
  const dest = path.join(UPLOAD_ROOT, subfolder);
  ensureDir(dest);
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      cb(null, uniqueName);
    },
  });
}

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error('Unsupported file type. Only JPEG, PNG, WEBP, and PDF are allowed.'));
  }
  cb(null, true);
}

const uploadProductImage = multer({
  storage: makeStorage('products'),
  limits: { fileSize: MAX_BYTES },
  fileFilter,
});

const uploadReceipt = multer({
  storage: makeStorage('receipts'),
  limits: { fileSize: MAX_BYTES },
  fileFilter,
});

const uploadUserPhoto = multer({
  storage: makeStorage('users'),
  limits: { fileSize: MAX_BYTES },
  fileFilter,
});

module.exports = { uploadProductImage, uploadReceipt, uploadUserPhoto };
