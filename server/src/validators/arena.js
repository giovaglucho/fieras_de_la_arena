const MAX_REQUEST_ID_LENGTH = 128;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

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

function parsePositiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null;
}

export function validateHistoryPagination(query) {
  const allowedFields = new Set(["page", "limit"]);
  if (Object.keys(query).some((field) => !allowedFields.has(field))) {
    return null;
  }

  const limit = parsePositiveInteger(query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const maxPage = Math.floor(Number.MAX_SAFE_INTEGER / (limit || 1)) + 1;
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE, maxPage);
  if (page === null || limit === null) {
    return null;
  }

  return { page, limit, skip: (page - 1) * limit };
}
