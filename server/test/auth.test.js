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
let sensitiveReadUser;
let baseUrl;

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI debe estar configurada para probar la autenticación.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });
  app.set("trust proxy", "loopback");
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
    if (sensitiveReadUser) {
      await User.deleteOne({ _id: sensitiveReadUser._id });
    }
    await sessionStore.close();
    await mongoose.disconnect();
  }
});

async function requestLogin(identifier, password = "arena password 123", ip) {
  return fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.NODE_ENV === "production" ? { "X-Forwarded-Proto": "https" } : {}),
      ...(ip ? { "X-Forwarded-For": ip } : {})
    },
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

test("rechaza campos no permitidos al iniciar sesión", async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: user.username,
      password: "arena password 123",
      userId: user._id.toString(),
      role: "admin"
    })
  });

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal((await response.json()).error.code, "INVALID_LOGIN_DATA");
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

test("rechaza datos en logout sin destruir la sesión", async () => {
  const login = await requestLogin(user.username);
  const { cookie } = readSessionCookie(login);
  const logout = await fetch(`${baseUrl}/api/v1/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify({ userId: user._id.toString(), role: "admin" })
  });
  const session = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Cookie: cookie }
  });

  assert.equal(logout.status, 400);
  assert.equal((await logout.json()).error.code, "INVALID_LOGOUT_DATA");
  assert.equal(session.status, 200);
});

test("limita los intentos de inicio de sesión por IP", async () => {
  const ip = "203.0.113.10";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await requestLogin("unknown-rate-limit-user", "incorrecta", ip);
    assert.equal(response.status, 401);
  }

  const exceeded = await requestLogin("unknown-rate-limit-user", "incorrecta", ip);
  assert.equal(exceeded.status, 429);
  assert.equal(exceeded.headers.get("set-cookie"), null);
  assert.deepEqual(await exceeded.json(), {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Has enviado demasiadas solicitudes. Inténtalo de nuevo más tarde."
    }
  });
});

test("limita las consultas privadas por cuenta", async () => {
  sensitiveReadUser = await User.create({
    username: `read_${runId.slice(0, 12)}`,
    email: `read-${runId}@example.test`,
    passwordHash: await bcrypt.hash("arena password 123", 12)
  });
  const login = await requestLogin(
    sensitiveReadUser.username,
    "arena password 123",
    "203.0.113.11"
  );
  const { cookie } = readSessionCookie(login);

  for (let requestCount = 0; requestCount < 60; requestCount += 1) {
    const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Cookie: cookie }
    });
    assert.equal(response.status, 200);
  }

  const exceeded = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Cookie: cookie }
  });
  assert.equal(exceeded.status, 429);
  assert.equal((await exceeded.json()).error.code, "RATE_LIMIT_EXCEEDED");
});
