import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import Battle from "../src/models/Battle.js";
import DailyActivity from "../src/models/DailyActivity.js";
import Fighter from "../src/models/Fighter.js";
import User from "../src/models/User.js";
import {
  ChallengeServiceError,
  startDirectedChallenge
} from "../src/services/challengeService.js";
import {
  DAILY_CHALLENGE_LIMIT,
  FIRST_DAY_CHALLENGE_LIMIT,
  getDailyChallengeLimit
} from "../src/services/dailyActivityService.js";

const runId = randomUUID().replaceAll("-", "");
let userIds;
let fighterIds;
let user;
let fighter;
let opponentUsers;
let opponents;
let sequence;

async function createUser(label) {
  const suffix = `${runId.slice(0, 10)}${sequence++}`;
  const createdUser = await User.create({
    username: `${label}_${suffix}`,
    email: `${label}-${suffix}@example.test`,
    passwordHash: "test-hash"
  });
  userIds.add(createdUser._id);
  return createdUser;
}

async function createFighter(owner, label, options = {}) {
  const suffix = `${runId.slice(0, 9)}${sequence++}`;
  const createdFighter = await Fighter.create({
    userId: owner._id,
    name: `${label}${suffix}`,
    referralCode: `challenge-${suffix}`,
    ...options
  });
  fighterIds.add(createdFighter._id);
  return createdFighter;
}

async function createOpponent(options = {}) {
  const owner = await createUser("opponent");
  const createdFighter = await createFighter(owner, "o", options);
  opponentUsers.push(owner);
  opponents.push(createdFighter);
  return createdFighter;
}

function challengeRequest(opponent, requestId = `request-${sequence++}`) {
  return {
    fighterId: fighter._id.toString(),
    opponentFighterId: opponent._id.toString(),
    requestId
  };
}

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI debe estar configurada para probar desafíos dirigidos.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000
  });
  await Promise.all([
    Battle.init(),
    DailyActivity.init(),
    Fighter.init(),
    User.init()
  ]);
});

after(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  userIds = new Set();
  fighterIds = new Set();
  opponentUsers = [];
  opponents = [];
  sequence = 0;

  user = await createUser("challenger");
  fighter = await createFighter(user, "f", { elo: 1000 });
  user.activeFighterId = fighter._id;
  await user.save();
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  await Promise.all([
    Battle.deleteMany({
      "participants.snapshot.fighterId": { $in: [...fighterIds] }
    }),
    DailyActivity.deleteMany({ fighterId: { $in: [...fighterIds] } }),
    Fighter.deleteMany({ _id: { $in: [...fighterIds] } }),
    User.deleteMany({ _id: { $in: [...userIds] } })
  ]);
});

test("aplica seis desafíos en la fecha UTC de creación y cinco después", () => {
  const createdAt = new Date("2026-10-25T23:59:59.999Z");
  assert.equal(
    getDailyChallengeLimit(createdAt, new Date("2026-10-25T00:00:00.000Z")),
    FIRST_DAY_CHALLENGE_LIMIT
  );
  assert.equal(
    getDailyChallengeLimit(createdAt, new Date("2026-10-26T00:00:00.000Z")),
    DAILY_CHALLENGE_LIMIT
  );
  assert.equal(
    getDailyChallengeLimit(
      createdAt,
      new Date("2026-10-26T01:00:00.000+02:00")
    ),
    FIRST_DAY_CHALLENGE_LIMIT
  );
});

test("permite seis desafíos el día de creación y reinicia a cinco al cambiar UTC", async () => {
  const createdAt = new Date("2026-10-19T10:00:00.000Z");
  const beforeUtcMidnight = new Date("2026-10-20T01:59:59.999+02:00");
  const afterUtcMidnight = new Date("2026-10-20T02:00:00.000+02:00");
  await Fighter.collection.updateOne(
    { _id: fighter._id },
    { $set: { createdAt } }
  );
  const firstDayTargets = await Promise.all(
    Array.from({ length: 7 }, () => createOpponent({ elo: 1000 }))
  );

  for (let index = 0; index < FIRST_DAY_CHALLENGE_LIMIT; index += 1) {
    await startDirectedChallenge(
      user._id,
      challengeRequest(firstDayTargets[index], `first-day-${runId}-${index}`),
      beforeUtcMidnight
    );
  }
  await assert.rejects(
    startDirectedChallenge(
      user._id,
      challengeRequest(firstDayTargets[6], `first-day-excess-${runId}`),
      beforeUtcMidnight
    ),
    (error) =>
      error instanceof ChallengeServiceError &&
      error.code === "DAILY_BATTLE_LIMIT_REACHED"
  );
  await startDirectedChallenge(
    user._id,
    challengeRequest(firstDayTargets[6], `next-utc-day-${runId}`),
    afterUtcMidnight
  );

  const activities = await DailyActivity.find({ fighterId: fighter._id })
    .sort({ dateKey: 1 })
    .lean();
  assert.deepEqual(
    activities.map(({ dateKey, limit, battlesUsed }) => ({
      dateKey,
      limit,
      battlesUsed
    })),
    [
      { dateKey: "2026-10-19", limit: FIRST_DAY_CHALLENGE_LIMIT, battlesUsed: 6 },
      { dateKey: "2026-10-20", limit: DAILY_CHALLENGE_LIMIT, battlesUsed: 1 }
    ]
  );
});

