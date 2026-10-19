import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import app from "../src/app.js";
import { sessionStore } from "../src/middleware/session.js";
import Fighter from "../src/models/Fighter.js";
import User from "../src/models/User.js";

const runId = randomUUID().replaceAll("-", "");
const usernamePrefix = `reg${runId.slice(0, 12)}`;
const server = createServer(app);
let baseUrl;
let registrationCounter = 0;

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI debe estar configurada para probar el registro.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });
  await User.init();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  if (mongoose.connection.readyState === 1) {
    const users = await User.find({ username: new RegExp(`^${usernamePrefix}`) }).select("_id");
    const userIds = users.map((user) => user._id);
    await Fighter.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    await mongoose.disconnect();
  }

  await sessionStore.close();
});

function registrationUrl() {
  return `${baseUrl}/api/v1/auth/register`;
}

function registrationData(overrides = {}) {
  const sequence = registrationCounter++;

  return {
    username: `${usernamePrefix}_${sequence}`,
    email: `${sequence}-${runId}@example.test`,
    password: "arena password 123",
    ...overrides
  };
}

async function createReferrer(suffix) {
  const user = await User.create({
    username: `${usernamePrefix}_ref${suffix}`,
    email: `${suffix}-${runId}@example.test`,
    passwordHash: "test-hash"
  });
  const fighter = await Fighter.create({
    userId: user._id,
    name: `f-${runId.slice(0, 8)}-${suffix}`,
    referralCode: randomUUID().replaceAll("-", "")
  });

  return { user, fighter };
}

async function register(data) {
  return fetch(registrationUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

test("crea una cuenta normalizada y solo devuelve los campos públicos", async () => {
  const password = "arena password 123";
  const response = await register(
    registrationData({
      username: `  ${usernamePrefix.toUpperCase()}_PLAYER  `,
      email: `  ${runId.toUpperCase()}@EXAMPLE.TEST  `,
      password
    })
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.deepEqual(body.user, {
    id: body.user.id,
    username: `${usernamePrefix}_player`,
    email: `${runId}@example.test`
  });
  assert.equal(response.headers.get("set-cookie"), null);
  assert.doesNotMatch(JSON.stringify(body), /password|hash/i);

  const user = await User.findById(body.user.id).select("+passwordHash");
  assert.ok(user.passwordHash);
  assert.notEqual(user.passwordHash, password);
  assert.equal(await bcrypt.compare(password, user.passwordHash), true);
  assert.equal(user.referredByUserId, null);
});

test("rechaza entradas inválidas y campos de cuenta no permitidos", async () => {
  const invalidEntries = [
    {},
    registrationData({ username: "ab" }),
    registrationData({ username: "bad-name" }),
    registrationData({ email: "no-es-correo" }),
    registrationData({ email: "nombre..invalido@example.test" }),
    registrationData({ email: "nombre@-dominio.example" }),
    registrationData({ password: "corta" }),
    registrationData({ password: "á".repeat(37) }),
    registrationData({ referralCode: "no-es-un-codigo" }),
    registrationData({ role: "admin" })
  ];

  for (const entry of invalidEntries) {
    const response = await register(entry);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "INVALID_REGISTRATION_DATA");
  }
});

test("vincula la cuenta nueva al dueño del código de invitación válido", async () => {
  const referrer = await createReferrer("one");
  const response = await register(
    registrationData({ referralCode: ` ${referrer.fighter.referralCode.toUpperCase()} ` })
  );
  const body = await response.json();
  const user = await User.findById(body.user.id);

  assert.equal(response.status, 201);
  assert.equal(user.referredByUserId.toString(), referrer.user._id.toString());
  assert.doesNotMatch(JSON.stringify(body), /referredByUserId|referralCode/i);
});

test("rechaza un código de invitación que no corresponde a un luchador", async () => {
  const data = registrationData({ referralCode: randomUUID().replaceAll("-", "") });
  const response = await register(data);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "INVALID_REFERRAL_CODE");
  assert.equal(await User.exists({ username: data.username }), null);
});

test("no permite cambiar el referente de una cuenta ya creada", async () => {
  const firstReferrer = await createReferrer("first");
  const secondReferrer = await createReferrer("second");
  const data = registrationData({ referralCode: firstReferrer.fighter.referralCode });
  const created = await register(data);
  const createdUser = await created.json();

  const repeatedRegistration = await register({
    ...data,
    referralCode: secondReferrer.fighter.referralCode
  });
  const user = await User.findById(createdUser.user.id);

  assert.equal(created.status, 201);
  assert.equal(repeatedRegistration.status, 409);
  assert.equal(user.referredByUserId.toString(), firstReferrer.user._id.toString());
});

test("rechaza username y correo duplicados con el mismo error público", async () => {
  const original = registrationData();
  const createdResponse = await register(original);
  assert.equal(createdResponse.status, 201);

  const duplicateUsername = await register(
    registrationData({
      username: original.username.toUpperCase(),
      email: `other-${runId}@example.test`
    })
  );
  const duplicateEmail = await register(
    registrationData({
      username: `${usernamePrefix}_other`,
      email: original.email.toUpperCase()
    })
  );
  const usernameError = await duplicateUsername.json();
  const emailError = await duplicateEmail.json();

  assert.equal(duplicateUsername.status, 409);
  assert.equal(duplicateEmail.status, 409);
  assert.deepEqual(usernameError, emailError);
  assert.deepEqual(usernameError, {
    error: {
      code: "REGISTRATION_CONFLICT",
      message: "No se pudo completar el registro con esos datos."
    }
  });
});
