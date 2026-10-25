import mongoose from "mongoose";
import DailyActivity from "../models/DailyActivity.js";

export const DAILY_BATTLE_LIMIT = 3;

function isDailyActivityDuplicateKeyError(error) {
  return (
    error?.code === 11000 &&
    ((error.keyPattern?.fighterId === 1 && error.keyPattern?.dateKey === 1) ||
      error.message?.includes("fighterId_1_dateKey_1"))
  );
}

function getDateKey(now) {
  return now.toISOString().slice(0, 10);
}

function validateDate(now) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError("now must be a valid Date.");
  }
}

function validateFighterId(fighterId) {
  if (!mongoose.isObjectIdOrHexString(fighterId)) {
    throw new TypeError("fighterId must be a valid MongoDB ObjectId.");
  }
}

function createReservationResult(
  activity,
  dateKey,
  { reserved = false, alreadyReserved = false } = {}
) {
  const battlesUsed = activity?.battlesUsed ?? 0;
  return {
    reserved,
    alreadyReserved,
    dateKey,
    battlesUsed,
    remaining: DAILY_BATTLE_LIMIT - battlesUsed
  };
}

export async function getDailyAttempts(fighterId, now = new Date()) {
  validateFighterId(fighterId);
  validateDate(now);

  const dateKey = getDateKey(now);
  const activity = await DailyActivity.findOne({ fighterId, dateKey })
    .select("battlesUsed")
    .lean();
  const battlesUsed = activity?.battlesUsed ?? 0;

  return {
    dateKey,
    limit: DAILY_BATTLE_LIMIT,
    used: battlesUsed,
    remaining: DAILY_BATTLE_LIMIT - battlesUsed
  };
}

export async function reserveDailyAttempt(fighterId, now = new Date(), requestId) {
  validateFighterId(fighterId);
  validateDate(now);
  if (
    requestId !== undefined &&
    (typeof requestId !== "string" ||
      requestId.length === 0 ||
      requestId.length > 128 ||
      requestId.trim() !== requestId ||
      /[\u0000-\u001f\u007f]/.test(requestId))
  ) {
    throw new TypeError("requestId must be a valid idempotency key.");
  }

  const dateKey = getDateKey(now);
  const filter = {
    fighterId,
    dateKey,
    battlesUsed: { $lt: DAILY_BATTLE_LIMIT }
  };
  if (requestId !== undefined) {
    filter.requestIds = { $ne: requestId };
  }
  const update = {
    $inc: { battlesUsed: 1 },
    $setOnInsert: { fighterId, dateKey }
  };
  if (requestId !== undefined) {
    update.$addToSet = { requestIds: requestId };
  }
  const options = {
    returnDocument: "after",
    runValidators: true,
    upsert: true
  };

  try {
    const activity = await DailyActivity.findOneAndUpdate(filter, update, options);
    if (activity) {
      return createReservationResult(activity, dateKey, { reserved: true });
    }
  } catch (error) {
    if (!isDailyActivityDuplicateKeyError(error)) {
      throw error;
    }

    const activity = await DailyActivity.findOneAndUpdate(
      filter,
      update,
      { ...options, upsert: false }
    );
    if (activity) {
      return createReservationResult(activity, dateKey, { reserved: true });
    }
  }

  const activity = await DailyActivity.findOne({ fighterId, dateKey }).lean();
  if (requestId !== undefined && activity?.requestIds?.includes(requestId)) {
    return createReservationResult(activity, dateKey, {
      reserved: true,
      alreadyReserved: true
    });
  }

  return createReservationResult(activity, dateKey);
}
