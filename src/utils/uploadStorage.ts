import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import type { Express } from "express";
import { env } from "../config/env";

export interface StorageProvider {
  uploadFile(file: Express.Multer.File, folder?: string): Promise<string>;
  createSignedUpload(input: { fileName: string; contentType: string; folder: string }): Promise<{
    uploadUrl: string;
    assetUrl: string;
    expiresAt: Date;
  }>;
}

class LocalStorageProvider implements StorageProvider {
  async uploadFile(file: Express.Multer.File, folder = "resources"): Promise<string> {
    const destination = path.join(process.cwd(), env.LOCAL_UPLOAD_DIR, folder);
    await fs.mkdir(destination, { recursive: true });
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    await fs.writeFile(path.join(destination, safeName), file.buffer);
    return `${env.UPLOAD_BASE_URL}/${folder}/${safeName}`;
  }

  async createSignedUpload(input: { fileName: string; contentType: string; folder: string }) {
    const safeName = `${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const assetUrl = `${env.UPLOAD_BASE_URL}/${input.folder}/${safeName}`;
    return {
      uploadUrl: assetUrl,
      assetUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    };
  }
}

class CloudinaryStorageProvider implements StorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME as string,
      api_key: env.CLOUDINARY_API_KEY as string,
      api_secret: env.CLOUDINARY_API_SECRET as string,
      secure: true
    });
  }

  async uploadFile(file: Express.Multer.File, folder = "resources"): Promise<string> {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "auto",
          public_id: `${Date.now()}-${path.parse(file.originalname).name}`.replace(/[^a-zA-Z0-9._-]/g, "-")
        },
        (error, response) => {
          if (error) return reject(error);
          if (!response) return reject(new Error("Cloudinary upload failed."));
          return resolve(response);
        }
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });

    return result.secure_url;
  }

  async createSignedUpload(input: { fileName: string; contentType: string; folder: string }) {
    const publicId = `${Date.now()}-${path.parse(input.fileName).name}`.replace(/[^a-zA-Z0-9._-]/g, "-");
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { folder: input.folder, public_id: publicId, timestamp },
      env.CLOUDINARY_API_SECRET || ""
    );

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload?api_key=${env.CLOUDINARY_API_KEY}&timestamp=${timestamp}&signature=${signature}&folder=${encodeURIComponent(input.folder)}&public_id=${encodeURIComponent(publicId)}`,
      assetUrl: cloudinary.url(`${input.folder}/${publicId}`, { secure: true, resource_type: "auto" }),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    };
  }
}

export const storageProvider: StorageProvider = env.STORAGE_PROVIDER === "cloudinary"
  ? new CloudinaryStorageProvider()
  : new LocalStorageProvider();
