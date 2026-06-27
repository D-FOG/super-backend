import { z } from "zod";
import { requireAdmin } from "../../middlewares/auth";
import { crudRouter } from "../../utils/crudRouter";
import { objectIdSchema } from "../../utils/schema";
import { CertificationLevel } from "./certificationLevel.model";

const body = z.object({
  name: z.string().min(2),
  order: z.coerce.number().int().positive(),
  requirements: z.array(z.unknown()).default([])
});

export default crudRouter({
  model: CertificationLevel,
  name: "Certification levels",
  createSchema: z.object({ body }),
  updateSchema: z.object({ params: z.object({ id: objectIdSchema }), body: body.partial() }),
  createAuth: [requireAdmin],
  updateAuth: [requireAdmin],
  deleteAuth: [requireAdmin]
});
