import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import { migrateFighterOwnership } from "../scripts/migrateFighterOwnershipV1.js";

let connection;
let database;

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI debe estar configurada para probar la migración de propiedad.");
  }

  connection = mongoose.createConnection(process.env.MONGODB_URI, {
    dbName: `fieras_migration_${randomUUID().replaceAll("-", "")}`,
    serverSelectionTimeoutMS: 5000
  });
  await connection.asPromise();
  database = connection.db;
});

beforeEach(async () => {
  await connection.dropDatabase();
});

after(async () => {
  if (connection) {
    await connection.dropDatabase();
    await connection.close();
  }
});

test("migra índices y actividades legadas conservando propiedad y recompensas", async () => {
  const userId = new mongoose.Types.ObjectId();
  const fighterId = new mongoose.Types.ObjectId();
  const activityId = new mongoose.Types.ObjectId();
  const battleId = new mongoose.Types.ObjectId();
  const users = database.collection("users");
  const fighters = database.collection("fighters");
  const activities = database.collection("dailyactivities");

  await users.insertOne({ _id: userId });
  await fighters.insertOne({
    _id: fighterId,
    userId,
    name: "legado",
    level: 7,
    xp: 35,
    elo: 1234,
    baseStats: { health: 100, attack: 10, defense: 4, speed: 5 },
    referralCode: "codigo-legado"
  });
  await fighters.createIndex({ userId: 1 }, { name: "userId_1", unique: true });
  await activities.createIndex(
    { userId: 1, dateKey: 1 },
    { name: "userId_1_dateKey_1", unique: true }
  );
  await activities.insertOne({
    _id: activityId,
    userId,
    dateKey: "2026-10-22",
    limit: 3,
    battlesUsed: 2,
    requestIds: ["peticion-legada"],
    createdAt: new Date("2026-10-22T10:00:00.000Z"),
    updatedAt: new Date("2026-10-22T11:00:00.000Z")
  });
  const battleFixture = {
    _id: battleId,
    battleType: "pvp",
    participants: [{ snapshot: { fighterId } }],
    events: [{ type: "combat_started" }],
    seed: "semilla-legada",
    engineVersion: "1"
  };
  await database.collection("battles").insertOne(battleFixture);

  const result = await migrateFighterOwnership(database);
  const migratedFighter = await fighters.findOne({ _id: fighterId });
  const migratedActivity = await activities.findOne({ _id: activityId });
  const migratedBattle = await database.collection("battles").findOne({ _id: battleId });
  const fighterIndexes = await fighters.listIndexes().toArray();
  const activityIndexes = await activities.listIndexes().toArray();

  assert.deepEqual(result, {
    fighters: 1,
    activitiesConverted: 1,
    ownerIndexChanged: true,
    legacyActivityIndexRemoved: true
  });
  assert.equal(migratedFighter.userId.toString(), userId.toString());
  assert.equal(migratedFighter.level, 7);
  assert.equal(migratedFighter.xp, 35);
  assert.equal(migratedFighter.elo, 1234);
  assert.equal(migratedFighter.referralCode, "codigo-legado");
  assert.equal(migratedActivity.userId.toString(), userId.toString());
  assert.equal(migratedActivity.fighterId.toString(), fighterId.toString());
  assert.equal(migratedActivity.dateKey, "2026-10-22");
  assert.equal(migratedActivity.limit, 3);
  assert.equal(migratedActivity.battlesUsed, 2);
  assert.deepEqual(migratedActivity.requestIds, ["peticion-legada"]);
  assert.deepEqual(migratedBattle, battleFixture);
  assert.equal(
    fighterIndexes.find((index) => index.name === "userId_1")?.unique,
    undefined
  );
  assert.equal(
    activityIndexes.some((index) => index.name === "userId_1_dateKey_1"),
    false
  );
  assert.deepEqual(
    activityIndexes.find((index) => index.name === "fighterId_1_dateKey_1")
      ?.partialFilterExpression,
    { fighterId: { $type: "objectId" } }
  );

  assert.deepEqual(await migrateFighterOwnership(database), {
    fighters: 1,
    activitiesConverted: 0,
    ownerIndexChanged: false,
    legacyActivityIndexRemoved: false
  });
});

test("el preflight detecta índices legados sin modificar la base", async () => {
  const userId = new mongoose.Types.ObjectId();
  const fighterId = new mongoose.Types.ObjectId();
  const users = database.collection("users");
  const fighters = database.collection("fighters");
  const activities = database.collection("dailyactivities");

  await users.insertOne({ _id: userId });
  await fighters.insertOne({
    _id: fighterId,
    userId,
    name: "preflight",
    referralCode: "codigo-preflight"
  });
  await fighters.createIndex({ userId: 1 }, { name: "userId_1", unique: true });
  await activities.createIndex(
    { userId: 1, dateKey: 1 },
    { name: "userId_1_dateKey_1", unique: true }
  );
  await activities.insertOne({
    userId,
    dateKey: "2026-11-15",
    battlesUsed: 1,
    requestIds: ["preflight-request"]
  });

  const result = await migrateFighterOwnership(database, { dryRun: true });
  const fighterIndexes = await fighters.listIndexes().toArray();
  const activityIndexes = await activities.listIndexes().toArray();
  const activity = await activities.findOne({ userId });

  assert.deepEqual(result, {
    validated: true,
    fighters: 1,
    activitiesToConvert: 1,
    ownersWithMultipleFighters: 0,
    ownerIndexUnique: true,
    legacyActivityIndexPresent: true,
    fighterActivityIndexPresent: false
  });
  assert.equal(fighterIndexes.find(({ name }) => name === "userId_1").unique, true);
  assert.equal(
    activityIndexes.some(({ name }) => name === "userId_1_dateKey_1"),
    true
  );
  assert.equal(activity.fighterId, undefined);
});

