import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import app from "../src/app.js";
import Fighter from "../src/models/Fighter.js";
import { sessionStore } from "../src/middleware/session.js";
import User from "../src/models/User.js";

const runId = randomUUID().replaceAll("-", "");
const server = createServer(app);
const userIds = [];
let baseUrl;
let owner;
let student;
let emptyUser;
let passwordHash;

async function login(username) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: username, password: "arena password 123" })
  });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie").split(";")[0];
}

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([Fighter.init(), User.init()]);
  passwordHash = await bcrypt.hash("arena password 123", 12);
  const make = async (label, extra = {}) => {
    const user = await User.create({
      username: `ref_${label}_${runId.slice(0, 10)}`,
      email: `${label}_${runId.slice(0, 10)}@example.test`,
      passwordHash,
      ...extra
    });
    userIds.push(user._id);
    return user;
  };
  owner = await make("owner");
  student = await make("student", { referredByUserId: owner._id });
  emptyUser = await make("empty");
  await Fighter.create({ userId: owner._id, name: `uno_${runId.slice(0, 10)}`, referralCode: `ref-a-${runId}` });
  await Fighter.create({ userId: owner._id, name: `dos_${runId.slice(0, 10)}`, referralCode: `ref-b-${runId}` });
  await Fighter.create({ userId: student._id, name: `alumno_${runId.slice(0, 8)}`, referralCode: `ref-c-${runId}` });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await Fighter.deleteMany({ userId: { $in: userIds } });
  await User.deleteMany({ _id: { $in: userIds } });
  await mongoose.disconnect();
  await sessionStore.close();
});

test("v2 exige sesión y devuelve 404 si la cuenta no tiene luchadores", async () => {
  assert.equal((await fetch(`${baseUrl}/api/v2/referrals/me`)).status, 401);
  const cookie = await login(emptyUser.username);
  const response = await fetch(`${baseUrl}/api/v2/referrals/me`, { headers: { Cookie: cookie } });
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, "FIGHTER_NOT_FOUND");
});

test("v1 es ambigua con varias fichas pero v2 entrega código y alumnos", async () => {
  const cookie = await login(owner.username);
  const v1 = await fetch(`${baseUrl}/api/v1/referrals/me`, { headers: { Cookie: cookie } });
  assert.equal(v1.status, 409);

  const fighters = await Fighter.find({ userId: owner._id }).sort({ createdAt: 1, _id: 1 });
  const v2 = await fetch(`${baseUrl}/api/v2/referrals/me`, { headers: { Cookie: cookie } });
  assert.equal(v2.status, 200);
  const body = await v2.json();
  assert.equal(body.referralCode, fighters[0].referralCode, "sin ficha activa usa la más antigua");
  assert.equal(body.students.length, 1);
  assert.equal(body.students[0].username, student.username);
  assert.equal(body.students[0].fighter.level, 1);
  assert.equal(JSON.stringify(body).includes("@"), false, "no expone correos");
});

test("v2 usa el código de la ficha activa seleccionada", async () => {
  const cookie = await login(owner.username);
  const fighters = await Fighter.find({ userId: owner._id }).sort({ createdAt: 1, _id: 1 });
  const second = fighters[1];
  const select = await fetch(`${baseUrl}/api/v2/fighters/active`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ fighterId: second._id.toString() })
  });
  assert.equal(select.status, 200);
  const v2 = await fetch(`${baseUrl}/api/v2/referrals/me`, { headers: { Cookie: cookie } });
  assert.equal((await v2.json()).referralCode, second.referralCode);
});