test("limita las solicitudes simultáneas al cupo por luchador", async () => {
  const now = new Date();
  await Fighter.collection.updateOne(
    { _id: fighter._id },
    { $set: { createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }
  );
  const targets = await Promise.all(
    Array.from({ length: 8 }, () => createOpponent({ elo: 1000 }))
  );

  const results = await Promise.allSettled(
    targets.map((target, index) =>
      startDirectedChallenge(
        user._id,
        challengeRequest(target, `parallel-${runId}-${index}`),
        now
      )
    )
  );
  const completed = results.filter((result) => result.status === "fulfilled");
  const exhausted = results.filter(
    (result) =>
      result.status === "rejected" &&
      result.reason instanceof ChallengeServiceError &&
      result.reason.code === "DAILY_BATTLE_LIMIT_REACHED"
  );
  const activity = await DailyActivity.findOne({ fighterId: fighter._id });

  assert.equal(completed.length, DAILY_CHALLENGE_LIMIT);
  assert.equal(exhausted.length, 8 - DAILY_CHALLENGE_LIMIT);
  assert.equal(activity.limit, DAILY_CHALLENGE_LIMIT);
  assert.equal(activity.battlesUsed, DAILY_CHALLENGE_LIMIT);
  assert.equal(
    await Battle.countDocuments({ requesterFighterId: fighter._id }),
    DAILY_CHALLENGE_LIMIT
  );
});

test("una misma clave concurrente devuelve el combate sin duplicar cuota ni recompensas", async () => {
  const opponent = await createOpponent({ elo: 1000 });
  const request = challengeRequest(opponent, `same-${runId}`);
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      startDirectedChallenge(user._id, request)
    )
  );
  const activity = await DailyActivity.findOne({ fighterId: fighter._id });
  const updatedFighter = await Fighter.findById(fighter._id);

  assert.equal(new Set(results.map(({ battle }) => battle._id.toString())).size, 1);
  assert.equal(results.filter(({ created }) => created).length, 1);
  assert.equal(activity.battlesUsed, 1);
  assert.equal(
    await Battle.countDocuments({ requesterFighterId: fighter._id }),
    1
  );
  assert.equal(updatedFighter.wins + updatedFighter.losses + updatedFighter.draws, 1);
});

