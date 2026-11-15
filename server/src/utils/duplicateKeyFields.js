export function getDuplicateKeyFields(error) {
  if (error?.code !== 11000) {
    return null;
  }

  const fields = error.keyPattern ?? error.keyValue;
  return fields && typeof fields === "object" ? fields : null;
}
