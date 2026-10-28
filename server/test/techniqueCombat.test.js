import assert from "node:assert/strict";
import { test } from "node:test";
import { simulateCombat } from "../src/game-engine/simulateCombat.js";
import {
  TECHNIQUE_CATALOG,
  TECHNIQUE_CATALOG_VERSION,
  TECHNIQUE_LOADOUT_VERSION
} from "../src/game-engine/techniqueCatalog.js";
import { resolveCombat } from "../src/services/combatService.js";

const noEquipment = {
  version: "equipment-loadout-v1",
  catalogVersion: "equipment-v1",
  weapon: null,
  armor: null
};

function createTechnique(techniqueId) {
  const definition = TECHNIQUE_CATALOG.find(({ id }) => id === techniqueId);
  assert.ok(definition, `Missing test technique ${techniqueId}.`);
  return {
    techniqueId: definition.id,
    techniqueVersion: definition.version,
    category: definition.category,
    minLevel: definition.minLevel,
    effect: {
      type: definition.effectType,
      amount: definition.effectAmount
    }
  };
}

function createLoadout(passive = null, active = null) {
  return {
    version: TECHNIQUE_LOADOUT_VERSION,
    catalogVersion: TECHNIQUE_CATALOG_VERSION,
    passive,
    active
  };
}

function createInput(seed, first = {}, second = {}) {
  const fighters = [
    {
      fighterId: "fighter-a",
      name: "Fiera A",
      level: 5,
      elo: 1000,
      stats: { health: 100, attack: 20, defense: 0, speed: 20 },
      equipment: structuredClone(noEquipment),
      techniques: createLoadout(),
      ...first
    },
    {
      fighterId: "fighter-b",
      name: "Fiera B",
      level: 5,
      elo: 1000,
      stats: { health: 100, attack: 1, defense: 0, speed: 1 },
      equipment: structuredClone(noEquipment),
      techniques: createLoadout(),
      ...second
    }
  ];
  return { seed, fighters };
}

function findActivation(techniqueId, createCombatInput, maxSeeds = 3000) {
  for (let seedNumber = 0; seedNumber < maxSeeds; seedNumber += 1) {
    const seed = `technique-seed-${seedNumber}`;
    const result = simulateCombat(createCombatInput(seed));
    const event = result.events.find(
      (item) =>
        item.type === "technique_activated" &&
        item.techniqueId === techniqueId
    );
    if (event) {
      return { result, event, seed };
    }
  }
  assert.fail(`${techniqueId} did not activate for any test seed.`);
}

