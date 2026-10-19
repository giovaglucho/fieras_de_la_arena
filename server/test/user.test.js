import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import User from "../src/models/User.js";

const runId = randomUUID();
const usernamePrefix = `user-model-test-${runId}`;

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI debe estar configurada para probar el modelo User.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });
  await User.init();
});

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({ username: new RegExp(`^${usernamePrefix}`) });
  }

  await mongoose.disconnect();
});

test("normaliza cuentas, aplica valores por defecto y restringe duplicados en MongoDB", async () => {
  const referrer = await User.create({
    username: `${usernamePrefix}-referrer`,
    email: `${runId}-referrer@example.test`,
    passwordHash: "test-hash"
  });
  const user = await User.create({
    username: `  ${usernamePrefix}-PLAYER  `,
    email: `  ${runId}-PLAYER@EXAMPLE.TEST  `,
    passwordHash: "test-hash",
    referredByUserId: referrer._id
  });

  assert.equal(user.username, `${usernamePrefix}-player`);
  assert.equal(user.email, `${runId}-player@example.test`);
  assert.equal(user.role, "user");
  assert.equal(user.status, "active");
  assert.equal(referrer.referredByUserId, null);
  assert.equal(user.referredByUserId.toString(), referrer._id.toString());
  assert.ok(user.createdAt instanceof Date);
  assert.ok(user.updatedAt instanceof Date);
  assert.equal(user.lastLoginAt, null);

  const loadedUser = await User.findById(user._id);
  assert.equal(loadedUser.passwordHash, undefined);
  assert.equal(loadedUser.referredByUserId.toString(), referrer._id.toString());

  const indexes = await User.collection.indexes();
  assert.equal(indexes.find((index) => index.name === "username_1")?.unique, true);
  assert.equal(indexes.find((index) => index.name === "email_1")?.unique, true);

  await assert.rejects(
    User.create({
      username: user.username.toUpperCase(),
      email: `${runId}-duplicate-username@example.test`,
      passwordHash: "test-hash"
    }),
    (error) => error.code === 11000
  );
  await assert.rejects(
    User.create({
      username: `${usernamePrefix}-duplicate-email`,
      email: user.email.toUpperCase(),
      passwordHash: "test-hash"
    }),
    (error) => error.code === 11000
  );
  await assert.rejects(
    User.create({
      username: `${usernamePrefix}-invalid-role`,
      email: `${runId}-invalid-role@example.test`,
      passwordHash: "test-hash",
      role: "owner"
    }),
    (error) => error.name === "ValidationError"
  );
  await assert.rejects(
    User.create({
      username: `${usernamePrefix}-invalid-status`,
      email: `${runId}-invalid-status@example.test`,
      passwordHash: "test-hash",
      status: "deleted"
    }),
    (error) => error.name === "ValidationError"
  );
});
