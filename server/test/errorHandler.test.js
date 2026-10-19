import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import express from "express";
import apiApp from "../src/app.js";
import { ApiError, errorHandler } from "../src/middleware/errorHandler.js";

const errorTestApp = express();

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
  assert.deepEqual(await response.json(), {
    error: {
      code: "NOT_FOUND",
      message: "Ruta no encontrada."
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
