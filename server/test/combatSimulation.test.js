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

test("aplica un punto de daño mínimo cuando el ataque no supera la defensa", () => {
  const input = structuredClone(combatInput);
  input.fighters[0].stats.attack = 0;
  input.fighters[0].stats.speed = 6;
  input.fighters[1].stats.defense = 100;
  input.fighters[1].stats.speed = 5;

  const result = simulateCombat(input);
  const firstDamage = result.events.find((event) => event.type === "damage");

  assert.deepEqual(firstDamage, {
    type: "damage",
    actionNumber: 1,
    targetFighterId: "fighter-b",
    amount: 1,
    remainingHealth: 99
  });
});

test("ordena los turnos por velocidad y alterna los atacantes", () => {
  const input = structuredClone(combatInput);
  input.fighters[0].stats.speed = 8;
  input.fighters[1].stats.speed = 3;

  const result = simulateCombat(input);
  const attacks = result.events.filter((event) => event.type === "attack");

  assert.equal(attacks[0].attackerFighterId, "fighter-a");
  assert.equal(attacks[1].attackerFighterId, "fighter-b");
});

test("termina inmediatamente cuando un luchador queda fuera de combate", () => {
  const input = structuredClone(combatInput);
  input.fighters[0].stats.speed = 8;
  input.fighters[0].stats.attack = 1000;
  input.fighters[1].stats.speed = 3;
  input.fighters[1].stats.health = 10;

  const result = simulateCombat(input);

  assert.equal(result.summary.winnerFighterId, "fighter-a");
  assert.equal(result.summary.actionCount, 1);
  assert.deepEqual(
    result.events.map((event) => event.type),
    ["combat_started", "attack", "damage", "fighter_defeated", "combat_finished"]
  );
  assert.equal(result.events[2].remainingHealth, 0);
});

test("detiene el combate en el máximo de 30 acciones sin KO", () => {
  const input = structuredClone(combatInput);
  input.fighters[0].stats.health = 1001;
  input.fighters[0].stats.attack = 0;
  input.fighters[0].stats.defense = 0;
  input.fighters[0].stats.speed = 8;
  input.fighters[1].stats.health = 1000;
  input.fighters[1].stats.attack = 0;
  input.fighters[1].stats.defense = 0;
  input.fighters[1].stats.speed = 3;

  const result = simulateCombat(input);
  const attacks = result.events.filter((event) => event.type === "attack");

  assert.equal(result.summary.actionCount, 30);
  assert.equal(attacks.length, 30);
  assert.equal(result.events.some((event) => event.type === "fighter_defeated"), false);
  assert.equal(result.summary.winnerFighterId, "fighter-a");
});

test("declara empate si ambos conservan la misma vida al llegar al máximo", () => {
  const input = structuredClone(combatInput);
  for (const fighter of input.fighters) {
    fighter.stats.health = 1000;
    fighter.stats.attack = 0;
    fighter.stats.defense = 0;
  }

  const result = simulateCombat(input);
  const finalEvent = result.events.at(-1);

  assert.equal(result.summary.actionCount, 30);
  assert.equal(result.summary.winnerFighterId, null);
  assert.deepEqual(finalEvent, {
    type: "combat_finished",
    winnerFighterId: null
  });
});
