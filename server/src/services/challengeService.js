import mongoose from "mongoose";
import Battle from "../models/Battle.js";
import Fighter from "../models/Fighter.js";
import User from "../models/User.js";
import { resolveCombat } from "./combatService.js";
import {
  ensureDailyChallengeActivity,
  getDailyChallengeLimit,
  reserveDailyChallengeAttempt
} from "./dailyActivityService.js";

const MAX_REQUEST_ID_LENGTH = 128;
const CHALLENGE_ELO_RANGE = 200;

export class ChallengeServiceError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "ChallengeServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function isValidRequestId(requestId) {
  return (
    typeof requestId === "string" &&
    requestId.length > 0 &&
    requestId.length <= MAX_REQUEST_ID_LENGTH &&
    requestId.trim() === requestId &&
    !/[\u0000-\u001f\u007f]/.test(requestId)
  );
}

function validateChallengeInput(userId, input, now) {
  if (
    !mongoose.isObjectIdOrHexString(userId) ||
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).length !== 3 ||
    Object.keys(input).some(
      (key) =>
        !["fighterId", "opponentFighterId", "requestId"].includes(key)
    ) ||
    !mongoose.isObjectIdOrHexString(input.fighterId) ||
    !mongoose.isObjectIdOrHexString(input.opponentFighterId) ||
    !isValidRequestId(input.requestId) ||
    !(now instanceof Date) ||
    Number.isNaN(now.getTime())
  ) {
    throw new ChallengeServiceError(
      400,
      "INVALID_CHALLENGE_REQUEST",
      "Los datos del desafío no son válidos."
    );
  }

  const fighterId = input.fighterId.toString();
  const opponentFighterId = input.opponentFighterId.toString();
  if (fighterId === opponentFighterId) {
    throw new ChallengeServiceError(
      400,
      "INVALID_CHALLENGE_REQUEST",
      "Un luchador no puede desafiarse a sí mismo."
    );
  }

  return {
    userId: userId.toString(),
    fighterId,
    opponentFighterId,
    requestId: input.requestId,
    now
  };
}

function getPairKey(firstFighterId, secondFighterId) {
  return [firstFighterId, secondFighterId].sort().join(":");
}

function getExistingChallengeQuery(request) {
  return Battle.findOne({
    requesterFighterId: request.fighterId,
    requestId: request.requestId
  });
}

function assertSameChallenge(battle, request) {
  const participantIds = battle.participants.map(({ snapshot }) =>
    snapshot.fighterId.toString()
  );
  if (
    battle.battleType !== "pvp" ||
    !battle.challengeDateKey ||
    !participantIds.includes(request.fighterId) ||
    !participantIds.includes(request.opponentFighterId)
  ) {
    throw new ChallengeServiceError(
      409,
      "IDEMPOTENCY_KEY_REUSED",
      "La clave de idempotencia ya se utilizó para otra solicitud."
    );
  }
  return battle;
}

function throwFighterNotFound() {
  throw new ChallengeServiceError(
    404,
    "FIGHTER_NOT_FOUND",
    "No se encontró el luchador solicitado."
  );
}

function throwActiveFighterRequired() {
  throw new ChallengeServiceError(
    409,
    "ACTIVE_FIGHTER_REQUIRED",
    "Selecciona como luchador activo una ficha propia antes de desafiar."
  );
}

function isActiveStatus(status) {
  return status === undefined || status === "active";
}

function isPublicVisibility(visibility) {
  return visibility === undefined || visibility === "public";
}

function withSession(query, session) {
  return session ? query.session(session) : query;
}

async function findChallengeParticipants(request, session) {
  const user = await withSession(
    User.findOne({ _id: request.userId, status: "active" })
      .select("_id activeFighterId")
      .lean(),
    session
  );
  if (!user) {
    throw new ChallengeServiceError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Debes iniciar sesión para acceder a este recurso."
    );
  }

  const requester = await withSession(
    Fighter.findOne({ _id: request.fighterId, userId: user._id }).lean(),
    session
  );
  if (!requester) {
    throwFighterNotFound();
  }
  if (!isActiveStatus(requester.status)) {
    throwActiveFighterRequired();
  }

  if (user.activeFighterId != null) {
    if (user.activeFighterId.toString() !== request.fighterId) {
      throwActiveFighterRequired();
    }
  } else {
    const ownedFighters = await withSession(
      Fighter.find({ userId: user._id }).select("_id").limit(2).lean(),
      session
    );
    if (
      ownedFighters.length !== 1 ||
      ownedFighters[0]._id.toString() !== request.fighterId
    ) {
      throwActiveFighterRequired();
    }
  }

  const opponent = await withSession(
    Fighter.findById(request.opponentFighterId).lean(),
    session
  );
  if (
    !opponent ||
    opponent.userId.equals(user._id) ||
    !isActiveStatus(opponent.status) ||
    !isPublicVisibility(opponent.visibility)
  ) {
    throwFighterNotFound();
  }

  const opponentOwner = await withSession(
    User.findOne({ _id: opponent.userId, status: "active" })
      .select("_id")
      .lean(),
    session
  );
  if (!opponentOwner) {
    throwFighterNotFound();
  }

  if (Math.abs(requester.elo - opponent.elo) > CHALLENGE_ELO_RANGE) {
    throw new ChallengeServiceError(
      409,
      "OPPONENT_OUT_OF_RANGE",
      "El rival está fuera del rango de ELO permitido."
    );
  }

  return { requester, opponent };
}

