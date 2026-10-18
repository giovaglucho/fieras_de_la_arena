import express from "express";

const app = express();

app.get("/api/v1/health", (request, response) => {
  response.status(200).json({ status: "ok" });
});

app.use((request, response) => {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Ruta no encontrada."
    }
  });
});

app.use((error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  console.error("Error no controlado en la API:", error);
  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Ocurrió un error interno."
    }
  });
});

export default app;
