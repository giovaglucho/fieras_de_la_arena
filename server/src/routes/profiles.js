import { Router } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import { findSingleFighterForUser } from "../services/legacyFighter.js";
import { toPublicFighter } from "../serializers/publicFighter.js";

const router = Router();

router.get("/:username", async (request, response, next) => {
  const username = request.params.username.trim().toLowerCase();

  try {
    const user = await User.findOne({ username })
      .select("_id username activeFighterId");

    if (!user) {
      return next(
        new ApiError(404, "PROFILE_NOT_FOUND", "No se encontró el perfil del luchador.")
      );
    }

    const fighter = await findSingleFighterForUser(
      user._id,
      "_id name level xp elo baseStats wins losses draws",
      user.activeFighterId
    );

    if (!fighter) {
      return next(
        new ApiError(404, "PROFILE_NOT_FOUND", "No se encontró el perfil del luchador.")
      );
    }

    return response.status(200).json({
      fighter: {
        ...toPublicFighter(fighter),
        username: user.username
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
