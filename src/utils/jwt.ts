import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { RoleName } from "../constants/roles";

export interface JwtPayload {
  sub: string;
  email: string;
  roles: RoleName[];
  clusterCenterId?: string;
}

export function signAccessToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]> };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(payload: Pick<JwtPayload, "sub" | "email">): string {
  const options: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]> };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, "sub" | "email"> {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as Pick<JwtPayload, "sub" | "email">;
}
