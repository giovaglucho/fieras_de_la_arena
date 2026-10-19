const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
const EMAIL_LOCAL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
const EMAIL_DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const ALLOWED_FIELDS = new Set(["username", "email", "password"]);
const MIN_PASSWORD_BYTES = 8;
const MAX_PASSWORD_BYTES = 72;

function isValidEmail(email) {
  const parts = email.split("@");

  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domain] = parts;
  const labels = domain.split(".");

  return (
    localPart.length <= 64 &&
    EMAIL_LOCAL_PATTERN.test(localPart) &&
    !localPart.startsWith(".") &&
    !localPart.endsWith(".") &&
    !localPart.includes("..") &&
    labels.length >= 2 &&
    labels.every(
      (label) => label.length <= 63 && EMAIL_DOMAIN_LABEL_PATTERN.test(label)
    )
  );
}

export function validateRegistration(body) {
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== ALLOWED_FIELDS.size ||
    Object.keys(body).some((field) => !ALLOWED_FIELDS.has(field))
  ) {
    return null;
  }

  if (
    typeof body.username !== "string" ||
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    return null;
  }

  const username = body.username.trim().toLowerCase();
  const email = body.email.trim().toLowerCase();
  const passwordBytes = Buffer.byteLength(body.password, "utf8");

  if (
    !USERNAME_PATTERN.test(username) ||
    email.length > 254 ||
    !isValidEmail(email) ||
    passwordBytes < MIN_PASSWORD_BYTES ||
    passwordBytes > MAX_PASSWORD_BYTES
  ) {
    return null;
  }

  return { username, email, password: body.password };
}
