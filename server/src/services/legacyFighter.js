import Fighter from "../models/Fighter.js";
import { ApiError } from "../middleware/errorHandler.js";

const MULTIPLE_FIGHTERS_ERROR = {
  statusCode: 409,
  code: "MULTIPLE_FIGHTERS_REQUIRE_V2",
  message: "Esta operación requiere una versión de API compatible con varios luchadores."
};

export async function findSingleFighterForUser(userId, projection, activeFighterId) {
  const fighters = await Fighter.find({ userId })
    .select(projection)
    .limit(2);

  if (fighters.length > 1) {
    throw new ApiError(
      MULTIPLE_FIGHTERS_ERROR.statusCode,
      MULTIPLE_FIGHTERS_ERROR.code,
      MULTIPLE_FIGHTERS_ERROR.message
    );
  }

  const fighter = fighters[0] ?? null;
  if (
    activeFighterId != null &&
    (!fighter || !fighter._id.equals(activeFighterId))
  ) {
    throw new ApiError(
      409,
      "ACTIVE_FIGHTER_REQUIRED",
      "La selección activa no es válida; selecciona un luchador propio."
    );
  }

  return fighter;
}
