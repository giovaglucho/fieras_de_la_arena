import mongoose from "mongoose";
import DailyActivity from "../models/DailyActivity.js";

export const DAILY_BATTLE_LIMIT = 3;
export const DAILY_CHALLENGE_LIMIT = 5;
export const FIRST_DAY_CHALLENGE_LIMIT = 6;

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

export function getDailyChallengeLimit(createdAt, now = new Date()) {
  validateDate(now);
  if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
    throw new TypeError("createdAt must be a valid Date.");
  }

  return getDateKey(createdAt) === getDateKey(now)
    ? FIRST_DAY_CHALLENGE_LIMIT
    : DAILY_CHALLENGE_LIMIT;
}

function validateDate(now) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError("now must be a valid Date.");
  }
}

function validateChallengeReservation(fighterId, now, limit, requestId, session) {
  validateFighterId(fighterId);
  validateDate(now);
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    typeof requestId !== "string" ||
    requestId.length === 0 ||
    requestId.length > 128 ||
    requestId.trim() !== requestId ||
    /[\u0000-\u001f\u007f]/.test(requestId) ||
    !session
  ) {
    throw new TypeError("The challenge reservation is invalid.");
  }
}

export async function ensureDailyChallengeActivity(
  fighterId,
  now,
  limit
) {
  validateFighterId(fighterId);
  validateDate(now);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError("limit must be a positive integer.");
  }

  const dateKey = getDateKey(now);
  try {
    await DailyActivity.updateOne(
      { fighterId, dateKey },
      {
        $setOnInsert: {
          fighterId,
          dateKey,
          limit,
          battlesUsed: 0,
          requestIds: []
        }
      },
      { upsert: true }
    );
  } catch (error) {
    if (!isDailyActivityDuplicateKeyError(error)) {
      throw error;
    }

    const activityExists = await DailyActivity.exists({ fighterId, dateKey });
    if (!activityExists) {
      throw error;
    }
  }
}

export async function reserveDailyChallengeAttempt(
  fighterId,
  now,
  limit,
  requestId,
  session
) {
  validateChallengeReservation(fighterId, now, limit, requestId, session);

  const dateKey = getDateKey(now);
  const filter = { fighterId, dateKey };
  const activity = await DailyActivity.findOne(filter)
    .select("limit battlesUsed requestIds")
    .session(session)
    .lean();
  if (!activity) {
    throw new Error("Daily challenge activity was not initialized.");
  }

  if (activity.requestIds?.includes(requestId)) {
    return createReservationResult(activity, dateKey, {
      alreadyReserved: true
    });
  }

  const updatedActivity = await DailyActivity.findOneAndUpdate(
    {
      ...filter,
      battlesUsed: { $lt: limit },
      requestIds: { $ne: requestId }
    },
    {
      $inc: { battlesUsed: 1 },
      $set: { limit },
      $addToSet: { requestIds: requestId }
    },
    { returnDocument: "after", runValidators: true, session }
  )
    .select("limit battlesUsed requestIds")
    .lean();
  if (updatedActivity) {
    return {
      reserved: true,
      alreadyReserved: false,
      dateKey,
      battlesUsed: updatedActivity.battlesUsed,
      remaining: limit - updatedActivity.battlesUsed
    };
  }

  const currentActivity = await DailyActivity.findOne(filter)
    .select("limit battlesUsed requestIds")
    .session(session)
    .lean();
  if (currentActivity?.requestIds?.includes(requestId)) {
    return createReservationResult(currentActivity, dateKey, {
      alreadyReserved: true
    });
  }
  if (!currentActivity) {
    throw new Error("Daily challenge activity disappeared during reservation.");
  }

  return {
    reserved: false,
    alreadyReserved: false,
    dateKey,
    battlesUsed: currentActivity.battlesUsed,
    remaining: Math.max(0, limit - currentActivity.battlesUsed)
  };
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
