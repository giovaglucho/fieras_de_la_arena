import { randomBytes } from "node:crypto";
import { Router } from "express";
import mongoose from "mongoose";
import Fighter from "../models/Fighter.js";
import User from "../models/User.js";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";
import { calculateFighterStats } from "../game-engine/fighterStats.js";
import { getXpRequiredForNextLevel } from "../game-engine/progression.js";
import { toPublicFighter } from "../serializers/publicFighter.js";
import { validateFighterCreation } from "../validators/fighterCreation.js";

const router = Router();

router.get("/me", requireAuth, async (request, response, next) => {
  try {
    const fighter = await Fighter.findOne({ userId: request.user._id })
      .select("_id name level xp elo baseStats wins losses draws");

    return response.status(200).json({
      fighter: fighter
        ? {
            ...toPublicFighter(fighter),
            username: request.user.username,
            stats: calculateFighterStats(fighter.level, fighter.baseStats),
            xpToNextLevel: getXpRequiredForNextLevel(fighter.level)
          }
        : null
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (request, response, next) => {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) {
    return next(
      new ApiError(404, "PROFILE_NOT_FOUND", "No se encontró el perfil del luchador.")
    );
  }

  try {
    const fighter = await Fighter.findById(request.params.id)
      .select("_id userId name level xp elo baseStats wins losses draws");

    if (!fighter) {
      return next(
        new ApiError(404, "PROFILE_NOT_FOUND", "No se encontró el perfil del luchador.")
      );
    }

    const user = await User.findById(fighter.userId).select("_id username");

    if (!user) {
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
