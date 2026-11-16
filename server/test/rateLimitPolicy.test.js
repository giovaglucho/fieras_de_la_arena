import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import app from "../src/app.js";
import { MongoRateLimitStore } from "../src/middleware/mongoRateLimitStore.js";
import { sessionStore } from "../src/middleware/session.js";
import Fighter from "../src/models/Fighter.js";
import User from "../src/models/User.js";

const runId = randomUUID().replaceAll("-", "");
const server = createServer(app);
const createdUsernames = [];
let baseUrl;
let ipCounter = 1;

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  app.set("trust proxy", "loopback");
  await User.init();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  const users = await User.find({ username: { $in: createdUsernames } }).select("_id");
  await Fighter.deleteMany({ userId: { $in: users.map(({ _id }) => _id) } });
  await User.deleteMany({ username: { $in: createdUsernames } });
  await mongoose.connection.collection("ratelimits").deleteMany({ _id: /^test-/ });
  await mongoose.disconnect();
  await sessionStore.close();
});

const nextIp = () => `198.18.0.${ipCounter++}`;
const post = (path, body, ip) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
    body: JSON.stringify(body)
  });

test("los errores de formato del registro no consumen el cupo por IP", async () => {
  const ip = nextIp();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await post("/api/v1/auth/register", { username: "a b", email: "x", password: "1" }, ip);
    assert.equal(response.status, 400);
  }
  const username = `pol_${runId.slice(0, 12)}`;
  createdUsernames.push(username);
  const ok = await post(
    "/api/v1/auth/register",
    { username, email: `${username}@example.test`, password: "arena password 123" },
    ip
  );
  assert.equal(ok.status, 201);
});

test("los conflictos 409 del registro siguen contando (no se puede enumerar cuentas)", async () => {
  const ip = nextIp();
  const username = `pol2_${runId.slice(0, 11)}`;
  createdUsernames.push(username);
  const data = { username, email: `${username}@example.test`, password: "arena password 123" };
  assert.equal((await post("/api/v1/auth/register", data, ip)).status, 201);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.equal((await post("/api/v1/auth/register", data, ip)).status, 409);
  }
  const blocked = await post("/api/v1/auth/register", data, ip);
  assert.equal(blocked.status, 429);
});

test("los inicios de sesión correctos no consumen el cupo; los fallidos sí", async () => {
  const ip = nextIp();
  const username = `pol3_${runId.slice(0, 11)}`;
  createdUsernames.push(username);
  await User.create({
    username,
    email: `${username}@example.test`,
    passwordHash: await bcrypt.hash("arena password 123", 4)
  });
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await post("/api/v1/auth/login", { identifier: username, password: "arena password 123" }, ip);
    assert.equal(response.status, 200, `inicio correcto ${attempt}`);
  }
  for (let attempt = 0; attempt < 10; attempt += 1) {
    assert.equal((await post("/api/v1/auth/login", { identifier: username, password: "mala" }, ip)).status, 401);
  }
  const blocked = await post("/api/v1/auth/login", { identifier: username, password: "mala" }, ip);
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
});

test("MongoRateLimitStore cuenta, decrementa, reinicia y aísla por prefijo", async () => {
  const store = new MongoRateLimitStore(`test-a-${runId}`);
  const other = new MongoRateLimitStore(`test-b-${runId}`);
  store.init({ windowMs: 60_000 });
  other.init({ windowMs: 60_000 });

  assert.equal((await store.increment("k")).totalHits, 1);
  const second = await store.increment("k");
  assert.equal(second.totalHits, 2);
  assert.ok(second.resetTime.getTime() > Date.now());
  assert.equal((await other.increment("k")).totalHits, 1, "otro prefijo no comparte contador");

  await store.decrement("k");
  assert.equal((await store.increment("k")).totalHits, 2);
  await store.resetKey("k");
  assert.equal((await store.increment("k")).totalHits, 1);
  await store.resetAll();
  await other.resetAll();
});

test("MongoRateLimitStore reinicia el contador cuando vence la ventana", async () => {
  const store = new MongoRateLimitStore(`test-c-${runId}`);
  store.init({ windowMs: 60_000 });
  await store.increment("expira");
  await store.increment("expira");
  await mongoose.connection
    .collection("ratelimits")
    .updateOne({ _id: `test-c-${runId}:expira` }, { $set: { resetAt: new Date(Date.now() - 1000) } });
  assert.equal((await store.increment("expira")).totalHits, 1);
  await store.resetAll();
});

test("incrementos concurrentes no pierden cuentas", async () => {
  const store = new MongoRateLimitStore(`test-d-${runId}`);
  store.init({ windowMs: 60_000 });
  await store.increment("warm");
  const results = await Promise.all(Array.from({ length: 20 }, () => store.increment("race")));
  assert.deepEqual(results.map(({ totalHits }) => totalHits).sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
  await store.resetAll();
});
