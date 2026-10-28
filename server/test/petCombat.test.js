import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TECHNIQUE_CATALOG,
  TECHNIQUE_CATALOG_VERSION,
  TECHNIQUE_LOADOUT_VERSION
} from "../src/game-engine/techniqueCatalog.js";
import { createPetSnapshot, PET_CATALOG_VERSION, PET_VERSION } from "../src/game-engine/petCatalog.js";
import { simulateCombat } from "../src/game-engine/simulateCombat.js";

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
    catalogVersion: TECHNIQUE_CATALOG_VERSION,
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

function makePets(fighterId, speciesIds) {
  return speciesIds.map((speciesId, index) =>
    createPetSnapshot(fighterId, [
      {
        petId: (index + 1).toString(16).padStart(24, "0"),
        speciesId,
        catalogVersion: PET_CATALOG_VERSION,
        version: PET_VERSION
      }
    ])[0]
  );
}

function createInput(seed, firstOptions = {}, secondOptions = {}) {
  return {
    seed,
    fighters: [
      {
        fighterId: "fighter-a",
        name: "Fiera A",
        level: 8,
        elo: 1000,
        stats: { health: 1000, attack: 2, defense: 0, speed: 15 },
        equipment: structuredClone(noEquipment),
        techniques: createLoadout(),
        pets: [],
        ...firstOptions
      },
      {
        fighterId: "fighter-b",
        name: "Fiera B",
        level: 8,
        elo: 1000,
        stats: { health: 1000, attack: 2, defense: 0, speed: 1 },
        equipment: structuredClone(noEquipment),
        techniques: createLoadout(),
        pets: [],
        ...secondOptions
      }
    ]
  };
}

test("integra mascotas en iniciativa, límites de acciones y replay", () => {
  const input = createInput("pet-replay-seed", {
    pets: makePets("fighter-a", ["perro"])
  });
  const result = simulateCombat(input);

  assert.equal(result.engineVersion, "1.3.0");
  assert.ok(result.summary.actionCount <= 30);
  assert.ok(result.events.some((event) => event.type === "pet_attack"));
  assert.deepEqual(simulateCombat(input), result);
  assert.deepEqual(input.fighters[0].pets, makePets("fighter-a", ["perro"]));
});

test("mantiene los eventos previos cuando un snapshot nuevo no tiene mascotas", () => {
  const withPetFormat = createInput("no-pets-regression");
  const legacyFormat = structuredClone(withPetFormat);
  for (const fighter of legacyFormat.fighters) {
    delete fighter.pets;
  }

  const current = simulateCombat(withPetFormat);
  const legacy = simulateCombat(legacyFormat);
  assert.equal(current.engineVersion, "1.3.0");
  assert.equal(legacy.engineVersion, "1.2.0");
  assert.deepEqual(current.summary, legacy.summary);
  assert.deepEqual(current.events, legacy.events);
});

test("los golpes múltiples de una mascota cuentan como una sola acción", () => {
  let multiStrikeResult = null;
  for (let index = 0; index < 20; index += 1) {
    const result = simulateCombat(
      createInput(`pet-multistrike-${index}`, {
        stats: { health: 1000, attack: 1, defense: 0, speed: 15 },
        pets: makePets("fighter-a", ["perro"])
      })
    );
    const firstActionStrikes = result.events.filter(
      (event) =>
        event.type === "pet_attack" &&
        event.actionNumber === 1 &&
        event.attackerPetId === "000000000000000000000001"
    );
    if (firstActionStrikes.length > 1) {
      multiStrikeResult = result;
      assert.ok(firstActionStrikes.length <= 3);
      break;
    }
  }
  assert.ok(multiStrikeResult);
  assert.equal(multiStrikeResult.summary.actionCount, 30);
});

test("Red neutraliza una mascota elegible y no se activa sin objetivos", () => {
  const redInput = createInput(
    "pet-red-seed",
    {
      techniques: createLoadout(null, createTechnique("tech-red"))
    },
    { pets: makePets("fighter-b", ["perro", "perro"]) }
  );
  const redResult = simulateCombat(redInput);
  const redEvent = redResult.events.find(
    (event) =>
      event.type === "technique_activated" &&
      event.techniqueId === "tech-red"
  );

  assert.equal(redEvent.actionNumber, 0);
  assert.equal(redEvent.petIds.length, 1);
  assert.ok(
    !redResult.events.some(
      (event) =>
        event.type === "pet_attack" &&
        event.attackerPetId === redEvent.petIds[0]
    )
  );

  const emptyResult = simulateCombat(
    createInput("pet-red-empty", {
      techniques: createLoadout(null, createTechnique("tech-red"))
    })
  );
  assert.equal(
    emptyResult.events.some(
      (event) =>
        event.type === "technique_activated" &&
        event.techniqueId === "tech-red"
    ),
    false
  );
});

