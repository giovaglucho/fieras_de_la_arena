import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import app from "../src/app.js";
import { sessionStore } from "../src/middleware/session.js";
import Fighter from "../src/models/Fighter.js";
import User from "../src/models/User.js";

const runId = randomUUID().replaceAll("-", "");
const userIds = [];
const fighterIds = [];
const server = createServer(app);
let baseUrl;
let testFighters;

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI debe estar configurada para probar la clasificación.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });
  await Promise.all([Fighter.init(), User.init()]);

  const users = await User.create(
    [0, 1, 2].map((index) => ({
      username: `leaderboard_${runId.slice(0, 10)}_${index}`,
      email: `leaderboard-${runId}-${index}@example.test`,
      passwordHash: "not-a-real-password-hash"
    }))
  );
  userIds.push(...users.map((user) => user._id));

  const students = await User.create(
    [0, 1, 2, 3].map((index) => ({
      username: `student_${runId.slice(0, 10)}_${index}`,
      email: `student-${runId}-${index}@example.test`,
      passwordHash: "not-a-real-password-hash",
      referredByUserId: users[index < 2 ? 0 : 2]._id
    }))
  );
  userIds.push(...students.map((student) => student._id));

  const fighters = await Fighter.create(
    users.map((user, index) => ({
      userId: user._id,
      name: `l${runId.slice(0, 10)}${index}`,
      referralCode: `leaderboard-${runId}-${index}`,
      elo: index === 2 ? Number.MAX_SAFE_INTEGER - 1 : Number.MAX_SAFE_INTEGER,
      level: index === 2 ? Number.MAX_SAFE_INTEGER - 1 : Number.MAX_SAFE_INTEGER
    }))
  );
  fighterIds.push(...fighters.map((fighter) => fighter._id));
  testFighters = fighters;

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await sessionStore.close();

  if (mongoose.connection.readyState === 1) {
    await Fighter.deleteMany({ _id: { $in: fighterIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    await mongoose.disconnect();
  }
});

test("la clasificación pública ordena por categoría y desempata por ID", async () => {
  for (const category of ["elo", "level"]) {
    const response = await fetch(
      `${baseUrl}/api/v1/leaderboards?category=${category}&limit=50`
    );
    const body = await response.json();
    const ownFighters = body.fighters.filter(({ id }) =>
      fighterIds.some((fighterId) => fighterId.toString() === id)
    );

    assert.equal(response.status, 200);
    assert.deepEqual(
      ownFighters.map(({ id }) => id),
      [...testFighters]
        .sort((first, second) => {
          const scoreDifference = second[category] - first[category];
          if (scoreDifference) {
            return scoreDifference;
          }

          return first._id.toString() < second._id.toString() ? -1 : 1;
        })
        .map((fighter) => fighter._id.toString())
    );
    assert.equal(
      body.fighters.find(({ id }) => id === testFighters[0]._id.toString()).username,
      `leaderboard_${runId.slice(0, 10)}_0`
    );
    assert.doesNotMatch(JSON.stringify(body), /email|password|referralCode|userId/i);
    assert.equal(body.pagination.limit, 50);
    assert.equal(typeof body.pagination.totalItems, "number");
  }
});

test("la clasificación pagina desde el servidor y limita parámetros", async () => {
  const firstPageResponse = await fetch(
    `${baseUrl}/api/v1/leaderboards?category=level&limit=1`
  );
  const firstPage = await firstPageResponse.json();
  const secondPageResponse = await fetch(
    `${baseUrl}/api/v1/leaderboards?category=level&page=2&limit=1`
  );
  const secondPage = await secondPageResponse.json();

  assert.equal(firstPageResponse.status, 200);
  assert.equal(secondPageResponse.status, 200);
  assert.equal(firstPage.pagination.page, 1);
  assert.equal(secondPage.pagination.page, 2);
  assert.notEqual(firstPage.fighters[0].id, secondPage.fighters[0].id);

  for (const query of [
    "?limit=51",
    "?page=0",
    "?unexpected=value",
    "?category=students&studentsCount=100"
  ]) {
    const response = await fetch(`${baseUrl}/api/v1/leaderboards${query}`);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_LEADERBOARD_QUERY");
  }
});

test("la clasificación de alumnos cuenta las cuentas vinculadas y desempata por ID", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/leaderboards?category=students&limit=50`
  );
  const body = await response.json();
  const ownFighters = body.fighters.filter(({ id }) =>
    fighterIds.some((fighterId) => fighterId.toString() === id)
  );

  assert.equal(response.status, 200);
  assert.deepEqual(
    ownFighters.map(({ id, studentsCount }) => ({
      id,
      studentsCount
    })),
    [
      { id: testFighters[0]._id.toString(), studentsCount: 2 },
      { id: testFighters[2]._id.toString(), studentsCount: 2 },
      { id: testFighters[1]._id.toString(), studentsCount: 0 }
    ]
  );
  assert.ok(body.pagination.totalItems >= 3);
  assert.doesNotMatch(JSON.stringify(body), /email|password|referralCode|userId/i);
});

test("la clasificación muestra una sola ficha por cuenta y excluye privadas o suspendidas", async () => {
  const multi = await User.create({
    username: `multi_${runId.slice(0, 10)}`,
    email: `multi-${runId}@example.test`,
    passwordHash: "not-a-real-password-hash"
  });
  userIds.push(multi._id);
  const created = await Fighter.create([
    { userId: multi._id, name: `ma${runId.slice(0, 10)}`, referralCode: `multi-a-${runId}`, elo: 1500, level: 3 },
    { userId: multi._id, name: `mb${runId.slice(0, 10)}`, referralCode: `multi-b-${runId}`, elo: 1700, level: 9 },
    { userId: multi._id, name: `mc${runId.slice(0, 10)}`, referralCode: `multi-c-${runId}`, elo: 9000, level: 99, visibility: "private" },
    { userId: multi._id, name: `md${runId.slice(0, 10)}`, referralCode: `multi-d-${runId}`, elo: 9500, level: 98, status: "suspended" }
  ]);
  fighterIds.push(...created.map((fighter) => fighter._id));
  const ids = new Set(created.map((fighter) => fighter._id.toString()));

  for (const category of ["elo", "level", "students"]) {
    const response = await fetch(`${baseUrl}/api/v1/leaderboards?category=${category}&limit=50`);
    assert.equal(response.status, 200);
    const body = await response.json();
    const rows = body.fighters.filter(({ id }) => ids.has(id));
    assert.equal(rows.length, 1, `${category}: una sola fila para la cuenta`);
    assert.equal(rows[0].id, created[1]._id.toString(), `${category}: la mejor ficha pública activa`);
    // Solo se revisan las filas de las cuentas de esta prueba: la base es compartida y otros
    // archivos (en paralelo) pueden borrar usuarios entre consultas.
    const ownRows = body.fighters.filter(({ id }) => fighterIds.some((fighterId) => fighterId.toString() === id));
    assert.equal(
      new Set(ownRows.map(({ username }) => username)).size,
      ownRows.length,
      `${category}: sin cuentas repetidas`
    );
  }
});
