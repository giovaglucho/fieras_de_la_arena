import { validatePagination } from "./pagination.js";

const ALLOWED_CATEGORIES = new Set(["elo", "level", "students"]);
const ALLOWED_FIELDS = new Set(["category", "page", "limit"]);

export function validateLeaderboardQuery(query) {
  if (Object.keys(query).some((field) => !ALLOWED_FIELDS.has(field))) {
    return null;
  }

  const category = query.category ?? "elo";
  if (!ALLOWED_CATEGORIES.has(category)) {
    return null;
  }

  const pagination = validatePagination({
    page: query.page,
    limit: query.limit
  });
  if (!pagination) {
    return null;
  }

  return { ...pagination, category };
}