test("Grito ahuyenta a todas las mascotas e Hipnosis las pasa al nuevo bando", () => {
  const gritoResult = simulateCombat(
    createInput(
      "pet-grito-seed",
      {
        techniques: createLoadout(
          null,
          createTechnique("tech-grito-condenados")
        )
      },
      { pets: makePets("fighter-b", ["perro", "lobo"]) }
    )
  );
  const gritoEvent = gritoResult.events.find(
    (event) =>
      event.type === "technique_activated" &&
      event.techniqueId === "tech-grito-condenados"
  );
  assert.equal(gritoEvent.effect.amount, 2);
  assert.equal(
    gritoResult.events.some((event) => event.type === "pet_attack"),
    false
  );

  const hypnosisResult = simulateCombat(
    createInput(
      "pet-hypnosis-seed",
      {
        stats: { health: 1000, attack: 2, defense: 0, speed: 25 },
        techniques: createLoadout(null, createTechnique("tech-hipnosis"))
      },
      { pets: makePets("fighter-b", ["perro"]) }
    )
  );
  const hypnosisEvent = hypnosisResult.events.find(
    (event) =>
      event.type === "technique_activated" &&
      event.techniqueId === "tech-hipnosis"
  );
  const transferredPetAttack = hypnosisResult.events.find(
    (event) =>
      event.type === "pet_attack" &&
      event.attackerPetId === hypnosisEvent.petIds[0]
  );

  assert.equal(hypnosisEvent.effect.amount, 1);
  assert.equal(transferredPetAttack.teamFighterId, "fighter-a");
  assert.equal(transferredPetAttack.petOwnerFighterId, "fighter-b");
  assert.equal(transferredPetAttack.targetFighterId, "fighter-b");
});

test("resuelve esquiva por golpe y combina mascota, técnica y equipo", () => {
  const pet = makePets("fighter-b", ["perro"])[0];
  const weapon = {
    ...structuredClone(noEquipment),
    weapon: {
      itemId: "weapon-caliza-01",
      catalogVersion: "equipment-v1",
      name: "Filo de Caliza",
      slot: "weapon",
      modifiers: {
        attack: 5,
        initiative: 0,
        piercing: 0,
        criticalChance: 0
      }
    }
  };
  let evadedResult = null;
  let petDamageEventSeen = false;
  for (let index = 0; index < 200; index += 1) {
    const result = simulateCombat(
      createInput(`pet-evasion-${index}`, {
        stats: { health: 1000, attack: 1, defense: 0, speed: 50 },
        equipment: structuredClone(weapon),
        techniques: createLoadout(createTechnique("tech-ojo-caliza"))
      }, {
        pets: [pet]
      })
    );
    if (result.events.some((event) => event.type === "pet_damage")) {
      petDamageEventSeen = true;
    }
    assert.equal(
      result.events.some(
        (event) =>
          ["attack", "damage"].includes(event.type) &&
          Object.hasOwn(event, "targetPetId")
      ),
      false
    );
    if (
      result.events.some(
        (event) => event.type === "pet_targeted_attack" && event.evaded
      )
    ) {
      evadedResult = result;
      break;
    }
  }
  assert.ok(evadedResult);
  assert.ok(petDamageEventSeen);
  assert.ok(
    evadedResult.events.some(
      (event) =>
        event.type === "technique_activated" &&
        event.techniqueId === "tech-ojo-caliza"
    )
  );
  assert.ok(
    evadedResult.events.some((event) => event.type === "pet_targeted_attack")
  );
  assert.equal(
    evadedResult.events.some(
      (event) =>
        event.type === "attack" &&
        Object.hasOwn(event, "targetPetId")
    ),
    false
  );
  assert.ok(evadedResult.events.some((event) => event.type === "pet_attack"));
});

test("rechaza snapshots de mascota de otro dueño o con efectos alterados", () => {
  const input = createInput("pet-invalid-owner", {
    pets: makePets("fighter-b", ["perro"])
  });
  assert.throws(() => simulateCombat(input), RangeError);

  const changedEffect = createInput("pet-invalid-effect", {
    pets: makePets("fighter-a", ["perro"])
  });
  changedEffect.fighters[0].pets[0].effects.ownerHealthPenalty = 0;
  assert.throws(() => simulateCombat(changedEffect), RangeError);
});
