import { validatePagination } from "./pagination.js";

const ALLOWED_OPPONENT_FIELDS = new Set([
  "page",
  "limit",
  "q",
  "minLevel",
  "maxLevel"
]);

function parseLevel(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const level = Number(value);
  return Number.isSafeInteger(level) ? level : null;
}

export function validateOpponentQuery(query) {
  if (Object.keys(query).some((field) => !ALLOWED_OPPONENT_FIELDS.has(field))) {
    return null;
  }

  const pagination = validatePagination(query);
  const minLevel = parseLevel(query.minLevel);
  const maxLevel = parseLevel(query.maxLevel);
  const search = query.q;

  if (
    !pagination ||
    minLevel === null ||
    maxLevel === null ||
    (minLevel !== undefined &&
      maxLevel !== undefined &&
      minLevel > maxLevel) ||
    (search !== undefined &&
      (typeof search !== "string" || search.length > 18))
  ) {
    return null;
  }

  return {
    ...pagination,
    q: search?.trim() ?? "",
    minLevel,
    maxLevel
  };
}
