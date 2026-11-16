import { rateLimit } from "express-rate-limit";
import { MongoRateLimitStore } from "./mongoRateLimitStore.js";

const RATE_LIMIT_MESSAGE = "Has enviado demasiadas solicitudes. Inténtalo de nuevo más tarde.";

// Los contadores viven en MongoDB (persisten y se comparten entre instancias).
// RATE_LIMIT_STORE=memory los mantiene en memoria del proceso (lo usan las pruebas).
const useMongoStore = (process.env.RATE_LIMIT_STORE ?? "mongo") !== "memory";

// Con skipFailedRequests, estas respuestas dejan de contar: son errores que la persona
// puede corregir (p. ej. 400 de validación) y no deberían bloquearla.
const ignoreStatuses = (...statuses) => (request, response) =>
  !statuses.includes(response.statusCode);

function secondsUntil(resetTime) {
  return resetTime
    ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
    : undefined;
}

function createRateLimit({ name, limit, windowMs, keyGenerator, ...options }) {
  return rateLimit({
    limit,
    windowMs,
    ...(keyGenerator ? { keyGenerator } : {}),
    ...(useMongoStore ? { store: new MongoRateLimitStore(name) } : {}),
    passOnStoreError: true,
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
    handler(request, response) {
      const retryAfterSeconds = secondsUntil(request.rateLimit?.resetTime);
      if (retryAfterSeconds) {
        response.setHeader("Retry-After", String(retryAfterSeconds));
      }
      return response.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: RATE_LIMIT_MESSAGE,
          ...(retryAfterSeconds ? { retryAfterSeconds } : {})
        }
      });
    }
  });
}

function readPositiveInteger(name, fallback) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error(`${name} debe ser un entero positivo.`);
  }
  return Number(value);
}

// Solo se ignoran los 400 (formato inválido). Los 409 siguen contando para que no se pueda
// averiguar sin límite qué usuarios o correos ya existen.
export const registrationRateLimit = createRateLimit({
  name: "register",
  limit: readPositiveInteger("REGISTRATION_RATE_LIMIT", 5),
  windowMs: 60 * 60 * 1000,
  skipFailedRequests: true,
  requestWasSuccessful: ignoreStatuses(400)
});

// Solo cuentan los intentos fallidos; iniciar sesión correctamente no consume el cupo.
export const loginRateLimit = createRateLimit({
  name: "login",
  limit: readPositiveInteger("LOGIN_RATE_LIMIT", 10),
  windowMs: 15 * 60 * 1000,
  skipSuccessfulRequests: true
});

const accountKey = (request) => request.user._id.toString();

const fighterCreationWindowMs = readPositiveInteger(
  "FIGHTER_CREATION_WINDOW_MS",
  60 * 60 * 1000
);
export const fighterCreationAccountRateLimit = createRateLimit({
  name: "fighter-create-account",
  limit: readPositiveInteger("FIGHTER_CREATION_ACCOUNT_LIMIT", 5),
  windowMs: fighterCreationWindowMs,
  keyGenerator: accountKey,
  skipFailedRequests: true,
  requestWasSuccessful: ignoreStatuses(400, 409)
});
export const fighterCreationIpRateLimit = createRateLimit({
  name: "fighter-create-ip",
  limit: readPositiveInteger("FIGHTER_CREATION_IP_LIMIT", 30),
  windowMs: fighterCreationWindowMs,
  skipFailedRequests: true,
  requestWasSuccessful: ignoreStatuses(400, 409)
});

export const fightRateLimit = createRateLimit({
  name: "fight",
  limit: 5,
  windowMs: 60 * 1000,
  keyGenerator: accountKey,
  skipFailedRequests: true,
  requestWasSuccessful: ignoreStatuses(400, 404, 409)
});

export const sensitiveReadRateLimit = createRateLimit({
  name: "sensitive-read",
  limit: readPositiveInteger("SENSITIVE_READ_RATE_LIMIT", 60),
  windowMs: 60 * 1000,
  keyGenerator: accountKey
});
