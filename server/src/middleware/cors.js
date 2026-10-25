const allowedOrigin = process.env.CLIENT_URL;

if (!allowedOrigin && process.env.NODE_ENV !== "production") {
  throw new Error("Falta configurar la variable CLIENT_URL.");
}

let clientOrigin;

if (allowedOrigin) {
  try {
    const clientUrl = new URL(allowedOrigin);

    if (
      !["http:", "https:"].includes(clientUrl.protocol) ||
      clientUrl.origin !== allowedOrigin
    ) {
      throw new Error();
    }

    clientOrigin = clientUrl.origin;
  } catch {
    throw new Error("CLIENT_URL debe ser un origen HTTP o HTTPS válido, sin ruta ni barra final.");
  }
}

const allowedMethods = ["GET", "HEAD", "POST", "PUT"];
const allowedHeaders = ["content-type"];

function corsMiddleware(request, response, next) {
  if (!clientOrigin) {
    return next();
  }

  const requestOrigin = request.get("Origin");

  if (requestOrigin) {
    response.vary("Origin");
  }

  if (requestOrigin !== clientOrigin) {
    return next();
  }

  response.setHeader("Access-Control-Allow-Origin", clientOrigin);
  response.setHeader("Access-Control-Allow-Credentials", "true");

  if (request.method !== "OPTIONS") {
    return next();
  }

  const requestedMethod = request.get("Access-Control-Request-Method")?.toUpperCase();
  const requestedHeaders = request.get("Access-Control-Request-Headers");
  const headersAreAllowed = !requestedHeaders || requestedHeaders
    .split(",")
    .every((header) => allowedHeaders.includes(header.trim().toLowerCase()));

  if (!allowedMethods.includes(requestedMethod) || !headersAreAllowed) {
    return response.sendStatus(403);
  }

  response.setHeader("Access-Control-Allow-Methods", allowedMethods.join(", "));
  if (requestedHeaders) {
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  response.setHeader("Access-Control-Max-Age", "600");

  return response.sendStatus(204);
}

export default corsMiddleware;
