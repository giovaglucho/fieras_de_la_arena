import { cleanFighterName } from "../utils/fighterName.js";

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

  const name = cleanFighterName(body.name);

  if (!name) {
    return null;
  }

  return { name };
}
