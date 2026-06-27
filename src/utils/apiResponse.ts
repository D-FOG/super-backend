import type { Response } from "express";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: unknown;
}

export function sendSuccess<T>(res: Response, message: string, data?: T, statusCode = 200): Response<ApiResponse<T>> {
  return res.status(statusCode).json({ success: true, message, data });
}
