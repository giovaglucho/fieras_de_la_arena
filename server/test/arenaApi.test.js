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
    DailyActivity.deleteMany({ fighterId: { $in: [...fighterIds] } }),
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

async function postChallenge(requestCookie, body) {
  return fetch(`${baseUrl}/api/v2/arena/challenges`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: requestCookie
    },
    body: JSON.stringify(body)
  });
}

test("las rutas de arena requieren una sesión", async () => {
  const [attempts, fight, history, opponentsV2, attemptsV2, historyV2] = await Promise.all([
    fetch(`${baseUrl}/api/v1/arena/attempts`),
    fetch(`${baseUrl}/api/v1/arena/fight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: "anonymous" })
    }),
    fetch(`${baseUrl}/api/v1/arena/history`),
    fetch(`${baseUrl}/api/v2/arena/opponents`),
    fetch(`${baseUrl}/api/v2/arena/attempts`),
    fetch(`${baseUrl}/api/v2/arena/history`)
  ]);

  assert.deepEqual(
    [
      attempts.status,
      fight.status,
      history.status,
      opponentsV2.status,
      attemptsV2.status,
      historyV2.status
    ],
    [401, 401, 401, 401, 401, 401]
  );
  for (const response of [
    attempts,
    fight,
    history,
    opponentsV2,
    attemptsV2,
    historyV2
  ]) {
    assert.equal((await response.json()).error.code, "AUTHENTICATION_REQUIRED");
  }
});

test("la API v2 lista solo rivales elegibles y devuelve cupos del luchador activo", async () => {
  await Fighter.updateOne({ _id: fighter._id }, { $set: { elo: 1000 } });

  async function createOpponent({
    name,
    usernamePrefix,
    level = 2,
    elo = 1000,
    visibility = "public",
    status = "active",
    ownerStatus = "active"
  }) {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
    const owner = await User.create({
      username: `${usernamePrefix}_${suffix}`,
      email: `${usernamePrefix}-${suffix}@example.test`,
      passwordHash,
      status: ownerStatus
    });
    userIds.add(owner._id);
    const opponent = await Fighter.create({
      userId: owner._id,
      name: `${name}${suffix.slice(0, 18 - name.length)}`,
      referralCode: `${usernamePrefix}-${suffix}`,
      level,
      elo,
      visibility,
      status
    });
    fighterIds.add(opponent._id);
    return opponent;
  }

  const visible = await createOpponent({
    name: "rival",
    usernamePrefix: "visible"
  });
  const otherVisible = await createOpponent({
    name: "rivales",
    usernamePrefix: "visible2",
    level: 4,
    elo: 1050
  });
  const privateFighter = await createOpponent({
    name: "privado",
    usernamePrefix: "private",
    visibility: "private"
  });
  const suspendedFighter = await createOpponent({
    name: "suspendido",
    usernamePrefix: "suspended",
    status: "suspended"
  });
  const suspendedOwnerFighter = await createOpponent({
    name: "cuentasuspendida",
    usernamePrefix: "suspendedowner",
    ownerStatus: "suspended"
  });
  const outOfRangeFighter = await createOpponent({
    name: "lejano",
    usernamePrefix: "outofrange",
    elo: 1201
  });

  const attemptsResponse = await fetch(`${baseUrl}/api/v2/arena/attempts`, {
    headers: { Cookie: cookie }
  });
  const attempts = await attemptsResponse.json();
  assert.equal(attemptsResponse.status, 200);
  assert.deepEqual(attempts, {
    fighterId: fighter._id.toString(),
    dateKey: new Date().toISOString().slice(0, 10),
    limit: 6,
    used: 0,
    remaining: 6
  });

  for (const query of [
    "?minLevel=4&maxLevel=2",
    "?q=%5B&unknown=value",
    "?limit=51"
  ]) {
    const invalidResponse = await fetch(
      `${baseUrl}/api/v2/arena/opponents${query}`,
      { headers: { Cookie: cookie } }
    );
    assert.equal(invalidResponse.status, 400);
    assert.equal((await invalidResponse.json()).error.code, "INVALID_OPPONENT_QUERY");
  }

  const filteredResponse = await fetch(
    `${baseUrl}/api/v2/arena/opponents?q=RIVAL&minLevel=2&maxLevel=2&limit=1`,
    { headers: { Cookie: cookie } }
  );
  const filtered = await filteredResponse.json();
  assert.equal(filteredResponse.status, 200);
  assert.deepEqual(filtered.fighters.map(({ id }) => id), [visible._id.toString()]);
  assert.deepEqual(filtered.pagination, {
    page: 1,
    limit: 1,
    totalItems: 1,
    totalPages: 1
  });
  const publicFighter = filtered.fighters[0];
  assert.equal(publicFighter.username.startsWith("visible_"), true);
  assert.equal("userId" in publicFighter, false);
  assert.equal("baseStats" in publicFighter, false);
  assert.equal("xp" in publicFighter, false);
  assert.equal("techniques" in publicFighter, false);
  assert.equal("techniqueUnlocks" in publicFighter, false);
  assert.equal("email" in publicFighter, false);
  assert.equal("passwordHash" in publicFighter, false);

  const allOpponentsResponse = await fetch(
    `${baseUrl}/api/v2/arena/opponents?limit=50`,
    { headers: { Cookie: cookie } }
  );
  const allOpponents = await allOpponentsResponse.json();
  const listedIds = allOpponents.fighters.map(({ id }) => id);
  assert.equal(listedIds.includes(visible._id.toString()), true);
  assert.equal(listedIds.includes(otherVisible._id.toString()), true);
  for (const excludedFighter of [
    fighter,
    privateFighter,
    suspendedFighter,
    suspendedOwnerFighter,
    outOfRangeFighter
  ]) {
    assert.equal(listedIds.includes(excludedFighter._id.toString()), false);
  }

  const challengeResponse = await postChallenge(cookie, {
    fighterId: fighter._id.toString(),
    opponentFighterId: visible._id.toString(),
    requestId: `catalog-${runId}`
  });
  assert.equal(challengeResponse.status, 201);

  const refreshedResponse = await fetch(
    `${baseUrl}/api/v2/arena/opponents?limit=50`,
    { headers: { Cookie: cookie } }
  );
  const refreshed = await refreshedResponse.json();
  assert.equal(
    refreshed.fighters.some(({ id }) => id === visible._id.toString()),
    false
  );

  const usedAttemptsResponse = await fetch(`${baseUrl}/api/v2/arena/attempts`, {
    headers: { Cookie: cookie }
  });
  assert.equal((await usedAttemptsResponse.json()).used, 1);
});

test("historial v2 y detalle reconocen cualquier luchador propio sin revelar combates ajenos", async () => {
  const secondFighter = await Fighter.create({
    userId: user._id,
    name: `second${runId.slice(0, 8)}`,
    referralCode: `second-${runId.slice(0, 10)}`
  });
  fighterIds.add(secondFighter._id);
  const missingSelectionResponse = await fetch(
    `${baseUrl}/api/v2/arena/attempts`,
    { headers: { Cookie: cookie } }
  );
  assert.equal(missingSelectionResponse.status, 409);
  assert.equal(
    (await missingSelectionResponse.json()).error.code,
    "ACTIVE_FIGHTER_REQUIRED"
  );
  await User.updateOne(
    { _id: user._id },
    { $set: { activeFighterId: secondFighter._id } }
  );

  const targetSuffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const targetOwner = await User.create({
    username: `history_target_${targetSuffix}`,
    email: `history-target-${targetSuffix}@example.test`,
    passwordHash
  });
  userIds.add(targetOwner._id);
  const target = await Fighter.create({
    userId: targetOwner._id,
    name: `hist${targetSuffix}`,
    referralCode: `history-${targetSuffix}`
  });
  fighterIds.add(target._id);

  const stats = { health: 100, attack: 10, defense: 4, speed: 5 };
  const battle = await Battle.create({
    battleType: "pvp",
    status: "completed",
    participants: [
      {
        snapshot: {
          fighterId: fighter._id,
          name: fighter.name,
          level: 1,
          elo: 1000,
          stats
        },
        result: { xpGained: 25, eloChange: 16, eloAfter: 1016 }
      },
      {
        snapshot: {
          fighterId: target._id,
          name: target.name,
          level: 1,
          elo: 1000,
          stats
        },
        result: { xpGained: 10, eloChange: -16, eloAfter: 984 }
      }
    ],
    winnerFighterId: fighter._id,
    requesterFighterId: fighter._id,
    requestId: `history-${runId}`,
    challengeDateKey: new Date().toISOString().slice(0, 10),
    challengePairKey: [fighter._id.toString(), target._id.toString()].sort().join(":"),
    actionCount: 2,
    seed: "history-seed",
    engineVersion: "combat-v1",
    events: [{ type: "combat_started" }]
  });

  const attemptsResponse = await fetch(`${baseUrl}/api/v2/arena/attempts`, {
    headers: { Cookie: cookie }
  });
  assert.equal((await attemptsResponse.json()).fighterId, secondFighter._id.toString());

  const historyResponse = await fetch(`${baseUrl}/api/v2/arena/history`, {
    headers: { Cookie: cookie }
  });
  const history = await historyResponse.json();
  assert.equal(historyResponse.status, 200);
  assert.deepEqual(history.battles.map(({ id }) => id), [battle._id.toString()]);
  assert.equal(history.battles[0].ownFighterId, fighter._id.toString());
  assert.equal("events" in history.battles[0], false);

  const detailResponse = await fetch(`${baseUrl}/api/v1/battles/${battle._id}`, {
    headers: { Cookie: cookie }
  });
  const detail = await detailResponse.json();
  assert.equal(detailResponse.status, 200);
  assert.equal(detail.battle.ownFighterId, fighter._id.toString());
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
  assert.equal(await DailyActivity.countDocuments({ fighterId: fighter._id }), 0);

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
  assert.equal(await DailyActivity.countDocuments({ fighterId: otherId }), 0);

  for (const query of ["?page=0", "?limit=51", "?page=1&unexpected=true"]) {
    const response = await fetch(`${baseUrl}/api/v1/arena/history${query}`, {
      headers: { Cookie: cookie }
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_PAGINATION");
  }
});

test("la API v2 fija el objetivo, valida el payload e idempotencia", async () => {
  const anonymousResponse = await fetch(`${baseUrl}/api/v2/arena/challenges`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  assert.equal(anonymousResponse.status, 401);

  for (const body of [
    {
      fighterId: fighter._id.toString(),
      opponentFighterId: fighter._id.toString(),
      requestId: "self",
      battlesUsed: 0
    }
  ]) {
    const response = await postChallenge(cookie, body);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_CHALLENGE_REQUEST");
  }
  assert.equal(await DailyActivity.countDocuments({ fighterId: fighter._id }), 0);

  await Fighter.updateOne({ _id: fighter._id }, { $set: { elo: 1000 } });
  const targetSuffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const targetOwner = await User.create({
    username: `target_${targetSuffix}`,
    email: `target-${targetSuffix}@example.test`,
    passwordHash
  });
  userIds.add(targetOwner._id);
  const target = await Fighter.create({
    userId: targetOwner._id,
    name: `t${targetSuffix}`,
    referralCode: `target-${targetSuffix}`,
    elo: 1000
  });
  fighterIds.add(target._id);
  const otherTargetOwner = await User.create({
    username: `target2_${targetSuffix}`,
    email: `target2-${targetSuffix}@example.test`,
    passwordHash
  });
  userIds.add(otherTargetOwner._id);
  const otherTarget = await Fighter.create({
    userId: otherTargetOwner._id,
    name: `u${targetSuffix}`,
    referralCode: `target2-${targetSuffix}`,
    elo: 1000
  });
  fighterIds.add(otherTarget._id);

  const request = {
    fighterId: fighter._id.toString(),
    opponentFighterId: target._id.toString(),
    requestId: `directed-${runId}`
  };
  const [firstResponse, replayResponse] = await Promise.all([
    postChallenge(cookie, request),
    postChallenge(cookie, request)
  ]);
  const [firstBody, replayBody] = await Promise.all([
    firstResponse.json(),
    replayResponse.json()
  ]);
  assert.ok([firstResponse.status, replayResponse.status].includes(201));
  assert.ok([firstResponse.status, replayResponse.status].includes(200));
  assert.equal(firstBody.battle.id, replayBody.battle.id);
  assert.ok(
    firstBody.battle.participants.some(
      ({ fighter: participant }) => participant.id === target._id.toString()
    )
  );

  const conflictingResponse = await postChallenge(cookie, {
    ...request,
    opponentFighterId: otherTarget._id.toString()
  });
  assert.equal(conflictingResponse.status, 409);
  assert.equal(
    (await conflictingResponse.json()).error.code,
    "IDEMPOTENCY_KEY_REUSED"
  );
  assert.equal(
    (await DailyActivity.findOne({ fighterId: fighter._id })).battlesUsed,
    1
  );
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
  ), JSON.stringify([firstBody.error, concurrentBody.error]));
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
  const detailBattle = (await detailResponse.json()).battle;
  assert.equal(detailBattle.ownFighterId, fighter._id.toString());
  const detailWithoutOwner = { ...detailBattle };
  delete detailWithoutOwner.ownFighterId;
  assert.deepEqual(detailWithoutOwner, firstBody.battle);

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
    (await DailyActivity.findOne({ fighterId: fighter._id })).battlesUsed,
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
