const statNames = ["health", "attack", "defense", "speed"];

export function calculateFighterStats(level, baseStats) {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError("level must be a positive integer.");
  }

  if (!baseStats || typeof baseStats !== "object" || Array.isArray(baseStats)) {
    throw new TypeError("baseStats must be an object.");
  }

  for (const statName of statNames) {
    if (!Number.isFinite(baseStats[statName]) || baseStats[statName] < 0) {
      throw new RangeError(`${statName} must be a non-negative number.`);
    }
  }

  return {
    health: baseStats.health + 5 * (level - 1),
    attack: baseStats.attack + Math.floor((level - 1) / 2),
    defense: baseStats.defense + Math.floor((level - 1) / 3),
    speed: baseStats.speed
  };
}
