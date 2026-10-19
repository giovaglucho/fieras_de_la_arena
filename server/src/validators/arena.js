import { validatePagination } from "./pagination.js";

const MAX_REQUEST_ID_LENGTH = 128;

export function validateFightRequest(body) {
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !Object.hasOwn(body, "requestId")
  ) {
    return null;
  }

  const { requestId } = body;
  if (
    typeof requestId !== "string" ||
    requestId.length === 0 ||
    requestId.length > MAX_REQUEST_ID_LENGTH ||
    requestId.trim() !== requestId ||
    /[\u0000-\u001f\u007f]/.test(requestId)
  ) {
    return null;
  }

  return { requestId };
}

export function validateHistoryPagination(query) {
  const allowedFields = new Set(["page", "limit"]);
  if (Object.keys(query).some((field) => !allowedFields.has(field))) {
    return null;
  }

  return validatePagination(query);
}
