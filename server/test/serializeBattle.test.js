import assert from "node:assert/strict";
import { test } from "node:test";
import serializeBattle from "../src/utils/serializeBattle.js";

function createBattle(progression, includeTechniques = true) {
  const fighterId = "fighter-own";
  const techniques = {
    version: "fighter-technique-loadout-v1",
    catalogVersion: "fighter-techniques-v1",
    passive: {
      techniqueId: "tech-manto-polvo",
      techniqueVersion: "technique-v1",
      category: "passive",
      minLevel: 1,
      effect: { type: "damage_reduction", amount: 2 }
    },
    active: null
  };
  const participantResult = {
    xpGained: 25,
    eloChange: 16,
    eloAfter: 1016,
    growthEvents: [
      {
        level: 2,
        stat: "attack",
        amount: 1,
        seed: Buffer.alloc(32, 1),
        requestId: "private-reward-key"
      }
    ]
  };
  if (progression) {
    participantResult.progression = progression;
  }

  return {
    _id: { toString: () => "battle-id" },
    battleType: "pvp",
    createdAt: new Date("2026-10-27T12:00:00.000Z"),
    winnerFighterId: { toString: () => fighterId },
    actionCount: 2,
    engineVersion: "combat-v1",
    participants: [
      {
        snapshot: {
          fighterId: { toString: () => fighterId },
          name: "colmillo",
          level: 1,
          elo: 1000,
          stats: { health: 100, attack: 10, defense: 4, speed: 5 },
          ...(includeTechniques ? { techniques } : {})
        },
        result: participantResult
      },
      {
        snapshot: {
          fighterId: { toString: () => "fighter-opponent" },
          name: "rival",
          level: 1,
          elo: 1000,
          stats: { health: 100, attack: 10, defense: 4, speed: 5 }
        },
        result: { xpGained: 10, eloChange: -16, eloAfter: 984 }
      }
    ],
    events: [{ type: "combat_finished", winnerFighterId: fighterId }]
  };
}

test("expone progreso oficial del resultado sin revelar semillas ni claves", () => {
  const progression = {
    levelBefore: 1,
    levelAfter: 2,
    xpBefore: 95,
    xpAfter: 20,
    levelsGained: 1,
    statsBefore: { health: 100, attack: 10, defense: 4, speed: 5 },
    statsAfter: { health: 100, attack: 11, defense: 4, speed: 5 }
  };

  const serialized = serializeBattle(createBattle(progression), true);

  assert.deepEqual(serialized.participants[0].result.progression, {
    ...progression,
    growthEvents: [{ level: 2, stat: "attack", amount: 1 }]
  });
  assert.equal(JSON.stringify(serialized).includes("private-reward-key"), false);
  assert.equal(JSON.stringify(serialized).includes(Buffer.alloc(32, 1).toString("hex")), false);
});

test("omite progreso en resúmenes y conserva compatibilidad con combates antiguos", () => {
  const progression = {
    levelBefore: 1,
    levelAfter: 2,
    xpBefore: 95,
    xpAfter: 20,
    levelsGained: 1,
    statsBefore: { health: 100, attack: 10, defense: 4, speed: 5 },
    statsAfter: { health: 100, attack: 11, defense: 4, speed: 5 }
  };
  const summary = serializeBattle(createBattle(progression));
  const legacyDetail = serializeBattle(createBattle(null, false), true);

  assert.equal(summary.participants[0].result.progression, undefined);
  assert.equal(summary.events, undefined);
  assert.equal(legacyDetail.participants[0].result.progression, undefined);
  assert.equal(legacyDetail.participants[0].fighter.techniques, undefined);
});

test("serializa solo el snapshot de técnicas y no incorpora la colección privada", () => {
  const serialized = serializeBattle(createBattle(null), true);

  assert.deepEqual(serialized.participants[0].fighter.techniques, {
    version: "fighter-technique-loadout-v1",
    catalogVersion: "fighter-techniques-v1",
    passive: {
      techniqueId: "tech-manto-polvo",
      techniqueVersion: "technique-v1",
      category: "passive",
      minLevel: 1,
      effect: { type: "damage_reduction", amount: 2 }
    },
    active: null
  });
  assert.equal(JSON.stringify(serialized).includes("techniqueUnlocks"), false);
  assert.equal(JSON.stringify(serialized).includes("seed"), false);
});
