import { createHash, randomBytes } from "node:crypto";

export const EQUIPMENT_CATALOG_VERSION = "equipment-v1";
export const EQUIPMENT_UNLOCK_VERSION = "equipment-unlock-v1";
export const EQUIPMENT_LOADOUT_VERSION = "equipment-loadout-v1";
export const EQUIPMENT_UNLOCK_CHANCE_PERCENT = 20;

const UINT256_RANGE = 1n << 256n;
const MAX_UINT32 = 0xffffffff;

export const EQUIPMENT_CATALOG = Object.freeze([
  Object.freeze({
    id: "weapon-caliza-01",
    name: "Aguja de Caliza",
    slot: "weapon",
    minLevel: 1,
    initial: true,
    modifiers: Object.freeze({
      attack: 1,
      initiative: 2,
      piercing: 0,
      criticalChance: 0
    })
  }),
  Object.freeze({
    id: "weapon-yunque-01",
    name: "Maza de Yunque",
    slot: "weapon",
    minLevel: 1,
    initial: true,
    modifiers: Object.freeze({
      attack: 5,
      initiative: -2,
      piercing: 0,
      criticalChance: 0
    })
  }),
  Object.freeze({
    id: "weapon-estuario-01",
    name: "Lanza de Estuario",
    slot: "weapon",
    minLevel: 1,
    initial: true,
    modifiers: Object.freeze({
      attack: 2,
      initiative: 0,
      piercing: 1,
      criticalChance: 0
    })
  }),
  Object.freeze({
    id: "weapon-bruma-01",
    name: "Cuchilla de Bruma",
    slot: "weapon",
    minLevel: 1,
    initial: true,
    modifiers: Object.freeze({
      attack: 3,
      initiative: 1,
      piercing: 0,
      criticalChance: 1
    })
  }),
  Object.freeze({
    id: "weapon-polea-01",
    name: "Garfio de Polea",
    slot: "weapon",
    minLevel: 3,
    initial: false,
    modifiers: Object.freeze({
      attack: 4,
      initiative: 0,
      piercing: 1,
      criticalChance: 0
    })
  }),
  Object.freeze({
    id: "weapon-campana-01",
    name: "Vara de Campana",
    slot: "weapon",
    minLevel: 3,
    initial: false,
    modifiers: Object.freeze({
      attack: 2,
      initiative: 2,
      piercing: 0,
      criticalChance: 2
    })
  }),
  Object.freeze({
    id: "weapon-laja-01",
    name: "Disco de Laja",
    slot: "weapon",
    minLevel: 4,
    initial: false,
    modifiers: Object.freeze({
      attack: 3,
      initiative: 1,
      piercing: 1,
      criticalChance: 1
    })
  }),
  Object.freeze({
    id: "weapon-torbellino-01",
    name: "Martillo de Torbellino",
    slot: "weapon",
    minLevel: 5,
    initial: false,
    modifiers: Object.freeze({
      attack: 6,
      initiative: -2,
      piercing: 0,
      criticalChance: -1
    })
  }),
  Object.freeze({
    id: "armor-yute-01",
    name: "Manto de Yute",
    slot: "armor",
    minLevel: 2,
    initial: false,
    modifiers: Object.freeze({ defense: 1, initiative: 0 })
  }),
  Object.freeze({
    id: "armor-cañas-01",
    name: "Petral de Cañas",
    slot: "armor",
    minLevel: 3,
    initial: false,
    modifiers: Object.freeze({ defense: 2, initiative: 0 })
  }),
  Object.freeze({
    id: "armor-anillos-01",
    name: "Cota de Anillos",
    slot: "armor",
    minLevel: 4,
    initial: false,
    modifiers: Object.freeze({ defense: 3, initiative: -1 })
  }),
  Object.freeze({
    id: "armor-laja-01",
    name: "Coraza de Laja",
    slot: "armor",
    minLevel: 6,
    initial: false,
    modifiers: Object.freeze({ defense: 4, initiative: -2 })
  })
]);

const CATALOG_BY_ID = new Map(
  EQUIPMENT_CATALOG.map((item) => [item.id, item])
);

function drawUniformValue(seed, domain, divisor, initialCounter = 0) {
  const acceptanceLimit = (UINT256_RANGE / divisor) * divisor;

  for (let counter = initialCounter; counter <= MAX_UINT32; counter += 1) {
    const counterBytes = Buffer.alloc(4);
    counterBytes.writeUInt32BE(counter);
    const digest = createHash("sha256")
      .update(seed)
      .update(domain, "utf8")
      .update(counterBytes)
      .digest();
    const value = BigInt(`0x${digest.toString("hex")}`);

    if (value < acceptanceLimit) {
      return {
        value: value % divisor,
        nextCounter: counter + 1
      };
    }
  }

  throw new Error("Se agotaron los contadores del sorteo de equipo.");
}

