import { z } from "zod";
import { LEADER_ROLES } from "../../constants/roles";
import { requireAdmin, requireRole } from "../../middlewares/auth";
import { crudRouter } from "../../utils/crudRouter";
import { objectIdSchema } from "../../utils/schema";
import { ClusterCenter } from "./clusterCenter.model";

const body = z.object({
  name: z.string().min(2),
  address: z.string().min(2),
  state: z.string().optional(),
  country: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  leaderContact: z.string().optional(),
  meetingSchedule: z.string().optional(),
  timeRange: z.string().optional()
});

const mapCenterBody = (input: Record<string, unknown>) => ({
  name: input.name,
  address: input.address,
  state: input.state,
  country: input.country,
  leaderContact: input.leaderContact,
  meetingSchedule: input.meetingSchedule,
  timeRange: input.timeRange,
  coordinates: {
    latitude: input.latitude,
    longitude: input.longitude
  }
});

export default crudRouter({
  model: ClusterCenter,
  name: "Cluster centers",
  createSchema: z.object({ body }),
  updateSchema: z.object({ params: z.object({ id: objectIdSchema }), body: body.partial() }),
  createAuth: [requireRole(...LEADER_ROLES)],
  updateAuth: [requireRole(...LEADER_ROLES)],
  deleteAuth: [requireAdmin],
  beforeCreate: mapCenterBody
});
