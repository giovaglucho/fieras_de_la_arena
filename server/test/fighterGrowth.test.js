import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyFighterProgression,
  createFighterGrowthState,
  drawGrowthStat,
  FIGHTER_GROWTH_WEIGHTS
} from "../src/game-engine/fighterGrowth.js";
import { calculateFighterStats } from "../src/game-engine/fighterStats.js";

const baseStats = { health: 100, attack: 10, defense: 4, speed: 5 };
const seedFor = (value) => {
  const seed = Buffer.alloc(32);
  seed.writeUInt32BE(value, 28);
  return seed;
};

test("un mismo seed, nivel y versión reproducen el mismo atributo", () => {
  const input = {
    seed: seedFor(42),
    level: 2,
    eligibleStats: Object.keys(FIGHTER_GROWTH_WEIGHTS)
  };

  assert.equal(drawGrowthStat(input), "defense");
  assert.equal(drawGrowthStat(input), drawGrowthStat(input));
});

test("el sorteo ponderado respeta la distribución aprobada", () => {
  const counts = { health: 0, attack: 0, defense: 0, speed: 0 };
  const eligibleStats = Object.keys(FIGHTER_GROWTH_WEIGHTS);
  const sampleCount = 10_000;

  for (let index = 0; index < sampleCount; index += 1) {
    counts[drawGrowthStat({ seed: seedFor(index), level: 2, eligibleStats })] += 1;
  }

  for (const [stat, weight] of Object.entries(FIGHTER_GROWTH_WEIGHTS)) {
    assert.ok(
      Math.abs(counts[stat] / sampleCount - weight / 100) < 0.015,
      `${stat} distribution was ${counts[stat] / sampleCount}`
    );
  }
});

test("procesa cada nivel ganado y conserva XP sobrante", () => {
  let seedNumber = 0;
  const result = applyFighterProgression({
    level: 1,
    xp: 0,
    xpGained: 600,
    baseStats,
    progression: createFighterGrowthState(baseStats),
    requestId: "multi-level",
    seedFactory: () => seedFor(seedNumber++)
  });

  assert.equal(result.level, 5);
  assert.equal(result.xp, 50);
  assert.equal(result.levelsGained, 4);
  assert.equal(result.progression.growthEvents.length, 4);
  assert.ok(
    result.progression.growthEvents.every(
      (event, index) =>
        event.level === index + 2 &&
        event.amount === 1 &&
        event.requestId === "multi-level"
    )
  );
});

test("mantiene el crecimiento fijo legado y suma solo el nuevo sorteo", () => {
  const before = calculateFighterStats(4, baseStats);
  const result = applyFighterProgression({
    level: 4,
    xp: 165,
    xpGained: 25,
    baseStats,
    requestId: "legacy-growth",
    seedFactory: () => seedFor(7)
  });
  const after = calculateFighterStats(
    result.level,
    result.baseStats,
    result.progression
  );
  const event = result.progression.growthEvents[0];

  assert.equal(result.level, 5);
  assert.equal(result.xp, 15);
  assert.deepEqual(result.baseStats, baseStats);
  assert.deepEqual(result.progression.legacyStats, before);
  for (const stat of Object.keys(baseStats)) {
    assert.equal(after[stat], before[stat] + (event.stat === stat ? 1 : 0));
  }
});

test("una ficha nueva aplica el aumento a baseStats sin bono fijo por nivel", () => {
  const result = applyFighterProgression({
    level: 1,
    xp: 90,
    xpGained: 25,
    baseStats,
    progression: createFighterGrowthState(baseStats),
    requestId: "new-growth",
    seedFactory: () => seedFor(9)
  });
  const event = result.progression.growthEvents[0];

  assert.equal(result.level, 2);
  assert.equal(result.xp, 15);
  assert.deepEqual(
    calculateFighterStats(result.level, result.baseStats, result.progression),
    result.baseStats
  );
  assert.equal(result.baseStats[event.stat], baseStats[event.stat] + 1);
});

test("no sortea un atributo cuando todos sus topes ya se alcanzaron", () => {
  const cappedStats = { health: 100, attack: 10, defense: 4, speed: 5 };
  const progression = {
    ...createFighterGrowthState(cappedStats),
    legacyStats: { health: 150, attack: 30, defense: 19, speed: 15 }
  };
  const result = applyFighterProgression({
    level: 1,
    xp: 90,
    xpGained: 25,
    baseStats: cappedStats,
    progression,
    requestId: "all-capped",
    seedFactory: () => seedFor(11)
  });

  assert.equal(result.level, 2);
  assert.equal(result.xp, 15);
  assert.equal(result.progression.growthEvents[0].stat, null);
  assert.equal(result.progression.growthEvents[0].amount, 0);
});
