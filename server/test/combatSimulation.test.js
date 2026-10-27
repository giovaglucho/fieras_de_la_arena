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

const noEquipment = {
  version: "equipment-loadout-v1",
  catalogVersion: "equipment-v1",
  weapon: null,
  armor: null
};

function equippedInput(seed, firstEquipment = noEquipment, secondEquipment = noEquipment) {
  const input = structuredClone(combatInput);
  input.seed = seed;
  input.fighters[0].equipment = structuredClone(firstEquipment);
  input.fighters[1].equipment = structuredClone(secondEquipment);
  return input;
}

function firstAttack(seedPrefix, equipment = noEquipment, configure = (input) => input) {
  for (let index = 0; index < 10_000; index += 1) {
    const seed = `${seedPrefix}-${index}`;
    const result = simulateCombat(
      configure(equippedInput(seed, equipment))
    );
    const attack = result.events.find((event) => event.type === "attack");
    if (attack.outcome === seedPrefix) {
      return { result, seed };
    }
  }
  assert.fail(`No se encontró una semilla reproducible para ${seedPrefix}.`);
}

test("produce el mismo resultado y los mismos eventos con la misma entrada y semilla", () => {
  const originalInput = structuredClone(combatInput);

  const firstResult = simulateCombat(combatInput);
  const secondResult = simulateCombat(combatInput);

  assert.deepEqual(secondResult, firstResult);
  assert.deepEqual(combatInput, originalInput);
});

test("el motor nuevo resuelve combates válidos incluso sin equipo", () => {
  const result = simulateCombat(equippedInput("equipment-empty"));

  assert.equal(result.engineVersion, "1.1.0");
  assert.equal(result.summary.actionCount > 0, true);
  assert.ok(result.events.some((event) => event.type === "damage"));
});

test("una pifia consume la acción y causa cero daño", () => {
  const { result } = firstAttack("misfire", noEquipment, (input) => {
    input.fighters.forEach((fighter) => {
      fighter.stats.health = 1000;
    });
    return input;
  });
  const attackIndex = result.events.findIndex((event) => event.type === "attack");
  const [attack, damage] = result.events.slice(attackIndex, attackIndex + 2);

  assert.equal(attack.outcome, "misfire");
  assert.equal(damage.amount, 0);
  assert.equal(result.summary.actionCount, 30);
});

test("un crítico es distinto de una pifia y aplica el multiplicador", () => {
  const criticalWeapon = {
    ...noEquipment,
    weapon: {
      itemId: "weapon-test",
      catalogVersion: "equipment-v1",
      name: "Arma de prueba",
      slot: "weapon",
      modifiers: {
        attack: 0,
        initiative: 0,
        piercing: 0,
        criticalChance: 10
      }
    }
  };
  const { result } = firstAttack("critical", criticalWeapon, (input) => {
    input.fighters[0].stats.attack = 200;
    input.fighters[0].stats.speed = 20;
    input.fighters[1].stats.defense = 0;
    input.fighters[1].stats.speed = 1;
    input.fighters[1].stats.health = 10000;
    return input;
  });
  const attackIndex = result.events.findIndex((event) => event.type === "attack");
  const [attack, damage] = result.events.slice(attackIndex, attackIndex + 2);

  assert.equal(attack.outcome, "critical");
  assert.ok(damage.amount >= 135);
});

test("iniciativa, ataque, defensa y perforación solo aplican modificadores permitidos", () => {
  const configure = (input) => {
    input.fighters[0].stats.speed = 20;
    input.fighters[1].stats.speed = 1;
    input.fighters[0].stats.attack = 100;
    input.fighters[1].stats.defense = 0;
    input.fighters[1].stats.health = 10000;
    return input;
  };
  const weapon = (modifiers) => ({
    ...noEquipment,
    weapon: {
      itemId: "weapon-test",
      catalogVersion: "equipment-v1",
      name: "Arma de prueba",
      slot: "weapon",
      modifiers: {
        attack: 0,
        initiative: 0,
        piercing: 0,
        criticalChance: 0,
        ...modifiers
      }
    }
  });
  const armor = (defense, initiative = 0) => ({
    ...noEquipment,
    armor: {
      itemId: "armor-test",
      catalogVersion: "equipment-v1",
      name: "Armadura de prueba",
      slot: "armor",
      modifiers: { defense, initiative }
    }
  });
  const { seed } = firstAttack("normal", noEquipment, configure);
  const run = (attackerEquipment, targetEquipment) => {
    const input = configure(equippedInput(seed, attackerEquipment));
    input.fighters[1].equipment = targetEquipment;
    return simulateCombat(input);
  };
  const firstAttackEvent = (result) =>
    result.events.find((event) => event.type === "attack");
  const firstDamage = (result) =>
    result.events.find((event) => event.type === "damage").amount;
  const baseline = run(noEquipment, noEquipment);
  const strongerWeapon = run(weapon({ attack: 10 }), noEquipment);
  const protectedTarget = run(noEquipment, armor(5));
  const piercedTarget = run(weapon({ piercing: 1 }), armor(5));

  assert.equal(firstAttackEvent(baseline).attackerFighterId, "fighter-a");
  assert.equal(firstAttackEvent(baseline).outcome, "normal");
  assert.ok(firstDamage(strongerWeapon) > firstDamage(baseline));
  assert.equal(firstDamage(protectedTarget), firstDamage(baseline) - 5);
  assert.equal(firstDamage(piercedTarget), firstDamage(protectedTarget) + 1);

  const initiativeInput = configure(equippedInput(seed, weapon({ initiative: 2 })));
  initiativeInput.fighters[0].stats.speed = 4;
  initiativeInput.fighters[1].stats.speed = 5;
  assert.equal(
    firstAttackEvent(simulateCombat(initiativeInput)).attackerFighterId,
    "fighter-a"
  );
});

test("las semillas reproducen el sorteo de pifia y crítico", () => {
  const { result: misfireResult, seed: misfireSeed } = firstAttack("misfire");
  const { result: criticalResult, seed: criticalSeed } = firstAttack(
    "critical",
    {
      ...noEquipment,
      weapon: {
        itemId: "weapon-test",
        catalogVersion: "equipment-v1",
        name: "Arma de prueba",
        slot: "weapon",
        modifiers: {
          attack: 0,
          initiative: 0,
          piercing: 0,
          criticalChance: 10
        }
      }
    }
  );
  assert.deepEqual(
    simulateCombat(equippedInput(misfireSeed)).events,
    misfireResult.events
  );
  assert.deepEqual(
    simulateCombat(
      equippedInput(criticalSeed, {
        ...noEquipment,
        weapon: {
          itemId: "weapon-test",
          catalogVersion: "equipment-v1",
          name: "Arma de prueba",
          slot: "weapon",
          modifiers: {
            attack: 0,
            initiative: 0,
            piercing: 0,
            criticalChance: 10
          }
        }
      })
    ).events,
    criticalResult.events
  );
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
