import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import DailyActivity from "../src/models/DailyActivity.js";
import {
  DAILY_BATTLE_LIMIT,
  reserveDailyAttempt
} from "../src/services/dailyActivityService.js";

let userIds;

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI debe estar configurada para probar DailyActivity.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000
  });
  await DailyActivity.init();
});

after(async () => {
  await mongoose.disconnect();
});

beforeEach(() => {
  userIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await DailyActivity.deleteMany({ userId: { $in: userIds } });
  }
});

test("reserva como máximo tres intentos ante solicitudes simultáneas", async () => {
  const results = await Promise.all(
    Array.from({ length: 8 }, () => reserveDailyAttempt(userIds[0]))
  );
  const reservations = results.filter(({ reserved }) => reserved);
  const activity = await DailyActivity.findOne({ userId: userIds[0] });

  assert.equal(DAILY_BATTLE_LIMIT, 3);
  assert.equal(reservations.length, DAILY_BATTLE_LIMIT);
  assert.deepEqual(
    reservations.map(({ battlesUsed }) => battlesUsed).sort(),
    [1, 2, 3]
  );
  assert.equal(activity.battlesUsed, DAILY_BATTLE_LIMIT);
  assert.ok(results.every(({ remaining }) => remaining >= 0));
});

test("calcula la fecha UTC y reinicia el límite al cambiar el día UTC", async () => {
  const justBeforeUtcMidnight = new Date("2026-10-20T01:59:59.999+02:00");
  const justAfterUtcMidnight = new Date("2026-10-20T02:00:00.000+02:00");

  const beforeMidnight = await reserveDailyAttempt(userIds[0], justBeforeUtcMidnight);
  const afterMidnight = await reserveDailyAttempt(userIds[0], justAfterUtcMidnight);

  assert.equal(beforeMidnight.dateKey, "2026-10-19");
  assert.equal(afterMidnight.dateKey, "2026-10-20");
  assert.equal(beforeMidnight.battlesUsed, 1);
  assert.equal(afterMidnight.battlesUsed, 1);
  assert.equal(await DailyActivity.countDocuments({ userId: userIds[0] }), 2);
});

test("define un índice único por usuario y fecha", async () => {
  const indexes = await DailyActivity.collection.indexes();
  const dailyIndex = indexes.find(
    (index) => index.key.userId === 1 && index.key.dateKey === 1
  );

  assert.equal(dailyIndex?.unique, true);
});

test("rechaza un identificador de usuario o fecha inválidos", async () => {
  await assert.rejects(
    reserveDailyAttempt("not-an-object-id"),
    (error) => error instanceof TypeError
  );
  await assert.rejects(
    reserveDailyAttempt(userIds[0], new Date(Number.NaN)),
    (error) => error instanceof TypeError
  );
});
