import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Fighter from "../src/models/Fighter.js";
import {
  createInitialFighterData,
  FIGHTER_CREATION_VERSION,
  getFighterAppearance,
  NEUTRAL_FIGHTER_APPEARANCE,
  validateFighterAppearance
} from "../src/game-engine/fighterCreation.js";
import { TECHNIQUE_CATALOG } from "../src/game-engine/techniqueCatalog.js";
import { validateManagedFighterCreation } from "../src/validators/fighterManagement.js";

const APPROVED_PROFILES = [
  {
    profile: "resistente",
    baseStats: { health: 85, attack: 10, defense: 5, speed: 5 }
  },
  {
    profile: "equilibrado",
    baseStats: { health: 100, attack: 10, defense: 4, speed: 5 }
  },
  {
    profile: "vitalidad",
    baseStats: { health: 115, attack: 10, defense: 3, speed: 5 }
  }
];

test("genera y conserva perfiles iniciales exclusivamente aprobados", () => {
  for (let value = 0; value < 256; value += 1) {
    const seed = Buffer.alloc(32, value);
    const created = createInitialFighterData(seed);
    const approved = APPROVED_PROFILES.find(
      (profile) => profile.profile === created.creation.profile
    );

    assert.ok(approved);
    assert.deepEqual(created.baseStats, approved.baseStats);
    assert.equal(created.creation.version, FIGHTER_CREATION_VERSION);
    assert.deepEqual(created.creation.seed, seed);
    assert.equal(created.techniques.length, 1);
    assert.equal(
      created.creation.initialTechniqueId,
      created.techniques[0].techniqueId
    );
    assert.ok(
      TECHNIQUE_CATALOG.some(
        ({ id, initial }) => id === created.techniques[0].techniqueId && initial
      )
    );
    assert.equal(created.petUnlocks.length, 1);
    assert.equal(created.petUnlocks[0].level, 1);
    assert.equal(created.petUnlocks[0].speciesId, created.pets[0]?.speciesId ?? null);
  }
});

test("una semilla repetida reproduce el mismo perfil y semilla", () => {
  const seed = Buffer.from(
    "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
    "hex"
  );

  assert.deepEqual(createInitialFighterData(seed), createInitialFighterData(seed));
  assert.throws(() => createInitialFighterData(Buffer.alloc(31)), TypeError);
});

test("valida las 500 combinaciones de apariencia definidas y rechaza valores ajenos", () => {
  const tones = ["arena", "arcilla", "cobre", "pizarra", "marfil"];
  const hairs = ["rapado", "corto", "trenzas", "melena", "cresta"];
  const clothing = [
    "tunica-cruzada",
    "manto-corto",
    "faldon-tejido",
    "chaleco-tejido"
  ];
  const accessories = [
    "ninguno",
    "cinta",
    "collar-cuentas",
    "brazaletes",
    "pendientes"
  ];
  let combinations = 0;

  for (const tone of tones) {
    for (const hair of hairs) {
      for (const clothingOption of clothing) {
        for (const accessory of accessories) {
          assert.ok(
            validateFighterAppearance({
              tone,
              hair,
              clothing: clothingOption,
              accessory
            })
          );
          combinations += 1;
        }
      }
    }
  }

  assert.equal(combinations, 500);
  assert.equal(validateFighterAppearance({ ...NEUTRAL_FIGHTER_APPEARANCE, stats: 1 }), null);
  assert.equal(
    validateFighterAppearance({ ...NEUTRAL_FIGHTER_APPEARANCE, tone: "legendario" }),
    null
  );
  assert.deepEqual(getFighterAppearance(undefined), NEUTRAL_FIGHTER_APPEARANCE);
});

test("los payloads de creación aceptan apariencia pero nunca stats del cliente", () => {
  const creation = {
    name: "Luchador",
    requestId: "request-1",
    appearance: {
      tone: "cobre",
      hair: "trenzas",
      clothing: "manto-corto",
      accessory: "cinta"
    }
  };

  assert.deepEqual(validateManagedFighterCreation(creation), creation);
  assert.deepEqual(
    validateManagedFighterCreation({ name: "Luchador", requestId: "request-2" }),
    { name: "Luchador", requestId: "request-2", appearance: null }
  );
  assert.equal(
    validateManagedFighterCreation({
      ...creation,
      baseStats: { health: 999999 }
    }),
    null
  );
  assert.equal(
    validateManagedFighterCreation({
      name: "Luchador",
      requestId: "request-3",
      seed: "cliente"
    }),
    null
  );
  assert.equal(
    validateManagedFighterCreation({
      name: "Luchador",
      requestId: "request-4",
      creation: { profile: "vitalidad" }
    }),
    null
  );
  assert.equal(
    validateManagedFighterCreation({
      name: "Luchador",
      requestId: "request-5",
      pets: []
    }),
    null
  );
  assert.equal(
    validateManagedFighterCreation({
      ...creation,
      appearance: { ...creation.appearance, baseStats: {} }
    }),
    null
  );
  assert.equal(
    validateManagedFighterCreation({
      name: "Luchador",
      requestId: "request-6",
      equipment: [{ itemId: "weapon-tomado-del-cliente" }]
    }),
    null
  );
});

test("el modelo valida límites y unicidad de la colección de mascotas", async () => {
  const fighter = (pets) =>
    new Fighter({
      userId: new mongoose.Types.ObjectId(),
      name: "fiera-mascotas",
      referralCode: "pet-validation",
      pets,
      petUnlocks: pets.map((entry, index) => ({
        level: index + 1,
        seed: Buffer.alloc(32, index),
        version: index === 0
          ? "fighter-pet-initial-v1"
          : "fighter-pet-unlock-v1",
        petId: entry.petId,
        speciesId: entry.speciesId,
        catalogVersion: entry.catalogVersion,
        requestId: `pet-${index}`
      }))
    });
  const validCollection = fighter(
    ["perro", "perro", "perro", "lobo"].map((speciesId, index) => ({
      petId: (index + 1).toString(16).padStart(24, "0"),
      speciesId,
      catalogVersion: "fighter-pets-v1",
      version: "pet-v1"
    }))
  );
  await validCollection.validate();

  const invalidCollection = fighter(
    ["perro", "perro", "perro", "perro"].map((speciesId, index) => ({
      petId: (index + 1).toString(16).padStart(24, "0"),
      speciesId,
      catalogVersion: "fighter-pets-v1",
      version: "pet-v1"
    }))
  );
  await assert.rejects(
    invalidCollection.validate(),
    (error) => error.errors.pets.kind === "user defined"
  );
});

test("los luchadores existentes reciben una apariencia neutral por defecto", () => {
  const fighter = new Fighter({
    userId: "507f1f77bcf86cd799439011",
    name: "legado",
    referralCode: "codigo-legado"
  });

  assert.deepEqual(fighter.appearance.toObject(), NEUTRAL_FIGHTER_APPEARANCE);
});
