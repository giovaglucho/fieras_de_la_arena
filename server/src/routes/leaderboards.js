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
    let fighters;
    let totalItems;

    if (query.category === "students") {
      const [leaderboard] = await Fighter.aggregate([
        {
          $lookup: {
            from: User.collection.name,
            let: { fighterUserId: "$userId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$referredByUserId", "$$fighterUserId"] }
                }
              },
              { $count: "total" }
            ],
            as: "studentCounts"
          }
        },
        {
          $addFields: {
            studentsCount: {
              $ifNull: [{ $arrayElemAt: ["$studentCounts.total", 0] }, 0]
            }
          }
        },
        { $sort: { studentsCount: -1, _id: 1 } },
        {
          $facet: {
            fighters: [
              { $skip: query.skip },
              { $limit: query.limit },
              { $project: { _id: 1, userId: 1, studentsCount: 1 } }
            ],
            totalItems: [{ $count: "count" }]
          }
        }
      ]);
      const rankedFighters = leaderboard?.fighters ?? [];
      const fighterIds = rankedFighters.map(({ _id }) => _id);

      fighters = await Fighter.find({ _id: { $in: fighterIds } })
        .select("_id userId name level xp elo baseStats wins losses draws");
      totalItems = leaderboard?.totalItems[0]?.count ?? 0;

      const fightersById = new Map(
        fighters.map((fighter) => [fighter._id.toString(), fighter])
      );
      fighters = rankedFighters.map((rankedFighter) => ({
        fighter: fightersById.get(rankedFighter._id.toString()),
        studentsCount: rankedFighter.studentsCount
      }));
    } else {
      [fighters, totalItems] = await Promise.all([
        Fighter.find({})
          .select("_id userId name level xp elo baseStats wins losses draws")
          .sort(sort)
          .skip(query.skip)
          .limit(query.limit),
        Fighter.countDocuments({})
      ]);
      fighters = fighters.map((fighter) => ({ fighter, studentsCount: null }));
    }

    const users = await User.find({
      _id: { $in: fighters.map(({ fighter }) => fighter.userId) }
    })
      .select("_id username")
      .lean();
    const usernamesById = new Map(
      users.map((user) => [user._id.toString(), user.username])
    );

    return response.status(200).json({
      fighters: fighters.map(({ fighter, studentsCount }) => ({
        ...toPublicFighter(fighter),
        username: usernamesById.get(fighter.userId.toString()),
        ...(studentsCount === null ? {} : { studentsCount })
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