test("resuelve las ocho condiciones aprobadas con activación única por técnica", () => {
  const cases = [
    {
      id: "tech-manto-polvo",
      input: (seed) =>
        createInput(seed, {
          stats: { health: 100, attack: 1, defense: 0, speed: 1 },
          techniques: createLoadout(createTechnique("tech-manto-polvo"))
        }, {
          stats: { health: 1000, attack: 30, defense: 0, speed: 20 }
        })
    },
    {
      id: "tech-ojo-caliza",
      input: (seed) =>
        createInput(seed, {
          techniques: createLoadout(createTechnique("tech-ojo-caliza"))
        })
    },
    {
      id: "tech-ritmo-marea",
      input: (seed) =>
        createInput(seed, {}, {
          stats: { health: 1000, attack: 1, defense: 0, speed: 20 },
          techniques: createLoadout(null, createTechnique("tech-ritmo-marea"))
        })
    },
    {
      id: "tech-pulso-bronce",
      input: (seed) =>
        createInput(seed, {
          stats: { health: 100, attack: 1, defense: 0, speed: 1 },
          techniques: createLoadout(null, createTechnique("tech-pulso-bronce"))
        }, {
          stats: { health: 1000, attack: 30, defense: 0, speed: 20 }
        })
    },
    {
      id: "tech-umbral-arena",
      input: (seed) =>
        createInput(seed, {
          stats: { health: 100, attack: 20, defense: 0, speed: 1 },
          techniques: createLoadout(createTechnique("tech-umbral-arena"))
        }, {
          stats: { health: 1000, attack: 30, defense: 0, speed: 20 }
        })
    },
    {
      id: "tech-guardia-anillos",
      input: (seed) =>
        createInput(seed, {
          stats: { health: 1000, attack: 1, defense: 0, speed: 1 },
          techniques: createLoadout(createTechnique("tech-guardia-anillos"))
        }, {
          stats: { health: 1000, attack: 1, defense: 0, speed: 20 },
          equipment: {
            ...structuredClone(noEquipment),
            weapon: {
              itemId: "test-weapon",
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
        })
    },
    {
      id: "tech-cuna-estuario",
      input: (seed) =>
        createInput(seed, {
          techniques: createLoadout(null, createTechnique("tech-cuna-estuario"))
        }, {
          stats: { health: 100, attack: 1, defense: 0, speed: 1 }
        })
    },
    {
      id: "tech-paso-yunque",
      input: (seed) =>
        createInput(seed, {}, {
          techniques: createLoadout(null, createTechnique("tech-paso-yunque"))
        })
    }
  ];

  for (const { id, input } of cases) {
    const { result, event, seed } = findActivation(id, input);
    assert.equal(result.engineVersion, "1.2.0");
    assert.deepEqual(simulateCombat(input(seed)), result);
    assert.equal(
      result.events.filter(
        (item) =>
          item.type === "technique_activated" && item.techniqueId === id
      ).length,
      1
    );
    assert.ok(event.trigger);
    assert.ok(event.effect.type);
    assert.ok(Number.isInteger(event.effect.amount));
  }
});

test("aplica el bono antes de la reducción y conserva el orden de eventos", () => {
  const firstTechniques = createLoadout(createTechnique("tech-umbral-arena"));
  const secondTechniques = createLoadout(
    null,
    createTechnique("tech-paso-yunque")
  );
  const { result } = findActivation(
    "tech-umbral-arena",
    (seed) =>
      createInput(seed, {
        stats: { health: 100, attack: 20, defense: 0, speed: 1 },
        techniques: firstTechniques
      }, {
        stats: { health: 1000, attack: 60, defense: 0, speed: 20 },
        techniques: secondTechniques
      })
  );
  const attackIndex = result.events.findIndex(
    (event) =>
      event.type === "attack" && event.attackerFighterId === "fighter-a"
  );
  const followingEvents = result.events.slice(attackIndex + 1);
  const offensiveIndex = followingEvents.findIndex(
    (event) =>
      event.type === "technique_activated" &&
      event.techniqueId === "tech-umbral-arena"
  );
  const defensiveIndex = followingEvents.findIndex(
    (event) =>
      event.type === "technique_activated" &&
      event.techniqueId === "tech-paso-yunque"
  );
  const damageIndex = followingEvents.findIndex(
    (event) => event.type === "damage"
  );

  assert.ok(offensiveIndex >= 0);
  assert.ok(defensiveIndex > offensiveIndex);
  assert.ok(damageIndex > defensiveIndex);
  const activations = result.events.filter(
    (event) => event.type === "technique_activated"
  );
  assert.equal(activations.length, 2);
  assert.ok(result.summary.actionCount <= 30);
  for (const fighterId of ["fighter-a", "fighter-b"]) {
    assert.ok(
      activations.filter((event) => event.fighterId === fighterId).length <= 1
    );
  }
});

test("resuelve el equipo antes del efecto de técnica y conserva el umbral impar exacto", () => {
  const weapon = {
    itemId: "test-bonus-weapon",
    catalogVersion: "equipment-v1",
    name: "Arma de prueba",
    slot: "weapon",
    modifiers: {
      attack: 5,
      initiative: 0,
      piercing: 0,
      criticalChance: 0
    }
  };
  const armor = {
    itemId: "test-armor",
    catalogVersion: "equipment-v1",
    name: "Armadura de prueba",
    slot: "armor",
    modifiers: { defense: 2, initiative: 0 }
  };
  let equippedResult;
  let equippedInput;
  for (let index = 0; index < 3000; index += 1) {
    const seed = `equipment-technique-${index}`;
    const candidate = createInput(seed, {
      equipment: { ...structuredClone(noEquipment), weapon },
      techniques: createLoadout(createTechnique("tech-ojo-caliza"))
    }, {
      equipment: { ...structuredClone(noEquipment), armor }
    });
    const result = simulateCombat(candidate);
    if (result.events[1]?.outcome === "normal") {
      equippedResult = result;
      equippedInput = candidate;
      break;
    }
  }
  assert.ok(equippedInput);

  const previousVersionInput = structuredClone(equippedInput);
  for (const fighter of previousVersionInput.fighters) {
    delete fighter.techniques;
  }
  const equippedDamage = equippedResult.events.find(
    (event) => event.type === "damage"
  ).amount;
  const previousDamage = simulateCombat(previousVersionInput).events.find(
    (event) => event.type === "damage"
  ).amount;
  assert.equal(equippedDamage, previousDamage + 2);

  let boundaryResult;
  for (let index = 0; index < 10_000; index += 1) {
    const candidate = simulateCombat(
      createInput(`odd-health-${index}`, {
        stats: { health: 101, attack: 1, defense: 0, speed: 1 },
        techniques: createLoadout(createTechnique("tech-manto-polvo"))
      }, {
        stats: { health: 1000, attack: 25, defense: 0, speed: 20 }
      })
    );
    const secondIncomingHit = candidate.events.find(
      (event) =>
        event.type === "damage" &&
        event.targetFighterId === "fighter-a" &&
        event.actionNumber === 3
    );
    const fifthAttack = candidate.events.find(
      (event) => event.type === "attack" && event.actionNumber === 5
    );
    if (
      secondIncomingHit?.remainingHealth === 51 &&
      fifthAttack?.outcome !== "misfire"
    ) {
      boundaryResult = candidate;
      break;
    }
  }
  assert.ok(boundaryResult);
  const mantoActivation = boundaryResult.events.find(
    (event) =>
      event.type === "technique_activated" &&
      event.techniqueId === "tech-manto-polvo"
  );
  assert.equal(mantoActivation.actionNumber, 7);
});

test("Pulso de Bronce registra la recuperación efectiva y no revive", () => {
  const { result } = findActivation("tech-pulso-bronce", (seed) =>
    createInput(seed, {
      stats: { health: 100, attack: 1, defense: 0, speed: 1 },
      techniques: createLoadout(null, createTechnique("tech-pulso-bronce"))
    }, {
      stats: { health: 1000, attack: 30, defense: 0, speed: 20 }
    })
  );
  const activation = result.events.find(
    (event) =>
      event.type === "technique_activated" &&
      event.techniqueId === "tech-pulso-bronce"
  );
  const damage = result.events.find(
    (event) =>
      event.type === "damage" &&
      event.targetFighterId === "fighter-a" &&
      event.remainingHealth === activation.healthBefore
  );

  assert.ok(damage);
  assert.ok(activation.healthAfter > activation.healthBefore);
  assert.ok(activation.healthAfter <= 100);
  assert.equal(activation.effect.amount, activation.healthAfter - activation.healthBefore);
});

test("la pifia no activa técnicas y el mismo snapshot y semilla reproducen el replay", () => {
  let input;
  let expected;
  for (let index = 0; index < 3000; index += 1) {
    input = createInput(`misfire-seed-${index}`, {
      techniques: createLoadout(null, createTechnique("tech-ritmo-marea"))
    });
    expected = simulateCombat(input);
    if (expected.events[1]?.outcome === "misfire") {
      break;
    }
  }

  assert.equal(expected.events[1].outcome, "misfire");
  assert.equal(
    expected.events.some(
      (event) =>
        event.type === "technique_activated" && event.actionNumber === 1
    ),
    false
  );
  assert.deepEqual(simulateCombat(input), expected);
});

test("no activa técnicas cuando sus condiciones de primer impacto, umbral o letalidad fallan", () => {
  const criticalWeapon = {
    ...structuredClone(noEquipment),
    weapon: {
      itemId: "test-critical-weapon",
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
  let ojoResult;
  for (let index = 0; index < 3000; index += 1) {
    const candidate = createInput(`critical-first-${index}`, {
      equipment: structuredClone(criticalWeapon),
      techniques: createLoadout(createTechnique("tech-ojo-caliza"))
    }, {
      stats: { health: 1000, attack: 1, defense: 0, speed: 1 }
    });
    const result = simulateCombat(candidate);
    if (result.events[1]?.outcome === "critical") {
      ojoResult = result;
      break;
    }
  }
  assert.ok(ojoResult);
  assert.equal(
    ojoResult.events.some(
      (event) =>
        event.type === "technique_activated" &&
        event.techniqueId === "tech-ojo-caliza"
    ),
    false
  );

  let rhythmResult;
  for (let index = 0; index < 3000; index += 1) {
    const candidate = simulateCombat(
      createInput(`rhythm-before-rival-${index}`, {
        techniques: createLoadout(null, createTechnique("tech-ritmo-marea"))
      }, {
        stats: { health: 1000, attack: 1, defense: 0, speed: 1 }
      })
    );
    if (candidate.events[1]?.outcome === "normal") {
      rhythmResult = candidate;
      break;
    }
  }
  assert.ok(rhythmResult);
  assert.equal(rhythmResult.events[1].attackerFighterId, "fighter-a");
  assert.equal(rhythmResult.events[1].outcome, "normal");
  assert.equal(
    rhythmResult.events.some(
      (event) =>
        event.type === "technique_activated" &&
        event.techniqueId === "tech-ritmo-marea"
    ),
    false
  );

  const thresholdResult = simulateCombat(
    createInput("health-thresholds-not-met", {
      stats: { health: 1000, attack: 1, defense: 0, speed: 20 },
      techniques: createLoadout(createTechnique("tech-umbral-arena"))
    }, {
      stats: { health: 1000, attack: 1, defense: 0, speed: 1 },
      techniques: createLoadout(null, createTechnique("tech-cuna-estuario"))
    })
  );
  assert.equal(
    thresholdResult.events.some(
      (event) =>
        event.type === "technique_activated" &&
        ["tech-umbral-arena", "tech-cuna-estuario"].includes(event.techniqueId)
    ),
    false
  );

  const mantoResult = simulateCombat(
    createInput("manto-health-above-half", {
      stats: { health: 1000, attack: 1, defense: 0, speed: 1 },
      techniques: createLoadout(createTechnique("tech-manto-polvo"))
    }, {
      stats: { health: 1000, attack: 1, defense: 0, speed: 20 }
    })
  );
  assert.equal(
    mantoResult.events.some(
      (event) =>
        event.type === "technique_activated" &&
        event.techniqueId === "tech-manto-polvo"
    ),
    false
  );

  let noCriticalResult;
  for (let index = 0; index < 3000; index += 1) {
    const candidate = simulateCombat(
      createInput(`guard-no-critical-${index}`, {
        stats: { health: 1000, attack: 1, defense: 0, speed: 1 },
        techniques: createLoadout(createTechnique("tech-guardia-anillos"))
      }, {
        stats: { health: 1000, attack: 1, defense: 0, speed: 20 },
        equipment: structuredClone(noEquipment)
      })
    );
    if (!candidate.events.some((event) => event.outcome === "critical")) {
      noCriticalResult = candidate;
      break;
    }
  }
  assert.ok(noCriticalResult);
  assert.equal(
    noCriticalResult.events.some(
      (event) =>
        event.type === "technique_activated" &&
        event.techniqueId === "tech-guardia-anillos"
    ),
    false
  );

  const lethalPulseResult = simulateCombat(
    createInput("lethal-pulse", {
      stats: { health: 100, attack: 1, defense: 0, speed: 20 }
    }, {
      stats: { health: 1, attack: 1, defense: 0, speed: 1 },
      techniques: createLoadout(null, createTechnique("tech-pulso-bronce"))
    })
  );
  assert.equal(
    lethalPulseResult.events.some(
      (event) =>
        event.type === "technique_activated" &&
        event.techniqueId === "tech-pulso-bronce"
    ),
    false
  );
  assert.equal(lethalPulseResult.summary.winnerFighterId, "fighter-a");
});

test("un combate sin técnicas mantiene los eventos de la versión anterior", () => {
  const input = createInput("no-technique-regression");
  const previousInput = structuredClone(input);
  const versionedInput = structuredClone(input);
  for (const fighter of previousInput.fighters) {
    delete fighter.techniques;
  }
  for (const fighter of versionedInput.fighters) {
    fighter.techniques = createLoadout();
  }

  const previous = simulateCombat(previousInput);
  const versioned = simulateCombat(versionedInput);

  assert.equal(previous.engineVersion, "1.1.0");
  assert.equal(versioned.engineVersion, "1.2.0");
  assert.deepEqual(versioned.summary, previous.summary);
  assert.deepEqual(versioned.events, previous.events);
});

test("rechaza técnicas no poseídas, manipuladas o incompatibles con el nivel", () => {
  const input = createInput("tampered-technique", {
    techniques: createLoadout(createTechnique("tech-ojo-caliza"))
  });
  const unknown = structuredClone(input);
  unknown.fighters[0].techniques.passive.techniqueId = "tech-forged";
  assert.throws(() => simulateCombat(unknown), RangeError);

  const changedEffect = structuredClone(input);
  changedEffect.fighters[0].techniques.passive.effect.amount = 999;
  assert.throws(() => simulateCombat(changedEffect), RangeError);

  const tooLowLevel = structuredClone(input);
  tooLowLevel.fighters[0].level = 1;
  tooLowLevel.fighters[0].techniques.passive = createTechnique("tech-umbral-arena");
  assert.throws(() => simulateCombat(tooLowLevel), RangeError);

  const extraSlot = structuredClone(input);
  extraSlot.fighters[0].techniques.extra = createTechnique("tech-manto-polvo");
  assert.throws(() => simulateCombat(extraSlot), TypeError);
});

test("la solicitud de combate rechaza selecciones de técnica enviadas por cliente", async () => {
  await assert.rejects(
    resolveCombat({
      requesterFighterId: "507f1f77bcf86cd799439011",
      opponentFighterId: "507f1f77bcf86cd799439012",
      battleType: "pvp",
      requestId: "client-technique-tampering",
      techniques: ["tech-ojo-caliza"]
    }),
    { code: "INVALID_COMBAT_REQUEST" }
  );
});