async function assertPairNotCompletedToday(request, session) {
  const dateKey = request.now.toISOString().slice(0, 10);
  const dayStart = new Date(`${dateKey}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const pairKey = getPairKey(request.fighterId, request.opponentFighterId);
  const previousBattle = await withSession(
    Battle.findOne({
      battleType: "pvp",
      status: "completed",
      $or: [
        { challengeDateKey: dateKey, challengePairKey: pairKey },
        {
          challengeDateKey: { $exists: false },
          createdAt: { $gte: dayStart, $lt: dayEnd },
          "participants.snapshot.fighterId": {
            $all: [request.fighterId, request.opponentFighterId]
          }
        }
      ]
    })
      .select("_id")
      .lean(),
    session
  );
  if (previousBattle) {
    throw new ChallengeServiceError(
      409,
      "OPPONENT_ALREADY_CHALLENGED_TODAY",
      "Ya completaste un desafío contra este luchador hoy."
    );
  }
}

function isDuplicateRequestError(error) {
  return (
    error?.code === 11000 &&
    (error.keyPattern?.requesterFighterId === 1 ||
      error.message?.includes("requesterFighterId_1_requestId_1"))
  );
}

function isDuplicatePairError(error) {
  return (
    error?.code === 11000 &&
    (error.keyPattern?.challengePairKey === 1 ||
      error.message?.includes("challenge_pair_day_unique"))
  );
}

async function recoverConcurrentRequest(request) {
  const ownedFighter = await Fighter.exists({
    _id: request.fighterId,
    userId: request.userId
  });
  if (!ownedFighter) {
    throwFighterNotFound();
  }

  const existingBattle = await getExistingChallengeQuery(request);
  if (!existingBattle) {
    return null;
  }
  return assertSameChallenge(existingBattle, request);
}

async function getExistingOwnedChallenge(request) {
  const existingBattle = await getExistingChallengeQuery(request);
  if (!existingBattle) {
    return null;
  }

  const ownedFighter = await Fighter.exists({
    _id: request.fighterId,
    userId: request.userId
  });
  if (!ownedFighter) {
    throwFighterNotFound();
  }
  return assertSameChallenge(existingBattle, request);
}

export async function startDirectedChallenge(userId, input, now = new Date()) {
  const request = validateChallengeInput(userId, input, now);
  const existingBattle = await getExistingOwnedChallenge(request);
  if (existingBattle) {
    return { battle: existingBattle, created: false };
  }

  const { requester } = await findChallengeParticipants(request);
  await assertPairNotCompletedToday(request);
  const limit = getDailyChallengeLimit(requester.createdAt, now);
  await ensureDailyChallengeActivity(request.fighterId, now, limit);

  const session = await mongoose.startSession();
  let completedBattle;
  let created = false;
  try {
    await session.withTransaction(async () => {
      const previousBattle = await getExistingChallengeQuery(request).session(session);
      if (previousBattle) {
        const ownedFighter = await Fighter.exists({
          _id: request.fighterId,
          userId: request.userId
        }).session(session);
        if (!ownedFighter) {
          throwFighterNotFound();
        }
        completedBattle = assertSameChallenge(previousBattle, request);
        created = false;
        return;
      }

      const participants = await findChallengeParticipants(request, session);
      await assertPairNotCompletedToday(request, session);
      const challengeLimit = getDailyChallengeLimit(
        participants.requester.createdAt,
        now
      );
      const reservation = await reserveDailyChallengeAttempt(
        request.fighterId,
        now,
        challengeLimit,
        request.requestId,
        session
      );
      if (reservation.alreadyReserved) {
        throw new ChallengeServiceError(
          409,
          "IDEMPOTENCY_KEY_REUSED",
          "No se pudo verificar el resultado asociado a esta clave."
        );
      }
      if (!reservation.reserved) {
        throw new ChallengeServiceError(
          429,
          "DAILY_BATTLE_LIMIT_REACHED",
          "Ya utilizaste todos tus desafíos disponibles por hoy."
        );
      }

      const pairKey = getPairKey(
        request.fighterId,
        request.opponentFighterId
      );
      completedBattle = await resolveCombat(
        {
          requesterFighterId: request.fighterId,
          opponentFighterId: request.opponentFighterId,
          battleType: "pvp",
          requestId: request.requestId
        },
        {
          session,
          challenge: {
            dateKey: reservation.dateKey,
            pairKey
          }
        }
      );
      created = true;
    });

    return { battle: completedBattle, created };
  } catch (error) {
    if (isDuplicateRequestError(error)) {
      const racedBattle = await recoverConcurrentRequest(request);
      if (racedBattle) {
        return { battle: assertSameChallenge(racedBattle, request), created: false };
      }
    }
    if (isDuplicatePairError(error)) {
      throw new ChallengeServiceError(
        409,
        "OPPONENT_ALREADY_CHALLENGED_TODAY",
        "Ya completaste un desafío contra este luchador hoy."
      );
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