export function drawEquipmentIndex(seed, domain, size, initialCounter = 0) {
  if (!Buffer.isBuffer(seed) || seed.length === 0) {
    throw new TypeError("La semilla del sorteo de equipo no es válida.");
  }
  if (typeof domain !== "string" || domain.length === 0) {
    throw new TypeError("El dominio del sorteo de equipo no es válido.");
  }
  if (!Number.isSafeInteger(size) || size < 1) {
    throw new RangeError("El tamaño del sorteo de equipo debe ser positivo.");
  }
  if (!Number.isInteger(initialCounter) || initialCounter < 0) {
    throw new RangeError("El contador del sorteo de equipo no es válido.");
  }

  const result = drawUniformValue(
    seed,
    domain,
    BigInt(size),
    initialCounter
  );
  return { index: Number(result.value), nextCounter: result.nextCounter };
}

export function validateEquipmentCatalog(catalog, version) {
  if (!Array.isArray(catalog) || catalog.length === 0) {
    throw new TypeError("El catálogo de equipo debe contener objetos.");
  }
  if (typeof version !== "string" || version.length === 0) {
    throw new TypeError("La versión del catálogo de equipo no es válida.");
  }

  const ids = new Set();
  for (const item of catalog) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.id !== "string" ||
      item.id.length === 0 ||
      ids.has(item.id) ||
      typeof item.name !== "string" ||
      item.name.length === 0 ||
      !["weapon", "armor"].includes(item.slot) ||
      !Number.isInteger(item.minLevel) ||
      item.minLevel < 1 ||
      typeof item.initial !== "boolean" ||
      !item.modifiers ||
      typeof item.modifiers !== "object" ||
      Array.isArray(item.modifiers)
    ) {
      throw new TypeError("El catálogo de equipo contiene un objeto inválido.");
    }
    ids.add(item.id);

    const expectedModifiers =
      item.slot === "weapon"
        ? ["attack", "initiative", "piercing", "criticalChance"]
        : ["defense", "initiative"];
    const modifierNames = Object.keys(item.modifiers);
    if (
      modifierNames.length !== expectedModifiers.length ||
      expectedModifiers.some(
        (modifier) =>
          !Object.hasOwn(item.modifiers, modifier) ||
          !Number.isInteger(item.modifiers[modifier])
      )
    ) {
      throw new TypeError("El catálogo de equipo contiene modificadores inválidos.");
    }
    if (
      (item.slot === "weapon" &&
        (item.modifiers.attack < 0 || item.modifiers.piercing < 0)) ||
      (item.slot === "armor" && item.modifiers.defense < 0)
    ) {
      throw new RangeError("El catálogo de equipo contiene modificadores fuera de rango.");
    }
    if (item.initial && (item.slot !== "weapon" || item.minLevel !== 1)) {
      throw new TypeError("El equipo inicial debe ser un arma de nivel uno.");
    }
  }

  if (
    version === EQUIPMENT_CATALOG_VERSION &&
    catalog.filter((item) => item.initial).length !== 4
  ) {
    throw new RangeError("El catálogo equipment-v1 debe definir cuatro armas iniciales.");
  }

  return true;
}

validateEquipmentCatalog(EQUIPMENT_CATALOG, EQUIPMENT_CATALOG_VERSION);

function copyInventory(inventory = []) {
  if (!Array.isArray(inventory)) {
    throw new TypeError("La colección de equipo no es válida.");
  }

  const seen = new Set();
  return inventory.map((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.itemId !== "string" ||
      entry.catalogVersion !== EQUIPMENT_CATALOG_VERSION ||
      !CATALOG_BY_ID.has(entry.itemId) ||
      seen.has(entry.itemId)
    ) {
      throw new RangeError("La colección contiene equipo inválido o duplicado.");
    }
    seen.add(entry.itemId);
    return { itemId: entry.itemId, catalogVersion: entry.catalogVersion };
  });
}

export function getEquipmentById(itemId, catalogVersion) {
  if (catalogVersion !== EQUIPMENT_CATALOG_VERSION) {
    throw new RangeError("La versión del catálogo de equipo no está disponible.");
  }
  const item = CATALOG_BY_ID.get(itemId);
  if (!item) {
    throw new RangeError("El objeto no existe en el catálogo de equipo.");
  }
  return item;
}

