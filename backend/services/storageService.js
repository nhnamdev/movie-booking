const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

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
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT;

const uploadToR2 = async ({ buffer, fileName, mimeType }) => {
  const Key = `movies/${fileName}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return `${R2_PUBLIC_URL}/${R2_BUCKET}/${Key}`;
};

const generateFileName = (originalName) => {
  const ext = originalName.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
};

module.exports = { uploadToR2, generateFileName };
