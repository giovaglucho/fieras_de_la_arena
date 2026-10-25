import { Router } from "express";
import Fighter from "../models/Fighter.js";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";
import { sensitiveReadRateLimit } from "../middleware/rateLimit.js";
import User from "../models/User.js";
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

    const students = await User.find({ referredByUserId: request.user._id })
      .select("_id username activeFighterId")
      .sort({ createdAt: 1 })
      .lean();
    const studentFighters = await Fighter.find({
      userId: { $in: students.map((student) => student._id) }
    })
      .select("_id userId name level")
      .lean();
    const fightersByUserId = new Map();
    for (const studentFighter of studentFighters) {
      const userId = studentFighter.userId.toString();
      const ownedFighters = fightersByUserId.get(userId) ?? [];
      ownedFighters.push(studentFighter);
      fightersByUserId.set(userId, ownedFighters);
    }

    return response.status(200).json({
      referralCode: fighter.referralCode,
      students: students.map((student) => {
        const studentFightersForUser =
          fightersByUserId.get(student._id.toString()) ?? [];
        const selectedFighter = student.activeFighterId
          ? studentFightersForUser.find(({ _id }) =>
              _id.equals(student.activeFighterId)
            )
          : studentFightersForUser.length === 1
            ? studentFightersForUser[0]
            : null;

        return {
          username: student.username,
          fighter: selectedFighter
            ? { name: selectedFighter.name, level: selectedFighter.level }
            : null
        };
      })
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
