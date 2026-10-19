export class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message);

    if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
      throw new RangeError("statusCode debe estar entre 400 y 599.");
    }

    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  if (error?.type === "entity.parse.failed") {
    return response.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "El cuerpo de la solicitud no contiene JSON válido."
      }
    });
  }

  if (error instanceof ApiError) {
    return response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message
      }
    });
  }

  console.error("Error no controlado en la API:", error);
  return response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Ocurrió un error interno."
    }
  });
}
