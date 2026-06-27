import { z } from "zod";
import { ROLE_VALUES } from "../constants/roles";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid MongoDB object id.");
export const roleSchema = z.enum(ROLE_VALUES);
export const rolesArraySchema = z.array(roleSchema).min(1);
export const optionalDateSchema = z.coerce.date().optional();

export const idParamsSchema = z.object({
  params: z.object({ id: objectIdSchema })
});

export const emptySchema = z.object({
  body: z.unknown().optional(),
  query: z.unknown().optional(),
  params: z.unknown().optional()
});

export const paginationQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      search: z.string().optional(),
      sort: z.string().optional(),
      order: z.enum(["asc", "desc"]).optional()
    })
    .passthrough()
    .optional()
});
