const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(String(file.mimetype || "").toLowerCase())) {
      return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "image"));
    }
    return callback(null, true);
  },
}).single("image");

const hasValidSignature = (file) => {
  const bytes = file?.buffer;
  if (!bytes || bytes.length < 12) return false;
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return jpeg || png || webp;
};

module.exports = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ message: "Ảnh phải là JPEG, PNG hoặc WebP và không vượt quá 8 MB" });
    if (!req.file || !hasValidSignature(req.file)) {
      return res.status(400).json({ message: "Nội dung tệp ảnh không hợp lệ" });
    }
    return next();
  });
};
