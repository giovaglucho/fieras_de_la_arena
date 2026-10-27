import assert from "node:assert/strict";
import { test } from "node:test";
import {
  copyEquipmentInventory,
  createInitialEquipment,
  drawEquipmentIndex,
  EQUIPMENT_CATALOG,
  EQUIPMENT_CATALOG_VERSION,
  EQUIPMENT_UNLOCK_VERSION,
  selectEquipmentLoadout,
  unlockEquipmentForLevels,
  validateEquipmentCatalog
} from "../src/game-engine/equipmentCatalog.js";

function seedFor(value) {
  const seed = Buffer.alloc(32);
  seed.writeUInt32BE(value, 28);
  return seed;
}

test("valida el catálogo versionado y rechaza IDs, modificadores o slots inválidos", () => {
  assert.equal(validateEquipmentCatalog(EQUIPMENT_CATALOG, EQUIPMENT_CATALOG_VERSION), true);
  assert.throws(
    () => validateEquipmentCatalog([], EQUIPMENT_CATALOG_VERSION),
    TypeError
  );
  assert.throws(
    () =>
      validateEquipmentCatalog(
        [EQUIPMENT_CATALOG[0], EQUIPMENT_CATALOG[0]],
        EQUIPMENT_CATALOG_VERSION
      ),
    TypeError
  );
  assert.throws(
    () =>
      validateEquipmentCatalog(
        [{ ...EQUIPMENT_CATALOG[0], slot: "pet" }],
        EQUIPMENT_CATALOG_VERSION
      ),
    TypeError
  );
  assert.throws(
    () =>
      validateEquipmentCatalog(
        [
          {
            ...EQUIPMENT_CATALOG[0],
            modifiers: { ...EQUIPMENT_CATALOG[0].modifiers, unknown: 1 }
          }
        ],
        EQUIPMENT_CATALOG_VERSION
      ),
    TypeError
  );
  assert.throws(
    () =>
      validateEquipmentCatalog(
        EQUIPMENT_CATALOG.filter((item) => item.id !== "weapon-caliza-01"),
        EQUIPMENT_CATALOG_VERSION
      ),
    RangeError
  );
  assert.throws(
    () =>
      validateEquipmentCatalog(
        [
          {
            ...EQUIPMENT_CATALOG[0],
            modifiers: { ...EQUIPMENT_CATALOG[0].modifiers, attack: -1 }
          }
        ],
        "equipment-test"
      ),
    RangeError
  );
});

test("el arma inicial se deriva de la semilla y solo pertenece a la selección inicial", () => {
  const seed = seedFor(91);
  const first = createInitialEquipment(seed);
  assert.deepEqual(createInitialEquipment(seed), first);
  assert.equal(first.equipment.length, 1);
  assert.equal(first.equipment[0].itemId, first.initialWeaponId);
  assert.equal(first.equipment[0].catalogVersion, EQUIPMENT_CATALOG_VERSION);
  assert.ok(
    EQUIPMENT_CATALOG.filter(({ initial }) => initial).some(
      ({ id }) => id === first.initialWeaponId
    )
  );
});

test("los índices reproducibles validan semillas y límites", () => {
  const seed = seedFor(12);
  assert.deepEqual(
    drawEquipmentIndex(seed, "equipment-test", 4),
    drawEquipmentIndex(seed, "equipment-test", 4)
  );
  assert.throws(() => drawEquipmentIndex(Buffer.alloc(0), "test", 2), TypeError);
  assert.throws(() => drawEquipmentIndex(seed, "test", 0), RangeError);
});

