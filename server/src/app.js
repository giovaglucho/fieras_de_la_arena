import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import { isDatabaseConnected } from "./database.js";
import corsMiddleware from "./middleware/cors.js";
import { ApiError, errorHandler } from "./middleware/errorHandler.js";
import sessionMiddleware from "./middleware/session.js";
import arenaRouter from "./routes/arena.js";
import arenaV2Router from "./routes/arenaV2.js";
import authRouter from "./routes/auth.js";
import battlesRouter from "./routes/battles.js";
import fightersRouter from "./routes/fighters.js";
import fightersV2Router from "./routes/fightersV2.js";
import leaderboardsRouter from "./routes/leaderboards.js";
import profilesRouter from "./routes/profiles.js";
import referralsRouter from "./routes/referrals.js";

const isProduction = process.env.NODE_ENV === "production";
const clientBuildPath = fileURLToPath(new URL("../../client/dist", import.meta.url));
const clientIndexPath = resolve(clientBuildPath, "index.html");

if (isProduction && !existsSync(clientIndexPath)) {
  throw new Error("Falta el build del cliente. Ejecuta el build de client antes de iniciar producción.");
}

const app = express();
const trustProxyHops = process.env.TRUST_PROXY ?? "0";

if (!/^(0|[1-9]\d*)$/.test(trustProxyHops)) {
  throw new Error("TRUST_PROXY debe ser un número entero no negativo de saltos de proxy.");
}

app.set("trust proxy", Number(trustProxyHops));
app.use(helmet({
  strictTransportSecurity: process.env.NODE_ENV === "production" ? undefined : false
}));
app.use(corsMiddleware);
app.use(express.json());
app.use(sessionMiddleware);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/battles", battlesRouter);
app.use("/api/v1/fighters", fightersRouter);
app.use("/api/v2/fighters", fightersV2Router);
app.use("/api/v1/arena", arenaRouter);
app.use("/api/v2/arena", arenaV2Router);
app.use("/api/v1/leaderboards", leaderboardsRouter);
app.use("/api/v1/profiles", profilesRouter);
app.use("/api/v1/referrals", referralsRouter);

app.get("/api/v1/health", (request, response) => {
  const databaseConnected = isDatabaseConnected();

  response.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? "ok" : "unavailable",
    database: databaseConnected ? "connected" : "disconnected"
  });
});

if (isProduction) {
  app.use(express.static(clientBuildPath));
  app.get("/{*path}", (request, response, next) => {
    if (
      request.path === "/api" ||
      request.path.startsWith("/api/") ||
      request.path.startsWith("/assets/") ||
      !request.accepts("html")
    ) {
      return next();
    }

    return response.sendFile(clientIndexPath, (error) => {
      if (error) {
        next(error);
      }
    });
  });
}

app.use((request, response, next) => {
  next(new ApiError(404, "NOT_FOUND", "Ruta no encontrada."));
});

app.use(errorHandler);

export default app;
