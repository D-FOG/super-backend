import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject, ZodError } from "zod";
import { ApiError } from "../utils/apiError";

function formatZod(error: ZodError) {
  return error.flatten().fieldErrors;
}

export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!result.success) {
      return next(new ApiError(400, "Request validation failed.", "VALIDATION_ERROR", formatZod(result.error)));
    }
    req.body = result.data.body ?? req.body;
    req.query = result.data.query ?? req.query;
    req.params = result.data.params ?? req.params;
    return next();
  };
}
