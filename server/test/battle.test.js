import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import Battle from "../src/models/Battle.js";
import Fighter from "../src/models/Fighter.js";

const runId = randomUUID().replaceAll("-", "");
const fighterIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI debe estar configurada para probar el modelo Battle.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });
  await Battle.init();
  await Fighter.init();
});

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await Battle.deleteMany({
      "participants.snapshot.fighterId": { $in: fighterIds }
    });
    await Fighter.deleteMany({ _id: { $in: fighterIds } });
  }

  await mongoose.disconnect();
});

test("conserva instantáneas, eventos y resultados aunque cambien los luchadores", async () => {
  const fighters = await Promise.all(
    fighterIds.map((userId, index) =>
      Fighter.create({
        _id: fighterIds[index],
        userId,
        name: `b${runId.slice(0, 10)}${index}`,
        referralCode: `battle-${runId}-${index}`
      })
    )
  );
  const snapshots = fighters.map((fighter) => ({
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
  }));
  const events = [
    { type: "combat_started", fighterIds: fighterIds.map(String) },
    {
      type: "attack",
      actionNumber: 1,
      attackerFighterId: fighterIds[0].toString(),
      targetFighterId: fighterIds[1].toString()
    },
    { type: "combat_finished", winnerFighterId: fighterIds[0].toString() }
  ];

  const battle = await Battle.create({
    battleType: "pvp",
    participants: snapshots.map((snapshot, index) => ({
      snapshot,
      result: {
        xpGained: index === 0 ? 25 : 10,
        eloChange: index === 0 ? 16 : -16,
        eloAfter: index === 0 ? 1016 : 984
      }
    })),
    winnerFighterId: fighterIds[0],
    actionCount: 1,
    seed: "test-seed",
    engineVersion: "1.0.0",
    events
  });

  await Promise.all([
    Fighter.updateOne(
      { _id: fighterIds[0] },
      { $set: { name: "changed-name", level: 4, elo: 1250 } }
    ),
    Fighter.updateOne(
      { _id: fighterIds[1] },
      { $set: { name: "changed-opponent", level: 3, elo: 900 } }
    )
  ]);

  const loadedBattle = await Battle.findById(battle._id).lean();

  assert.equal(loadedBattle.battleType, "pvp");
  assert.equal(loadedBattle.status, "completed");
  assert.equal(loadedBattle.seed, "test-seed");
  assert.equal(loadedBattle.engineVersion, "1.0.0");
  assert.equal(loadedBattle.winnerFighterId.toString(), fighterIds[0].toString());
  assert.deepEqual(
    loadedBattle.participants.map(({ snapshot }) => ({
      ...snapshot,
      fighterId: snapshot.fighterId.toString()
    })),
    snapshots.map((snapshot) => ({
      ...snapshot,
      fighterId: snapshot.fighterId.toString()
    }))
  );
  assert.deepEqual(loadedBattle.events, events);
  assert.deepEqual(
    loadedBattle.participants.map(({ result }) => result.xpGained),
    [25, 10]
  );
  assert.deepEqual(
    loadedBattle.participants.map(({ result }) => result.eloAfter),
    [1016, 984]
  );
  assert.ok(loadedBattle.createdAt instanceof Date);
});

test("rechaza batallas incompletas, participantes duplicados y ganador ajeno", async () => {
  const participant = {
    snapshot: {
      fighterId: fighterIds[0],
      name: "snapshot",
      level: 1,
      elo: 1000,
      stats: { health: 100, attack: 10, defense: 4, speed: 5 }
    },
    result: { xpGained: 10, eloChange: 0, eloAfter: 1000 }
  };
  const baseBattle = {
    battleType: "training",
    participants: [participant, { ...participant }],
    actionCount: 1,
    seed: "test-seed",
    engineVersion: "1.0.0",
    events: [{ type: "combat_finished", winnerFighterId: null }]
  };

  await assert.rejects(
    Battle.create({ ...baseBattle, status: "in_progress" }),
    (error) => error.name === "ValidationError"
  );
  await assert.rejects(
    Battle.create(baseBattle),
    (error) =>
      error.name === "ValidationError" &&
      error.errors.participants?.message.includes("two distinct fighter participants")
  );
  await assert.rejects(
    Battle.create({
      ...baseBattle,
      participants: [
        participant,
        {
          ...participant,
          snapshot: { ...participant.snapshot, fighterId: fighterIds[1] }
        }
      ],
      winnerFighterId: new mongoose.Types.ObjectId()
    }),
    (error) =>
      error.name === "ValidationError" &&
      error.errors.winnerFighterId?.message.includes("winner must be a battle participant")
  );
});

test("define índices de fecha y participante para consultas de historial", async () => {
  const indexes = await Battle.collection.indexes();

  assert.ok(indexes.some((index) => index.key.createdAt === -1));
  assert.ok(
    indexes.some(
      (index) =>
        index.key["participants.snapshot.fighterId"] === 1 && index.key.createdAt === -1
    )
  );
});
