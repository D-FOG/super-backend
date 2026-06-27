import type { Request } from "express";
import type { FilterQuery, Model } from "mongoose";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function getPagination(req: Request): { page: number; limit: number; skip: number } {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

export async function paginate<T>(
  model: Model<T>,
  filter: FilterQuery<T>,
  req: Request,
  populate: string[] = []
): Promise<{ items: T[]; meta: PaginationMeta }> {
  const { page, limit, skip } = getPagination(req);
  const order = req.query.order === "asc" ? 1 : -1;
  const sortField = typeof req.query.sort === "string" ? req.query.sort : "createdAt";
  let query = model.find(filter).sort({ [sortField]: order }).skip(skip).limit(limit);
  populate.forEach((path) => {
    query = query.populate(path);
  });
  const [items, total] = await Promise.all([query.exec(), model.countDocuments(filter)]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}
