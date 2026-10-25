import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import Fighter from "../models/Fighter.js";
import User from "../models/User.js";
import { ApiError } from "../middleware/errorHandler.js";
import {
  createInitialFighterData,
  getFighterAppearance,
  NEUTRAL_FIGHTER_APPEARANCE
} from "../game-engine/fighterCreation.js";

const FIGHTER_FIELDS =
  "_id name level xp elo baseStats appearance wins losses draws status visibility createdAt";

function serializeManagedFighter(fighter, activeFighterId) {
  const baseStats = fighter.baseStats?.toObject
    ? fighter.baseStats.toObject()
    : fighter.baseStats;
  return {
    id: fighter._id.toString(),
    name: fighter.name,
    level: fighter.level,
    xp: fighter.xp,
    elo: fighter.elo,
    baseStats,
    appearance: getFighterAppearance(fighter.appearance),
    wins: fighter.wins,
    losses: fighter.losses,
    draws: fighter.draws,
    status: fighter.status ?? "active",
    visibility: fighter.visibility ?? "public",
    isActive:
      activeFighterId != null &&
      fighter._id.equals(activeFighterId) &&
      (fighter.status === undefined || fighter.status === "active"),
    createdAt: fighter.createdAt
  };
}

function throwNotFound() {
  throw new ApiError(404, "FIGHTER_NOT_FOUND", "No se encontró el luchador solicitado.");
}

function throwIdempotencyConflict() {
  throw new ApiError(
    409,
    "IDEMPOTENCY_KEY_REUSED",
    "La clave de creación ya se utilizó con otros datos."
  );
}

export class FighterNameConflictError extends Error {
  constructor() {
    super("El nombre del luchador no está disponible.");
    this.name = "FighterNameConflictError";
  }
}

export async function listOwnedFighters(userId, pagination) {
  const filter = { userId };
  const user = await User.findById(userId).select("activeFighterId").lean();
  if (!user) {
    throwNotFound();
  }
  const [fighters, totalItems] = await Promise.all([
    Fighter.find(filter)
      .select(FIGHTER_FIELDS)
      .sort({ createdAt: 1, _id: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Fighter.countDocuments(filter)
  ]);
  let effectiveActiveFighterId = null;
  if (user.activeFighterId != null) {
    const activeFighter = await Fighter.findOne({
      _id: user.activeFighterId,
      userId,
      $or: [{ status: "active" }, { status: { $exists: false } }]
    })
      .select("_id")
      .lean();
    effectiveActiveFighterId = activeFighter?._id ?? null;
  } else if (
    totalItems === 1 &&
    fighters.length === 1 &&
    (fighters[0]?.status === undefined || fighters[0]?.status === "active")
  ) {
    effectiveActiveFighterId = fighters[0]._id;
  }

  return {
    fighters: fighters.map((fighter) =>
      serializeManagedFighter(fighter, effectiveActiveFighterId)
    ),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / pagination.limit)
    }
  };
}

export async function getActiveFighter(userId) {
  const user = await User.findById(userId).select("activeFighterId").lean();
  if (!user) {
    throwNotFound();
  }

  if (user.activeFighterId != null) {
    const fighter = await Fighter.findOne({
      _id: user.activeFighterId,
      userId,
      $or: [{ status: "active" }, { status: { $exists: false } }]
    })
      .select(FIGHTER_FIELDS)
      .lean();
    return {
      fighter: fighter
        ? serializeManagedFighter(fighter, user.activeFighterId)
        : null
    };
  }

  const fighters = await Fighter.find({ userId })
    .select(FIGHTER_FIELDS)
    .limit(2)
    .lean();
  const legacyFighter =
    fighters.length === 1 &&
    (fighters[0].status === undefined || fighters[0].status === "active")
      ? fighters[0]
      : null;

  return {
    fighter: legacyFighter
      ? serializeManagedFighter(legacyFighter, legacyFighter._id)
      : null
  };
}

