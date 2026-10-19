import mongoose from "mongoose";
import DailyActivity from "../models/DailyActivity.js";

export const DAILY_BATTLE_LIMIT = 3;

function isDailyActivityDuplicateKeyError(error) {
  return (
    error?.code === 11000 &&
    ((error.keyPattern?.userId === 1 && error.keyPattern?.dateKey === 1) ||
      error.message?.includes("userId_1_dateKey_1"))
  );
}

function createReservationResult(activity, dateKey) {
  const battlesUsed = activity?.battlesUsed ?? DAILY_BATTLE_LIMIT;
  return {
    reserved: Boolean(activity),
    dateKey,
    battlesUsed,
    remaining: DAILY_BATTLE_LIMIT - battlesUsed
  };
}

export async function reserveDailyAttempt(userId, now = new Date()) {
  if (!mongoose.isObjectIdOrHexString(userId)) {
    throw new TypeError("userId must be a valid MongoDB ObjectId.");
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError("now must be a valid Date.");
  }

  const dateKey = now.toISOString().slice(0, 10);
  const filter = {
    userId,
    dateKey,
    battlesUsed: { $lt: DAILY_BATTLE_LIMIT }
  };
  const update = {
    $inc: { battlesUsed: 1 },
    $setOnInsert: { userId, dateKey }
  };
  const options = {
    returnDocument: "after",
    runValidators: true,
    upsert: true
  };

  try {
    const activity = await DailyActivity.findOneAndUpdate(filter, update, options);
    return createReservationResult(activity, dateKey);
  } catch (error) {
    if (!isDailyActivityDuplicateKeyError(error)) {
      throw error;
    }

    const activity = await DailyActivity.findOneAndUpdate(
      filter,
      update,
      { ...options, upsert: false }
    );
    return createReservationResult(activity, dateKey);
  }
}