export function createInitialEquipment(seed) {
  if (!Buffer.isBuffer(seed) || seed.length !== 32) {
    throw new TypeError("La semilla de creación debe contener exactamente 32 bytes.");
  }

  const initialWeapons = EQUIPMENT_CATALOG.filter((item) => item.initial);
  const { index } = drawEquipmentIndex(
    seed,
    "equipment-starting-weapon-v1",
    initialWeapons.length
  );
  const weapon = initialWeapons[index];
  return {
    initialWeaponId: weapon.id,
    equipmentCatalogVersion: EQUIPMENT_CATALOG_VERSION,
    equipment: [
      { itemId: weapon.id, catalogVersion: EQUIPMENT_CATALOG_VERSION }
    ]
  };
}

export function unlockEquipmentForLevels({
  fromLevel,
  toLevel,
  inventory = [],
  existingUnlocks = [],
  requestId,
  seedFactory = () => randomBytes(32)
}) {
  if (
    !Number.isInteger(fromLevel) ||
    fromLevel < 1 ||
    !Number.isInteger(toLevel) ||
    toLevel < fromLevel
  ) {
    throw new RangeError("Los niveles del desbloqueo de equipo no son válidos.");
  }
  if (typeof requestId !== "string" || requestId.length === 0) {
    throw new TypeError("La clave del desbloqueo debe ser texto no vacío.");
  }
  if (typeof seedFactory !== "function") {
    throw new TypeError("seedFactory debe ser una función.");
  }

  const nextInventory = copyInventory(inventory);
  const unlocks = existingUnlocks.map((unlock) => ({ ...unlock }));
  const unlockedLevels = new Set(unlocks.map((unlock) => unlock.level));

  for (let level = fromLevel + 1; level <= toLevel; level += 1) {
    if (unlockedLevels.has(level)) {
      continue;
    }

    const seed = seedFactory();
    if (!Buffer.isBuffer(seed) || seed.length !== 32) {
      throw new TypeError("La semilla de desbloqueo debe contener 32 bytes.");
    }

    const domain = `${EQUIPMENT_UNLOCK_VERSION}:${level}`;
    const chance = drawUniformValue(seed, domain, 100n);
    let itemId = null;
    const candidates = EQUIPMENT_CATALOG.filter(
      (item) =>
        !item.initial &&
        item.minLevel <= level &&
        !nextInventory.some((owned) => owned.itemId === item.id)
    );

    if (
      Number(chance.value) < EQUIPMENT_UNLOCK_CHANCE_PERCENT &&
      candidates.length > 0
    ) {
      const { index } = drawEquipmentIndex(
        seed,
        domain,
        candidates.length,
        chance.nextCounter
      );
      itemId = candidates[index].id;
      nextInventory.push({
        itemId,
        catalogVersion: EQUIPMENT_CATALOG_VERSION
      });
    }

    unlocks.push({
      level,
      seed: Buffer.from(seed),
      version: EQUIPMENT_UNLOCK_VERSION,
      itemId,
      catalogVersion: EQUIPMENT_CATALOG_VERSION,
      requestId
    });
  }

  return { inventory: nextInventory, unlocks };
}

export function selectEquipmentLoadout({
  fighterId,
  seed,
  inventory = []
}) {
  if (typeof fighterId !== "string" || fighterId.length === 0) {
    throw new TypeError("fighterId debe ser texto no vacío.");
  }
  if (!Buffer.isBuffer(seed) || seed.length === 0) {
    throw new TypeError("La semilla de carga de equipo no es válida.");
  }

  const ownedItems = copyInventory(inventory).map(({ itemId, catalogVersion }) =>
    getEquipmentById(itemId, catalogVersion)
  );
  const selected = {};

  for (const slot of ["weapon", "armor"]) {
    const candidates = ownedItems.filter((item) => item.slot === slot);
    if (candidates.length === 0) {
      selected[slot] = null;
      continue;
    }
    const { index } = drawEquipmentIndex(
      seed,
      `${EQUIPMENT_LOADOUT_VERSION}:${fighterId}:${slot}`,
      candidates.length
    );
    const item = candidates[index];
    selected[slot] = {
      itemId: item.id,
      catalogVersion: EQUIPMENT_CATALOG_VERSION,
      name: item.name,
      slot: item.slot,
      modifiers: { ...item.modifiers }
    };
  }

  return {
    version: EQUIPMENT_LOADOUT_VERSION,
    catalogVersion: EQUIPMENT_CATALOG_VERSION,
    ...selected
  };
}

export function getEffectiveInitiative(stats, equipment) {
  return Math.max(
    1,
    stats.speed +
      (equipment?.weapon?.modifiers.initiative ?? 0) +
      (equipment?.armor?.modifiers.initiative ?? 0)
  );
}

export function copyEquipmentInventory(inventory) {
  return copyInventory(inventory);
}
