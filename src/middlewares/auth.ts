import type { NextFunction, Request, Response } from "express";
import { ROLE_VALUES, ROLES, type RoleName } from "../constants/roles";
import { User } from "../modules/users/user.model";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyAccessToken } from "../utils/jwt";

function hasRole(userRoles: RoleName[], roles: RoleName[]): boolean {
  return userRoles.some((role) => roles.includes(role));
}

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Authentication is required.", "UNAUTHORIZED");
  }

  const payload = verifyAccessToken(header.slice(7));
  const user = await User.findById(payload.sub).select("_id email roles clusterCenterId").lean();
  if (!user) {
    throw new ApiError(401, "Authentication is required.", "UNAUTHORIZED");
  }

  req.user = {
    id: user._id.toString(),
    email: user.email,
    roles: user.roles,
    ...(user.clusterCenterId ? { clusterCenterId: user.clusterCenterId.toString() } : {})
  };
  next();
});

export function requireRole(...roles: RoleName[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication is required.", "UNAUTHORIZED"));
    }
    if (!hasRole(req.user.roles, roles)) {
      return next(new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN"));
    }
    return next();
  };
}

export const requireAdmin = requireRole(ROLES.CLUSTER_SUPERVISOR);

export function assertValidRoles(roles: string[]): asserts roles is RoleName[] {
  const invalid = roles.filter((role) => !ROLE_VALUES.includes(role as RoleName));
  if (invalid.length > 0) {
    throw new ApiError(400, "Request validation failed.", "VALIDATION_ERROR", { roles: ["Invalid role supplied."] });
  }
}
