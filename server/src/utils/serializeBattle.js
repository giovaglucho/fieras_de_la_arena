function serializeStats(stats) {
  return typeof stats.toObject === "function" ? stats.toObject() : stats;
}

function serializeProgression(progression, growthEvents) {
  if (!progression) {
    return undefined;
  }

  return {
    levelBefore: progression.levelBefore,
    levelAfter: progression.levelAfter,
    xpBefore: progression.xpBefore,
    xpAfter: progression.xpAfter,
    levelsGained: progression.levelsGained,
    statsBefore: serializeStats(progression.statsBefore),
    statsAfter: serializeStats(progression.statsAfter),
    growthEvents: (growthEvents ?? []).map(({ level, stat, amount }) => ({
      level,
      stat: stat ?? null,
      amount
    }))
  };
}

function serializeEquipmentItem(item) {
  if (!item) {
    return null;
  }

  return {
    itemId: item.itemId,
    catalogVersion: item.catalogVersion,
    name: item.name,
    slot: item.slot,
    modifiers:
      typeof item.modifiers.toObject === "function"
        ? item.modifiers.toObject()
        : item.modifiers
  };
}

function serializeEquipmentLoadout(equipment) {
  return {
    version: equipment.version,
    catalogVersion: equipment.catalogVersion,
    weapon: serializeEquipmentItem(equipment.weapon),
    armor: serializeEquipmentItem(equipment.armor)
  };
}

function serializeTechniqueSnapshot(technique) {
  if (!technique) {
    return null;
  }

  return {
    techniqueId: technique.techniqueId,
    ...(technique.catalogVersion
      ? { catalogVersion: technique.catalogVersion }
      : {}),
    techniqueVersion: technique.techniqueVersion,
    category: technique.category,
    minLevel: technique.minLevel,
    effect:
      typeof technique.effect.toObject === "function"
        ? technique.effect.toObject()
        : technique.effect
  };
}

function serializeTechniqueLoadout(techniques) {
  return {
    version: techniques.version,
    catalogVersion: techniques.catalogVersion,
    passive: serializeTechniqueSnapshot(techniques.passive),
    active: serializeTechniqueSnapshot(techniques.active)
  };
}

export default function serializeBattle(battle, includeEvents = false) {
  const result = {
    id: battle._id.toString(),
    battleType: battle.battleType,
    createdAt: battle.createdAt,
    winnerFighterId: battle.winnerFighterId?.toString() ?? null,
    actionCount: battle.actionCount,
    engineVersion: battle.engineVersion,
    participants: battle.participants.map(({ snapshot, result: participantResult }) => ({
      fighter: {
        id: snapshot.fighterId.toString(),
        name: snapshot.name,
        level: snapshot.level,
        elo: snapshot.elo,
        stats:
          typeof snapshot.stats.toObject === "function"
            ? snapshot.stats.toObject()
            : snapshot.stats,
        ...(snapshot.equipment
          ? { equipment: serializeEquipmentLoadout(snapshot.equipment) }
          : {}),
        ...(snapshot.techniques
          ? { techniques: serializeTechniqueLoadout(snapshot.techniques) }
          : {}),
        ...(snapshot.initiative === undefined
          ? {}
          : { initiative: snapshot.initiative })
      },
      result: {
        xpGained: participantResult.xpGained,
        eloChange: participantResult.eloChange,
        eloAfter: participantResult.eloAfter,
        ...(includeEvents && participantResult.progression
          ? {
              progression: serializeProgression(
                participantResult.progression,
                participantResult.growthEvents
              )
            }
          : {})
      }
    }))
  };

  if (includeEvents) {
    result.events = battle.events;
  }

  return result;
}
