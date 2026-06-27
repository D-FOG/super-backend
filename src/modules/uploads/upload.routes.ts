import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/auth";
import { upload } from "../../middlewares/upload";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { storageProvider } from "../../utils/uploadStorage";

const router = Router();
router.use(requireAuth, requireAdmin);

router.post("/", upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "A file is required.", "VALIDATION_ERROR");
  const folder = typeof req.body.folder === "string" ? req.body.folder : "uploads";
  const fileUrl = await storageProvider.uploadFile(req.file, folder);
  sendSuccess(res, "File uploaded.", { fileUrl }, 201);
}));

export default router;
