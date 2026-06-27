import { Router } from "express";
import { ROLES } from "../../constants/roles";
import { requireAdmin, requireAuth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginate } from "../../utils/pagination";
import { idParamsSchema } from "../../utils/schema";
import { User } from "./user.model";
import { completeCertificationSchema, createUserSchema, replaceRolesSchema, updateUserSchema } from "./user.validation";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const filter = search ? { $or: [{ name: new RegExp(search, "i") }, { email: new RegExp(search, "i") }] } : {};
    const { items, meta } = await paginate(User, filter, req, ["clusterCenterId"]);
    sendSuccess(res, "Users loaded.", { data: items, meta });
  })
);

router.post(
  "/",
  requireAdmin,
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const exists = await User.exists({ email: req.body.email });
    if (exists) throw new ApiError(409, "Email is already registered.", "CONFLICT");
    const user = await User.create(req.body);
    sendSuccess(res, "User created.", { user }, 201);
  })
);

router.get(
  "/:id",
  validate(idParamsSchema),
  asyncHandler(async (req, res) => {
    if (req.params.id !== req.user?.id && !req.user?.roles.includes(ROLES.CLUSTER_SUPERVISOR)) {
      throw new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN");
    }
    const user = await User.findById(req.params.id).populate("clusterCenterId").lean();
    if (!user) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
    sendSuccess(res, "User loaded.", { user });
  })
);

router.patch(
  "/:id",
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const isAdmin = req.user?.roles.includes(ROLES.CLUSTER_SUPERVISOR);
    if (req.params.id !== req.user?.id && !isAdmin) {
      throw new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN");
    }
    const limitedBody = isAdmin ? req.body : (({ name, phone, profession, location }) => ({ name, phone, profession, location }))(req.body);
    const user = await User.findByIdAndUpdate(req.params.id, limitedBody, { new: true });
    if (!user) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
    sendSuccess(res, "User updated.", { user });
  })
);

router.delete(
  "/:id",
  requireAdmin,
  validate(idParamsSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
    sendSuccess(res, "User deleted.");
  })
);

router.patch(
  "/:id/roles",
  requireAdmin,
  validate(replaceRolesSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { roles: req.body.roles }, { new: true });
    if (!user) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
    sendSuccess(res, "User roles updated.", { user });
  })
);

router.post(
  "/:id/certifications",
  requireAdmin,
  validate(completeCertificationSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { certificationLevel: req.body.certificationLevel }, { new: true });
    if (!user) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
    sendSuccess(res, "Certification marked complete.", { user });
  })
);

export default router;
