import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().default("/api/v1"),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("*"),
  UPLOAD_BASE_URL: z.string().url(),
  LOCAL_UPLOAD_DIR: z.string().default("uploads"),
  STORAGE_PROVIDER: z.enum(["local", "cloudinary"]).default("local"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}

if (
  parsed.data.STORAGE_PROVIDER === "cloudinary" &&
  (!parsed.data.CLOUDINARY_CLOUD_NAME || !parsed.data.CLOUDINARY_API_KEY || !parsed.data.CLOUDINARY_API_SECRET)
) {
  throw new Error("Invalid environment: Cloudinary storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
}

export const env = parsed.data;
