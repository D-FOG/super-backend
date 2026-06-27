import { Router } from "express";
import { ROLE_VALUES } from "../../constants/roles";
import { requireAdmin, requireAuth } from "../../middlewares/auth";
import { sendSuccess } from "../../utils/apiResponse";

const router = Router();

router.get("/", requireAuth, requireAdmin, (_req, res) => {
  sendSuccess(res, "Roles loaded.", { roles: ROLE_VALUES });
});

export default router;
