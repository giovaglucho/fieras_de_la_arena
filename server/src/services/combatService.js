import { randomBytes, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Battle from "../models/Battle.js";
import Fighter from "../models/Fighter.js";
import { TRAINING_OPPONENT } from "../config/trainingOpponent.js";
import { calculateFighterStats } from "../game-engine/fighterStats.js";
import { applyFighterProgression } from "../game-engine/fighterGrowth.js";
import {
  EQUIPMENT_CATALOG_VERSION,
  EQUIPMENT_LOADOUT_VERSION,
  getEffectiveInitiative,
  selectEquipmentLoadout,
  unlockEquipmentForLevels
} from "../game-engine/equipmentCatalog.js";
import {
  TECHNIQUE_CATALOG_VERSION,
  TECHNIQUE_RULES_VERSION,
  selectTechniquesForCombat,
  unlockTechniquesForLevels
} from "../game-engine/techniqueCatalog.js";
import {
  applyPetHealthPenalty,
  createPetSnapshot,
  PET_CATALOG_VERSION,
  PET_RULES_VERSION,
  PET_SNAPSHOT_VERSION,
  unlockPetsForLevels
} from "../game-engine/petCatalog.js";
import {
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
    input.battleType === "training" &&
    opponentFighterId !== TRAINING_OPPONENT._id
  ) {
    throw new CombatServiceError(
      400,
      "INVALID_COMBAT_REQUEST",
      "El rival del combate de entrenamiento no es válido."
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

function getExistingBattleQuery({ requesterFighterId, requestId }, session) {
  const query = Battle.findOne({ requesterFighterId, requestId });
  return session ? query.session(session) : query;
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

function createParticipantResult(
  fighter,
  snapshot,
  xpGained,
  eloChange,
  requestId
) {
  const previousGrowthEventCount =
    fighter.progression?.growthEvents?.length ?? 0;
  const growth = applyFighterProgression({
    level: fighter.level,
    xp: fighter.xp,
    xpGained,
    baseStats:
      typeof fighter.baseStats.toObject === "function"
        ? fighter.baseStats.toObject()
        : fighter.baseStats,
    progression: fighter.progression,
    requestId
  });
  const equipmentProgression =
    growth.levelsGained > 0
      ? unlockEquipmentForLevels({
          fromLevel: fighter.level,
          toLevel: growth.level,
          inventory: fighter.equipment ?? [],
          existingUnlocks: fighter.equipmentUnlocks ?? [],
          requestId,
          seedFactory: () => randomBytes(32)
        })
      : {
          inventory: fighter.equipment ?? [],
          unlocks: fighter.equipmentUnlocks ?? []
        };
  const techniqueProgression =
    growth.levelsGained > 0
      ? unlockTechniquesForLevels({
          fromLevel: fighter.level,
          toLevel: growth.level,
          inventory: fighter.techniques ?? [],
          existingUnlocks: fighter.techniqueUnlocks ?? [],
          requestId,
          seedFactory: () => randomBytes(32)
        })
      : {
          inventory: fighter.techniques ?? [],
          unlocks: fighter.techniqueUnlocks ?? []
        };
  const petProgression =
    growth.levelsGained > 0
      ? unlockPetsForLevels({
          fromLevel: fighter.level,
          toLevel: growth.level,
          inventory: fighter.pets ?? [],
          existingUnlocks: fighter.petUnlocks ?? [],
          requestId,
          seedFactory: () => randomBytes(32)
        })
      : {
          inventory: fighter.pets ?? [],
          unlocks: fighter.petUnlocks ?? []
        };
  const eloAfter = Math.max(0, fighter.elo + eloChange);

  return {
    xpGained,
    eloChange: eloAfter - fighter.elo,
    eloAfter,
    level: growth.level,
    xp: growth.xp,
    levelsGained: growth.levelsGained,
    baseStats: growth.baseStats,
    progression: growth.progression,
    equipment: equipmentProgression.inventory,
    equipmentUnlocks: equipmentProgression.unlocks,
    techniques: techniqueProgression.inventory,
    techniqueUnlocks: techniqueProgression.unlocks,
    pets: petProgression.inventory,
    petUnlocks: petProgression.unlocks,
    progressionSnapshot: {
      levelBefore: fighter.level,
      levelAfter: growth.level,
      xpBefore: fighter.xp,
      xpAfter: growth.xp,
      levelsGained: growth.levelsGained,
      statsBefore: snapshot.stats,
      statsAfter: applyPetHealthPenalty(
        calculateFighterStats(
          growth.level,
          growth.baseStats,
          growth.progression
        ),
        petProgression.inventory
      )
    },
    growthEvents:
      growth.progression?.growthEvents?.slice(previousGrowthEventCount) ?? []
  };
}

function createSnapshot(fighter, seed, includeTechniques, includePets) {
  const baseStats = calculateFighterStats(
    fighter.level,
    typeof fighter.baseStats.toObject === "function"
      ? fighter.baseStats.toObject()
      : fighter.baseStats,
    fighter.progression
  );
  const pets = createPetSnapshot(fighter._id.toString(), fighter.pets ?? []);
  const stats = includePets
    ? applyPetHealthPenalty(baseStats, fighter.pets ?? [])
    : baseStats;
  const equipment = selectEquipmentLoadout({
    fighterId: fighter._id.toString(),
    seed: Buffer.from(seed, "utf8"),
    inventory: fighter.equipment ?? []
  });
  const snapshot = {
    fighterId: fighter._id.toString(),
    name: fighter.name,
    level: fighter.level,
    elo: fighter.elo,
    stats,
    equipment,
    initiative: getEffectiveInitiative(stats, equipment)
  };
  if (includeTechniques) {
    snapshot.techniques = selectTechniquesForCombat({
      fighterId: snapshot.fighterId,
      level: fighter.level,
      seed,
      inventory: fighter.techniques ?? []
    });
  }
  if (includePets) {
    snapshot.pets = pets;
  }
  return snapshot;
}

function createCounterUpdate(outcome) {
  return {
    wins: outcome === "win" ? 1 : 0,
    losses: outcome === "loss" ? 1 : 0,
    draws: outcome === "draw" ? 1 : 0
  };
}

async function applyRewards(fighters, outcomes, results, session) {
  const updates = fighters.map((fighter, index) => {
    const result = results[index];
    const fields = {
      xp: result.xp,
      level: result.level,
      elo: result.eloAfter
    };
    if (result.levelsGained > 0) {
      fields.baseStats = result.baseStats;
      fields.progression = result.progression;
      fields.equipment = result.equipment;
      fields.equipmentUnlocks = result.equipmentUnlocks;
      fields.techniques = result.techniques;
      fields.techniqueUnlocks = result.techniqueUnlocks;
      fields.pets = result.pets;
      fields.petUnlocks = result.petUnlocks;
    }

    return {
      updateOne: {
        filter: { _id: fighter._id },
        update: {
          $set: fields,
          $inc: createCounterUpdate(outcomes[index])
        }
      }
    };
  });
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

async function resolveCombatInSession(request, session, challenge) {
  const isTraining = request.battleType === "training";
  const requestedIds = [
    request.requesterFighterId,
    request.opponentFighterId
  ];
  const persistedIds = isTraining
    ? [request.requesterFighterId]
    : requestedIds;
  const fighters = await Fighter.find({ _id: { $in: persistedIds } }).session(session);
  if (fighters.length !== persistedIds.length) {
    throw new CombatServiceError(
      404,
      "COMBATANT_NOT_FOUND",
      "No se encontró uno de los luchadores del combate."
    );
  }

  const fighterById = new Map(fighters.map((fighter) => [fighter._id.toString(), fighter]));
  const orderedFighters = isTraining
    ? [
        fighterById.get(request.requesterFighterId),
        {
          ...TRAINING_OPPONENT,
          _id: new mongoose.Types.ObjectId(TRAINING_OPPONENT._id)
        }
      ]
    : requestedIds.map((fighterId) => fighterById.get(fighterId));
  const battleId = new mongoose.Types.ObjectId();
  const seed = randomUUID();
  const includeTechniques = orderedFighters.some((fighter) =>
    Array.isArray(fighter.techniques)
  );
  const includePets = orderedFighters.some((fighter) =>
    Array.isArray(fighter.pets)
  );
  const snapshots = orderedFighters.map((fighter) =>
    createSnapshot(fighter, seed, includeTechniques, includePets)
  );
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
      snapshots[index],
      isTraining
        ? index === 0
          ? calculateXpReward({ outcome: outcomes[index], isTraining: true })
          : 0
        : calculateXpReward({ outcome: outcomes[index] }),
      changes[index],
      request.requestId
    )
  );

  const completedBattle = new Battle({
    _id: battleId,
    battleType: request.battleType,
    requesterFighterId: request.requesterFighterId,
    requestId: request.requestId,
    ...(challenge
      ? {
          challengeDateKey: challenge.dateKey,
          challengePairKey: challenge.pairKey
        }
      : {}),
    participants: snapshots.map((snapshot, index) => ({
      snapshot,
      result: {
        xpGained: results[index].xpGained,
        eloChange: results[index].eloChange,
        eloAfter: results[index].eloAfter,
        progression: results[index].progressionSnapshot,
        growthEvents: results[index].growthEvents
      }
    })),
    winnerFighterId,
    actionCount: combatResult.summary.actionCount,
    seed,
    engineVersion: combatResult.engineVersion,
    snapshotVersion: includePets
      ? "battle-snapshot-v4"
      : includeTechniques
        ? "battle-snapshot-v3"
        : "battle-snapshot-v2",
    equipmentCatalogVersion: EQUIPMENT_CATALOG_VERSION,
    loadoutVersion: EQUIPMENT_LOADOUT_VERSION,
    ...(includeTechniques
      ? {
          techniqueCatalogVersion: TECHNIQUE_CATALOG_VERSION,
          techniqueRulesVersion: TECHNIQUE_RULES_VERSION
        }
      : {}),
    ...(includePets
      ? {
          petCatalogVersion: PET_CATALOG_VERSION,
          petSnapshotVersion: PET_SNAPSHOT_VERSION,
          petRulesVersion: PET_RULES_VERSION
        }
      : {}),
    events: combatResult.events
  });
  await completedBattle.save({ session });
  await applyRewards(
    isTraining ? orderedFighters.slice(0, 1) : orderedFighters,
    isTraining ? outcomes.slice(0, 1) : outcomes,
    isTraining ? results.slice(0, 1) : results,
    session
  );
  return completedBattle;
}

export async function resolveCombat(input, { session: externalSession, challenge } = {}) {
  const request = validateRequest(input);
  const idempotencyQuery = {
    requesterFighterId: request.requesterFighterId,
    requestId: request.requestId
  };

  if (externalSession) {
    const existingBattle = await getExistingBattleQuery(
      idempotencyQuery,
      externalSession
    );
    if (existingBattle) {
      return validateExistingBattle(existingBattle, request);
    }
    return resolveCombatInSession(request, externalSession, challenge);
  }

  const existingBattle = await getExistingBattleQuery(idempotencyQuery);
  if (existingBattle) {
    return validateExistingBattle(existingBattle, request);
  }

  const session = await mongoose.startSession();
  let completedBattle;

  try {
    await session.withTransaction(async () => {
      const previousBattle = await getExistingBattleQuery(
        idempotencyQuery,
        session
      );
      if (previousBattle) {
        completedBattle = validateExistingBattle(previousBattle, request);
        return;
      }

      completedBattle = await resolveCombatInSession(
        request,
        session,
        challenge
      );
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
