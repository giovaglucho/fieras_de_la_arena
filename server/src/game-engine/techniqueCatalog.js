import { createHash, randomBytes } from "node:crypto";

export const TECHNIQUE_CATALOG_VERSION = "fighter-techniques-v1";
export const TECHNIQUE_UNLOCK_VERSION = "fighter-technique-unlock-v1";
export const TECHNIQUE_LOADOUT_VERSION = "fighter-technique-loadout-v1";
export const TECHNIQUE_RULES_VERSION = "fighter-technique-rules-v1";
export const TECHNIQUE_UNLOCK_CHANCE_PERCENT = 20;

const UINT256_RANGE = 1n << 256n;
const MAX_UINT32 = 0xffffffff;

export const TECHNIQUE_CATALOG = Object.freeze([
  Object.freeze({
    id: "tech-manto-polvo",
    name: "Manto de Polvo",
    category: "passive",
    minLevel: 1,
    initial: true,
    version: "technique-v1",
    effectType: "damage_reduction",
    effectAmount: 2
  }),
  Object.freeze({
    id: "tech-ojo-caliza",
    name: "Ojo de Caliza",
    category: "passive",
    minLevel: 1,
    initial: true,
    version: "technique-v1",
    effectType: "damage_bonus",
    effectAmount: 2
  }),
  Object.freeze({
    id: "tech-ritmo-marea",
    name: "Ritmo de Marea",
    category: "active",
    minLevel: 1,
    initial: true,
    version: "technique-v1",
    effectType: "damage_bonus",
    effectAmount: 2
  }),
  Object.freeze({
    id: "tech-pulso-bronce",
    name: "Pulso de Bronce",
    category: "active",
    minLevel: 1,
    initial: true,
    version: "technique-v1",
    effectType: "heal",
    effectAmount: 3
  }),
  Object.freeze({
    id: "tech-umbral-arena",
    name: "Umbral de Arena",
    category: "passive",
    minLevel: 3,
    initial: false,
    version: "technique-v1",
    effectType: "damage_bonus",
    effectAmount: 3
  }),
  Object.freeze({
    id: "tech-guardia-anillos",
    name: "Guardia de Anillos",
    category: "passive",
    minLevel: 3,
    initial: false,
    version: "technique-v1",
    effectType: "damage_reduction",
    effectAmount: 2
  }),
  Object.freeze({
    id: "tech-cuna-estuario",
    name: "Cuña de Estuario",
    category: "active",
    minLevel: 5,
    initial: false,
    version: "technique-v1",
    effectType: "damage_bonus",
    effectAmount: 3
  }),
  Object.freeze({
    id: "tech-paso-yunque",
    name: "Paso de Yunque",
    category: "active",
    minLevel: 5,
    initial: false,
    version: "technique-v1",
    effectType: "damage_reduction",
    effectAmount: 3
  })
]);

const CATALOG_BY_ID = new Map(
  TECHNIQUE_CATALOG.map((technique) => [technique.id, technique])
);

function drawUniformValue(seed, domain, divisor, startCounter = 0) {
  const acceptanceLimit = (UINT256_RANGE / divisor) * divisor;

  for (let counter = startCounter; counter <= MAX_UINT32; counter += 1) {
    const counterBytes = Buffer.alloc(4);
    counterBytes.writeUInt32BE(counter);
    const digest = createHash("sha256")
      .update(seed)
      .update(domain, "utf8")
      .update(counterBytes)
      .digest();
    const value = BigInt(`0x${digest.toString("hex")}`);

    if (value < acceptanceLimit) {
      return { value: value % divisor, nextCounter: counter + 1 };
    }
  }

  throw new Error("Se agotaron los contadores al sortear una técnica.");
}

function drawUniformIndex(seed, domain, size, startCounter = 0) {
  const { value, nextCounter } = drawUniformValue(
    seed,
    domain,
    BigInt(size),
    startCounter
  );
  return { index: Number(value), nextCounter };
}

function copyTechniqueInventory(inventory) {
  if (!Array.isArray(inventory)) {
    throw new TypeError("La colección de técnicas debe ser una lista.");
  }

  const seen = new Set();
  return inventory.map((entry) => {
    const technique = getTechniqueById(
      entry?.techniqueId,
      entry?.catalogVersion,
      entry?.techniqueVersion
    );
    if (seen.has(technique.id)) {
      throw new RangeError("La colección de técnicas no puede tener duplicados.");
    }
    seen.add(technique.id);
    return {
      techniqueId: technique.id,
      catalogVersion: TECHNIQUE_CATALOG_VERSION,
      techniqueVersion: technique.version
    };
  });
}

