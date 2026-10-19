import { Router } from "express";
import Fighter from "../models/Fighter.js";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";
import { sensitiveReadRateLimit } from "../middleware/rateLimit.js";
import User from "../models/User.js";

const router = Router();

router.get("/me", requireAuth, sensitiveReadRateLimit, async (request, response, next) => {
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

    const students = await User.find({ referredByUserId: request.user._id })
      .select("_id username")
      .sort({ createdAt: 1 })
      .lean();
    const studentFighters = await Fighter.find({
      userId: { $in: students.map((student) => student._id) }
    })
      .select("userId name level")
      .lean();
    const fightersByUserId = new Map(
      studentFighters.map((studentFighter) => [
        studentFighter.userId.toString(),
        { name: studentFighter.name, level: studentFighter.level }
      ])
    );

    return response.status(200).json({
      referralCode: fighter.referralCode,
      students: students.map((student) => ({
        username: student.username,
        fighter: fightersByUserId.get(student._id.toString()) ?? null
      }))
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
