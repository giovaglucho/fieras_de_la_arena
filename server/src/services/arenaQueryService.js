import Battle from "../models/Battle.js";
import Fighter from "../models/Fighter.js";
import User from "../models/User.js";
import { ApiError } from "../middleware/errorHandler.js";
import { getFighterAppearance } from "../game-engine/fighterCreation.js";
import { getDailyChallengeAttempts } from "./dailyActivityService.js";
import serializeBattle from "../utils/serializeBattle.js";

function throwActiveFighterRequired() {
  throw new ApiError(
    409,
    "ACTIVE_FIGHTER_REQUIRED",
    "Selecciona un luchador propio activo antes de entrar en la arena."
  );
}

export async function findActiveFighterForArena(userId) {
  const user = await User.findOne({ _id: userId, status: "active" })
    .select("_id activeFighterId")
    .lean();
  if (!user) {
    throw new ApiError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Debes iniciar sesión para acceder a este recurso."
    );
  }

  const eligibleStatus = {
    $or: [{ status: "active" }, { status: { $exists: false } }]
  };

  if (user.activeFighterId != null) {
    const fighter = await Fighter.findOne({
      _id: user.activeFighterId,
      userId: user._id,
      ...eligibleStatus
    }).lean();
    if (!fighter) {
      throwActiveFighterRequired();
    }
    return fighter;
  }

  const ownedFighters = await Fighter.find({ userId: user._id })
    .limit(2)
    .lean();
  if (
    ownedFighters.length !== 1 ||
    (ownedFighters[0].status !== undefined &&
      ownedFighters[0].status !== "active")
  ) {
    throwActiveFighterRequired();
  }

  return ownedFighters[0];
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findPreviouslyChallengedOpponentIds(fighterId, now) {
  const dateKey = now.toISOString().slice(0, 10);
  const dayStart = new Date(`${dateKey}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const previousBattles = await Battle.find({
    battleType: "pvp",
    status: "completed",
    "participants.snapshot.fighterId": fighterId,
    $or: [
      { challengeDateKey: dateKey },
      {
        challengeDateKey: { $exists: false },
        createdAt: { $gte: dayStart, $lt: dayEnd }
      }
    ]
  })
    .select("participants.snapshot.fighterId")
    .lean();

  const opponentIds = new Map();
  for (const battle of previousBattles) {
    for (const { snapshot } of battle.participants) {
      if (!snapshot.fighterId.equals(fighterId)) {
        opponentIds.set(snapshot.fighterId.toString(), snapshot.fighterId);
      }
    }
  }
  return [...opponentIds.values()];
}

export async function listArenaOpponents(
  userId,
  query,
  now = new Date()
) {
  const fighter = await findActiveFighterForArena(userId);
  const previouslyChallengedIds = await findPreviouslyChallengedOpponentIds(
    fighter._id,
    now
  );
  const baseFilter = {
    _id: { $nin: [fighter._id, ...previouslyChallengedIds] },
    userId: { $ne: fighter.userId },
    elo: {
      $gte: fighter.elo - 200,
      $lte: fighter.elo + 200
    },
    $and: [
      { $or: [{ status: "active" }, { status: { $exists: false } }] },
      { $or: [{ visibility: "public" }, { visibility: { $exists: false } }] }
    ]
  };

  if (query.q) {
    baseFilter.name = {
      $regex: escapeRegularExpression(query.q),
      $options: "i"
    };
  }
  if (query.minLevel !== undefined || query.maxLevel !== undefined) {
    baseFilter.level = {};
    if (query.minLevel !== undefined) {
      baseFilter.level.$gte = query.minLevel;
    }
    if (query.maxLevel !== undefined) {
      baseFilter.level.$lte = query.maxLevel;
    }
  }

  const [result] = await Fighter.aggregate([
    { $match: baseFilter },
    {
      $lookup: {
        from: User.collection.name,
        let: { ownerId: "$userId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$_id", "$$ownerId"] },
                  { $eq: [{ $ifNull: ["$status", "active"] }, "active"] }
                ]
              }
            }
          },
          { $project: { _id: 0, username: 1 } }
        ],
        as: "owner"
      }
    },
    { $unwind: "$owner" },
    {
      $addFields: {
        eloDifference: { $abs: { $subtract: ["$elo", fighter.elo] } }
      }
    },
    {
      $facet: {
        fighters: [
          { $sort: { eloDifference: 1, _id: 1 } },
          { $skip: query.skip },
          { $limit: query.limit },
          {
            $project: {
              _id: 1,
              name: 1,
              username: "$owner.username",
              level: 1,
              elo: 1,
              appearance: 1,
              wins: { $ifNull: ["$wins", 0] },
              losses: { $ifNull: ["$losses", 0] },
              draws: { $ifNull: ["$draws", 0] }
            }
          }
        ],
        totalItems: [{ $count: "count" }]
      }
    }
  ]);
  const fighters = (result?.fighters ?? []).map((opponent) => ({
    id: opponent._id.toString(),
    name: opponent.name,
    username: opponent.username,
    level: opponent.level,
    elo: opponent.elo,
    appearance: getFighterAppearance(opponent.appearance),
    wins: opponent.wins,
    losses: opponent.losses,
    draws: opponent.draws
  }));
  const totalItems = result?.totalItems[0]?.count ?? 0;

  return {
    fighters,
    pagination: {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / query.limit)
    }
  };
}

export async function getArenaAttempts(userId, now = new Date()) {
  const fighter = await findActiveFighterForArena(userId);
  const attempts = await getDailyChallengeAttempts(
    fighter._id,
    fighter.createdAt,
    now
  );
  return { fighterId: fighter._id.toString(), ...attempts };
}

export async function listOwnedArenaHistory(userId, pagination) {
  const ownedFighters = await Fighter.find({ userId }).select("_id").lean();
  const ownedFighterIds = ownedFighters.map(({ _id }) => _id);
  const [battles, totalItems] = ownedFighterIds.length
    ? await Promise.all([
        Battle.find({
          status: "completed",
          "participants.snapshot.fighterId": { $in: ownedFighterIds }
        })
          .select(
            "_id battleType createdAt winnerFighterId actionCount engineVersion participants"
          )
          .sort({ createdAt: -1, _id: -1 })
          .skip(pagination.skip)
          .limit(pagination.limit)
          .lean(),
        Battle.countDocuments({
          status: "completed",
          "participants.snapshot.fighterId": { $in: ownedFighterIds }
        })
      ])
    : [[], 0];
  const ownedFighterIdSet = new Set(
    ownedFighterIds.map((fighterId) => fighterId.toString())
  );

  return {
    battles: battles.map((battle) => {
      const ownParticipant = battle.participants.find(({ snapshot }) =>
        ownedFighterIdSet.has(snapshot.fighterId.toString())
      );
      return {
        ...serializeBattle(battle),
        ownFighterId: ownParticipant.snapshot.fighterId.toString()
      };
    }),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / pagination.limit)
    }
  };
}
