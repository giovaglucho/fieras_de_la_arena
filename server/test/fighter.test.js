import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import Fighter from "../src/models/Fighter.js";

const runId = randomUUID().replaceAll("-", "");
const namePrefix = `f${runId.slice(0, 12)}`;
const testUserIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI debe estar configurada para probar el modelo Fighter.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });
  await Fighter.init();
});

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await Fighter.deleteMany({ userId: { $in: testUserIds } });
  }

  await mongoose.disconnect();
});

test("aplica valores iniciales, normaliza el nombre y restringe índices únicos en MongoDB", async () => {
  const fighter = await Fighter.create({
    userId: testUserIds[0],
    name: `  ${namePrefix.toUpperCase()}  `,
    referralCode: `ref-${runId}-one`
  });

  assert.equal(fighter.name, namePrefix);
  assert.equal(fighter.level, 1);
  assert.equal(fighter.xp, 0);
  assert.equal(fighter.elo, 1000);
  assert.deepEqual(fighter.baseStats.toObject(), {
    health: 100,
    attack: 10,
    defense: 4,
    speed: 5
  });
  assert.equal(fighter.wins, 0);
  assert.equal(fighter.losses, 0);
  assert.equal(fighter.draws, 0);
  assert.ok(fighter.createdAt instanceof Date);
  assert.ok(fighter.updatedAt instanceof Date);

  const indexes = await Fighter.collection.indexes();
  assert.equal(indexes.find((index) => index.name === "userId_1")?.unique, true);
  assert.equal(indexes.find((index) => index.name === "name_1")?.unique, true);
  assert.equal(indexes.find((index) => index.name === "referralCode_1")?.unique, true);
  assert.ok(indexes.some((index) => index.key.elo === -1));

  await assert.rejects(
    Fighter.create({
      userId: testUserIds[0],
      name: `${namePrefix}-alt`,
      referralCode: `ref-${runId}-two`
    }),
    (error) => error.code === 11000 && error.keyPattern.userId === 1
  );
  await assert.rejects(
    Fighter.create({
      userId: testUserIds[1],
      name: namePrefix.toUpperCase(),
      referralCode: `ref-${runId}-three`
    }),
    (error) => error.code === 11000 && error.keyPattern.name === 1
  );
  await assert.rejects(
    Fighter.create({
      userId: testUserIds[1],
      name: `${namePrefix}-alt`,
      referralCode: `ref-${runId}-one`
    }),
    (error) => error.code === 11000 && error.keyPattern.referralCode === 1
  );
});
