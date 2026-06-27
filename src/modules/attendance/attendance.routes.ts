import { Router } from "express";
import { z } from "zod";
import { LEADER_ROLES } from "../../constants/roles";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginate } from "../../utils/pagination";
import { combineDateAndTime, isWithinWindow } from "../../utils/time";
import { objectIdSchema } from "../../utils/schema";
import { Meeting } from "../meetings/meeting.model";
import { Attendance } from "./attendance.model";

const router = Router();
router.use(requireAuth);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const { items, meta } = await paginate(Attendance, { userId: req.user?.id }, req, ["meetingId"]);
    sendSuccess(res, "Attendance history loaded.", { data: items, meta });
  })
);

router.get(
  "/",
  requireRole(...LEADER_ROLES),
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = {};
    if (req.query.meetingId) filter.meetingId = req.query.meetingId;
    const { items, meta } = await paginate(Attendance, filter, req, ["userId", "meetingId"]);
    sendSuccess(res, "Attendance loaded.", { data: items, meta });
  })
);

router.post(
  "/check-in",
  validate(z.object({ body: z.object({ meetingId: objectIdSchema }) })),
  asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.body.meetingId).lean();
    if (!meeting) throw new ApiError(404, "Meeting not found.", "MEETING_NOT_FOUND");
    const start = combineDateAndTime(new Date(meeting.date), meeting.startTime);
    if (!isWithinWindow(start, meeting.checkInWindowMinutes ?? 30)) {
      throw new ApiError(400, "Check-in is not open for this meeting.", "CHECK_IN_NOT_OPEN");
    }
    const exists = await Attendance.exists({ userId: req.user?.id, meetingId: req.body.meetingId });
    if (exists) throw new ApiError(409, "You have already checked in.", "ALREADY_CHECKED_IN");
    const now = new Date();
    const attendance = await Attendance.create({ userId: req.user?.id, meetingId: req.body.meetingId, checkInTime: now, date: now });
    sendSuccess(res, "Check-in successful.", attendance, 201);
  })
);

export default router;
