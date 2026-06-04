const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config({
  path: path.join(__dirname, "..", "..", ".env"),
  override: true,
});

const EnvSchema = z.object({
  NODE_ENV: z.string().optional().default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  SUPERADMIN_EMAIL: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email()),
  SUPERADMIN_PASSWORD: z.string().trim().min(10),
  SUPERADMIN_NAME: z.string().trim().min(1).optional().default("Super Admin"),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ENDPOINT: z.string().url().optional(),
  R2_ACCESS_KEY: z.string().optional(),
  R2_SECRET_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),
  NEWS_API_KEY: z.string().optional(),
  INSTAGRAM_ACCESS_TOKEN: z.string().optional(),
  INSTAGRAM_USER_ID: z.string().optional(),
  INSTAGRAM_APP_ID: z.string().optional(),
});

function loadEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("[env] invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

const env = loadEnv();

module.exports = { env };
