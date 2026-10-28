function getSafeErrorDetails(error) {
  const details = [];
  const seen = new Set();
  let current = error;

  while (current && typeof current === "object" && !seen.has(current) && details.length < 5) {
    seen.add(current);

    const name = typeof current.name === "string" && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(current.name)
      ? current.name
      : "Error";
    const detail = { name };
    const code = current.code;

    if (
      (typeof code === "number" && Number.isFinite(code)) ||
      (typeof code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(code))
    ) {
      detail.code = code;
    }
    if (code === 11000 && current.keyPattern && typeof current.keyPattern === "object") {
      detail.duplicateKeyFields = Object.keys(current.keyPattern);
    }

    details.push(detail);
    current = current.cause;
  }

  if (details.length === 0) {
    details.push({ name: error === null ? "null" : typeof error });
  }

  return details;
}

export function logOperationalError(event, error, context = {}) {
  const logEntry = {
    event,
    errors: getSafeErrorDetails(error)
  };

  if (typeof context.method === "string" && /^[A-Z]{3,10}$/.test(context.method)) {
    logEntry.method = context.method;
  }
  if (
    typeof context.route === "string" &&
    context.route.length <= 200 &&
    !context.route.includes("?")
  ) {
    logEntry.route = context.route;
  }
  if (Number.isInteger(context.statusCode) && context.statusCode >= 400 && context.statusCode <= 599) {
    logEntry.statusCode = context.statusCode;
  }

  console.error(JSON.stringify(logEntry));
}
