import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createInitialTechnique,
  selectTechniquesForCombat,
  TECHNIQUE_CATALOG,
  TECHNIQUE_CATALOG_VERSION,
  TECHNIQUE_UNLOCK_VERSION,
  unlockTechniquesForLevels
} from "../src/game-engine/techniqueCatalog.js";

const seedFor = (value) => {
  const seed = Buffer.alloc(32);
  seed.writeUInt32BE(value, 28);
  return seed;
};

test("asigna una técnica inicial válida y reproducible con dominio separado", () => {
  const seen = new Set();
  for (let value = 0; value < 256; value += 1) {
    const seed = seedFor(value);
    const result = createInitialTechnique(seed);
    const owned = result.techniques[0];

    assert.equal(result.techniques.length, 1);
    assert.equal(result.techniqueUnlocks.length, 0);
    assert.equal(result.techniqueCatalogVersion, TECHNIQUE_CATALOG_VERSION);
    assert.equal(
      owned.techniqueId,
      TECHNIQUE_CATALOG.find(({ id }) => id === owned.techniqueId).id
    );
    assert.equal(
      TECHNIQUE_CATALOG.find(({ id }) => id === owned.techniqueId).initial,
      true
    );
    assert.deepEqual(createInitialTechnique(seed), result);
    seen.add(owned.techniqueId);
  }

  assert.equal(seen.size, 4);
  assert.throws(() => createInitialTechnique(Buffer.alloc(31)), TypeError);
});

test("registra cada nivel, evita copias y no repite desbloqueos existentes", () => {
  let seedNumber = 0;
  const initial = createInitialTechnique(seedFor(10));
  const result = unlockTechniquesForLevels({
    fromLevel: 1,
    toLevel: 5,
    inventory: initial.techniques,
    requestId: "level-reward",
    seedFactory: () => seedFor(seedNumber++)
  });

  assert.deepEqual(
    result.unlocks.map(({ level }) => level),
    [2, 3, 4, 5]
  );
  assert.ok(
    result.unlocks.every(
      (unlock) =>
        Buffer.isBuffer(unlock.seed) &&
        unlock.seed.length === 32 &&
        unlock.version === TECHNIQUE_UNLOCK_VERSION &&
        unlock.requestId === "level-reward"
    )
  );
  assert.equal(
    new Set(result.inventory.map(({ techniqueId }) => techniqueId)).size,
    result.inventory.length
  );
  for (const unlock of result.unlocks) {
    if (unlock.techniqueId) {
      const technique = TECHNIQUE_CATALOG.find(
        ({ id }) => id === unlock.techniqueId
      );
      assert.ok(technique.minLevel <= unlock.level);
      assert.ok(
        result.inventory.some(({ techniqueId }) => techniqueId === technique.id)
      );
    }
  }

  const repeated = unlockTechniquesForLevels({
    fromLevel: 1,
    toLevel: 5,
    inventory: result.inventory,
    existingUnlocks: result.unlocks,
    requestId: "level-reward",
    seedFactory: () => {
      assert.fail("Un nivel ya registrado no debe volver a sortearse.");
    }
  });
  assert.deepEqual(repeated, result);
});

test("una semilla, nivel y versiones repetidos reproducen el mismo desbloqueo", () => {
  const initial = createInitialTechnique(seedFor(12));
  const createUnlock = () =>
    unlockTechniquesForLevels({
      fromLevel: 1,
      toLevel: 2,
      inventory: initial.techniques,
      requestId: "replay-level-2",
      seedFactory: () => seedFor(900)
    });

  assert.deepEqual(createUnlock(), createUnlock());
});

