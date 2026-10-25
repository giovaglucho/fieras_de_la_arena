import { rateLimit } from "express-rate-limit";

const RATE_LIMIT_MESSAGE = "Has enviado demasiadas solicitudes. Inténtalo de nuevo más tarde.";

function createRateLimit({ limit, windowMs, keyGenerator }) {
  return rateLimit({
    limit,
    windowMs,
    ...(keyGenerator ? { keyGenerator } : {}),
    standardHeaders: true,
    legacyHeaders: false,
    handler(request, response) {
      return response.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: RATE_LIMIT_MESSAGE
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

export const registrationRateLimit = createRateLimit({
  limit: 5,
  windowMs: 60 * 60 * 1000
});

export const loginRateLimit = createRateLimit({
  limit: 10,
  windowMs: 15 * 60 * 1000
});

const accountKey = (request) => request.user._id.toString();

const fighterCreationWindowMs = readPositiveInteger(
  "FIGHTER_CREATION_WINDOW_MS",
  60 * 60 * 1000
);
export const fighterCreationAccountRateLimit = createRateLimit({
  limit: readPositiveInteger("FIGHTER_CREATION_ACCOUNT_LIMIT", 5),
  windowMs: fighterCreationWindowMs,
  keyGenerator: accountKey
});
export const fighterCreationIpRateLimit = createRateLimit({
  limit: readPositiveInteger("FIGHTER_CREATION_IP_LIMIT", 30),
  windowMs: fighterCreationWindowMs
});

export const fightRateLimit = createRateLimit({
  limit: 5,
  windowMs: 60 * 1000,
  keyGenerator: accountKey
});

export const sensitiveReadRateLimit = createRateLimit({
  limit: 60,
  windowMs: 60 * 1000,
  keyGenerator: accountKey
});
