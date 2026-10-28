import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyPetHealthPenalty,
  copyPetInventory,
  createInitialPetData,
  createPetSnapshot,
  PET_CATALOG_VERSION,
  PET_VERSION,
  unlockPetsForLevels,
  validatePetSnapshot
} from "../src/game-engine/petCatalog.js";

const seedFor = (value) => {
  const seed = Buffer.alloc(32);
  seed.writeUInt32BE(value, 28);
  return seed;
};

const pet = (petId, speciesId) => ({
  petId: petId.toString(16).padStart(24, "0"),
  speciesId,
  catalogVersion: PET_CATALOG_VERSION,
  version: PET_VERSION
});

test("la mascota inicial usa una tirada reproducible del ocho por ciento", () => {
  let receivedDog = 0;
  const sampleCount = 10_000;

  for (let index = 0; index < sampleCount; index += 1) {
    const seed = seedFor(index);
    const first = createInitialPetData(seed);
    assert.deepEqual(createInitialPetData(seed), first);
    assert.equal(first.petUnlocks.length, 1);
    assert.equal(first.petUnlocks[0].level, 1);
    assert.equal(first.petUnlocks[0].version, "fighter-pet-initial-v1");
    assert.equal(first.petUnlocks[0].requestId, "fighter-creation-v1");
    if (first.pets.length === 1) {
      receivedDog += 1;
      assert.equal(first.pets[0].speciesId, "perro");
    }
  }

  assert.ok(Math.abs(receivedDog / sampleCount - 0.08) < 0.01);
  assert.throws(() => createInitialPetData(Buffer.alloc(31)), TypeError);
});

test("un desbloqueo por nivel es reproducible e idempotente", () => {
  const input = {
    fromLevel: 1,
    toLevel: 8,
    inventory: [],
    requestId: "reward-id",
    seedFactory: (level = 0) => seedFor(level)
  };
  let nextSeed = 0;
  const result = unlockPetsForLevels({
    ...input,
    seedFactory: () => seedFor(nextSeed++)
  });
  let replaySeed = 0;
  const replay = unlockPetsForLevels({
    ...input,
    seedFactory: () => seedFor(replaySeed++)
  });

  assert.deepEqual(result, replay);
  assert.deepEqual(
    result.unlocks.map(({ level }) => level),
    [2, 3, 4, 5, 6, 7, 8]
  );
  assert.ok(
    result.unlocks.every(
      (unlock) =>
        Buffer.isBuffer(unlock.seed) &&
        unlock.seed.length === 32 &&
        unlock.requestId === "reward-id"
    )
  );

  const repeated = unlockPetsForLevels({
    fromLevel: 1,
    toLevel: 8,
    inventory: result.inventory,
    existingUnlocks: result.unlocks,
    requestId: "reward-id",
    seedFactory: () => assert.fail("A recorded level must not draw again.")
  });
  assert.deepEqual(repeated, result);
});

test("aplica el peso 96:3:1 y no supera los límites de colección", () => {
  const counts = { perro: 0, lobo: 0, oso: 0 };
  const sampleCount = 25_000;
  for (let index = 0; index < sampleCount; index += 1) {
    const result = unlockPetsForLevels({
      fromLevel: 1,
      toLevel: 2,
      inventory: [],
      requestId: `weight-${index}`,
      seedFactory: () => seedFor(index)
    });
    const speciesId = result.unlocks[0].speciesId;
    if (speciesId) {
      counts[speciesId] += 1;
    }
  }
  assert.ok(counts.perro > counts.lobo * 20);
  assert.ok(counts.lobo > counts.oso);

  assert.throws(
    () =>
      copyPetInventory([
        pet(1, "perro"),
        pet(2, "perro"),
        pet(3, "perro"),
        pet(4, "perro")
      ]),
    RangeError
  );
  assert.throws(
    () => copyPetInventory([pet(1, "lobo"), pet(2, "oso")]),
    RangeError
  );
  assert.throws(
    () => copyPetInventory([pet(1, "lobo"), pet(1, "lobo")]),
    RangeError
  );

  const fullCollection = [pet(1, "perro"), pet(2, "perro"), pet(3, "perro"), pet(4, "lobo")];
  const noEligibleSpecies = unlockPetsForLevels({
    fromLevel: 1,
    toLevel: 2,
    inventory: fullCollection,
    requestId: "full",
    seedFactory: () => seedFor(1)
  });
  assert.equal(noEligibleSpecies.inventory.length, 4);
  assert.equal(noEligibleSpecies.unlocks[0].speciesId, null);
});

test("la penalización acumulada respeta el piso y los snapshots son completos", () => {
  const stats = { health: 85, attack: 10, defense: 5, speed: 5 };
  const dogsAndWolf = [pet(1, "perro"), pet(2, "perro"), pet(3, "perro"), pet(4, "lobo")];
  assert.deepEqual(applyPetHealthPenalty(stats, []), stats);
  assert.equal(applyPetHealthPenalty(stats, dogsAndWolf).health, 43);

  const snapshots = createPetSnapshot("fighter-owner", dogsAndWolf);
  assert.equal(snapshots.length, 4);
  for (const snapshot of snapshots) {
    assert.equal(snapshot.ownerFighterId, "fighter-owner");
    assert.equal(validatePetSnapshot(snapshot).id, snapshot.speciesId);
  }
  const tampered = structuredClone(snapshots[0]);
  tampered.effects.ownerHealthPenalty = 0;
  assert.throws(() => validatePetSnapshot(tampered), RangeError);
});
