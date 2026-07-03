import { Router } from "express";
import type { Request } from "express";
import { z } from "zod";
import { LEADER_ROLES, ROLES } from "../../constants/roles";
import { requireAdmin, requireAuth, requireRole } from "../../middlewares/auth";
import { upload } from "../../middlewares/upload";
import { validate } from "../../middlewares/validate";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginate } from "../../utils/pagination";
import { objectIdSchema, roleSchema } from "../../utils/schema";
import { storageProvider } from "../../utils/uploadStorage";
import { Resource } from "./resource.model";

const router = Router();
router.use(requireAuth);

const resourceSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    category: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(["Video", "PDF", "MP3", "Image", "video", "pdf", "audio", "image"]),
    fileUrl: z.string().url().optional(),
    visibleTo: z.union([z.array(roleSchema), roleSchema, z.string()]).optional()
  })
});

function normalizeRoles(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "string") return value.includes(",") ? value.split(",").map((item) => item.trim()) : [value];
  return [];
}

function assertFileMatchesResourceType(type: string, file?: Express.Multer.File) {
  if (!file) return;
  const normalizedType = type.toLowerCase();
  const mimeType = file.mimetype.toLowerCase();
  const matches =
    (normalizedType === "pdf" && mimeType === "application/pdf") ||
    (normalizedType === "mp3" && mimeType.startsWith("audio/")) ||
    (normalizedType === "audio" && mimeType.startsWith("audio/")) ||
    (normalizedType === "video" && mimeType.startsWith("video/")) ||
    (normalizedType === "image" && mimeType.startsWith("image/"));

  if (!matches) {
    throw new ApiError(400, "Uploaded file type does not match the selected resource type.", "INVALID_FILE_TYPE");
  }
}

function visibleFilter(req: Request) {
  if (req.user?.roles.includes(ROLES.CLUSTER_SUPERVISOR)) return {};
  return { $or: [{ visibleTo: { $size: 0 } }, { visibleTo: { $in: req.user?.roles ?? [] } }] };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { items, meta } = await paginate(Resource, visibleFilter(req), req, ["uploadedBy"]);
    sendSuccess(res, "Resources loaded.", { data: items, meta });
  })
);

router.post(
  "/",
  requireRole(...LEADER_ROLES),
  upload.single("file"),
  validate(resourceSchema),
  asyncHandler(async (req, res) => {
    assertFileMatchesResourceType(req.body.type, req.file);
    const fileUrl = req.file ? await storageProvider.uploadFile(req.file, "resources") : req.body.fileUrl;
    if (!fileUrl) throw new ApiError(400, "A file or fileUrl is required.", "VALIDATION_ERROR");
    const resource = await Resource.create({
      ...req.body,
      visibleTo: normalizeRoles(req.body.visibleTo),
      fileUrl,
      uploadedBy: req.user?.id
    });
    sendSuccess(res, "Resource created.", resource, 201);
  })
);

router.get(
  "/:id",
  validate(z.object({ params: z.object({ id: objectIdSchema }) })),
  asyncHandler(async (req, res) => {
    const resource = await Resource.findOne({ _id: req.params.id, ...visibleFilter(req) }).lean();
    if (!resource) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
    sendSuccess(res, "Resource loaded.", resource);
  })
);

router.get(
  "/:id/download",
  validate(z.object({ params: z.object({ id: objectIdSchema }) })),
  asyncHandler(async (req, res) => {
    const resource = await Resource.findOne({ _id: req.params.id, ...visibleFilter(req) }).lean();
    if (!resource) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
    sendSuccess(res, "Resource download URL generated.", { downloadUrl: resource.fileUrl });
  })
);

router.patch(
  "/:id",
  requireRole(...LEADER_ROLES),
  upload.single("file"),
  validate(z.object({ params: z.object({ id: objectIdSchema }), body: resourceSchema.shape.body.partial() })),
  asyncHandler(async (req, res) => {
    if (req.body.type) assertFileMatchesResourceType(req.body.type, req.file);
    const fileUrl = req.file ? await storageProvider.uploadFile(req.file, "resources") : req.body.fileUrl;
    const update = { ...req.body, ...(fileUrl ? { fileUrl } : {}), ...(req.body.visibleTo ? { visibleTo: normalizeRoles(req.body.visibleTo) } : {}) };
    const resource = await Resource.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!resource) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
    sendSuccess(res, "Resource updated.", resource);
  })
);

router.delete(
  "/:id",
  requireAdmin,
  validate(z.object({ params: z.object({ id: objectIdSchema }) })),
  asyncHandler(async (req, res) => {
    const resource = await Resource.findByIdAndDelete(req.params.id);
    if (!resource) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
    sendSuccess(res, "Resource deleted.");
  })
);

export default router;
