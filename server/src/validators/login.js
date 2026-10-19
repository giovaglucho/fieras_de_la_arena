const ALLOWED_FIELDS = new Set(["identifier", "password"]);
const MAX_IDENTIFIER_LENGTH = 254;
const MAX_PASSWORD_BYTES = 72;

export function validateLogin(body) {
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== ALLOWED_FIELDS.size ||
    Object.keys(body).some((field) => !ALLOWED_FIELDS.has(field))
  ) {
    return null;
  }

  if (typeof body.identifier !== "string" || typeof body.password !== "string") {
    return null;
  }

  const identifier = body.identifier.trim().toLowerCase();
  const passwordBytes = Buffer.byteLength(body.password, "utf8");

  if (
    identifier.length === 0 ||
    identifier.length > MAX_IDENTIFIER_LENGTH ||
    passwordBytes === 0 ||
    passwordBytes > MAX_PASSWORD_BYTES
  ) {
    return null;
  }

  return { identifier, password: body.password };
}
