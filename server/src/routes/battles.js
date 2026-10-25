import { Router } from "express";
import mongoose from "mongoose";
import Battle from "../models/Battle.js";
import Fighter from "../models/Fighter.js";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";
import { sensitiveReadRateLimit } from "../middleware/rateLimit.js";
import serializeBattle from "../utils/serializeBattle.js";

const router = Router();

router.get("/:id", requireAuth, sensitiveReadRateLimit, async (request, response, next) => {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) {
    return next(
      new ApiError(404, "BATTLE_NOT_FOUND", "No se encontró el combate solicitado.")
    );
  }

  try {
    const ownedFighters = await Fighter.find({ userId: request.user._id })
      .select("_id")
      .lean();
    const ownedFighterIds = ownedFighters.map(({ _id }) => _id);
    if (ownedFighterIds.length === 0) {
      return next(
        new ApiError(404, "BATTLE_NOT_FOUND", "No se encontró el combate solicitado.")
      );
    }

    const battle = await Battle.findOne({
      _id: request.params.id,
      status: "completed",
      "participants.snapshot.fighterId": { $in: ownedFighterIds }
    }).lean();
    if (!battle) {
      return next(
        new ApiError(404, "BATTLE_NOT_FOUND", "No se encontró el combate solicitado.")
      );
    }

    const ownedFighterIdSet = new Set(
      ownedFighterIds.map((fighterId) => fighterId.toString())
    );
    const ownFighterId = battle.participants
      .map(({ snapshot }) => snapshot.fighterId.toString())
      .find((fighterId) => ownedFighterIdSet.has(fighterId));
    const serializedBattle = serializeBattle(battle, true);
    serializedBattle.ownFighterId = ownFighterId;

    return response.status(200).json({ battle: serializedBattle });
  } catch (error) {
    return next(error);
  }
});

export default router;
