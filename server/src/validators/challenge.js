import mongoose from "mongoose";

const MAX_REQUEST_ID_LENGTH = 128;

export function validateChallengeRequest(body) {
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== 3 ||
    Object.keys(body).some(
      (key) =>
        !["fighterId", "opponentFighterId", "requestId"].includes(key)
    )
  ) {
    return null;
  }

  const { fighterId, opponentFighterId, requestId } = body;
  if (
    !mongoose.isObjectIdOrHexString(fighterId) ||
    !mongoose.isObjectIdOrHexString(opponentFighterId) ||
    typeof requestId !== "string" ||
    requestId.length === 0 ||
    requestId.length > MAX_REQUEST_ID_LENGTH ||
    requestId.trim() !== requestId ||
    /[\u0000-\u001f\u007f]/.test(requestId)
  ) {
    return null;
  }

  return {
    fighterId: fighterId.toString(),
    opponentFighterId: opponentFighterId.toString(),
    requestId
  };
}
