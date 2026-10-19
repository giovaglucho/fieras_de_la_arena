import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Battle from "../models/Battle.js";
import Fighter from "../models/Fighter.js";
import { calculateFighterStats } from "../game-engine/fighterStats.js";
import {
  applyExperience,
  calculateEloChanges,
  calculateXpReward
} from "../game-engine/progression.js";
import { simulateCombat } from "../game-engine/simulateCombat.js";

const MAX_REQUEST_ID_LENGTH = 128;

export class CombatServiceError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "CombatServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function isObjectId(value) {
  return (
    value instanceof mongoose.Types.ObjectId ||
    mongoose.isObjectIdOrHexString(value)
  );
}

function validateRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new CombatServiceError(
      400,
      "INVALID_COMBAT_REQUEST",
      "Los datos del combate no son válidos."
    );
  }

  const allowedFields = new Set([
    "requesterFighterId",
    "opponentFighterId",
    "battleType",
    "requestId"
  ]);
  if (
    Object.keys(input).length !== allowedFields.size ||
    Object.keys(input).some((field) => !allowedFields.has(field))
  ) {
    throw new CombatServiceError(
      400,
      "INVALID_COMBAT_REQUEST",
      "Los datos del combate no son válidos."
    );
  }

  if (!isObjectId(input.requesterFighterId) || !isObjectId(input.opponentFighterId)) {
    throw new CombatServiceError(
      400,
      "INVALID_COMBAT_REQUEST",
      "Los luchadores del combate no son válidos."
    );
  }

  const requesterFighterId = input.requesterFighterId.toString();
  const opponentFighterId = input.opponentFighterId.toString();
  if (requesterFighterId === opponentFighterId) {
    throw new CombatServiceError(
      400,
      "INVALID_COMBAT_REQUEST",
      "Un luchador no puede combatir contra sí mismo."
    );
  }

  if (!["pvp", "training"].includes(input.battleType)) {
    throw new CombatServiceError(
      400,
      "INVALID_COMBAT_REQUEST",
      "El tipo de combate no es válido."
    );
  }

  if (
    typeof input.requestId !== "string" ||
    input.requestId.length === 0 ||
    input.requestId.length > MAX_REQUEST_ID_LENGTH ||
    input.requestId.trim() !== input.requestId ||
    /[\u0000-\u001f\u007f]/.test(input.requestId)
  ) {
    throw new CombatServiceError(
      400,
      "INVALID_COMBAT_REQUEST",
      "La clave de idempotencia no es válida."
    );
  }

  return {
    requesterFighterId,
    opponentFighterId,
    battleType: input.battleType,
    requestId: input.requestId
  };
}

function getExistingBattleQuery({ requesterFighterId, requestId }) {
  return Battle.findOne({ requesterFighterId, requestId });
}

function validateExistingBattle(battle, request) {
  const participantIds = battle.participants.map(({ snapshot }) =>
    snapshot.fighterId.toString()
  );
  const sameParticipants =
    participantIds.includes(request.requesterFighterId) &&
    participantIds.includes(request.opponentFighterId);

  if (battle.battleType !== request.battleType || !sameParticipants) {
    throw new CombatServiceError(
      409,
      "IDEMPOTENCY_KEY_REUSED",
      "La clave de idempotencia ya se utilizó para otra solicitud."
    );
  }

  return battle;
}

function getOutcome(winnerFighterId, fighterId) {
  if (winnerFighterId === null) {
    return "draw";
  }
  return winnerFighterId === fighterId ? "win" : "loss";
}

function createParticipantResult(fighter, xpGained, eloChange) {
  const experience = applyExperience({
    level: fighter.level,
    xp: fighter.xp,
    xpGained
  });
  const eloAfter = Math.max(0, fighter.elo + eloChange);

  return {
    xpGained,
    eloChange: eloAfter - fighter.elo,
    eloAfter,
    level: experience.level,
    xp: experience.xp
  };
}

function createSnapshot(fighter) {
  return {
    fighterId: fighter._id.toString(),
    name: fighter.name,
    level: fighter.level,
    elo: fighter.elo,
    stats: calculateFighterStats(fighter.level, fighter.baseStats.toObject())
  };
}

