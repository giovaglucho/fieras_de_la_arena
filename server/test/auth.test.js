import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import app from "../src/app.js";
import { SESSION_COOKIE_NAME, sessionStore } from "../src/middleware/session.js";
import User from "../src/models/User.js";

const runId = randomUUID().replaceAll("-", "");
const server = createServer(app);
const sessionIds = new Set();
let user;
let baseUrl;

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI debe estar configurada para probar la autenticación.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });
  await User.init();
  user = await User.create({
    username: `auth_${runId.slice(0, 12)}`,
    email: `${runId}@example.test`,
    passwordHash: await bcrypt.hash("arena password 123", 12)
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.collection("sessions").deleteMany({
      _id: { $in: [...sessionIds] }
    });
    await User.deleteOne({ _id: user._id });
    await sessionStore.close();
    await mongoose.disconnect();
  }
});

async function requestLogin(identifier, password = "arena password 123") {
  return fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password })
  });
}

function readSessionCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie);

  const cookie = setCookie.split(";")[0];
  const encodedSessionId = cookie.slice(`${SESSION_COOKIE_NAME}=`.length);
  const sessionId = decodeURIComponent(encodedSessionId).slice(2).split(".")[0];
  sessionIds.add(sessionId);

  return { cookie, sessionId, setCookie };
}

test("rechaza credenciales inválidas con una respuesta genérica", async () => {
  const unknownUser = await requestLogin("missing-user");
  const wrongPassword = await requestLogin(user.username, "incorrecta");
  const unknownUserBody = await unknownUser.json();
  const wrongPasswordBody = await wrongPassword.json();

  assert.equal(unknownUser.status, 401);
  assert.equal(wrongPassword.status, 401);
  assert.deepEqual(unknownUserBody, wrongPasswordBody);
  assert.deepEqual(unknownUserBody, {
    error: {
      code: "INVALID_CREDENTIALS",
      message: "El usuario o la contraseña no son válidos."
    }
  });
});

test("GET /auth/me requiere sesión y devuelve solo los datos públicos", async () => {
  const anonymousResponse = await fetch(`${baseUrl}/api/v1/auth/me`);

  assert.equal(anonymousResponse.status, 401);
  assert.deepEqual(await anonymousResponse.json(), {
    error: {
      code: "AUTHENTICATION_REQUIRED",
      message: "Debes iniciar sesión para acceder a este recurso."
    }
  });

  const login = await requestLogin(user.username);
  const { cookie } = readSessionCookie(login);
  const meResponse = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Cookie: cookie }
  });

  assert.equal(meResponse.status, 200);
  assert.deepEqual(await meResponse.json(), {
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email
    }
  });
});

test("acepta el correo como identificador y regenera la sesión al iniciar", async () => {
  const response = await requestLogin(user.email.toUpperCase());
  const body = await response.json();
  const { setCookie, sessionId } = readSessionCookie(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body.user, {
    id: user._id.toString(),
    username: user.username,
    email: user.email
  });
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.equal(/;\s*Secure/i.test(setCookie), process.env.NODE_ENV === "production");
  assert.ok(await mongoose.connection.collection("sessions").findOne({ _id: sessionId }));
});

test("persiste la sesión entre solicitudes y logout la invalida", async () => {
  const response = await requestLogin(user.username);
  const { cookie, sessionId, setCookie } = readSessionCookie(response);

  assert.equal(response.status, 200);
  assert.match(setCookie, /HttpOnly/i);
  assert.ok(await mongoose.connection.collection("sessions").findOne({ _id: sessionId }));

  const logout = await fetch(`${baseUrl}/api/v1/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookie }
  });

  assert.equal(logout.status, 204);
  assert.match(logout.headers.get("set-cookie"), new RegExp(`^${SESSION_COOKIE_NAME}=`));
  assert.equal(
    await mongoose.connection.collection("sessions").findOne({ _id: sessionId }),
    null
  );
});

test("requiere una sesión para cerrar sesión", async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/logout`, { method: "POST" });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: {
      code: "AUTHENTICATION_REQUIRED",
      message: "Debes iniciar sesión para cerrar sesión."
    }
  });
});
