import { Router } from "express";
import Fighter from "../models/Fighter.js";
import { ApiError } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import { toPublicFighter } from "../serializers/publicFighter.js";
import { validateLeaderboardQuery } from "../validators/leaderboards.js";

const router = Router();

// Solo luchadores públicos y activos: los privados o suspendidos nunca aparecen.
const PUBLIC_FIGHTER_FILTER = {
  $and: [
    { $or: [{ status: "active" }, { status: { $exists: false } }] },
    { $or: [{ visibility: "public" }, { visibility: { $exists: false } }] }
  ]
};

// Cada cuenta aparece una sola vez, representada por su mejor ficha para la categoría.
const REPRESENTATIVE_SORT = {
  elo: { elo: -1, _id: 1 },
  level: { level: -1, _id: 1 },
  students: { level: -1, elo: -1, _id: 1 }
};

const FINAL_SORT = {
  elo: { elo: -1, userId: 1 },
  level: { level: -1, userId: 1 },
  students: { studentsCount: -1, userId: 1 }
};

function buildPipeline(query) {
  const pipeline = [
    { $match: PUBLIC_FIGHTER_FILTER },
    { $sort: REPRESENTATIVE_SORT[query.category] },
    { $group: { _id: "$userId", fighter: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$fighter" } }
  ];

  if (query.category === "students") {
    pipeline.push(
      {
        $lookup: {
          from: User.collection.name,
          let: { fighterUserId: "$userId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$referredByUserId", "$$fighterUserId"] } } },
            { $count: "total" }
          ],
          as: "studentCounts"
        }
      },
      {
        $addFields: {
          studentsCount: { $ifNull: [{ $arrayElemAt: ["$studentCounts.total", 0] }, 0] }
        }
      }
    );
  }

  pipeline.push(
    { $sort: FINAL_SORT[query.category] },
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
  );

  return pipeline;
}

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

  try {
    const [leaderboard] = await Fighter.aggregate(buildPipeline(query));
    const ranked = leaderboard?.fighters ?? [];
    const totalItems = leaderboard?.totalItems[0]?.count ?? 0;

    const fighterDocs = await Fighter.find({ _id: { $in: ranked.map(({ _id }) => _id) } })
      .select("_id userId name displayName level xp elo baseStats appearance wins losses draws");
    const fightersById = new Map(fighterDocs.map((fighter) => [fighter._id.toString(), fighter]));

    // Un luchador puede borrarse entre la agregación y esta lectura: se omite en vez de fallar.
    const rankedPresent = ranked.filter((entry) => fightersById.has(entry._id.toString()));

    const users = await User.find({ _id: { $in: rankedPresent.map(({ userId }) => userId) } })
      .select("_id username")
      .lean();
    const usernamesById = new Map(users.map((user) => [user._id.toString(), user.username]));

    return response.status(200).json({
      fighters: rankedPresent.map((entry) => {
        const fighter = fightersById.get(entry._id.toString());
        return {
          ...toPublicFighter(fighter),
          username: usernamesById.get(fighter.userId.toString()),
          ...(query.category === "students" ? { studentsCount: entry.studentsCount } : {})
        };
      }),
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
