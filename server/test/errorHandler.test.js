import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import express from "express";
import apiApp from "../src/app.js";
import { ApiError, errorHandler } from "../src/middleware/errorHandler.js";
import { sessionStore } from "../src/middleware/session.js";

const errorTestApp = express();

errorTestApp.use(express.json());
errorTestApp.get("/known-error", (request, response, next) => {
  next(new ApiError(422, "INVALID_INPUT", "Los datos no son válidos."));
});

errorTestApp.get("/unexpected-error", () => {
  throw new Error("Detalle interno confidencial.");
});

errorTestApp.use(errorHandler);

const apiServer = createServer(apiApp);
const errorTestServer = createServer(errorTestApp);
let apiBaseUrl;
let errorTestBaseUrl;

before(async () => {
  await Promise.all([
    new Promise((resolve) => apiServer.listen(0, "127.0.0.1", resolve)),
    new Promise((resolve) => errorTestServer.listen(0, "127.0.0.1", resolve))
  ]);
  apiBaseUrl = `http://127.0.0.1:${apiServer.address().port}`;
  errorTestBaseUrl = `http://127.0.0.1:${errorTestServer.address().port}`;
});

after(async () => {
  await Promise.all([apiServer, errorTestServer].map((server) => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  })));
  await sessionStore.close();
});

test("responde errores conocidos con su estado y cuerpo", async () => {
  const response = await fetch(`${errorTestBaseUrl}/known-error`);

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), {
    error: {
      code: "INVALID_INPUT",
      message: "Los datos no son válidos."
    }
  });
});

test("responde rutas inexistentes con el formato común", async () => {
  const response = await fetch(`${apiBaseUrl}/missing`);

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-powered-by"), null);
  if (process.env.NODE_ENV === "production") {
    assert.match(response.headers.get("strict-transport-security"), /max-age=/);
  } else {
    assert.equal(response.headers.get("strict-transport-security"), null);
  }
  assert.deepEqual(await response.json(), {
    error: {
      code: "NOT_FOUND",
      message: "Ruta no encontrada."
    }
  });
});

test("permite CORS con credenciales solo desde el origen del cliente configurado", async () => {
  const allowedOrigin = process.env.CLIENT_URL;
  const allowedResponse = await fetch(`${apiBaseUrl}/api/v1/health`, {
    headers: { Origin: allowedOrigin }
  });
  const deniedResponse = await fetch(`${apiBaseUrl}/api/v1/health`, {
    headers: { Origin: "https://untrusted.example" }
  });

  assert.equal(allowedResponse.headers.get("access-control-allow-origin"), allowedOrigin);
  assert.equal(allowedResponse.headers.get("access-control-allow-credentials"), "true");
  assert.match(allowedResponse.headers.get("vary"), /Origin/i);
  assert.equal(deniedResponse.headers.get("access-control-allow-origin"), null);
  assert.match(deniedResponse.headers.get("vary"), /Origin/i);
});

test("acepta preflight solo para métodos y cabeceras permitidos", async () => {
  const allowedPreflight = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
    method: "OPTIONS",
    headers: {
      Origin: process.env.CLIENT_URL,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type"
    }
  });
  const deniedPreflight = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
    method: "OPTIONS",
    headers: {
      Origin: process.env.CLIENT_URL,
      "Access-Control-Request-Method": "DELETE"
    }
  });
  const deniedHeaderPreflight = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
    method: "OPTIONS",
    headers: {
      Origin: process.env.CLIENT_URL,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization"
    }
  });
  const untrustedPreflight = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://untrusted.example",
      "Access-Control-Request-Method": "POST"
    }
  });

  assert.equal(allowedPreflight.status, 204);
  assert.equal(allowedPreflight.headers.get("access-control-allow-methods"), "GET, HEAD, POST");
  assert.equal(allowedPreflight.headers.get("access-control-allow-headers"), "Content-Type");
  assert.equal(deniedPreflight.status, 403);
  assert.equal(deniedPreflight.headers.get("access-control-allow-origin"), process.env.CLIENT_URL);
  assert.equal(deniedHeaderPreflight.status, 403);
  assert.equal(untrustedPreflight.headers.get("access-control-allow-origin"), null);
});

test("rechaza JSON mal formado con un error público de solicitud", async () => {
  const response = await fetch(`${errorTestBaseUrl}/known-error`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{"
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "INVALID_JSON",
      message: "El cuerpo de la solicitud no contiene JSON válido."
    }
  });
});

test("oculta los detalles de errores internos", async () => {
  const response = await fetch(`${errorTestBaseUrl}/unexpected-error`);
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.deepEqual(body, {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Ocurrió un error interno."
    }
  });
  assert.doesNotMatch(JSON.stringify(body), /confidencial|Error:|at /);
});
