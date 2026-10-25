import { Router } from "express";
import mongoose from "mongoose";
import Battle from "../models/Battle.js";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";
import { sensitiveReadRateLimit } from "../middleware/rateLimit.js";
import { findSingleFighterForUser } from "../services/legacyFighter.js";
import serializeBattle from "../utils/serializeBattle.js";

const router = Router();

router.get("/:id", requireAuth, sensitiveReadRateLimit, async (request, response, next) => {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) {
    return next(
      new ApiError(404, "BATTLE_NOT_FOUND", "No se encontró el combate solicitado.")
    );
  }

  try {
    const fighter = await findSingleFighterForUser(
      request.user._id,
      "_id",
      request.user.activeFighterId
    );
    if (!fighter) {
      return next(
        new ApiError(404, "BATTLE_NOT_FOUND", "No se encontró el combate solicitado.")
      );
    }

    const battle = await Battle.findOne({
      _id: request.params.id,
      status: "completed",
      "participants.snapshot.fighterId": fighter._id
    }).lean();
    if (!battle) {
      return next(
        new ApiError(404, "BATTLE_NOT_FOUND", "No se encontró el combate solicitado.")
      );
    }

    return response.status(200).json({ battle: serializeBattle(battle, true) });
  } catch (error) {
    return next(error);
  }
});

export default router;