test("los desbloqueos son reproducibles, idempotentes y no duplican propiedad", () => {
  const seed = Array.from({ length: 10_000 }, (_, index) => seedFor(index)).find(
    (candidate) =>
      unlockEquipmentForLevels({
        fromLevel: 1,
        toLevel: 2,
        inventory: [{ itemId: "weapon-caliza-01", catalogVersion: EQUIPMENT_CATALOG_VERSION }],
        requestId: "unlock-test",
        seedFactory: () => candidate
      }).unlocks[0].itemId !== null
  );
  assert.ok(seed);

  const result = unlockEquipmentForLevels({
    fromLevel: 1,
    toLevel: 2,
    inventory: [{ itemId: "weapon-caliza-01", catalogVersion: EQUIPMENT_CATALOG_VERSION }],
    requestId: "unlock-test",
    seedFactory: () => seed
  });
  assert.equal(result.unlocks[0].version, EQUIPMENT_UNLOCK_VERSION);
  assert.equal(result.unlocks[0].level, 2);
  assert.equal(result.unlocks[0].itemId, result.inventory[1].itemId);
  assert.equal(new Set(result.inventory.map(({ itemId }) => itemId)).size, 2);

  const retry = unlockEquipmentForLevels({
    fromLevel: 1,
    toLevel: 2,
    inventory: result.inventory,
    existingUnlocks: result.unlocks,
    requestId: "unlock-test",
    seedFactory: () => {
      throw new Error("Un reintento no debe volver a sortear el mismo nivel.");
    }
  });
  assert.deepEqual(retry, result);
  assert.throws(
    () =>
      copyEquipmentInventory([
        { itemId: "id-elegido-por-cliente", catalogVersion: EQUIPMENT_CATALOG_VERSION }
      ]),
    RangeError
  );
  assert.throws(
    () =>
      copyEquipmentInventory([
        { itemId: "weapon-caliza-01", catalogVersion: EQUIPMENT_CATALOG_VERSION },
        { itemId: "weapon-caliza-01", catalogVersion: EQUIPMENT_CATALOG_VERSION }
      ]),
    RangeError
  );
});

test("procesa todos los niveles cruzados y no compensa colecciones sin candidatos", () => {
  let seedNumber = 0;
  const multiLevel = unlockEquipmentForLevels({
    fromLevel: 1,
    toLevel: 4,
    inventory: [],
    requestId: "multi-level-unlock",
    seedFactory: () => seedFor(seedNumber++)
  });
  assert.deepEqual(
    multiLevel.unlocks.map(({ level }) => level),
    [2, 3, 4]
  );
  assert.equal(new Set(multiLevel.unlocks.map(({ seed }) => seed.toString("hex"))).size, 3);

  const completeForLevelTwo = unlockEquipmentForLevels({
    fromLevel: 1,
    toLevel: 2,
    inventory: EQUIPMENT_CATALOG.filter(
      (item) => item.initial || item.id === "armor-yute-01"
    ).map(({ id }) => ({
      itemId: id,
      catalogVersion: EQUIPMENT_CATALOG_VERSION
    })),
    requestId: "no-eligible-items",
    seedFactory: () => seedFor(4)
  });
  assert.equal(completeForLevelTwo.unlocks[0].itemId, null);
  assert.equal(
    completeForLevelTwo.inventory.length,
    EQUIPMENT_CATALOG.filter(
      (item) => item.initial || item.id === "armor-yute-01"
    ).length
  );
});

test("la carga vacía usa slots nulos y la carga parcial solo selecciona objetos propios", () => {
  const seed = seedFor(782);
  const emptyLoadout = selectEquipmentLoadout({
    fighterId: "fighter-empty",
    seed,
    inventory: []
  });
  assert.equal(emptyLoadout.weapon, null);
  assert.equal(emptyLoadout.armor, null);

  const inventory = [
    { itemId: "weapon-caliza-01", catalogVersion: EQUIPMENT_CATALOG_VERSION },
    { itemId: "armor-yute-01", catalogVersion: EQUIPMENT_CATALOG_VERSION }
  ];
  const loadout = selectEquipmentLoadout({
    fighterId: "fighter-owned",
    seed,
    inventory
  });
  assert.equal(loadout.weapon.itemId, "weapon-caliza-01");
  assert.equal(loadout.armor.itemId, "armor-yute-01");
  assert.deepEqual(
    selectEquipmentLoadout({
      fighterId: "fighter-owned",
      seed,
      inventory
    }),
    loadout
  );
});
