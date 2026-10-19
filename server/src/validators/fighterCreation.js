const ALLOWED_FIELDS = new Set(["name"]);

export function validateFighterCreation(body) {
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== ALLOWED_FIELDS.size ||
    Object.keys(body).some((field) => !ALLOWED_FIELDS.has(field))
  ) {
    return null;
  }

  if (typeof body.name !== "string") {
    return null;
  }

  const name = body.name.trim();

  if (name.length < 3 || name.length > 18) {
    return null;
  }

  return { name };
}
