import { z } from "zod";
import { objectIdSchema, rolesArraySchema } from "../../utils/schema";

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8).default("ChangeMe123!"),
    phone: z.string().optional(),
    profession: z.string().optional(),
    location: z.string().optional(),
    clusterCenterId: objectIdSchema.optional()
  })
});

export const updateUserSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    profession: z.string().optional(),
    location: z.string().optional(),
    clusterCenterId: objectIdSchema.optional(),
    trainingLevel: z.string().optional(),
    certificationLevel: z.string().optional()
  })
});

export const replaceRolesSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({ roles: rolesArraySchema })
});

export const completeCertificationSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({ certificationLevel: z.string().min(1) })
});
