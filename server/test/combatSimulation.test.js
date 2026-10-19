import assert from "node:assert/strict";
import { test } from "node:test";
import { simulateCombat } from "../src/game-engine/simulateCombat.js";

const combatInput = {
  seed: "arena-prueba-4.2",
  fighters: [
    {
      fighterId: "fighter-a",
      name: "Fiera A",
      level: 1,
      elo: 1000,
      stats: { health: 100, attack: 10, defense: 4, speed: 5 }
    },
    {
      fighterId: "fighter-b",
      name: "Fiera B",
      level: 1,
      elo: 1000,
      stats: { health: 100, attack: 10, defense: 4, speed: 5 }
    }
  ]
};

test("produce el mismo resultado y los mismos eventos con la misma entrada y semilla", () => {
  const originalInput = structuredClone(combatInput);

  const firstResult = simulateCombat(combatInput);
  const secondResult = simulateCombat(combatInput);

  assert.deepEqual(secondResult, firstResult);
  assert.deepEqual(combatInput, originalInput);
});
