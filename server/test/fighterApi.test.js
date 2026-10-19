import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import app from "../src/app.js";
import Fighter from "../src/models/Fighter.js";
import { SESSION_COOKIE_NAME, sessionStore } from "../src/middleware/session.js";
import User from "../src/models/User.js";

const runId = randomUUID().replaceAll("-", "");
const userIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const sessionIds = new Set();
const server = createServer(app);
let baseUrl;
let fighterName;

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI debe estar configurada para probar la API de luchadores.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });
  await Fighter.init();
  await User.init();

  const passwordHash = await bcrypt.hash("arena password 123", 12);
  await User.create([
    {
      _id: userIds[0],
      username: `fighter_${runId.slice(0, 12)}`,
      email: `${runId}@example.test`,
      passwordHash
    },
    {
      _id: userIds[1],
      username: `fighter_${runId.slice(12, 24)}`,
      email: `second-${runId}@example.test`,
      passwordHash
    }
  ]);

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  if (mongoose.connection.readyState === 1) {
    await Fighter.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    await mongoose.connection.collection("sessions").deleteMany({
      _id: { $in: [...sessionIds] }
    });
    await mongoose.disconnect();
  }

  await sessionStore.close();
});

async function login(userIndex) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: `fighter_${runId.slice(userIndex * 12, userIndex * 12 + 12)}`,
      password: "arena password 123"
    })
  });
  const setCookie = response.headers.get("set-cookie");
  assert.equal(response.status, 200);
  assert.ok(setCookie);

  const cookie = setCookie.split(";")[0];
  const sessionId = decodeURIComponent(
    cookie.slice(`${SESSION_COOKIE_NAME}=`.length)
  ).slice(2).split(".")[0];
  sessionIds.add(sessionId);

  return cookie;
}

async function createFighter(cookie, body) {
  return fetch(`${baseUrl}/api/v1/fighters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify(body)
  });
}

async function getMyFighter(cookie) {
  return fetch(`${baseUrl}/api/v1/fighters/me`, {
    headers: { Cookie: cookie }
  });
}

test("GET /fighters/me requiere una sesión", async () => {
  const response = await fetch(`${baseUrl}/api/v1/fighters/me`);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: {
      code: "AUTHENTICATION_REQUIRED",
      message: "Debes iniciar sesión para acceder a este recurso."
    }
  });
});

test("GET /fighters/me informa cuando la cuenta todavía no tiene luchador", async () => {
  const cookie = await login(1);
  const response = await getMyFighter(cookie);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { fighter: null });
});

test("POST /fighters requiere una sesión", async () => {
  const response = await fetch(`${baseUrl}/api/v1/fighters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "SinSesion" })
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: {
      code: "AUTHENTICATION_REQUIRED",
      message: "Debes iniciar sesión para acceder a este recurso."
    }
  });
});

test("rechaza nombres inválidos y atributos enviados por el cliente", async () => {
  const cookie = await login(0);

  for (const body of [
    {},
    { name: "ab" },
    { name: "x".repeat(19) },
    { name: 123 },
    { name: "Tramposo", level: 99 },
    { name: "Tramposo", elo: 999999 },
    { name: "Tramposo", baseStats: { health: 999999 } },
    { name: "Tramposo", userId: userIds[1].toString() }
  ]) {
    const response = await createFighter(cookie, body);

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_FIGHTER_DATA");
  }

  assert.equal(await Fighter.countDocuments({ userId: userIds[0] }), 0);
});

