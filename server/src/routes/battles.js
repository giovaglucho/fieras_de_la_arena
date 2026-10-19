import { Router } from "express";
import mongoose from "mongoose";
import Battle from "../models/Battle.js";
import Fighter from "../models/Fighter.js";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";
import serializeBattle from "../utils/serializeBattle.js";

const router = Router();

router.get("/:id", requireAuth, async (request, response, next) => {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) {
    return next(
      new ApiError(404, "BATTLE_NOT_FOUND", "No se encontró el combate solicitado.")
    );
  }

  try {
    const fighter = await Fighter.findOne({ userId: request.user._id })
      .select("_id")
      .lean();
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
