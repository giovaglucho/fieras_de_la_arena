import { Router } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";
import { sensitiveReadRateLimit } from "../middleware/rateLimit.js";
import { listStudentsForAccount } from "../services/referralService.js";
import { findSingleFighterForUser } from "../services/legacyFighter.js";

const router = Router();

router.get("/me", requireAuth, sensitiveReadRateLimit, async (request, response, next) => {
  try {
    const fighter = await findSingleFighterForUser(
      request.user._id,
      "referralCode",
      request.user.activeFighterId
    );

    if (!fighter) {
      return next(
        new ApiError(
          404,
          "FIGHTER_NOT_FOUND",
          "Esta cuenta todavía no tiene un luchador."
        )
      );
    }

    return response.status(200).json({
      referralCode: fighter.referralCode,
      students: await listStudentsForAccount(request.user._id)
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
