const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const R2_BUCKET = process.env.R2_BUCKET || "tieuluan";
const ALLOWED_FOLDERS = new Set(["movies", "combos"]);

const normalizeFolder = (folder) =>
  ALLOWED_FOLDERS.has(folder) ? folder : "movies";

const normalizeObjectKey = (key) => {
  const normalized = String(key || "").replace(/^\/+/, "");
  if (!/^(movies|combos)\/[a-zA-Z0-9._-]+$/.test(normalized)) {
    const error = new Error("Đường dẫn ảnh không hợp lệ");
    error.code = "INVALID_MEDIA_KEY";
    throw error;
  }
  return normalized;
};

// Tải ảnh vào bucket riêng tư và trả đường dẫn qua backend.
const uploadToR2 = async ({ buffer, fileName, mimeType, folder = "movies" }) => {
  const Key = `${normalizeFolder(folder)}/${fileName}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return { key: Key, url: `/media/${Key}` };
};

const getFromR2 = async (key) =>
  s3Client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: normalizeObjectKey(key),
    })
  );

const deleteFromR2 = async (keyOrUrl) => {
  const key = normalizeObjectKey(String(keyOrUrl || "").replace(/^.*\/media\//, ""));
  await s3Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  return true;
};

// Tạo tên file duy nhất nhưng vẫn giữ phần mở rộng gốc.
const generateFileName = (originalName) => {
  const ext = originalName.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
};

module.exports = { getFromR2, uploadToR2, deleteFromR2, generateFileName };