export function getTechniqueById(
  techniqueId,
  catalogVersion,
  techniqueVersion
) {
  if (catalogVersion !== TECHNIQUE_CATALOG_VERSION) {
    throw new RangeError("La versión del catálogo de técnicas no está disponible.");
  }
  const technique = CATALOG_BY_ID.get(techniqueId);
  if (!technique || technique.version !== techniqueVersion) {
    throw new RangeError("La técnica no existe en la versión indicada.");
  }
  return technique;
}

export function createInitialTechnique(seed) {
  if (!Buffer.isBuffer(seed) || seed.length !== 32) {
    throw new TypeError("La semilla de creación debe contener exactamente 32 bytes.");
  }

  const initialTechniques = TECHNIQUE_CATALOG.filter(
    (technique) => technique.initial
  );
  const { index } = drawUniformIndex(
    seed,
    "fighter-technique-initial-v1",
    initialTechniques.length
  );
  const technique = initialTechniques[index];

  return {
    initialTechniqueId: technique.id,
    techniqueCatalogVersion: TECHNIQUE_CATALOG_VERSION,
    techniques: [
      {
        techniqueId: technique.id,
        catalogVersion: TECHNIQUE_CATALOG_VERSION,
        techniqueVersion: technique.version
      }
    ],
    techniqueUnlocks: []
  };
}

export function unlockTechniquesForLevels({
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
    throw new RangeError("Los niveles del desbloqueo de técnicas no son válidos.");
  }
  if (typeof requestId !== "string" || requestId.length === 0) {
    throw new TypeError("La clave del desbloqueo debe ser texto no vacío.");
  }
  if (typeof seedFactory !== "function") {
    throw new TypeError("seedFactory debe ser una función.");
  }

  const nextInventory = copyTechniqueInventory(inventory);
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

    const domain = `${TECHNIQUE_UNLOCK_VERSION}:${level}`;
    const chance = drawUniformValue(seed, domain, 100n);
    const candidates = TECHNIQUE_CATALOG.filter(
      (technique) =>
        technique.minLevel <= level &&
        !nextInventory.some((owned) => owned.techniqueId === technique.id)
    );
    let techniqueId = null;

    if (
      Number(chance.value) < TECHNIQUE_UNLOCK_CHANCE_PERCENT &&
      candidates.length > 0
    ) {
      const { index } = drawUniformIndex(
        seed,
        domain,
        candidates.length,
        chance.nextCounter
      );
      const technique = candidates[index];
      techniqueId = technique.id;
      nextInventory.push({
        techniqueId,
        catalogVersion: TECHNIQUE_CATALOG_VERSION,
        techniqueVersion: technique.version
      });
    }

    unlocks.push({
      level,
      seed: Buffer.from(seed),
      version: TECHNIQUE_UNLOCK_VERSION,
      techniqueId,
      catalogVersion: TECHNIQUE_CATALOG_VERSION,
      requestId
    });
  }

  return { inventory: nextInventory, unlocks };
}

export function selectTechniquesForCombat({
  fighterId,
  level,
  seed,
  inventory = []
}) {
  if (typeof fighterId !== "string" || fighterId.length === 0) {
    throw new TypeError("fighterId debe ser texto no vacío.");
  }
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError("level debe ser un entero positivo.");
  }
  if (typeof seed !== "string" || seed.length === 0) {
    throw new TypeError("seed debe ser texto no vacío.");
  }

  const eligible = copyTechniqueInventory(inventory)
    .map((owned) =>
      getTechniqueById(
        owned.techniqueId,
        owned.catalogVersion,
        owned.techniqueVersion
      )
    )
    .filter((technique) => technique.minLevel <= level);
  const selectCategory = (category) => {
    const candidates = eligible.filter(
      (technique) => technique.category === category
    );
    if (candidates.length === 0) {
      return null;
    }
    const { index } = drawUniformIndex(
      Buffer.from(seed, "utf8"),
      `fighter-technique-loadout-v1:${fighterId}:${category}`,
      candidates.length
    );
    const { id, version, minLevel, effectType, effectAmount } =
      candidates[index];
    return {
      techniqueId: id,
      techniqueVersion: version,
      category,
      minLevel,
      effect: { type: effectType, amount: effectAmount }
    };
  };

  return {
    version: TECHNIQUE_LOADOUT_VERSION,
    catalogVersion: TECHNIQUE_CATALOG_VERSION,
    passive: selectCategory("passive"),
    active: selectCategory("active")
  };
}
