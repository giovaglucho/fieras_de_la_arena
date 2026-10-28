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
import { getEquipmentById } from "../src/game-engine/equipmentCatalog.js";

const runId = randomUUID().replaceAll("-", "");
const userIds = Array.from({ length: 3 }, () => new mongoose.Types.ObjectId());
const sessionIds = new Set();
const server = createServer(app);
let baseUrl;
let fighterName;
const studentUsername = `student_${runId.slice(0, 12)}`;
const studentFighterName = `alumno_${runId.slice(0, 10)}`;

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
    },
    {
      _id: userIds[2],
      username: studentUsername,
      email: `student-${runId}@example.test`,
      passwordHash,
      referredByUserId: userIds[0]
    }
  ]);
  await Fighter.create({
    userId: userIds[2],
    name: studentFighterName,
    referralCode: `student-${runId}`
  });

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
  const identifier = userIndex === 2
    ? studentUsername
    : `fighter_${runId.slice(userIndex * 12, userIndex * 12 + 12)}`;
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier,
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

async function createManagedFighter(cookie, body) {
  return fetch(`${baseUrl}/api/v2/fighters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify(body)
  });
}

async function updateActiveFighter(cookie, body) {
  return fetch(`${baseUrl}/api/v2/fighters/active`, {
    method: "PUT",
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

async function getActiveFighter(cookie) {
  return fetch(`${baseUrl}/api/v2/fighters/active`, {
    headers: { Cookie: cookie }
  });
}

async function getMyReferralCode(cookie) {
  return fetch(`${baseUrl}/api/v1/referrals/me`, {
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

test("GET /referrals/me requiere sesión y un luchador", async () => {
  const unauthenticatedResponse = await fetch(`${baseUrl}/api/v1/referrals/me`);
  assert.equal(unauthenticatedResponse.status, 401);
  assert.equal(
    (await unauthenticatedResponse.json()).error.code,
    "AUTHENTICATION_REQUIRED"
  );

  const cookie = await login(1);
  const response = await getMyReferralCode(cookie);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: {
      code: "FIGHTER_NOT_FOUND",
      message: "Esta cuenta todavía no tiene un luchador."
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
    { name: "Tramposo", equipment: [{ itemId: "weapon-arbitrario" }] },
    { name: "Tramposo", userId: userIds[1].toString() },
    { name: "Tramposo", referralCode: "codigo-elegido-por-cliente" }
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
    baseStats: body.fighter.baseStats,
    appearance: {
      tone: "arena",
      hair: "rapado",
      clothing: "tunica-cruzada",
      accessory: "ninguno"
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
        health: body.fighter.baseStats.health,
        attack: body.fighter.baseStats.attack,
        defense: body.fighter.baseStats.defense,
        speed: body.fighter.baseStats.speed
      },
      xpToNextLevel: 100
    }
  });

  const storedFighter = await Fighter.findById(body.fighter.id);
  const approvedInitialProfiles = [
    { health: 85, attack: 10, defense: 5, speed: 5 },
    { health: 100, attack: 10, defense: 4, speed: 5 },
    { health: 115, attack: 10, defense: 3, speed: 5 }
  ];
  assert.ok(
    approvedInitialProfiles.some(
      (profile) =>
        JSON.stringify(storedFighter.baseStats.toObject()) ===
        JSON.stringify(profile)
    )
  );
  assert.equal(storedFighter.progression.version, "fighter-growth-v1");
  assert.deepEqual(storedFighter.progression.growthEvents, []);
  assert.equal(storedFighter.creation.version, "fighter-creation-v1");
  assert.equal(storedFighter.creation.seed.length, 32);
  assert.equal(storedFighter.creation.equipmentCatalogVersion, "equipment-v1");
  assert.equal(storedFighter.creation.techniqueCatalogVersion, "fighter-techniques-v1");
  assert.equal(storedFighter.techniques.length, 1);
  assert.equal(
    storedFighter.techniques[0].techniqueId,
    storedFighter.creation.initialTechniqueId
  );
  assert.equal(
    storedFighter.techniques[0].catalogVersion,
    "fighter-techniques-v1"
  );
  assert.deepEqual(storedFighter.techniqueUnlocks, []);
  assert.equal(storedFighter.equipment.length, 1);
  assert.equal(
    storedFighter.equipment[0].itemId,
    storedFighter.creation.initialWeaponId
  );
  assert.equal(storedFighter.equipment[0].catalogVersion, "equipment-v1");
  assert.deepEqual(storedFighter.equipmentUnlocks, []);
  const activeFighterResponse = await getActiveFighter(cookie);
  assert.equal(activeFighterResponse.status, 200);
  const activeFighter = (await activeFighterResponse.json()).fighter;
  assert.equal(Object.hasOwn(activeFighter, "techniques"), false);
  const initialWeapon = getEquipmentById(
    storedFighter.equipment[0].itemId,
    storedFighter.equipment[0].catalogVersion
  );
  assert.deepEqual(activeFighter.equipment, [{
    itemId: initialWeapon.id,
    catalogVersion: "equipment-v1",
    name: initialWeapon.name,
    slot: initialWeapon.slot,
    minLevel: initialWeapon.minLevel,
    modifiers: { ...initialWeapon.modifiers }
  }]);
  assert.deepEqual(activeFighter.equipmentUnlocks, []);
  const unlockedArmor = getEquipmentById("armor-yute-01", "equipment-v1");
  storedFighter.equipment.push({
    itemId: unlockedArmor.id,
    catalogVersion: "equipment-v1"
  });
  storedFighter.equipmentUnlocks.push({
    level: 2,
    seed: Buffer.alloc(32, 1),
    version: "equipment-unlock-v1",
    itemId: unlockedArmor.id,
    catalogVersion: "equipment-v1",
    requestId: "test-unlock"
  });
  await storedFighter.save();
  const unlockedFighterResponse = await getActiveFighter(cookie);
  const unlockedFighter = (await unlockedFighterResponse.json()).fighter;
  assert.deepEqual(unlockedFighter.equipmentUnlocks, [{
    level: 2,
    itemId: unlockedArmor.id,
    catalogVersion: "equipment-v1",
    item: {
      itemId: unlockedArmor.id,
      catalogVersion: "equipment-v1",
      name: unlockedArmor.name,
      slot: unlockedArmor.slot,
      minLevel: unlockedArmor.minLevel,
      modifiers: { ...unlockedArmor.modifiers }
    }
  }]);
  assert.doesNotMatch(JSON.stringify(unlockedFighter), /seed|requestId/i);
  assert.equal(storedFighter.userId.toString(), userIds[0].toString());
  assert.equal(storedFighter.referralCode.length, 32);
  assert.match(storedFighter.referralCode, /^[a-f0-9]{32}$/);
  const storedUser = await User.findById(userIds[0]);
  assert.equal(storedUser.activeFighterId.toString(), storedFighter._id.toString());

  const referralCodeResponse = await getMyReferralCode(cookie);
  assert.equal(referralCodeResponse.status, 200);
  const referralOverview = await referralCodeResponse.json();
  assert.deepEqual(referralOverview, {
    referralCode: storedFighter.referralCode,
    students: [
      {
        username: studentUsername,
        fighter: { name: studentFighterName, level: 1 }
      }
    ]
  });
  assert.doesNotMatch(
    JSON.stringify(referralOverview.students),
    /email|password|session|referralCode|referredByUserId|userId|_id/i
  );

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
  const userAfterFailedCreation = await User.findById(userIds[1]).lean();
  assert.equal(userAfterFailedCreation.activeFighterId, null);
});

test("GET /fighters/me devuelve estadísticas efectivas y XP del nivel actual", async () => {
  const cookie = await login(0);
  const fighter = await Fighter.findOne({ userId: userIds[0] });
  await Fighter.updateOne(
    { _id: fighter._id },
    {
      $set: { level: 3, xp: 25 },
      $unset: { progression: 1 }
    }
  );

  const response = await getMyFighter(cookie);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.fighter.stats, {
    health: fighter.baseStats.health + 10,
    attack: fighter.baseStats.attack + 1,
    defense: fighter.baseStats.defense,
    speed: fighter.baseStats.speed
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
    appearance: fighter.appearance.toObject(),
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

test("rechaza una selección activa obsoleta en rutas que requieren el luchador activo", async () => {
  const cookie = await login(1);
  await User.updateOne(
    { _id: userIds[1] },
    { $set: { activeFighterId: new mongoose.Types.ObjectId() } }
  );

  const response = await getMyFighter(cookie);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error.code, "ACTIVE_FIGHTER_REQUIRED");

  await User.updateOne(
    { _id: userIds[1] },
    { $unset: { activeFighterId: 1 } }
  );
});

test("las rutas singulares no eligen un luchador arbitrario para cuentas con varios", async () => {
  const cookie = await login(2);
  const firstFighter = await Fighter.findOne({ userId: userIds[2] });
  const legacyActiveResponse = await fetch(`${baseUrl}/api/v2/fighters/active`, {
    headers: { Cookie: cookie }
  });
  assert.equal(
    (await legacyActiveResponse.json()).fighter.id,
    firstFighter._id.toString()
  );
  const secondFighter = await Fighter.create({
    userId: userIds[2],
    name: `extra_${runId.slice(0, 10)}`,
    referralCode: `extra-${runId}`
  });
  const requests = [
    getMyFighter(cookie),
    getMyReferralCode(cookie),
    fetch(`${baseUrl}/api/v1/profiles/${studentUsername}`),
    fetch(`${baseUrl}/api/v1/arena/attempts`, { headers: { Cookie: cookie } }),
    fetch(`${baseUrl}/api/v1/arena/history`, { headers: { Cookie: cookie } }),
    fetch(`${baseUrl}/api/v1/battles/${new mongoose.Types.ObjectId()}`, {
      headers: { Cookie: cookie }
    }),
    createFighter(cookie, { name: "OtroLuchador" }),
    fetch(`${baseUrl}/api/v1/arena/fight`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({ requestId: `multiple-${runId}` })
    })
  ];
  const responses = await Promise.all(requests);
  const bodies = await Promise.all(responses.map((response) => response.json()));

  for (const [index, response] of responses.entries()) {
    assert.equal(response.status, 409, `request ${index} should reject ambiguous ownership`);
    assert.equal(bodies[index].error.code, "MULTIPLE_FIGHTERS_REQUIRE_V2");
  }
  assert.equal(firstFighter.userId.toString(), userIds[2].toString());
  assert.equal(secondFighter.userId.toString(), userIds[2].toString());
  const ambiguousActiveResponse = await fetch(
    `${baseUrl}/api/v2/fighters/active`,
    { headers: { Cookie: cookie } }
  );
  assert.deepEqual(await ambiguousActiveResponse.json(), { fighter: null });
  assert.equal(
    await mongoose.connection.collection("dailyactivities").countDocuments({
      fighterId: { $in: [firstFighter._id, secondFighter._id] }
    }),
    0
  );
});

test("la API v2 crea y lista luchadores propios con selección activa e idempotencia", async () => {
  const unauthenticated = await fetch(`${baseUrl}/api/v2/fighters`);
  assert.equal(unauthenticated.status, 401);

  const cookie = await login(1);
  const emptyListResponse = await fetch(`${baseUrl}/api/v2/fighters`, {
    headers: { Cookie: cookie }
  });
  assert.equal(emptyListResponse.status, 200);
  assert.deepEqual((await emptyListResponse.json()).fighters, []);

  const emptyActiveResponse = await fetch(`${baseUrl}/api/v2/fighters/active`, {
    headers: { Cookie: cookie }
  });
  assert.equal(emptyActiveResponse.status, 200);
  assert.deepEqual(await emptyActiveResponse.json(), { fighter: null });

  const unknownField = await createManagedFighter(cookie, {
    name: "valido",
    requestId: `unknown-${runId}`,
    status: "suspended"
  });
  assert.equal(unknownField.status, 400);
  assert.equal((await unknownField.json()).error.code, "INVALID_FIGHTER_DATA");

  const invalidName = await createManagedFighter(cookie, {
    name: "ab",
    requestId: `invalid-${runId}`
  });
  assert.equal(invalidName.status, 400);

  const requestId = `create-${runId}`;
  const appearance = {
    tone: "cobre",
    hair: "trenzas",
    clothing: "manto-corto",
    accessory: "cinta"
  };
  const createRequest = createManagedFighter(cookie, {
    name: `V2_${runId.slice(0, 8)}`,
    requestId,
    appearance
  });
  const retryRequest = createManagedFighter(cookie, {
    name: `v2_${runId.slice(0, 8)}`,
    requestId,
    appearance
  });
  const [firstResponse, retryResponse] = await Promise.all([
    createRequest,
    retryRequest
  ]);
  assert.deepEqual(
    [firstResponse.status, retryResponse.status].sort(),
    [200, 201]
  );
  const firstBody = await firstResponse.json();
  const retryBody = await retryResponse.json();
  const createdFighter = firstResponse.status === 201
    ? firstBody.fighter
    : retryBody.fighter;
  const retriedFighter = firstResponse.status === 200
    ? firstBody.fighter
    : retryBody.fighter;
  assert.equal(createdFighter.status, "active");
  assert.equal(createdFighter.visibility, "public");
  assert.equal(createdFighter.isActive, true);
  assert.equal(retriedFighter.id, createdFighter.id);
  assert.deepEqual(retriedFighter, createdFighter);
  assert.deepEqual(createdFighter.appearance, appearance);
  assert.ok(
    [
      { health: 85, attack: 10, defense: 5, speed: 5 },
      { health: 100, attack: 10, defense: 4, speed: 5 },
      { health: 115, attack: 10, defense: 3, speed: 5 }
    ].some((profile) => JSON.stringify(profile) === JSON.stringify(createdFighter.baseStats))
  );
  assert.doesNotMatch(
    JSON.stringify([firstBody, retryBody]),
    /userId|referralCode|creation|seed/i
  );
  assert.equal(await Fighter.countDocuments({ userId: userIds[1] }), 1);
  const persistedManagedFighter = await Fighter.findById(createdFighter.id);
  assert.equal(persistedManagedFighter.creation.version, "fighter-creation-v1");
  assert.equal(persistedManagedFighter.creation.seed.length, 32);

  const reusedKey = await createManagedFighter(cookie, {
    name: `v2_${runId.slice(0, 8)}`,
    requestId,
    appearance: {
      tone: "arcilla",
      hair: "rapado",
      clothing: "tunica-cruzada",
      accessory: "ninguno"
    }
  });
  assert.equal(reusedKey.status, 409);
  assert.equal((await reusedKey.json()).error.code, "IDEMPOTENCY_KEY_REUSED");

  const listResponse = await fetch(`${baseUrl}/api/v2/fighters?page=1&limit=1`, {
    headers: { Cookie: cookie }
  });
  assert.equal(listResponse.status, 200);
  const listBody = await listResponse.json();
  assert.equal(listBody.fighters.length, 1);
  assert.equal(listBody.pagination.totalItems, 1);
  assert.equal(listBody.pagination.totalPages, 1);
  assert.equal(listBody.fighters[0].isActive, true);

  const emptyPage = await fetch(`${baseUrl}/api/v2/fighters?page=2&limit=1`, {
    headers: { Cookie: cookie }
  });
  assert.equal(emptyPage.status, 200);
  assert.deepEqual((await emptyPage.json()).fighters, []);

  const invalidPagination = await fetch(
    `${baseUrl}/api/v2/fighters?page=1&limit=51`,
    { headers: { Cookie: cookie } }
  );
  assert.equal(invalidPagination.status, 400);
  const unknownQueryField = await fetch(
    `${baseUrl}/api/v2/fighters?status=active`,
    { headers: { Cookie: cookie } }
  );
  assert.equal(unknownQueryField.status, 400);

  const secondFighter = await Fighter.create({
    userId: userIds[1],
    name: `second_${runId.slice(0, 8)}`,
    referralCode: `second-${runId}`
  });
  const foreignFighter = await Fighter.findOne({ userId: userIds[2] });
  const foreignSelection = await updateActiveFighter(cookie, {
    fighterId: foreignFighter._id.toString()
  });
  assert.equal(foreignSelection.status, 404);
  assert.equal((await foreignSelection.json()).error.code, "FIGHTER_NOT_FOUND");

  const unknownSelectionField = await updateActiveFighter(cookie, {
    fighterId: secondFighter._id.toString(),
    status: "active"
  });
  assert.equal(unknownSelectionField.status, 400);

  await Fighter.updateOne(
    { _id: secondFighter._id },
    { $set: { status: "suspended", visibility: "private" } }
  );
  const suspendedListResponse = await fetch(`${baseUrl}/api/v2/fighters`, {
    headers: { Cookie: cookie }
  });
  const suspendedListedFighter = (await suspendedListResponse.json()).fighters.find(
    (fighter) => fighter.id === secondFighter._id.toString()
  );
  assert.equal(suspendedListedFighter.status, "suspended");
  assert.equal(suspendedListedFighter.visibility, "private");

  const suspendedSelection = await updateActiveFighter(cookie, {
    fighterId: secondFighter._id.toString()
  });
  assert.equal(suspendedSelection.status, 404);
  await Fighter.updateOne({ _id: secondFighter._id }, { $set: { status: "active" } });

  const selectedResponse = await updateActiveFighter(cookie, {
    fighterId: secondFighter._id.toString()
  });
  assert.equal(selectedResponse.status, 200);
  assert.equal((await selectedResponse.json()).fighter.id, secondFighter._id.toString());

  const activeResponse = await fetch(`${baseUrl}/api/v2/fighters/active`, {
    headers: { Cookie: cookie }
  });
  assert.equal((await activeResponse.json()).fighter.id, secondFighter._id.toString());

  const currentList = await fetch(`${baseUrl}/api/v2/fighters`, {
    headers: { Cookie: cookie }
  });
  const currentListBody = await currentList.json();
  assert.equal(currentListBody.fighters.filter((fighter) => fighter.isActive).length, 1);
  assert.equal(
    currentListBody.fighters.find((fighter) => fighter.isActive).id,
    secondFighter._id.toString()
  );
});

test("la API v2 limita la creación temporal por cuenta e IP, sin un máximo permanente", async () => {
  const cookie = await login(0);
  const accountLimit = Number(process.env.FIGHTER_CREATION_ACCOUNT_LIMIT ?? 5);
  const ipLimit = Number(process.env.FIGHTER_CREATION_IP_LIMIT ?? 30);
  const allowedCreations = Math.min(accountLimit, Math.max(0, ipLimit - 5));

  for (let index = 0; index < allowedCreations; index += 1) {
    const response = await createManagedFighter(cookie, {
      name: `limit${runId.slice(0, 7)}${index.toString(36)}`,
      requestId: `limit-${runId}-${index}`
    });
    assert.equal(response.status, 201);
  }

  const limitedResponse = await createManagedFighter(cookie, {
    name: `limitx${runId.slice(0, 7)}`,
    requestId: `limit-${runId}-exceeded`
  });
  assert.equal(limitedResponse.status, 429);
  assert.equal((await limitedResponse.json()).error.code, "RATE_LIMIT_EXCEEDED");
});
