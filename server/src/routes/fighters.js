import { randomBytes } from "node:crypto";
import { Router } from "express";
import Fighter from "../models/Fighter.js";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";
import { validateFighterCreation } from "../validators/fighterCreation.js";

const router = Router();

function toPublicFighter(fighter) {
  return {
    id: fighter._id.toString(),
    name: fighter.name,
    level: fighter.level,
    xp: fighter.xp,
    elo: fighter.elo,
    baseStats: fighter.baseStats.toObject(),
    wins: fighter.wins,
    losses: fighter.losses,
    draws: fighter.draws
  };
}

router.get("/me", requireAuth, async (request, response, next) => {
  try {
    const fighter = await Fighter.findOne({ userId: request.user._id })
      .select("_id name")
      .lean();

    return response.status(200).json({
      fighter: fighter
        ? { id: fighter._id.toString(), name: fighter.name }
        : null
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, async (request, response, next) => {
  const fighterData = validateFighterCreation(request.body);

  if (!fighterData) {
    return next(
      new ApiError(
        400,
        "INVALID_FIGHTER_DATA",
        "Envía únicamente un nombre de luchador de entre 3 y 18 caracteres."
      )
    );
  }

  try {
    const fighter = await Fighter.create({
      userId: request.user._id,
      name: fighterData.name,
      referralCode: randomBytes(16).toString("hex")
    });

    return response.status(201).json({ fighter: toPublicFighter(fighter) });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateFields = error.keyPattern ?? error.keyValue ?? {};

      if (Object.hasOwn(duplicateFields, "userId")) {
        return next(
          new ApiError(
            409,
            "FIGHTER_ALREADY_EXISTS",
            "Esta cuenta ya tiene un luchador."
          )
        );
      }

      if (Object.hasOwn(duplicateFields, "name")) {
        return next(
          new ApiError(
            409,
            "FIGHTER_NAME_TAKEN",
            "El nombre del luchador no está disponible."
          )
        );
      }
    }

    return next(error);
  }
});

export default router;
