import { Router } from "express";
import Battle from "../models/Battle.js";
import Fighter from "../models/Fighter.js";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";
import {
  CombatServiceError,
  resolveCombat
} from "../services/combatService.js";
import {
  getDailyAttempts,
  reserveDailyAttempt
} from "../services/dailyActivityService.js";
import {
  MatchmakingServiceError,
  selectOpponent
} from "../services/matchmakingService.js";
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

router.get("/attempts", requireAuth, async (request, response, next) => {
  try {
    const attempts = await getDailyAttempts(request.user._id);
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

router.post("/fight", requireAuth, async (request, response, next) => {
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
    const requester = await Fighter.findOne({ userId: request.user._id })
      .select("_id")
      .lean();
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
      request.user._id,
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

router.get("/history", requireAuth, async (request, response, next) => {
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
    const fighter = await Fighter.findOne({ userId: request.user._id })
      .select("_id")
      .lean();
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
