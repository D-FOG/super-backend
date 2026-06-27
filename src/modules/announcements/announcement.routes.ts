import { z } from "zod";
import { requireAdmin } from "../../middlewares/auth";
import { crudRouter } from "../../utils/crudRouter";
import { objectIdSchema, roleSchema } from "../../utils/schema";
import { Announcement } from "./announcement.model";

const body = z.object({
  title: z.string().min(2),
  body: z.string().min(1),
  audienceRoles: z.array(roleSchema).default([]),
  publishAt: z.coerce.date().optional()
});

export default crudRouter({
  model: Announcement,
  name: "Announcements",
  createSchema: z.object({ body }),
  updateSchema: z.object({ params: z.object({ id: objectIdSchema }), body: body.partial() }),
  createAuth: [requireAdmin],
  updateAuth: [requireAdmin],
  deleteAuth: [requireAdmin],
  beforeCreate: (input, req) => ({ ...input, createdBy: req.user?.id }),
  filter: (req) => ({ $or: [{ audienceRoles: { $size: 0 } }, { audienceRoles: { $in: req.user?.roles ?? [] } }] })
});