test("pondera el grupo antimascota con 15 por ciento y conserva 5:3:1 dentro del grupo", () => {
  const normalInventory = TECHNIQUE_CATALOG.filter(
    ({ id, initial }) =>
      initial &&
      !["tech-grito-condenados", "tech-red", "tech-hipnosis"].includes(id)
  ).map(({ id, version }) => ({
    techniqueId: id,
    catalogVersion: TECHNIQUE_CATALOG_VERSION,
    techniqueVersion: version
  }));
  const counts = {
    normal: 0,
    "tech-grito-condenados": 0,
    "tech-red": 0,
    "tech-hipnosis": 0
  };
  const sampleCount = 30_000;

  for (let index = 0; index < sampleCount; index += 1) {
    const result = unlockTechniquesForLevels({
      fromLevel: 7,
      toLevel: 8,
      inventory: normalInventory,
      requestId: `pet-counter-${index}`,
      seedFactory: () => seedFor(index)
    });
    const techniqueId = result.unlocks[0].techniqueId;
    if (techniqueId) {
      if (Object.hasOwn(counts, techniqueId)) {
        counts[techniqueId] += 1;
      } else {
        counts.normal += 1;
      }
    }
  }

  const antiPetCount =
    counts["tech-grito-condenados"] +
    counts["tech-red"] +
    counts["tech-hipnosis"];
  const successfulCount = antiPetCount + counts.normal;
  assert.ok(Math.abs(antiPetCount / successfulCount - 0.15) < 0.025);
  assert.ok(
    Math.abs(counts["tech-grito-condenados"] / antiPetCount - 5 / 9) < 0.06
  );
  assert.ok(Math.abs(counts["tech-red"] / antiPetCount - 3 / 9) < 0.06);
  assert.ok(
    Math.abs(counts["tech-hipnosis"] / antiPetCount - 1 / 9) < 0.04
  );
});

test("el grupo único con candidatas recibe todo el sorteo y excluye poseídas", () => {
  const normalInventory = TECHNIQUE_CATALOG.filter(
    ({ id }) =>
      !["tech-grito-condenados", "tech-red", "tech-hipnosis"].includes(id)
  ).map(({ id, version }) => ({
    techniqueId: id,
    catalogVersion: TECHNIQUE_CATALOG_VERSION,
    techniqueVersion: version
  }));
  for (let index = 0; index < 100; index += 1) {
    const result = unlockTechniquesForLevels({
      fromLevel: 3,
      toLevel: 4,
      inventory: normalInventory,
      requestId: `only-anti-pet-${index}`,
      seedFactory: () => seedFor(index)
    });
    if (result.unlocks[0].techniqueId) {
      assert.equal(result.unlocks[0].techniqueId, "tech-grito-condenados");
    }
  }
});

test("rechaza propiedad duplicada, catálogo ajeno y semillas de desbloqueo inválidas", () => {
  const initial = createInitialTechnique(seedFor(15));
  const duplicateInventory = [
    ...initial.techniques,
    { ...initial.techniques[0] }
  ];

  assert.throws(
    () =>
      selectTechniquesForCombat({
        fighterId: "fighter-a",
        level: 1,
        seed: "battle-seed",
        inventory: duplicateInventory
      }),
    RangeError
  );
  assert.throws(
    () =>
      selectTechniquesForCombat({
        fighterId: "fighter-a",
        level: 1,
        seed: "battle-seed",
        inventory: [
          { ...initial.techniques[0], catalogVersion: "foreign-catalog" }
        ]
      }),
    RangeError
  );
  assert.throws(
    () =>
      unlockTechniquesForLevels({
        fromLevel: 1,
        toLevel: 2,
        requestId: "invalid-seed",
        seedFactory: () => Buffer.alloc(31)
      }),
    TypeError
  );
});

test("selecciona solo técnicas poseídas y elegibles en slots separados y reproducibles", () => {
  const initial = createInitialTechnique(seedFor(21));
  const laterTechniques = TECHNIQUE_CATALOG.filter(
    (technique) => !technique.initial && technique.category === "passive"
  ).map((technique) => ({
    techniqueId: technique.id,
    catalogVersion: TECHNIQUE_CATALOG_VERSION,
    techniqueVersion: technique.version
  }));
  const inventory = [...initial.techniques, ...laterTechniques];
  const selection = selectTechniquesForCombat({
    fighterId: "fighter-a",
    level: 3,
    seed: "battle-seed",
    inventory
  });
  const repeated = selectTechniquesForCombat({
    fighterId: "fighter-a",
    level: 3,
    seed: "battle-seed",
    inventory
  });
  const lowerLevelSelection = selectTechniquesForCombat({
    fighterId: "fighter-a",
    level: 2,
    seed: "battle-seed",
    inventory
  });

  assert.deepEqual(selection, repeated);
  assert.equal(selection.version, "fighter-technique-loadout-v2");
  assert.equal(selection.catalogVersion, TECHNIQUE_CATALOG_VERSION);
  assert.equal(selection.passive?.category, "passive");
  assert.equal(selection.active?.category, "active");
  for (const selected of [selection.passive, selection.active]) {
    if (selected) {
      assert.ok(inventory.some(({ techniqueId }) => techniqueId === selected.techniqueId));
      assert.ok(selected.minLevel <= 3);
    }
  }
  assert.ok(
    lowerLevelSelection.passive === null ||
      lowerLevelSelection.passive.minLevel <= 2
  );
});
