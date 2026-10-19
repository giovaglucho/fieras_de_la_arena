import express from "express";
import { isDatabaseConnected } from "./database.js";
import { ApiError, errorHandler } from "./middleware/errorHandler.js";
import authRouter from "./routes/auth.js";

const app = express();

app.use(express.json());
app.use("/api/v1/auth", authRouter);

app.get("/api/v1/health", (request, response) => {
  const databaseConnected = isDatabaseConnected();

  response.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? "ok" : "unavailable",
    database: databaseConnected ? "connected" : "disconnected"
  });
});

app.use((request, response, next) => {
  next(new ApiError(404, "NOT_FOUND", "Ruta no encontrada."));
});

app.use(errorHandler);

export default app;
