import multer from "multer";
import { ApiError } from "../utils/apiError";

const allowedMimeTypes = new Set([
  "application/pdf",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/webm",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 200
  },
  fileFilter: (_req, file, callback) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new ApiError(400, "Only PDF, video, audio, and image files are allowed.", "INVALID_FILE_TYPE"));
  }
});