test("crea un luchador con valores iniciales del servidor y limita uno por cuenta", async () => {
  const cookie = await login(0);
  fighterName = `  F${runId.slice(0, 12).toUpperCase()}  `;
  const [response, concurrentResponse] = await Promise.all([
    createFighter(cookie, { name: fighterName }),
    createFighter(cookie, { name: "Concurrente" })
  ]);
  const responses = [response, concurrentResponse];
  const responseBodies = await Promise.all(responses.map((item) => item.json()));
  const createdIndex = responses.findIndex((item) => item.status === 201);
  const conflictIndex = responses.findIndex((item) => item.status === 409);
  const body = responseBodies[createdIndex];

  assert.notEqual(createdIndex, -1);
  assert.notEqual(conflictIndex, -1);
  assert.deepEqual(body.fighter, {
    id: body.fighter.id,
    name: body.fighter.name,
    level: 1,
    xp: 0,
    elo: 1000,
    baseStats: {
      health: 100,
      attack: 10,
      defense: 4,
      speed: 5
    },
    wins: 0,
    losses: 0,
    draws: 0
  });
  assert.ok(
    [fighterName.trim().toLowerCase(), "concurrente"].includes(body.fighter.name)
  );
  assert.equal(responseBodies[conflictIndex].error.code, "FIGHTER_ALREADY_EXISTS");
  fighterName = body.fighter.name;
  assert.doesNotMatch(JSON.stringify(body), /userId|referralCode/i);

  const ownFighterResponse = await getMyFighter(cookie);
  assert.equal(ownFighterResponse.status, 200);
  assert.deepEqual(await ownFighterResponse.json(), {
    fighter: {
      ...body.fighter,
      username: `fighter_${runId.slice(0, 12)}`,
      stats: {
        health: 100,
        attack: 10,
        defense: 4,
        speed: 5
      },
      xpToNextLevel: 100
    }
  });

  const storedFighter = await Fighter.findById(body.fighter.id);
  assert.equal(storedFighter.userId.toString(), userIds[0].toString());
  assert.equal(storedFighter.referralCode.length, 32);

  const secondFighter = await createFighter(cookie, { name: "OtroNombre" });
  assert.equal(secondFighter.status, 409);
  assert.equal((await secondFighter.json()).error.code, "FIGHTER_ALREADY_EXISTS");
  assert.equal(await Fighter.countDocuments({ userId: userIds[0] }), 1);

  const otherCookie = await login(1);
  const duplicateName = await createFighter(otherCookie, {
    name: fighterName.trim()
  });
  assert.equal(duplicateName.status, 409);
  assert.equal((await duplicateName.json()).error.code, "FIGHTER_NAME_TAKEN");
});

test("GET /fighters/me devuelve estadísticas efectivas y XP del nivel actual", async () => {
  const cookie = await login(0);
  const fighter = await Fighter.findOne({ userId: userIds[0] });
  await Fighter.updateOne({ _id: fighter._id }, { level: 3, xp: 25 });

  const response = await getMyFighter(cookie);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.fighter.stats, {
    health: 110,
    attack: 11,
    defense: 4,
    speed: 5
  });
  assert.equal(body.fighter.xpToNextLevel, 150);
  assert.equal(body.fighter.xp, 25);
});

test("los perfiles públicos exponen solo los campos de juego permitidos", async () => {
  const fighter = await Fighter.findOne({ userId: userIds[0] });
  const publicById = await fetch(`${baseUrl}/api/v1/fighters/${fighter._id}`);
  const publicByUsername = await fetch(
    `${baseUrl}/api/v1/profiles/fighter_${runId.slice(0, 12)}`
  );
  const publicByIdBody = await publicById.json();
  const publicByUsernameBody = await publicByUsername.json();
  const expectedProfile = {
    id: fighter._id.toString(),
    name: fighter.name,
    level: fighter.level,
    xp: fighter.xp,
    elo: fighter.elo,
    baseStats: {
      health: fighter.baseStats.health,
      attack: fighter.baseStats.attack,
      defense: fighter.baseStats.defense,
      speed: fighter.baseStats.speed
    },
    wins: fighter.wins,
    losses: fighter.losses,
    draws: fighter.draws,
    username: `fighter_${runId.slice(0, 12)}`
  };

  assert.equal(publicById.status, 200);
  assert.deepEqual(publicByIdBody, { fighter: expectedProfile });
  assert.equal(publicByUsername.status, 200);
  assert.deepEqual(publicByUsernameBody, { fighter: expectedProfile });
  for (const profile of [publicByIdBody, publicByUsernameBody]) {
    assert.doesNotMatch(
      JSON.stringify(profile),
      /email|password|session|referralCode|userId/i
    );
  }
});

test("los perfiles inexistentes responden 404, incluso con un ID inválido", async () => {
  const missingId = new mongoose.Types.ObjectId().toString();
  const missingFighter = await fetch(`${baseUrl}/api/v1/fighters/${missingId}`);
  const invalidId = await fetch(`${baseUrl}/api/v1/fighters/no-es-un-id`);
  const missingUsername = await fetch(`${baseUrl}/api/v1/profiles/usuario_inexistente`);
  const userWithoutFighter = await fetch(
    `${baseUrl}/api/v1/profiles/fighter_${runId.slice(12, 24)}`
  );

  for (const response of [missingFighter, invalidId, missingUsername, userWithoutFighter]) {
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, "PROFILE_NOT_FOUND");
  }
});
