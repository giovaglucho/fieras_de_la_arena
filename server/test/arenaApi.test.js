import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { after, afterEach, before, beforeEach, test } from "node:test";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import app from "../src/app.js";
import Battle from "../src/models/Battle.js";
import DailyActivity from "../src/models/DailyActivity.js";
import Fighter from "../src/models/Fighter.js";
import { SESSION_COOKIE_NAME, sessionStore } from "../src/middleware/session.js";
import User from "../src/models/User.js";

const runId = randomUUID().replaceAll("-", "");
const server = createServer(app);
const sessionIds = new Set();
const userIds = new Set();
const fighterIds = new Set();
let passwordHash;
let baseUrl;
let user;
let fighter;
let cookie;

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI debe estar configurada para probar la API de arena.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });
  await Promise.all([
    Battle.init(),
    DailyActivity.init(),
    Fighter.init(),
    User.init()
  ]);
  passwordHash = await bcrypt.hash("arena password 123", 12);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  await sessionStore.close();
  await mongoose.disconnect();
});

beforeEach(async () => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  user = await User.create({
    username: `arena_${suffix}`,
    email: `${suffix}@example.test`,
    passwordHash
  });
  userIds.add(user._id);
  fighter = await Fighter.create({
    userId: user._id,
    name: `a${suffix}`,
    referralCode: `arena-${suffix}`,
    elo: Number.MAX_SAFE_INTEGER
  });
  fighterIds.add(fighter._id);
  cookie = await login(user);
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  await Promise.all([
    Battle.deleteMany({
      "participants.snapshot.fighterId": { $in: [...fighterIds] }
    }),
    DailyActivity.deleteMany({ userId: { $in: [...userIds] } }),
    Fighter.deleteMany({ _id: { $in: [...fighterIds] } }),
    User.deleteMany({ _id: { $in: [...userIds] } }),
    mongoose.connection.collection("sessions").deleteMany({
      _id: { $in: [...sessionIds] }
    })
  ]);
  fighterIds.clear();
  userIds.clear();
  sessionIds.clear();
});

async function login(account) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: account.username,
      password: "arena password 123"
    })
  });
  const setCookie = response.headers.get("set-cookie");
  assert.equal(response.status, 200);
  assert.ok(setCookie);

  const rawCookie = setCookie.split(";")[0];
  const sessionId = decodeURIComponent(
    rawCookie.slice(`${SESSION_COOKIE_NAME}=`.length)
  ).slice(2).split(".")[0];
  sessionIds.add(sessionId);
  return rawCookie;
}

async function postFight(requestCookie, body) {
  return fetch(`${baseUrl}/api/v1/arena/fight`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: requestCookie
    },
    body: JSON.stringify(body)
  });
}

