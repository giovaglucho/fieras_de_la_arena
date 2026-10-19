import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyExperience,
  calculateEloChanges,
  calculateXpReward,
  getXpRequiredForNextLevel
} from "../src/game-engine/progression.js";

test("otorga la recompensa de XP correspondiente al resultado PvP", () => {
  assert.equal(calculateXpReward({ outcome: "win" }), 25);
  assert.equal(calculateXpReward({ outcome: "loss" }), 10);
  assert.equal(calculateXpReward({ outcome: "draw" }), 15);
});

test("otorga 5 XP por entrenamiento independientemente del resultado", () => {
  for (const outcome of ["win", "loss", "draw"]) {
    assert.equal(calculateXpReward({ outcome, isTraining: true }), 5);
  }
});

test("conserva XP restante al subir un nivel", () => {
  assert.deepEqual(applyExperience({ level: 1, xp: 90, xpGained: 25 }), {
    level: 2,
    xp: 15,
    levelsGained: 1
  });
});

test("procesa los umbrales de varios niveles usando el coste de cada nivel", () => {
  assert.deepEqual(applyExperience({ level: 1, xp: 0, xpGained: 600 }), {
    level: 5,
    xp: 50,
    levelsGained: 4
  });
});

test("calcula la XP necesaria para el siguiente nivel", () => {
  assert.equal(getXpRequiredForNextLevel(1), 100);
  assert.equal(getXpRequiredForNextLevel(3), 150);
  assert.throws(() => getXpRequiredForNextLevel(0), RangeError);
});

test("calcula cambios ELO para victoria, derrota y empate", () => {
  assert.deepEqual(
    calculateEloChanges({
      firstElo: 1000,
      secondElo: 1000,
      outcome: "win"
    }),
    { firstChange: 16, secondChange: -16 }
  );
  assert.deepEqual(
    calculateEloChanges({
      firstElo: 1000,
      secondElo: 1000,
      outcome: "loss"
    }),
    { firstChange: -16, secondChange: 16 }
  );
  assert.deepEqual(
    calculateEloChanges({
      firstElo: 1000,
      secondElo: 1000,
      outcome: "draw"
    }),
    { firstChange: 0, secondChange: 0 }
  );
});

test("no modifica ELO durante entrenamiento", () => {
  for (const outcome of ["win", "loss", "draw"]) {
    assert.deepEqual(
      calculateEloChanges({
        firstElo: 1000,
        secondElo: 1200,
        outcome,
        isTraining: true
      }),
      { firstChange: 0, secondChange: 0 }
    );
  }
});

test("mantiene cambios ELO simétricos al comparar puntuaciones diferentes", () => {
  const changes = calculateEloChanges({
    firstElo: 1000,
    secondElo: 1200,
    outcome: "win"
  });

  assert.deepEqual(changes, { firstChange: 24, secondChange: -24 });
  assert.equal(changes.firstChange + changes.secondChange, 0);
});

test("rechaza resultados y valores de XP inválidos", () => {
  assert.throws(
    () => calculateXpReward({ outcome: "unknown" }),
    RangeError
  );
  assert.throws(
    () => applyExperience({ level: 1, xp: -1, xpGained: 10 }),
    RangeError
  );
  assert.throws(
    () => applyExperience({ level: 1, xp: 0, xpGained: 1.5 }),
    RangeError
  );
});
