import { Router } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";
import { fightRateLimit } from "../middleware/rateLimit.js";
import {
  ChallengeServiceError,
  startDirectedChallenge
} from "../services/challengeService.js";
import { validateChallengeRequest } from "../validators/challenge.js";
import serializeBattle from "../utils/serializeBattle.js";

const router = Router();

router.post(
  "/challenges",
  requireAuth,
  fightRateLimit,
  async (request, response, next) => {
    const challengeRequest = validateChallengeRequest(request.body);
    if (!challengeRequest) {
      return next(
        new ApiError(
          400,
          "INVALID_CHALLENGE_REQUEST",
          "Envía únicamente fighterId, opponentFighterId y una clave requestId válida."
        )
      );
    }

    try {
      const result = await startDirectedChallenge(
        request.user._id,
        challengeRequest
      );
      return response
        .status(result.created ? 201 : 200)
        .json({ battle: serializeBattle(result.battle, true) });
    } catch (error) {
      if (error instanceof ChallengeServiceError) {
        return next(new ApiError(error.statusCode, error.code, error.message));
      }
      return next(error);
    }
  }
);

export default router;
