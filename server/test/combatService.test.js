import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import Battle from "../src/models/Battle.js";
import Fighter from "../src/models/Fighter.js";
import { CombatServiceError, resolveCombat } from "../src/services/combatService.js";

const runId = randomUUID().replaceAll("-", "");
let fighterIds;
let userIds;
const requestId = (suffix) => `${runId}-${suffix}`;

async function createFighters(options = {}) {
  const fighters = await Promise.all(
    fighterIds.map((fighterId, index) =>
      Fighter.create({
        _id: fighterId,
        userId: userIds[index],
        name: `c${runId.slice(0, 10)}${index}`,
        referralCode: `combat-${runId}-${index}`,
        ...options[index]
      })
    )
  );
  return fighters;
}

function combatRequest(suffix, battleType = "pvp") {
  return {
    requesterFighterId: fighterIds[0],
    opponentFighterId: fighterIds[1],
    battleType,
    requestId: requestId(suffix)
  };
}

async function findBattles() {
  return Battle.find({
    "participants.snapshot.fighterId": { $in: fighterIds }
  });
}

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI debe estar configurada para probar el servicio de combate.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000
  });
  await Promise.all([Battle.init(), Fighter.init()]);
});

after(async () => {
  await mongoose.disconnect();
});

beforeEach(() => {
  fighterIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
  userIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await Battle.deleteMany({
      "participants.snapshot.fighterId": { $in: fighterIds }
    });
    await Fighter.deleteMany({ _id: { $in: fighterIds } });
  }
});

test("guarda el combate PvP y aplica XP, ELO y contadores a ambos luchadores", async () => {
  await createFighters();

  const battle = await resolveCombat(combatRequest("pvp"));
  const fighters = await Fighter.find({ _id: { $in: fighterIds } }).sort({ _id: 1 });
  const participantResults = battle.participants.map(({ result }) => result);
  const totalXp = participantResults.reduce((sum, result) => sum + result.xpGained, 0);
  const fightersById = new Map(
    fighters.map((fighter) => [fighter._id.toString(), fighter])
  );

  assert.equal(battle.status, "completed");
  assert.equal(battle.battleType, "pvp");
  assert.equal(battle.requestId, requestId("pvp"));
  assert.equal(battle.participants.length, 2);
  assert.ok(battle.seed.length > 0);
  assert.ok(battle.events.length > 0);
  assert.equal(totalXp, battle.winnerFighterId ? 35 : 30);
  for (const participant of battle.participants) {
    const fighterId = participant.snapshot.fighterId.toString();
    const fighter = fightersById.get(fighterId);
    const expectedXp = battle.winnerFighterId
      ? battle.winnerFighterId.toString() === fighterId
        ? 25
        : 10
      : 15;

    assert.equal(participant.result.xpGained, expectedXp);
    assert.equal(fighter.xp, expectedXp);
    assert.equal(fighter.elo, participant.result.eloAfter);
  }
  assert.ok(
    fighters.every(
      (fighter) => fighter.wins + fighter.losses + fighter.draws === 1
    )
  );
  assert.equal(
    fighters.reduce((sum, fighter) => sum + fighter.xp, 0),
    totalXp
  );
  assert.equal(fighters[0].elo + fighters[1].elo, 2000);
});

test("repetir una solicitud devuelve la misma pelea sin aplicar recompensas otra vez", async () => {
  await createFighters();
  const request = combatRequest("retry");

  const firstBattle = await resolveCombat(request);
  const repeatedBattle = await resolveCombat(request);
  const fighters = await Fighter.find({ _id: { $in: fighterIds } }).sort({ _id: 1 });

  assert.equal(repeatedBattle._id.toString(), firstBattle._id.toString());
  assert.equal(await Battle.countDocuments({ requestId: request.requestId }), 1);
  assert.equal(
    fighters.every(
      (fighter) => fighter.wins + fighter.losses + fighter.draws === 1
    ),
    true
  );
});

test("serializa solicitudes concurrentes con la misma clave idempotente", async () => {
  await createFighters();
  const request = combatRequest("concurrent");

  const battles = await Promise.all([
    resolveCombat(request),
    resolveCombat(request)
  ]);

  assert.equal(battles[0]._id.toString(), battles[1]._id.toString());
  assert.equal(await Battle.countDocuments({ requestId: request.requestId }), 1);
  const fighters = await Fighter.find({ _id: { $in: fighterIds } }).sort({ _id: 1 });
  assert.equal(
    fighters.every(
      (fighter) => fighter.wins + fighter.losses + fighter.draws === 1
    ),
    true
  );
});

test("rechaza reutilizar una clave idempotente para participantes diferentes", async () => {
  await createFighters();
  const request = combatRequest("conflict");
  await resolveCombat(request);

  await assert.rejects(
    resolveCombat({ ...request, opponentFighterId: new mongoose.Types.ObjectId() }),
    (error) =>
      error instanceof CombatServiceError &&
      error.statusCode === 409 &&
      error.code === "IDEMPOTENCY_KEY_REUSED"
  );
});

test("un entrenamiento concede 5 XP y no cambia ELO", async () => {
  await createFighters();
  const battle = await resolveCombat(combatRequest("training", "training"));
  const fighters = await Fighter.find({ _id: { $in: fighterIds } }).sort({ _id: 1 });

  assert.ok(battle.participants.every(({ result }) => result.xpGained === 5));
  assert.ok(battle.participants.every(({ result }) => result.eloChange === 0));
  assert.ok(fighters.every((fighter) => fighter.elo === 1000));
});

test("un error al aplicar recompensas revierte la pelea y evita aparentar una victoria", async () => {
  const initialFighters = await createFighters();
  const originalBulkWrite = Fighter.bulkWrite;
  const failure = new Error("Simulated fighter update failure.");
  Fighter.bulkWrite = async () => {
    throw failure;
  };

  try {
    await assert.rejects(
      resolveCombat(combatRequest("rollback")),
      (error) => error === failure
    );
  } finally {
    Fighter.bulkWrite = originalBulkWrite;
  }

  const [battles, fighters] = await Promise.all([
    findBattles(),
    Fighter.find({ _id: { $in: fighterIds } }).sort({ _id: 1 })
  ]);
  assert.equal(battles.length, 0);
  assert.deepEqual(
    fighters.map(({ xp, elo, wins, losses, draws }) => ({
      xp,
      elo,
      wins,
      losses,
      draws
    })),
    initialFighters.map(({ xp, elo, wins, losses, draws }) => ({
      xp,
      elo,
      wins,
      losses,
      draws
    }))
  );
});

test("rechaza entradas inválidas antes de crear una pelea", async () => {
  await createFighters();

  await assert.rejects(
    resolveCombat({ ...combatRequest("invalid"), extra: true }),
    (error) =>
      error instanceof CombatServiceError &&
      error.statusCode === 400 &&
      error.code === "INVALID_COMBAT_REQUEST"
  );
  await assert.rejects(
    resolveCombat({
      ...combatRequest("missing"),
      opponentFighterId: new mongoose.Types.ObjectId()
    }),
    (error) =>
      error instanceof CombatServiceError &&
      error.statusCode === 404 &&
      error.code === "COMBATANT_NOT_FOUND"
  );
  assert.equal((await findBattles()).length, 0);
});