export async function selectActiveFighter(userId, fighterId) {
  const session = await mongoose.startSession();
  let selectedFighter;
  try {
    await session.withTransaction(async () => {
      selectedFighter = await Fighter.findOne({
        _id: fighterId,
        userId,
        $or: [{ status: "active" }, { status: { $exists: false } }]
      })
        .select(FIGHTER_FIELDS)
        .session(session)
        .lean();
      if (!selectedFighter) {
        throwNotFound();
      }

      const result = await User.updateOne(
        { _id: userId, status: "active" },
        { $set: { activeFighterId: selectedFighter._id } },
        { session }
      );
      if (result.matchedCount !== 1) {
        throw new ApiError(
          401,
          "AUTHENTICATION_REQUIRED",
          "Debes iniciar sesión para acceder a este recurso."
        );
      }
    });
  } finally {
    await session.endSession();
  }

  return {
    fighter: serializeManagedFighter(selectedFighter, selectedFighter._id)
  };
}

function sameAppearance(first, second) {
  return Object.keys(NEUTRAL_FIGHTER_APPEARANCE).every(
    (field) => first[field] === second[field]
  );
}

async function findCreationRetry(userId, requestId, name, appearance) {
  const existing = await Fighter.findOne({ userId, creationRequestId: requestId })
    .select(FIGHTER_FIELDS)
    .lean();
  if (!existing) {
    return null;
  }
  if (
    existing.name !== name.trim().toLowerCase() ||
    !sameAppearance(
      getFighterAppearance(existing.appearance),
      appearance ?? NEUTRAL_FIGHTER_APPEARANCE
    )
  ) {
    throwIdempotencyConflict();
  }
  const user = await User.findById(userId).select("activeFighterId").lean();

  return {
    fighter: serializeManagedFighter(existing, user?.activeFighterId),
    created: false
  };
}

export async function createOwnedFighter(
  userId,
  { name, requestId, appearance = null }
) {
  const normalizedName = name.trim().toLowerCase();
  const requestedAppearance = appearance ?? NEUTRAL_FIGHTER_APPEARANCE;
  const existing = await findCreationRetry(
    userId,
    requestId,
    normalizedName,
    requestedAppearance
  );
  if (existing) {
    return existing;
  }

  const fighterId = new mongoose.Types.ObjectId();
  const initialData = createInitialFighterData();
  const session = await mongoose.startSession();
  let createdFighter;
  try {
    await session.withTransaction(async () => {
      const concurrentRetry = await Fighter.findOne({
        userId,
        creationRequestId: requestId
      })
        .select(FIGHTER_FIELDS)
        .session(session)
        .lean();
      if (concurrentRetry) {
        if (concurrentRetry.name !== normalizedName) {
          throwIdempotencyConflict();
        }
        if (
          !sameAppearance(
            getFighterAppearance(concurrentRetry.appearance),
            requestedAppearance
          )
        ) {
          throwIdempotencyConflict();
        }
        createdFighter = concurrentRetry;
        return;
      }

      const fighter = new Fighter({
        _id: fighterId,
        userId,
        name: normalizedName,
        creationRequestId: requestId,
        ...initialData,
        appearance: requestedAppearance,
        referralCode: randomBytes(16).toString("hex"),
        status: "active",
        visibility: "public"
      });
      await fighter.save({ session });

      const userUpdate = await User.updateOne(
        { _id: userId, status: "active" },
        { $set: { activeFighterId: fighter._id } },
        { session }
      );
      if (userUpdate.matchedCount !== 1) {
        throw new ApiError(
          401,
          "AUTHENTICATION_REQUIRED",
          "Debes iniciar sesión para acceder a este recurso."
        );
      }
      createdFighter = fighter;
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateFields = error.keyPattern ?? error.keyValue ?? {};
      if (Object.hasOwn(duplicateFields, "name")) {
        throw new FighterNameConflictError();
      }
      if (Object.hasOwn(duplicateFields, "creationRequestId")) {
        const retry = await findCreationRetry(
          userId,
          requestId,
          normalizedName,
          requestedAppearance
        );
        if (retry) {
          return retry;
        }
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }

  const created = createdFighter._id.equals(fighterId);
  const activeFighterId = created
    ? fighterId
    : (await User.findById(userId).select("activeFighterId").lean())
        ?.activeFighterId;

  return {
    fighter: serializeManagedFighter(createdFighter, activeFighterId),
    created
  };
}