test("dos claves simultáneas no permiten repetir la misma pareja en orden inverso", async () => {
  const opponent = await createOpponent({ elo: 1000 });
  const results = await Promise.allSettled([
    startDirectedChallenge(
      user._id,
      challengeRequest(opponent, `pair-a-${runId}`)
    ),
    startDirectedChallenge(
      opponent.userId,
      {
        fighterId: opponent._id.toString(),
        opponentFighterId: fighter._id.toString(),
        requestId: `pair-b-${runId}`
      }
    )
  ]);
  const completed = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");

  assert.equal(completed.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok(
    rejected[0].reason instanceof ChallengeServiceError &&
      rejected[0].reason.code === "OPPONENT_ALREADY_CHALLENGED_TODAY"
  );
  assert.equal(
    await Battle.countDocuments({
      "participants.snapshot.fighterId": { $all: [fighter._id, opponent._id] }
    }),
    1
  );
});

test("rechaza un objetivo propio, privado o fuera de rango sin cobrar cupo", async () => {
  const ownSecondFighter = await createFighter(user, "s");
  const privateOpponent = await createOpponent({
    elo: 1000,
    visibility: "private"
  });
  const distantOpponent = await createOpponent({ elo: 1500 });

  await assert.rejects(
    startDirectedChallenge(
      user._id,
      challengeRequest(ownSecondFighter, `own-${runId}`)
    ),
    (error) =>
      error instanceof ChallengeServiceError &&
      error.code === "FIGHTER_NOT_FOUND"
  );
  await assert.rejects(
    startDirectedChallenge(
      user._id,
      challengeRequest(privateOpponent, `private-${runId}`)
    ),
    (error) =>
      error instanceof ChallengeServiceError &&
      error.code === "FIGHTER_NOT_FOUND"
  );
  await assert.rejects(
    startDirectedChallenge(
      user._id,
      challengeRequest(distantOpponent, `range-${runId}`)
    ),
    (error) =>
      error instanceof ChallengeServiceError &&
      error.code === "OPPONENT_OUT_OF_RANGE"
  );

  assert.equal(await DailyActivity.countDocuments({ fighterId: fighter._id }), 0);
  assert.equal(await Battle.countDocuments({ requesterFighterId: fighter._id }), 0);
});

test("una misma clave no puede cambiar el objetivo y una pareja no se repite ese día", async () => {
  const firstOpponent = await createOpponent({ elo: 1000 });
  const secondOpponent = await createOpponent({ elo: 1000 });
  const requestId = `fixed-target-${runId}`;
  const first = await startDirectedChallenge(
    user._id,
    challengeRequest(firstOpponent, requestId)
  );

  await assert.rejects(
    startDirectedChallenge(
      user._id,
      challengeRequest(secondOpponent, requestId)
    ),
    (error) =>
      error instanceof ChallengeServiceError &&
      error.code === "IDEMPOTENCY_KEY_REUSED"
  );
  await assert.rejects(
    startDirectedChallenge(
      user._id,
      challengeRequest(firstOpponent, `new-key-${runId}`)
    ),
    (error) =>
      error instanceof ChallengeServiceError &&
      error.code === "OPPONENT_ALREADY_CHALLENGED_TODAY"
  );

  assert.equal(first.battle.participants[1].snapshot.fighterId.toString(), firstOpponent._id.toString());
  assert.equal(
    (await DailyActivity.findOne({ fighterId: fighter._id })).battlesUsed,
    1
  );
});

test("un fallo al guardar recompensas revierte batalla y reserva de cupo", async () => {
  const opponent = await createOpponent({ elo: 1000 });
  const originalBulkWrite = Fighter.bulkWrite;
  const failure = new Error("Simulated challenge reward failure.");
  Fighter.bulkWrite = async () => {
    throw failure;
  };

  try {
    await assert.rejects(
      startDirectedChallenge(
        user._id,
        challengeRequest(opponent, `rollback-${runId}`)
      ),
      (error) => error === failure
    );
  } finally {
    Fighter.bulkWrite = originalBulkWrite;
  }

  const [battleCount, activity] = await Promise.all([
    Battle.countDocuments({ requesterFighterId: fighter._id }),
    DailyActivity.findOne({ fighterId: fighter._id })
  ]);
  assert.equal(battleCount, 0);
  assert.equal(activity.battlesUsed, 0);
  assert.deepEqual(activity.requestIds, []);
});

test("los cupos no se comparten entre luchadores de una cuenta", async () => {
  const secondFighter = await createFighter(user, "s", { elo: 1000 });
  const opponent = await createOpponent({ elo: 1000 });

  await assert.rejects(
    startDirectedChallenge(
      user._id,
      {
        fighterId: secondFighter._id.toString(),
        opponentFighterId: opponent._id.toString(),
        requestId: `not-active-${runId}`
      }
    ),
    (error) =>
      error instanceof ChallengeServiceError &&
      error.code === "ACTIVE_FIGHTER_REQUIRED"
  );

  user.activeFighterId = fighter._id;
  await user.save();
  await startDirectedChallenge(
    user._id,
    challengeRequest(opponent, `first-${runId}`)
  );
  user.activeFighterId = secondFighter._id;
  await user.save();
  await startDirectedChallenge(
    user._id,
    {
      fighterId: secondFighter._id.toString(),
      opponentFighterId: opponent._id.toString(),
      requestId: `second-${runId}`
    }
  );

  const activities = await DailyActivity.find({
    fighterId: { $in: [fighter._id, secondFighter._id] }
  }).sort({ fighterId: 1 });
  assert.equal(activities.length, 2);
  assert.deepEqual(
    activities.map(({ battlesUsed }) => battlesUsed),
    [1, 1]
  );
});
