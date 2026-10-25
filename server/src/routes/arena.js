import { Router } from "express";
import Battle from "../models/Battle.js";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";
import {
  fightRateLimit,
  sensitiveReadRateLimit
} from "../middleware/rateLimit.js";
import {
  CombatServiceError,
  resolveCombat
} from "../services/combatService.js";
import {
  DAILY_BATTLE_LIMIT,
  getDailyAttempts,
  reserveDailyAttempt
} from "../services/dailyActivityService.js";
import {
  MatchmakingServiceError,
  selectOpponent
} from "../services/matchmakingService.js";
import { findSingleFighterForUser } from "../services/legacyFighter.js";
import {
  validateFightRequest,
  validateHistoryPagination
} from "../validators/arena.js";
import serializeBattle from "../utils/serializeBattle.js";

const router = Router();

function createApiError(error) {
  if (
    error instanceof CombatServiceError ||
    error instanceof MatchmakingServiceError
  ) {
    return new ApiError(error.statusCode, error.code, error.message);
  }
  return error;
}

router.get("/attempts", requireAuth, sensitiveReadRateLimit, async (request, response, next) => {
  try {
    const fighter = await findSingleFighterForUser(
      request.user._id,
      "_id",
      request.user.activeFighterId
    );
    const attempts = fighter
      ? await getDailyAttempts(fighter._id)
      : {
          dateKey: new Date().toISOString().slice(0, 10),
          limit: DAILY_BATTLE_LIMIT,
          used: 0,
          remaining: DAILY_BATTLE_LIMIT
        };
    return response.status(200).json({
      dateKey: attempts.dateKey,
      limit: attempts.limit,
      used: attempts.used,
      remaining: attempts.remaining
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/fight", requireAuth, fightRateLimit, async (request, response, next) => {
  const fightRequest = validateFightRequest(request.body);
  if (!fightRequest) {
    return next(
      new ApiError(
        400,
        "INVALID_FIGHT_REQUEST",
        "Envía únicamente una clave de idempotencia válida."
      )
    );
  }

  try {
    const requester = await findSingleFighterForUser(
      request.user._id,
      "_id",
      request.user.activeFighterId
    );
    if (!requester) {
      return next(
        new ApiError(
          409,
          "FIGHTER_REQUIRED",
          "Debes crear un luchador antes de iniciar un combate."
        )
      );
    }

    const existingBattle = await Battle.findOne({
      requesterFighterId: requester._id,
      requestId: fightRequest.requestId
    });
    if (existingBattle) {
      return response
        .status(200)
        .json({ battle: serializeBattle(existingBattle, true) });
    }

    const opponent = await selectOpponent(requester._id);
    const reservation = await reserveDailyAttempt(
      requester._id,
      new Date(),
      fightRequest.requestId
    );
    if (!reservation.reserved) {
      return next(
        new ApiError(
          429,
          "DAILY_BATTLE_LIMIT_REACHED",
          "Ya utilizaste todos tus intentos de arena de hoy."
        )
      );
    }

    const battle = await resolveCombat({
      requesterFighterId: requester._id,
      opponentFighterId: opponent._id,
      battleType: opponent.battleType,
      requestId: fightRequest.requestId
    });

    return response.status(201).json({ battle: serializeBattle(battle, true) });
  } catch (error) {
    return next(createApiError(error));
  }
});

router.get("/history", requireAuth, sensitiveReadRateLimit, async (request, response, next) => {
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
    const fighter = await findSingleFighterForUser(
      request.user._id,
      "_id",
      request.user.activeFighterId
    );
    const filter = fighter
      ? {
          status: "completed",
          "participants.snapshot.fighterId": fighter._id
        }
      : { _id: null };
    const [battles, totalItems] = await Promise.all([
      Battle.find(filter)
        .select(
          "battleType createdAt winnerFighterId actionCount engineVersion participants"
        )
        .sort({ createdAt: -1, _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Battle.countDocuments(filter)
    ]);

    return response.status(200).json({
      battles: battles.map((battle) => serializeBattle(battle)),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / pagination.limit)
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
