import assert from "node:assert/strict";
import { test } from "node:test";
import serializeBattle from "../src/utils/serializeBattle.js";

function createBattle(equipment) {
  const participants = ["fighter-one", "fighter-two"].map((fighterId, index) => ({
    snapshot: {
      fighterId: { toString: () => fighterId },
      name: fighterId,
      level: 1,
      elo: 1000,
      stats: { health: 100, attack: 10, defense: 4, speed: 5 },
      ...(index === 0 && equipment
        ? { equipment, initiative: 7 }
        : {})
    },
    result: { xpGained: 25, eloChange: 0, eloAfter: 1000 }
  }));

  return {
    _id: { toString: () => "battle-id" },
    battleType: "pvp",
    createdAt: new Date("2026-10-27T12:00:00.000Z"),
    winnerFighterId: null,
    actionCount: 1,
    engineVersion: "combat-v2",
    participants,
    events: [{ type: "combat_finished", winnerFighterId: null }]
  };
}

test("serializa snapshots de carga sin exponer semillas ni alterar registros legados", () => {
  const equipment = {
    version: "equipment-loadout-v1",
    catalogVersion: "equipment-v1",
    weapon: {
      itemId: "weapon-caliza-01",
      catalogVersion: "equipment-v1",
      name: "Aguja de Caliza",
      slot: "weapon",
      modifiers: {
        attack: 1,
        initiative: 2,
        piercing: 0,
        criticalChance: 0
      }
    },
    armor: null
  };
  const battle = createBattle(equipment);
  battle.seed = "private-combat-seed";

  const serialized = serializeBattle(battle, true);

  assert.deepEqual(serialized.participants[0].fighter.equipment, equipment);
  assert.equal(serialized.participants[0].fighter.initiative, 7);
  assert.equal(
    Object.hasOwn(serialized.participants[1].fighter, "equipment"),
    false
  );
  assert.equal(Object.hasOwn(serialized, "seed"), false);
  assert.deepEqual(serialized.events, battle.events);

  const legacyBattle = serializeBattle(createBattle(null), true);
  assert.equal(
    Object.hasOwn(legacyBattle.participants[0].fighter, "equipment"),
    false
  );
});
