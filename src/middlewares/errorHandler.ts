import type { ErrorRequestHandler, RequestHandler } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { env } from "../config/env";
import { ApiError } from "../utils/apiError";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} was not found.`, "NOT_FOUND"));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode = 500;
  let code = "INTERNAL_SERVER_ERROR";
  let message = "Something went wrong.";
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Request validation failed.";
    details = err.flatten().fieldErrors;
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Invalid identifier supplied.";
  } else if (typeof err === "object" && err !== null && "code" in err && err.code === 11000) {
    statusCode = 409;
    code = "CONFLICT";
    message = "Email is already registered.";
  } else if (err instanceof TokenExpiredError || err instanceof JsonWebTokenError) {
    statusCode = 401;
    code = "UNAUTHORIZED";
    message = "Authentication is invalid or expired.";
  } else if (err instanceof Error) {
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(env.NODE_ENV === "development" && err instanceof Error ? { stack: err.stack } : {})
    }
  });
};
