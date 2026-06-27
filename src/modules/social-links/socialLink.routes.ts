import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginate } from "../../utils/pagination";
import { objectIdSchema } from "../../utils/schema";
import { SocialLink } from "./socialLink.model";

const router = Router();

const body = z.object({
  platform: z.string().min(2),
  url: z.string().url(),
  isActive: z.coerce.boolean().default(true),
  order: z.coerce.number().int().default(0)
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { items, meta } = await paginate(SocialLink, { isActive: true }, req);
    sendSuccess(res, "Social links loaded.", { data: items, meta });
  })
);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  validate(z.object({ body })),
  asyncHandler(async (req, res) => {
    const link = await SocialLink.create(req.body);
    sendSuccess(res, "Social link created.", link, 201);
  })
);

router.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  validate(z.object({ params: z.object({ id: objectIdSchema }), body: body.partial() })),
  asyncHandler(async (req, res) => {
    const link = await SocialLink.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!link) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
    sendSuccess(res, "Social link updated.", link);
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  validate(z.object({ params: z.object({ id: objectIdSchema }) })),
  asyncHandler(async (req, res) => {
    const link = await SocialLink.findByIdAndDelete(req.params.id);
    if (!link) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
    sendSuccess(res, "Social link deleted.");
  })
);

export default router;