test("permite completar índices si ya hay varios luchadores y las actividades están asociadas", async () => {
  const userId = new mongoose.Types.ObjectId();
  const fighterIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
  const users = database.collection("users");
  const fighters = database.collection("fighters");
  const activities = database.collection("dailyactivities");

  await users.insertOne({ _id: userId, activeFighterId: fighterIds[1] });
  await fighters.insertMany(fighterIds.map((fighterId, index) => ({
    _id: fighterId,
    userId,
    name: `multi-${index}`,
    referralCode: `codigo-multi-${index}`
  })));
  await fighters.createIndex({ userId: 1 }, { name: "userId_1" });
  await activities.createIndex(
    { userId: 1, dateKey: 1 },
    { name: "userId_1_dateKey_1", unique: true }
  );
  await activities.insertOne({
    userId,
    fighterId: fighterIds[1],
    dateKey: "2026-11-15",
    battlesUsed: 1,
    requestIds: ["associated-request"]
  });

  const result = await migrateFighterOwnership(database);
  const fighterIndexes = await fighters.listIndexes().toArray();
  const activityIndexes = await activities.listIndexes().toArray();

  assert.deepEqual(result, {
    fighters: 2,
    activitiesConverted: 0,
    ownerIndexChanged: false,
    legacyActivityIndexRemoved: true
  });
  assert.equal(fighterIndexes.find(({ name }) => name === "userId_1").unique, undefined);
  assert.equal(
    activityIndexes.some(({ name }) => name === "userId_1_dateKey_1"),
    false
  );
  assert.deepEqual(
    activityIndexes.find(({ name }) => name === "fighterId_1_dateKey_1")
      ?.partialFilterExpression,
    { fighterId: { $type: "objectId" } }
  );
});

test("rechaza sin escrituras actividades legadas de una cuenta ambigua con varias fichas", async () => {
  const userId = new mongoose.Types.ObjectId();
  const fighterIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
  const fighters = database.collection("fighters");
  const activities = database.collection("dailyactivities");

  await database.collection("users").insertOne({ _id: userId });
  await fighters.insertMany(fighterIds.map((fighterId, index) => ({
    _id: fighterId,
    userId,
    name: `ambiguous-${index}`,
    referralCode: `codigo-ambiguous-${index}`
  })));
  await activities.insertOne({
    userId,
    dateKey: "2026-11-15",
    battlesUsed: 1,
    requestIds: ["ambiguous-request"]
  });

  await assert.rejects(
    migrateFighterOwnership(database, { dryRun: true }),
    /no se puede asociar a un único luchador/
  );
  assert.equal((await activities.findOne({ userId })).fighterId, undefined);
  assert.equal(
    (await activities.listIndexes().toArray()).some(
      ({ name }) => name === "fighterId_1_dateKey_1"
    ),
    false
  );
});

test("si falla una escritura, revierte las actividades ya asociadas y conserva índices legados", async () => {
  const userId = new mongoose.Types.ObjectId();
  const fighterId = new mongoose.Types.ObjectId();
  const firstActivityId = new mongoose.Types.ObjectId("000000000000000000000001");
  const failingActivityId = new mongoose.Types.ObjectId("000000000000000000000002");
  const users = database.collection("users");
  const fighters = database.collection("fighters");
  const activities = database.collection("dailyactivities");

  await users.insertOne({ _id: userId });
  await fighters.insertOne({
    _id: fighterId,
    userId,
    name: "rollback",
    referralCode: "codigo-rollback"
  });
  await fighters.createIndex({ userId: 1 }, { name: "userId_1", unique: true });
  await activities.createIndex(
    { userId: 1, dateKey: 1 },
    { name: "userId_1_dateKey_1", unique: true }
  );
  await activities.insertMany([
    {
      _id: firstActivityId,
      userId,
      dateKey: "2026-10-21",
      battlesUsed: 1,
      requestIds: []
    },
    {
      _id: failingActivityId,
      userId,
      dateKey: "2026-10-22",
      battlesUsed: 2,
      requestIds: []
    }
  ]);
  await database.command({
    collMod: "dailyactivities",
    validator: { _id: { $ne: failingActivityId } }
  });

  await assert.rejects(migrateFighterOwnership(database));

  const activitiesAfterFailure = await activities
    .find({ userId })
    .sort({ _id: 1 })
    .toArray();
  const fighterIndexes = await fighters.listIndexes().toArray();
  const activityIndexes = await activities.listIndexes().toArray();
  assert.ok(activitiesAfterFailure.every((activity) => activity.fighterId === undefined));
  assert.equal(fighterIndexes.find((index) => index.name === "userId_1")?.unique, true);
  assert.equal(
    activityIndexes.some((index) => index.name === "userId_1_dateKey_1"),
    true
  );
  assert.equal(
    activityIndexes.some((index) => index.name === "fighterId_1_dateKey_1"),
    false
  );
});
