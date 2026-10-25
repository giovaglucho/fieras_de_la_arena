const statNames = ["health", "attack", "defense", "speed"];

export function calculateFighterStats(level, baseStats, progression = null) {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError("level must be a positive integer.");
  }

  const baseStatsValue =
    typeof baseStats?.toObject === "function"
      ? baseStats.toObject()
      : baseStats;
  if (
    !baseStatsValue ||
    typeof baseStatsValue !== "object" ||
    Array.isArray(baseStatsValue)
  ) {
    throw new TypeError("baseStats must be an object.");
  }

  for (const statName of statNames) {
    if (
      !Number.isFinite(baseStatsValue[statName]) ||
      baseStatsValue[statName] < 0
    ) {
      throw new RangeError(`${statName} must be a non-negative number.`);
    }
  }

  const progressionValue =
    typeof progression?.toObject === "function"
      ? progression.toObject()
      : progression;
  if (progressionValue) {
    if (progressionValue.version !== "fighter-growth-v1") {
      throw new RangeError("progression version is not supported.");
    }

    if (progressionValue.legacyStats) {
      const legacyStats =
        typeof progressionValue.legacyStats.toObject === "function"
          ? progressionValue.legacyStats.toObject()
          : progressionValue.legacyStats;
      const stats = { ...legacyStats };

      for (const statName of statNames) {
        if (!Number.isFinite(stats[statName]) || stats[statName] < 0) {
          throw new RangeError(`${statName} must be a non-negative number.`);
        }
      }

      for (const event of progressionValue.growthEvents ?? []) {
        if (event.stat == null && event.amount === 0) {
          continue;
        }
        if (!statNames.includes(event.stat) || event.amount !== 1) {
          throw new RangeError("progression contains an invalid growth event.");
        }
        stats[event.stat] += event.amount;
      }
      return stats;
    }

    return { ...baseStatsValue };
  }

  return {
    health: baseStatsValue.health + 5 * (level - 1),
    attack: baseStatsValue.attack + Math.floor((level - 1) / 2),
    defense: baseStatsValue.defense + Math.floor((level - 1) / 3),
    speed: baseStatsValue.speed
  };
}
