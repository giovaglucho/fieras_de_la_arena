import { Router } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";
import {
  fightRateLimit,
  sensitiveReadRateLimit
} from "../middleware/rateLimit.js";
import {
  ChallengeServiceError,
  startDirectedChallenge
} from "../services/challengeService.js";
import {
  getArenaAttempts,
  listArenaOpponents,
  listOwnedArenaHistory
} from "../services/arenaQueryService.js";
import { validateHistoryPagination } from "../validators/arena.js";
import { validateOpponentQuery } from "../validators/arenaV2.js";
import { validateChallengeRequest } from "../validators/challenge.js";
import serializeBattle from "../utils/serializeBattle.js";

const router = Router();

router.get(
  "/opponents",
  requireAuth,
  sensitiveReadRateLimit,
  async (request, response, next) => {
    const query = validateOpponentQuery(request.query);
    if (!query) {
      return next(
        new ApiError(
          400,
          "INVALID_OPPONENT_QUERY",
          "Los filtros de rivales no son válidos."
        )
      );
    }

    try {
      return response
        .status(200)
        .json(await listArenaOpponents(request.user._id, query));
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/attempts",
  requireAuth,
  sensitiveReadRateLimit,
  async (request, response, next) => {
    try {
      return response
        .status(200)
        .json(await getArenaAttempts(request.user._id));
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/history",
  requireAuth,
  sensitiveReadRateLimit,
  async (request, response, next) => {
    const pagination = validateHistoryPagination(request.query);
    if (!pagination) {
      return next(
        new ApiError(
          400,
          "INVALID_PAGINATION",
          "Los parámetros de paginación no son válidos."
        )
      );
    }

    try {
      return response
        .status(200)
        .json(await listOwnedArenaHistory(request.user._id, pagination));
    } catch (error) {
      return next(error);
    }
  }
);

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
        .json({
          battle: {
            ...serializeBattle(result.battle, true),
            ownFighterId: challengeRequest.fighterId
          }
        });
    } catch (error) {
      if (error instanceof ChallengeServiceError) {
        return next(new ApiError(error.statusCode, error.code, error.message));
      }
      return next(error);
    }
  }
);

export default router;
