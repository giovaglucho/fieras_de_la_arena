import mongoose from "mongoose";
import Battle from "../models/Battle.js";
import Fighter from "../models/Fighter.js";
import User from "../models/User.js";
import { MATCHMAKING_CONFIG } from "../config/matchmaking.js";
import { TRAINING_OPPONENT } from "../config/trainingOpponent.js";

export class MatchmakingServiceError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "MatchmakingServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function compareCandidates(requesterElo, first, second) {
  const eloDifference =
    Math.abs(first.elo - requesterElo) - Math.abs(second.elo - requesterElo);
  return eloDifference || first._id.toString().localeCompare(second._id.toString());
}

function withoutUser(candidate) {
  const { userId, ...opponent } = candidate;
  return opponent;
}

function createOpponent(candidate, battleType) {
  return { ...withoutUser(candidate), battleType };
}

async function findPreviousOpponentId(requesterFighterId) {
  const previousBattle = await Battle.findOne({
    battleType: "pvp",
    status: "completed",
    "participants.snapshot.fighterId": requesterFighterId
  })
    .sort({ createdAt: -1 })
    .select("participants.snapshot.fighterId")
    .lean();

  return previousBattle?.participants
    .map(({ snapshot }) => snapshot.fighterId)
    .find((fighterId) => !fighterId.equals(requesterFighterId)) ?? null;
}

async function findActiveCandidates(requester, eloRange) {
  return Fighter.find({
    _id: { $ne: requester._id },
    elo: {
      $gte: Math.max(0, requester.elo - eloRange),
      $lte: requester.elo + eloRange
    }
  })
    .select("_id userId name level elo baseStats")
    .populate({
      path: "userId",
      model: User,
      match: { status: "active" },
      select: "_id"
    })
    .lean();
}

export async function selectOpponent(requesterFighterId) {
  if (
    !(
      requesterFighterId instanceof mongoose.Types.ObjectId ||
      mongoose.isObjectIdOrHexString(requesterFighterId)
    )
  ) {
    throw new MatchmakingServiceError(
      400,
      "INVALID_REQUESTER_FIGHTER",
      "El luchador solicitante no es válido."
    );
  }

  const requester = await Fighter.findById(requesterFighterId)
    .select("_id elo")
    .lean();
  if (!requester) {
    throw new MatchmakingServiceError(
      404,
      "REQUESTER_FIGHTER_NOT_FOUND",
      "No se encontró el luchador solicitante."
    );
  }

  const previousOpponentId = await findPreviousOpponentId(requester._id);
  let previousOpponentFallback = null;

  for (const eloRange of MATCHMAKING_CONFIG.eloRangeSteps) {
    const candidates = (await findActiveCandidates(requester, eloRange))
      .filter(({ userId }) => userId)
      .sort((first, second) => compareCandidates(requester.elo, first, second));
    const alternatives = previousOpponentId
      ? candidates.filter(
          ({ _id }) => _id.toString() !== previousOpponentId.toString()
        )
      : candidates;

    if (alternatives.length > 0) {
      return createOpponent(alternatives[0], "pvp");
    }

    if (previousOpponentFallback === null && candidates.length > 0) {
      previousOpponentFallback = candidates[0];
    }
  }

  return previousOpponentFallback
    ? createOpponent(previousOpponentFallback, "pvp")
    : createOpponent(TRAINING_OPPONENT, "training");
}
