import mongoose from "mongoose";
import { cleanFighterName } from "../utils/fighterName.js";
import { validatePagination } from "./pagination.js";
import { validateFighterAppearance } from "../game-engine/fighterCreation.js";

const MAX_REQUEST_ID_LENGTH = 128;

export function validateFighterListQuery(query) {
  const allowedFields = new Set(["page", "limit"]);
  if (Object.keys(query).some((field) => !allowedFields.has(field))) {
    return null;
  }

  return validatePagination(query);
}

export function validateFighterSelection(body) {
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !Object.hasOwn(body, "fighterId") ||
    !mongoose.isObjectIdOrHexString(body.fighterId)
  ) {
    return null;
  }

  return { fighterId: body.fighterId };
}

export function validateManagedFighterCreation(body) {
  const allowedFields = new Set(["name", "requestId", "appearance"]);
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((field) => !allowedFields.has(field)) ||
    !Object.hasOwn(body, "name") ||
    !Object.hasOwn(body, "requestId") ||
    (Object.hasOwn(body, "appearance") &&
      !validateFighterAppearance(body.appearance)) ||
    typeof body.name !== "string" ||
    typeof body.requestId !== "string"
  ) {
    return null;
  }

  const name = cleanFighterName(body.name);
  const { requestId } = body;
  if (
    !name ||
    requestId.length === 0 ||
    requestId.length > MAX_REQUEST_ID_LENGTH ||
    requestId.trim() !== requestId ||
    /[\u0000-\u001f\u007f]/.test(requestId)
  ) {
    return null;
  }

  return {
    name,
    requestId,
    appearance: Object.hasOwn(body, "appearance")
      ? validateFighterAppearance(body.appearance)
      : null
  };
}
