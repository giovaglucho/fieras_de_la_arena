const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

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

export function validatePagination(query) {
  const limit = parsePositiveInteger(query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const maxPage = Math.floor(Number.MAX_SAFE_INTEGER / (limit || 1)) + 1;
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE, maxPage);
  if (page === null || limit === null) {
    return null;
  }

  return { page, limit, skip: (page - 1) * limit };
}
