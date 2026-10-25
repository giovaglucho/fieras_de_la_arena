import { createHash, randomBytes } from "node:crypto";
import { calculateFighterStats } from "./fighterStats.js";
import { applyExperience } from "./progression.js";

export const FIGHTER_GROWTH_VERSION = "fighter-growth-v1";

export const FIGHTER_GROWTH_WEIGHTS = Object.freeze({
  health: 35,
  attack: 30,
  defense: 20,
  speed: 15
});

export const FIGHTER_GROWTH_LIMITS = Object.freeze({
  health: 50,
  attack: 20,
  defense: 15,
  speed: 10
});

const STAT_NAMES = Object.keys(FIGHTER_GROWTH_WEIGHTS);
const MAX_UINT32 = 0xffffffff;
const UINT256_RANGE = 1n << 256n;

function copyStats(stats) {
  const value =
    typeof stats?.toObject === "function" ? stats.toObject() : stats;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("stats must be an object.");
  }

  const copied = {};
  for (const stat of STAT_NAMES) {
    if (!Number.isInteger(value[stat]) || value[stat] < 0) {
      throw new RangeError(`${stat} must be a non-negative integer.`);
    }
    copied[stat] = value[stat];
  }
  return copied;
}

function copyProgression(progression) {
  const value =
    typeof progression?.toObject === "function"
      ? progression.toObject()
      : progression;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("progression must be an object.");
  }
  if (value.version !== FIGHTER_GROWTH_VERSION) {
    throw new RangeError("progression version is not supported.");
  }

  return {
    version: value.version,
    startingStats: copyStats(value.startingStats),
    legacyStats:
      value.legacyStats == null ? null : copyStats(value.legacyStats),
    growthEvents: (value.growthEvents ?? []).map((event) => ({
      level: event.level,
      seed: Buffer.from(event.seed),
      version: event.version,
      stat: event.stat ?? null,
      amount: event.amount,
      requestId: event.requestId
    }))
  };
}

export function createFighterGrowthState(baseStats) {
  return {
    version: FIGHTER_GROWTH_VERSION,
    startingStats: copyStats(baseStats),
    legacyStats: null,
    growthEvents: []
  };
}

export function drawGrowthStat({ seed, level, eligibleStats }) {
  if (!Buffer.isBuffer(seed) || seed.length !== 32) {
    throw new TypeError("Growth seed must contain exactly 32 bytes.");
  }
  if (!Number.isInteger(level) || level < 2) {
    throw new RangeError("level must be an integer greater than one.");
  }
  if (!Array.isArray(eligibleStats)) {
    throw new TypeError("eligibleStats must be an array.");
  }
  if (eligibleStats.length === 0) {
    return null;
  }
  if (
    eligibleStats.some((stat) => !STAT_NAMES.includes(stat)) ||
    new Set(eligibleStats).size !== eligibleStats.length
  ) {
    throw new RangeError("eligibleStats contains an invalid statistic.");
  }

  const totalWeight = eligibleStats.reduce(
    (total, stat) => total + FIGHTER_GROWTH_WEIGHTS[stat],
    0
  );
  const divisor = BigInt(totalWeight);
  const acceptanceLimit = (UINT256_RANGE / divisor) * divisor;
  const domain = `${FIGHTER_GROWTH_VERSION}:${level}`;

  for (let counter = 0; counter <= MAX_UINT32; counter += 1) {
    const counterBytes = Buffer.alloc(4);
    counterBytes.writeUInt32BE(counter);
    const digest = createHash("sha256")
      .update(seed)
      .update(domain, "utf8")
      .update(counterBytes)
      .digest();
    const value = BigInt(`0x${digest.toString("hex")}`);

    if (value < acceptanceLimit) {
      let selection = Number(value % divisor);
      for (const stat of eligibleStats) {
        selection -= FIGHTER_GROWTH_WEIGHTS[stat];
        if (selection < 0) {
          return stat;
        }
      }
    }
  }

  throw new Error("Se agotaron los contadores al sortear el crecimiento.");
}

export function applyFighterProgression({
  level,
  xp,
  xpGained,
  baseStats,
  progression,
  requestId,
  seedFactory = () => randomBytes(32)
}) {
  const experience = applyExperience({ level, xp, xpGained });
  const nextBaseStats = copyStats(baseStats);

  if (experience.levelsGained === 0) {
    return {
      ...experience,
      baseStats: nextBaseStats,
      progression: progression ?? null
    };
  }
  if (typeof requestId !== "string" || requestId.length === 0) {
    throw new TypeError("requestId must be a non-empty string.");
  }
  if (typeof seedFactory !== "function") {
    throw new TypeError("seedFactory must be a function.");
  }

  const existingProgression =
    progression == null ? null : copyProgression(progression);
  const nextProgression =
    existingProgression ?? {
      version: FIGHTER_GROWTH_VERSION,
      startingStats: { ...nextBaseStats },
      legacyStats: calculateFighterStats(level, nextBaseStats),
      growthEvents: []
    };
  const isLegacy = nextProgression.legacyStats !== null;

  for (
    let gainedLevel = level + 1;
    gainedLevel <= experience.level;
    gainedLevel += 1
  ) {
    const seed = seedFactory();
    if (!Buffer.isBuffer(seed) || seed.length !== 32) {
      throw new TypeError("Growth seed must contain exactly 32 bytes.");
    }

    const currentStats = calculateFighterStats(
      gainedLevel - 1,
      nextBaseStats,
      nextProgression
    );
    const eligibleStats = STAT_NAMES.filter(
      (stat) =>
        currentStats[stat] <
        nextProgression.startingStats[stat] + FIGHTER_GROWTH_LIMITS[stat]
    );
    const stat = drawGrowthStat({ seed, level: gainedLevel, eligibleStats });

    if (stat && !isLegacy) {
      nextBaseStats[stat] += 1;
    }
    nextProgression.growthEvents.push({
      level: gainedLevel,
      seed: Buffer.from(seed),
      version: FIGHTER_GROWTH_VERSION,
      stat,
      amount: stat ? 1 : 0,
      requestId
    });
  }

  return {
    ...experience,
    baseStats: nextBaseStats,
    progression: nextProgression
  };
}
