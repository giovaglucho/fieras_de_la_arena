import { Router } from "express";
import Fighter from "../models/Fighter.js";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();

router.get("/me", requireAuth, async (request, response, next) => {
  try {
    const fighter = await Fighter.findOne({ userId: request.user._id })
      .select("referralCode");

    if (!fighter) {
      return next(
        new ApiError(
          404,
          "FIGHTER_NOT_FOUND",
          "Esta cuenta todavía no tiene un luchador."
        )
      );
    }

    return response.status(200).json({ referralCode: fighter.referralCode });
  } catch (error) {
    return next(error);
  }
});

export default router;