test("las rutas de arena requieren una sesión", async () => {
  const [attempts, fight, history] = await Promise.all([
    fetch(`${baseUrl}/api/v1/arena/attempts`),
    fetch(`${baseUrl}/api/v1/arena/fight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: "anonymous" })
    }),
    fetch(`${baseUrl}/api/v1/arena/history`)
  ]);

  assert.deepEqual([attempts.status, fight.status, history.status], [401, 401, 401]);
  for (const response of [attempts, fight, history]) {
    assert.equal((await response.json()).error.code, "AUTHENTICATION_REQUIRED");
  }
});

test("consulta intentos, valida solicitudes y no inicia combates sin luchador", async () => {
  const attemptsResponse = await fetch(`${baseUrl}/api/v1/arena/attempts`, {
    headers: { Cookie: cookie }
  });
  const attempts = await attemptsResponse.json();
  assert.equal(attemptsResponse.status, 200);
  assert.deepEqual(attempts, {
    dateKey: new Date().toISOString().slice(0, 10),
    limit: 3,
    used: 0,
    remaining: 3
  });

  for (const body of [
    {},
    { requestId: "" },
    { requestId: "with-space " },
    { requestId: "spoofed", opponentFighterId: fighter._id.toString() }
  ]) {
    const response = await postFight(cookie, body);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_FIGHT_REQUEST");
  }
  assert.equal(await DailyActivity.countDocuments({ userId: user._id }), 0);

  const otherId = new mongoose.Types.ObjectId();
  const accountWithoutFighter = await User.create({
    _id: otherId,
    username: `empty_${runId.slice(0, 8)}`,
    email: `empty-${runId}@example.test`,
    passwordHash
  });
  userIds.add(accountWithoutFighter._id);
  const accountCookie = await login(accountWithoutFighter);
  const rejectedFight = await postFight(accountCookie, { requestId: "no-fighter" });

  assert.equal(rejectedFight.status, 409);
  assert.equal((await rejectedFight.json()).error.code, "FIGHTER_REQUIRED");
  assert.equal(await DailyActivity.countDocuments({ userId: otherId }), 0);

  for (const query of ["?page=0", "?limit=51", "?page=1&unexpected=true"]) {
    const response = await fetch(`${baseUrl}/api/v1/arena/history${query}`, {
      headers: { Cookie: cookie }
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_PAGINATION");
  }
});

test("idempotencia, límite diario e historial paginado funcionan en la API", async () => {
  const request = { requestId: `arena-${runId}-1` };
  const [firstResponse, concurrentResponse] = await Promise.all([
    postFight(cookie, request),
    postFight(cookie, request)
  ]);
  const [firstBody, concurrentBody] = await Promise.all([
    firstResponse.json(),
    concurrentResponse.json()
  ]);
  assert.ok([firstResponse.status, concurrentResponse.status].every(
    (status) => status === 200 || status === 201
  ));
  assert.ok(
    [firstResponse.status, concurrentResponse.status].includes(201)
  );
  assert.equal(firstBody.battle.id, concurrentBody.battle.id);
  assert.equal(firstBody.battle.battleType, "training");
  assert.equal(firstBody.battle.participants.length, 2);
  assert.ok(firstBody.battle.events.length > 0);

  const detailResponse = await fetch(
    `${baseUrl}/api/v1/battles/${firstBody.battle.id}`,
    { headers: { Cookie: cookie } }
  );
  assert.equal(detailResponse.status, 200);
  assert.deepEqual((await detailResponse.json()).battle, firstBody.battle);

  const repeatedResponse = await postFight(cookie, request);
  const repeatedBody = await repeatedResponse.json();
  assert.equal(repeatedResponse.status, 200);
  assert.equal(repeatedBody.battle.id, firstBody.battle.id);
  assert.equal(await Battle.countDocuments({ requesterFighterId: fighter._id }), 1);

  const attemptsAfterRetry = await fetch(`${baseUrl}/api/v1/arena/attempts`, {
    headers: { Cookie: cookie }
  });
  assert.deepEqual(await attemptsAfterRetry.json(), {
    dateKey: new Date().toISOString().slice(0, 10),
    limit: 3,
    used: 1,
    remaining: 2
  });

  const secondResponse = await postFight(cookie, { requestId: `arena-${runId}-2` });
  const thirdResponse = await postFight(cookie, { requestId: `arena-${runId}-3` });
  assert.equal(secondResponse.status, 201);
  assert.equal(thirdResponse.status, 201);

  const outsiderSuffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const outsider = await User.create({
    username: `outsider_${outsiderSuffix}`,
    email: `outsider-${outsiderSuffix}@example.test`,
    passwordHash
  });
  userIds.add(outsider._id);
  const outsiderFighter = await Fighter.create({
    userId: outsider._id,
    name: `b${outsiderSuffix}`,
    referralCode: `outsider-${outsiderSuffix}`
  });
  fighterIds.add(outsiderFighter._id);
  const outsiderCookie = await login(outsider);
  const outsiderFightResponse = await postFight(outsiderCookie, {
    requestId: `outsider-${runId}`
  });
  const outsiderBattle = (await outsiderFightResponse.json()).battle;
  assert.equal(outsiderFightResponse.status, 201);

  const exhaustedResponse = await postFight(cookie, { requestId: `arena-${runId}-4` });
  assert.equal(exhaustedResponse.status, 429);
  assert.equal((await exhaustedResponse.json()).error.code, "RATE_LIMIT_EXCEEDED");
  assert.equal(
    (await DailyActivity.findOne({ userId: user._id })).battlesUsed,
    3
  );
  assert.equal(await Battle.countDocuments({ requesterFighterId: fighter._id }), 3);

  const firstPageResponse = await fetch(
    `${baseUrl}/api/v1/arena/history?page=1&limit=2`,
    { headers: { Cookie: cookie } }
  );
  const firstPage = await firstPageResponse.json();
  assert.equal(firstPageResponse.status, 200);
  assert.equal(firstPage.battles.length, 2);
  assert.deepEqual(firstPage.pagination, {
    page: 1,
    limit: 2,
    totalItems: 3,
    totalPages: 2
  });
  assert.equal("events" in firstPage.battles[0], false);

  const secondPageResponse = await fetch(
    `${baseUrl}/api/v1/arena/history?page=2&limit=2`,
    { headers: { Cookie: cookie } }
  );
  const secondPage = await secondPageResponse.json();
  assert.equal(secondPageResponse.status, 200);
  assert.equal(secondPage.battles.length, 1);
  assert.equal(secondPage.pagination.totalItems, 3);
  assert.equal(
    new Set([
      ...firstPage.battles.map(({ id }) => id),
      ...secondPage.battles.map(({ id }) => id)
    ]).size,
    3
  );
  const listedBattles = [...firstPage.battles, ...secondPage.battles];
  const sortedBattles = [...listedBattles].sort((left, right) => {
    const dateDifference = Date.parse(right.createdAt) - Date.parse(left.createdAt);
    if (dateDifference !== 0) {
      return dateDifference;
    }
    return right.id > left.id ? 1 : right.id < left.id ? -1 : 0;
  });
  assert.deepEqual(
    listedBattles.map(({ id }) => id),
    sortedBattles.map(({ id }) => id)
  );
  assert.equal(listedBattles.some(({ id }) => id === outsiderBattle.id), false);

  const outsiderHistoryResponse = await fetch(
    `${baseUrl}/api/v1/arena/history`,
    { headers: { Cookie: outsiderCookie } }
  );
  const outsiderHistory = await outsiderHistoryResponse.json();
  assert.equal(outsiderHistoryResponse.status, 200);
  assert.deepEqual(outsiderHistory.battles.map(({ id }) => id), [outsiderBattle.id]);
});

test("el detalle de combate requiere sesión y solo está disponible para participantes", async () => {
  const anonymousResponse = await fetch(
    `${baseUrl}/api/v1/battles/${new mongoose.Types.ObjectId()}`
  );
  assert.equal(anonymousResponse.status, 401);

  const fightResponse = await postFight(cookie, { requestId: `detail-${runId}` });
  const { battle } = await fightResponse.json();
  assert.equal(fightResponse.status, 201);

  for (const battleId of ["invalid-id", new mongoose.Types.ObjectId().toString()]) {
    const missingResponse = await fetch(`${baseUrl}/api/v1/battles/${battleId}`, {
      headers: { Cookie: cookie }
    });
    assert.equal(missingResponse.status, 404);
    assert.equal((await missingResponse.json()).error.code, "BATTLE_NOT_FOUND");
  }

  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const outsider = await User.create({
    username: `outsider_${suffix}`,
    email: `outsider-${suffix}@example.test`,
    passwordHash
  });
  userIds.add(outsider._id);
  const outsiderFighter = await Fighter.create({
    userId: outsider._id,
    name: `b${suffix}`,
    referralCode: `outsider-${suffix}`
  });
  fighterIds.add(outsiderFighter._id);
  const outsiderCookie = await login(outsider);
  const deniedResponse = await fetch(`${baseUrl}/api/v1/battles/${battle.id}`, {
    headers: { Cookie: outsiderCookie }
  });

  assert.equal(deniedResponse.status, 404);
  assert.equal((await deniedResponse.json()).error.code, "BATTLE_NOT_FOUND");
});
