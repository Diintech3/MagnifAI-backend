const { randomUUID } = require("crypto");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { env } = require("../config/env");

function isR2Configured() {
  return Boolean(env.R2_ENDPOINT && env.R2_ACCESS_KEY && env.R2_SECRET_KEY && env.R2_BUCKET);
}

function getR2Client() {
  if (!isR2Configured()) {
    throw new Error("R2_NOT_CONFIGURED");
  }
  return new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY,
      secretAccessKey: env.R2_SECRET_KEY,
    },
  });
}

function buildPublicUrl(key) {
  if (env.R2_PUBLIC_BASE_URL) {
    return `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  }
  // Use query param route — confirmed working with Express 5
  return `/api/public/logo?key=${encodeURIComponent(key)}`;
}

async function uploadToR2(file, folder = "apps/logos") {
  const client = getR2Client();
  const ext = file.originalname?.split(".").pop()?.toLowerCase() || "bin";
  const key = `${folder.replace(/\/$/, "")}/${randomUUID()}.${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  return { key, url: buildPublicUrl(key) };
}

async function getObjectFromR2(key) {
  const client = getR2Client();
  const result = await client.send(
    new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
    }),
  );
  return result;
}

module.exports = { isR2Configured, uploadToR2, getObjectFromR2, buildPublicUrl };
