import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import Battle from "../src/models/Battle.js";
import Fighter from "../src/models/Fighter.js";
import { TRAINING_OPPONENT } from "../src/config/trainingOpponent.js";
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
    opponentFighterId:
      battleType === "training" ? TRAINING_OPPONENT._id : fighterIds[1],
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
    const progression = participant.result.progression;
    const expectedXp = battle.winnerFighterId
      ? battle.winnerFighterId.toString() === fighterId
        ? 25
        : 10
      : 15;

    assert.equal(participant.result.xpGained, expectedXp);
    assert.equal(fighter.xp, expectedXp);
    assert.equal(fighter.elo, participant.result.eloAfter);
    assert.equal(progression.levelsGained, 0);
    assert.equal(progression.levelBefore, participant.snapshot.level);
    assert.equal(progression.levelAfter, participant.snapshot.level);
    assert.deepEqual(
      progression.statsBefore.toObject(),
      participant.snapshot.stats.toObject()
    );
    assert.deepEqual(
      progression.statsAfter.toObject(),
      participant.snapshot.stats.toObject()
    );
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
  await createFighters([{ xp: 95 }, { xp: 95 }]);
  const request = combatRequest("retry");

  const firstBattle = await resolveCombat(request);
  const repeatedBattle = await resolveCombat(request);
  const fighters = await Fighter.find({ _id: { $in: fighterIds } }).sort({ _id: 1 });

  assert.equal(repeatedBattle._id.toString(), firstBattle._id.toString());
  assert.equal(await Battle.countDocuments({ requestId: request.requestId }), 1);
  assert.equal(
    fighters.every(
      (fighter) =>
        fighter.wins + fighter.losses + fighter.draws === 1 &&
        fighter.progression.growthEvents.length === 1 &&
        fighter.progression.growthEvents[0].requestId === request.requestId
    ),
    true
  );
  assert.ok(
    firstBattle.participants.every(({ snapshot, result }) => {
      const [growthEvent] = result.growthEvents;
      const expectedStats = result.progression.statsBefore.toObject();
      expectedStats[growthEvent.stat] += growthEvent.amount;
      return (
        result.growthEvents.length === 1 &&
        growthEvent.version === "fighter-growth-v1" &&
        growthEvent.level === 2 &&
        growthEvent.amount === 1 &&
        growthEvent.requestId === request.requestId &&
        Buffer.isBuffer(growthEvent.seed) &&
        growthEvent.seed.length === 32 &&
        result.progression.levelBefore === snapshot.level &&
        result.progression.levelAfter === snapshot.level + 1 &&
        result.progression.levelsGained === 1 &&
        result.progression.xpBefore === 95 &&
        result.progression.statsBefore.health === snapshot.stats.health &&
        Object.keys(expectedStats).every(
          (stat) => result.progression.statsAfter[stat] === expectedStats[stat]
        )
      );
    })
  );
  assert.deepEqual(
    repeatedBattle.participants.map(({ result }) =>
      result.growthEvents.map((event) => ({
        level: event.level,
        seed: event.seed.toString("hex"),
        version: event.version,
        stat: event.stat,
        amount: event.amount,
        requestId: event.requestId
      }))
    ),
    firstBattle.participants.map(({ result }) =>
      result.growthEvents.map((event) => ({
        level: event.level,
        seed: event.seed.toString("hex"),
        version: event.version,
        stat: event.stat,
        amount: event.amount,
        requestId: event.requestId
      }))
    )
  );
});

test("serializa solicitudes concurrentes con la misma clave idempotente", async () => {
  await createFighters([{ xp: 95 }, { xp: 95 }]);
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
      (fighter) =>
        fighter.wins + fighter.losses + fighter.draws === 1 &&
        fighter.progression.growthEvents.length === 1
    ),
    true
  );
});

test("aplica recompensas concurrentes distintas sin perder niveles ni sorteos", async () => {
  await createFighters([{ xp: 90 }, { xp: 90 }]);

  const battles = await Promise.all([
    resolveCombat(combatRequest("growth-race-a")),
    resolveCombat(combatRequest("growth-race-b"))
  ]);
  const fighters = await Fighter.find({ _id: { $in: fighterIds } }).sort({ _id: 1 });

  assert.equal(await Battle.countDocuments({ requesterFighterId: fighterIds[0] }), 2);
  assert.equal(battles.length, 2);
  assert.ok(
    fighters.every(
      (fighter) =>
        fighter.level === 2 &&
        fighter.progression.growthEvents.length === 1 &&
        fighter.wins + fighter.losses + fighter.draws === 2
    )
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

test("un entrenamiento solo recompensa al jugador y no cambia ELO", async () => {
  const [requester, opponent] = await createFighters();
  const request = combatRequest("training", "training");
  const battle = await resolveCombat(request);
  const repeatedBattle = await resolveCombat(request);
  const [updatedRequester, unchangedOpponent] = await Promise.all([
    Fighter.findById(requester._id),
    Fighter.findById(opponent._id)
  ]);

  assert.equal(repeatedBattle._id.toString(), battle._id.toString());
  assert.equal(battle.battleType, "training");
  assert.equal(battle.participants[1].snapshot.name, TRAINING_OPPONENT.name);
  assert.deepEqual(
    battle.participants[1].snapshot.stats.toObject(),
    TRAINING_OPPONENT.baseStats
  );
  assert.equal(battle.participants[0].result.xpGained, 5);
  assert.equal(battle.participants[1].result.xpGained, 0);
  assert.ok(battle.participants.every(({ result }) => result.eloChange === 0));
  assert.equal(updatedRequester.xp, 5);
  assert.equal(updatedRequester.elo, requester.elo);
  assert.equal(unchangedOpponent.xp, opponent.xp);
  assert.equal(unchangedOpponent.elo, opponent.elo);
  assert.equal(await Fighter.exists({ _id: TRAINING_OPPONENT._id }), null);
});

test("rechaza usar un luchador persistido como rival de entrenamiento", async () => {
  await createFighters();

  await assert.rejects(
    resolveCombat({
      ...combatRequest("training-real-opponent", "training"),
      opponentFighterId: fighterIds[1]
    }),
    (error) =>
      error instanceof CombatServiceError &&
      error.statusCode === 400 &&
      error.code === "INVALID_COMBAT_REQUEST"
  );
  assert.equal((await findBattles()).length, 0);
});

test("un error al aplicar recompensas revierte la pelea y evita aparentar una victoria", async () => {
  const initialFighters = await createFighters([{ xp: 90 }, { xp: 90 }]);
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
    fighters.map(({ xp, level, elo, wins, losses, draws, progression }) => ({
      xp,
      level,
      elo,
      wins,
      losses,
      draws,
      progression
    })),
    initialFighters.map(({ xp, level, elo, wins, losses, draws, progression }) => ({
      xp,
      level,
      elo,
      wins,
      losses,
      draws,
      progression
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
