import { z } from "zod";
import { requireAdmin } from "../../middlewares/auth";
import { crudRouter } from "../../utils/crudRouter";
import { combineDateAndTime, isWithinWindow } from "../../utils/time";
import { objectIdSchema } from "../../utils/schema";
import { Meeting } from "./meeting.model";

const body = z.object({
  title: z.string().min(2),
  date: z.coerce.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  clusterCenterId: objectIdSchema
});

const router = crudRouter({
  model: Meeting,
  name: "Meetings",
  createSchema: z.object({ body }),
  updateSchema: z.object({ params: z.object({ id: objectIdSchema }), body: body.partial() }),
  createAuth: [requireAdmin],
  updateAuth: [requireAdmin],
  deleteAuth: [requireAdmin],
  populate: ["clusterCenterId"]
});

Meeting.schema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    if (!(ret.date instanceof Date) || typeof ret.startTime !== "string") return ret;
    const start = combineDateAndTime(new Date(ret.date), ret.startTime);
    ret.checkInOpen = isWithinWindow(start, Number(ret.checkInWindowMinutes ?? 30));
    return ret;
  }
});

export default router;
