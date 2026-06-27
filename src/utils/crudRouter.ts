import { Router, type RequestHandler } from "express";
import type { AnyZodObject } from "zod";
import type { Model } from "mongoose";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { sendSuccess } from "./apiResponse";
import { ApiError } from "./apiError";
import { asyncHandler } from "./asyncHandler";
import { paginate } from "./pagination";
import { idParamsSchema } from "./schema";

interface CrudOptions<T> {
  model: Model<T>;
  name: string;
  createSchema: AnyZodObject;
  updateSchema: AnyZodObject;
  createAuth?: RequestHandler[];
  updateAuth?: RequestHandler[];
  deleteAuth?: RequestHandler[];
  listAuth?: RequestHandler[];
  detailAuth?: RequestHandler[];
  beforeCreate?: (body: Record<string, unknown>, req: Parameters<RequestHandler>[0]) => Record<string, unknown>;
  filter?: (req: Parameters<RequestHandler>[0]) => Record<string, unknown>;
  populate?: string[];
}

export function crudRouter<T>(options: CrudOptions<T>) {
  const router = Router();
  router.use(requireAuth);

  router.get(
    "/",
    ...(options.listAuth ?? []),
    asyncHandler(async (req, res) => {
      const { items, meta } = await paginate(options.model, options.filter?.(req) ?? {}, req, options.populate ?? []);
      sendSuccess(res, `${options.name} loaded.`, { data: items, meta });
    })
  );

  router.post(
    "/",
    ...(options.createAuth ?? []),
    validate(options.createSchema),
    asyncHandler(async (req, res) => {
      const body = options.beforeCreate ? options.beforeCreate(req.body, req) : req.body;
      const item = await options.model.create(body);
      sendSuccess(res, `${options.name} created.`, item, 201);
    })
  );

  router.get(
    "/:id",
    ...(options.detailAuth ?? []),
    validate(idParamsSchema),
    asyncHandler(async (req, res) => {
      const item = await options.model.findById(req.params.id).populate(options.populate ?? []).lean();
      if (!item) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
      sendSuccess(res, `${options.name} loaded.`, item);
    })
  );

  router.patch(
    "/:id",
    ...(options.updateAuth ?? []),
    validate(options.updateSchema),
    asyncHandler(async (req, res) => {
      const item = await options.model.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!item) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
      sendSuccess(res, `${options.name} updated.`, item);
    })
  );

  router.delete(
    "/:id",
    ...(options.deleteAuth ?? []),
    validate(idParamsSchema),
    asyncHandler(async (req, res) => {
      const item = await options.model.findByIdAndDelete(req.params.id);
      if (!item) throw new ApiError(404, "Resource not found.", "NOT_FOUND");
      sendSuccess(res, `${options.name} deleted.`);
    })
  );

  return router;
}
