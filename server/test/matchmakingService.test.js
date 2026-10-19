import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import Battle from "../src/models/Battle.js";
import Fighter from "../src/models/Fighter.js";
import User from "../src/models/User.js";
import { MATCHMAKING_CONFIG } from "../src/config/matchmaking.js";
import {
  MatchmakingServiceError,
  selectOpponent
} from "../src/services/matchmakingService.js";

const runId = randomUUID().replaceAll("-", "");
let fighterIds;
let userIds;
let requester;

async function createFighter({ elo = 1000, status = "active" } = {}) {
  const index = userIds.length;
  const user = await User.create({
    username: `matchmaking-${runId}-${index}`,
    email: `matchmaking-${runId}-${index}@example.test`,
    passwordHash: "test-hash",
    status
  });
  userIds.push(user._id);

  const fighter = await Fighter.create({
    userId: user._id,
    name: `m${runId.slice(0, 10)}${index}`,
    referralCode: `matchmaking-${runId}-${index}`,
    elo
  });
  fighterIds.push(fighter._id);
  return fighter;
}

async function savePreviousBattle(first, second) {
  const participants = [first, second].map((fighter) => ({
    snapshot: {
      fighterId: fighter._id,
      name: fighter.name,
      level: fighter.level,
      elo: fighter.elo,
      stats: {
        health: fighter.baseStats.health,
        attack: fighter.baseStats.attack,
        defense: fighter.baseStats.defense,
        speed: fighter.baseStats.speed
      }
    },
    result: {
      xpGained: 0,
      eloChange: 0,
      eloAfter: fighter.elo
    }
  }));

  await Battle.create({
    battleType: "pvp",
    participants,
    actionCount: 1,
    seed: "matchmaking-test",
    engineVersion: "1.0.0",
    events: [{ type: "combat_finished", winnerFighterId: null }]
  });
}

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI debe estar configurada para probar matchmaking.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000
  });
  await Promise.all([Battle.init(), Fighter.init(), User.init()]);
});

after(async () => {
  await mongoose.disconnect();
});

beforeEach(() => {
  fighterIds = [];
  userIds = [];
  requester = null;
});

afterEach(async () => {
  if (
    mongoose.connection.readyState === 1 &&
    (fighterIds.length > 0 || userIds.length > 0)
  ) {
    await Battle.deleteMany({
      "participants.snapshot.fighterId": { $in: fighterIds }
    });
    await Fighter.deleteMany({ _id: { $in: fighterIds } });
    await User.deleteMany({ _id: { $in: userIds } });
  }
});

test("elige al rival activo más cercano en ELO y nunca se elige a sí mismo", async () => {
  requester = await createFighter({ elo: 50000 });
  await createFighter({ elo: 50001, status: "suspended" });
  await createFighter({ elo: 50180 });
  const closestOpponent = await createFighter({ elo: 50050 });

  const opponent = await selectOpponent(requester._id);

  assert.deepEqual(
    MATCHMAKING_CONFIG.eloRangeSteps,
    [200, 400, 800, 1600]
  );
  assert.equal(opponent._id.toString(), closestOpponent._id.toString());
  assert.notEqual(opponent._id.toString(), requester._id.toString());
  assert.equal("userId" in opponent, false);
});

test("amplía el rango por etapas hasta encontrar un rival", async () => {
  requester = await createFighter({ elo: 50000 });
  const expandedRangeOpponent = await createFighter({ elo: 50300 });

  const opponent = await selectOpponent(requester._id);

  assert.equal(opponent._id.toString(), expandedRangeOpponent._id.toString());
});

test("termina con null si no hay rivales dentro del rango máximo", async () => {
  requester = await createFighter({ elo: 50000 });
  await createFighter({ elo: 51601 });

  assert.equal(await selectOpponent(requester._id), null);
});

test("incluye rivales situados exactamente en el límite máximo", async () => {
  requester = await createFighter({ elo: 50000 });
  const opponentAtLimit = await createFighter({ elo: 51600 });

  const opponent = await selectOpponent(requester._id);

  assert.equal(opponent._id.toString(), opponentAtLimit._id.toString());
});

test("prefiere un rival distinto al del combate PvP anterior cuando hay alternativa", async () => {
  requester = await createFighter({ elo: 50000 });
  const previousOpponent = await createFighter({ elo: 50010 });
  const alternative = await createFighter({ elo: 50300 });
  await savePreviousBattle(requester, previousOpponent);

  const opponent = await selectOpponent(requester._id);

  assert.equal(opponent._id.toString(), alternative._id.toString());
});

test("permite repetir el rival anterior si no hay otra alternativa", async () => {
  requester = await createFighter({ elo: 50000 });
  const previousOpponent = await createFighter({ elo: 50010 });
  await savePreviousBattle(requester, previousOpponent);

  const opponent = await selectOpponent(requester._id);

  assert.equal(opponent._id.toString(), previousOpponent._id.toString());
});

test("rechaza solicitantes inválidos y distingue un luchador inexistente", async () => {
  await assert.rejects(
    selectOpponent("not-an-object-id"),
    (error) =>
      error instanceof MatchmakingServiceError &&
      error.statusCode === 400 &&
      error.code === "INVALID_REQUESTER_FIGHTER"
  );

  await assert.rejects(
    selectOpponent(new mongoose.Types.ObjectId()),
    (error) =>
      error instanceof MatchmakingServiceError &&
      error.statusCode === 404 &&
      error.code === "REQUESTER_FIGHTER_NOT_FOUND"
  );
});
