import { Router } from "express";
import Fighter from "../models/Fighter.js";
import { ApiError } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import { toPublicFighter } from "../serializers/publicFighter.js";
import { validateLeaderboardQuery } from "../validators/leaderboards.js";

const router = Router();

router.get("/", async (request, response, next) => {
  const query = validateLeaderboardQuery(request.query);
  if (!query) {
    return next(
      new ApiError(
        400,
        "INVALID_LEADERBOARD_QUERY",
        "Los parámetros de clasificación no son válidos."
      )
    );
  }

  const sort = query.category === "elo"
    ? { elo: -1, _id: 1 }
    : { level: -1, _id: 1 };

  try {
    const [fighters, totalItems] = await Promise.all([
      Fighter.find({})
        .select("_id userId name level xp elo baseStats wins losses draws")
        .sort(sort)
        .skip(query.skip)
        .limit(query.limit),
      Fighter.countDocuments({})
    ]);
    const users = await User.find({
      _id: { $in: fighters.map((fighter) => fighter.userId) }
    })
      .select("_id username")
      .lean();
    const usernamesById = new Map(
      users.map((user) => [user._id.toString(), user.username])
    );

    return response.status(200).json({
      fighters: fighters.map((fighter) => ({
        ...toPublicFighter(fighter),
        username: usernamesById.get(fighter.userId.toString())
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / query.limit)
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
