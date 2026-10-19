import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateFighterStats } from "../src/game-engine/fighterStats.js";

const baseStats = {
  health: 100,
  attack: 10,
  defense: 4,
  speed: 5
};

test("calcula las estadísticas iniciales y el aumento de vida por nivel", () => {
  assert.deepEqual(calculateFighterStats(1, baseStats), baseStats);
  assert.deepEqual(calculateFighterStats(2, baseStats), {
    health: 105,
    attack: 10,
    defense: 4,
    speed: 5
  });
});

test("aumenta ataque y defensa al completar sus intervalos desde nivel 1", () => {
  assert.deepEqual(calculateFighterStats(3, baseStats), {
    health: 110,
    attack: 11,
    defense: 4,
    speed: 5
  });
  assert.deepEqual(calculateFighterStats(4, baseStats), {
    health: 115,
    attack: 11,
    defense: 5,
    speed: 5
  });
});

test("produce siempre las mismas estadísticas sin modificar los atributos base", () => {
  const input = { ...baseStats };
  const firstResult = calculateFighterStats(8, input);
  const secondResult = calculateFighterStats(8, input);

  assert.deepEqual(firstResult, {
    health: 135,
    attack: 13,
    defense: 6,
    speed: 5
  });
  assert.deepEqual(secondResult, firstResult);
  assert.deepEqual(input, baseStats);
});

test("rechaza niveles o estadísticas base inválidos", () => {
  assert.throws(() => calculateFighterStats(0, baseStats), RangeError);
  assert.throws(() => calculateFighterStats(1.5, baseStats), RangeError);
  assert.throws(() => calculateFighterStats(1, null), TypeError);
  assert.throws(
    () => calculateFighterStats(1, { ...baseStats, speed: -1 }),
    RangeError
  );
});
