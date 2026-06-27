import bcrypt from "bcrypt";
import { Router } from "express";
import { DEFAULT_ROLE, type RoleName } from "../../constants/roles";
import { requireAuth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { User } from "../users/user.model";
import { loginSchema, refreshSchema, registerSchema } from "./auth.validation";

const router = Router();

type AuthUserShape = {
  _id: unknown;
  name: string;
  email: string;
  roles: RoleName[];
  clusterCenterId?: unknown;
};

function authUser(user: AuthUserShape) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    roles: user.roles,
    clusterCenterId: user.clusterCenterId ? String(user.clusterCenterId) : undefined
  };
}

async function issueTokens(user: AuthUserShape) {
  const payload = {
    sub: String(user._id),
    email: user.email,
    roles: user.roles,
    ...(user.clusterCenterId ? { clusterCenterId: String(user.clusterCenterId) } : {})
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ sub: payload.sub, email: payload.email });
  await User.findByIdAndUpdate(user._id, { refreshTokenHash: await bcrypt.hash(refreshToken, 12) });
  return { accessToken, refreshToken };
}

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const exists = await User.exists({ email: req.body.email });
    if (exists) throw new ApiError(409, "Email is already registered.", "CONFLICT");
    const user = await User.create({ ...req.body, roles: [DEFAULT_ROLE] });
    const tokens = await issueTokens(user as AuthUserShape);
    sendSuccess(res, "Registration successful.", { user: authUser(user), ...tokens }, 201);
  })
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select("+password +refreshTokenHash");
    if (!user || !(await user.comparePassword(req.body.password))) {
      throw new ApiError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
    }
    const tokens = await issueTokens(user as AuthUserShape);
    sendSuccess(res, "Login successful.", { user: authUser(user), ...tokens });
  })
);

router.post(
  "/refresh",
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const payload = verifyRefreshToken(req.body.refreshToken);
    const user = await User.findById(payload.sub).select("+refreshTokenHash");
    if (!user?.refreshTokenHash || !(await bcrypt.compare(req.body.refreshToken, user.refreshTokenHash))) {
      throw new ApiError(401, "Refresh token is invalid or expired.", "UNAUTHORIZED");
    }
    const tokens = await issueTokens(user as AuthUserShape);
    sendSuccess(res, "Token refreshed.", { user: authUser(user), ...tokens });
  })
);

router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user?.id, { $unset: { refreshTokenHash: 1 } });
    sendSuccess(res, "Logout successful.");
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?.id).populate("clusterCenterId").lean();
    sendSuccess(res, "Current profile loaded.", { user });
  })
);

export default router;