function createCounterUpdate(outcome) {
  return {
    wins: outcome === "win" ? 1 : 0,
    losses: outcome === "loss" ? 1 : 0,
    draws: outcome === "draw" ? 1 : 0
  };
}

async function applyRewards(fighters, outcomes, results, session) {
  const updates = fighters.map((fighter, index) => ({
    updateOne: {
      filter: { _id: fighter._id },
      update: {
        $set: {
          xp: results[index].xp,
          level: results[index].level,
          elo: results[index].eloAfter
        },
        $inc: createCounterUpdate(outcomes[index])
      }
    }
  }));
  const updateResult = await Fighter.bulkWrite(updates, { session });

  if (updateResult.matchedCount !== fighters.length) {
    throw new Error("No se pudieron actualizar todos los luchadores del combate.");
  }
}

function isDuplicateRequestError(error) {
  return (
    error?.code === 11000 &&
    (error.keyPattern?.requesterFighterId === 1 ||
      error.message?.includes("requesterFighterId_1_requestId_1"))
  );
}

export async function resolveCombat(input) {
  const request = validateRequest(input);
  const idempotencyQuery = {
    requesterFighterId: request.requesterFighterId,
    requestId: request.requestId
  };
  const existingBattle = await getExistingBattleQuery(idempotencyQuery);
  if (existingBattle) {
    return validateExistingBattle(existingBattle, request);
  }

  const session = await mongoose.startSession();
  let completedBattle;

  try {
    await session.withTransaction(async () => {
      const previousBattle = await getExistingBattleQuery(idempotencyQuery).session(session);
      if (previousBattle) {
        completedBattle = validateExistingBattle(previousBattle, request);
        return;
      }

      const requestedIds = [
        request.requesterFighterId,
        request.opponentFighterId
      ];
      const fighters = await Fighter.find({ _id: { $in: requestedIds } }).session(session);
      if (fighters.length !== 2) {
        throw new CombatServiceError(
          404,
          "COMBATANT_NOT_FOUND",
          "No se encontró uno de los luchadores del combate."
        );
      }

      const fighterById = new Map(fighters.map((fighter) => [fighter._id.toString(), fighter]));
      const orderedFighters = requestedIds.map((fighterId) => fighterById.get(fighterId));
      const snapshots = orderedFighters.map(createSnapshot);
      const seed = randomUUID();
      const combatResult = simulateCombat({ fighters: snapshots, seed });
      const winnerFighterId = combatResult.summary.winnerFighterId;
      const outcomes = orderedFighters.map((fighter) =>
        getOutcome(winnerFighterId, fighter._id.toString())
      );
      const eloChanges = calculateEloChanges({
        firstElo: orderedFighters[0].elo,
        secondElo: orderedFighters[1].elo,
        outcome: outcomes[0],
        isTraining: request.battleType === "training"
      });
      const changes = [eloChanges.firstChange, eloChanges.secondChange];
      const results = orderedFighters.map((fighter, index) =>
        createParticipantResult(
          fighter,
          calculateXpReward({
            outcome: outcomes[index],
            isTraining: request.battleType === "training"
          }),
          changes[index]
        )
      );

      completedBattle = new Battle({
        battleType: request.battleType,
        requesterFighterId: request.requesterFighterId,
        requestId: request.requestId,
        participants: snapshots.map((snapshot, index) => ({
          snapshot,
          result: {
            xpGained: results[index].xpGained,
            eloChange: results[index].eloChange,
            eloAfter: results[index].eloAfter
          }
        })),
        winnerFighterId,
        actionCount: combatResult.summary.actionCount,
        seed,
        engineVersion: combatResult.engineVersion,
        events: combatResult.events
      });
      await completedBattle.save({ session });
      await applyRewards(orderedFighters, outcomes, results, session);
    });

    return completedBattle;
  } catch (error) {
    if (isDuplicateRequestError(error)) {
      const racedBattle = await getExistingBattleQuery(idempotencyQuery);
      if (racedBattle) {
        return validateExistingBattle(racedBattle, request);
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
