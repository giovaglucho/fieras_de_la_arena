import { createHash, randomBytes } from "node:crypto";

export const PET_CATALOG_VERSION = "fighter-pets-v1";
export const PET_VERSION = "pet-v1";
export const PET_INITIAL_VERSION = "fighter-pet-initial-v1";
export const PET_UNLOCK_VERSION = "fighter-pet-unlock-v1";
export const PET_SNAPSHOT_VERSION = "fighter-pet-snapshot-v1";
export const PET_RULES_VERSION = "fighter-pet-rules-v1";

const UINT256_RANGE = 1n << 256n;
const MAX_UINT32 = 0xffffffff;

export const PET_CATALOG = Object.freeze([
  Object.freeze({
    id: "perro",
    name: "Perro",
    rarity: "comun",
    version: PET_VERSION,
    stats: Object.freeze({ health: 14, strength: 5, agility: 5, speed: 20 }),
    attacksPerAction: Object.freeze({ min: 1, max: 3 }),
    ownerHealthPenalty: 10,
    evasionChancePercent: 10,
    unlockWeight: 96
  }),
  Object.freeze({
    id: "lobo",
    name: "Lobo",
    rarity: "rara",
    version: PET_VERSION,
    stats: Object.freeze({ health: 26, strength: 10, agility: 10, speed: 10 }),
    attacksPerAction: Object.freeze({ min: 2, max: 4 }),
    ownerHealthPenalty: 25,
    evasionChancePercent: 20,
    unlockWeight: 3
  }),
  Object.freeze({
    id: "oso",
    name: "Oso",
    rarity: "muy_rara",
    version: PET_VERSION,
    stats: Object.freeze({ health: 110, strength: 20, agility: 5, speed: 5 }),
    attacksPerAction: Object.freeze({ min: 1, max: 1 }),
    ownerHealthPenalty: 40,
    evasionChancePercent: 10,
    unlockWeight: 1
  })
]);

const PET_BY_ID = new Map(PET_CATALOG.map((pet) => [pet.id, pet]));

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

  throw new Error("Se agotaron los contadores al sortear una mascota.");
}

function validateSeed(seed) {
  if (!Buffer.isBuffer(seed) || seed.length !== 32) {
    throw new TypeError("La semilla de mascota debe contener exactamente 32 bytes.");
  }
}

function createPetId(seed, version, level, speciesId) {
  return createHash("sha256")
    .update(seed)
    .update(`fighter-pet-id-v1:${version}:${level}:${speciesId}`, "utf8")
    .digest("hex")
    .slice(0, 24);
}

export function getPetById(speciesId, catalogVersion, petVersion) {
  if (catalogVersion !== PET_CATALOG_VERSION) {
    throw new RangeError("La versión del catálogo de mascotas no está disponible.");
  }
  const pet = PET_BY_ID.get(speciesId);
  if (!pet || pet.version !== petVersion) {
    throw new RangeError("La especie no existe en la versión indicada.");
  }
  return pet;
}

export function copyPetInventory(inventory = []) {
  if (!Array.isArray(inventory)) {
    throw new TypeError("La colección de mascotas debe ser una lista.");
  }

  const seenIds = new Set();
  const nextInventory = inventory.map((entry) => {
    const pet = getPetById(
      entry?.speciesId,
      entry?.catalogVersion,
      entry?.version
    );
    if (typeof entry.petId !== "string" || !/^[a-f\d]{24}$/i.test(entry.petId)) {
      throw new TypeError("El identificador de mascota no es válido.");
    }
    if (seenIds.has(entry.petId)) {
      throw new RangeError("La colección de mascotas no puede repetir identificadores.");
    }
    seenIds.add(entry.petId);
    return {
      petId: entry.petId,
      speciesId: pet.id,
      catalogVersion: PET_CATALOG_VERSION,
      version: pet.version
    };
  });
  validatePetLimits(nextInventory);
  return nextInventory;
}

function validatePetLimits(inventory) {
  const dogCount = inventory.filter(({ speciesId }) => speciesId === "perro").length;
  const hasWolf = inventory.some(({ speciesId }) => speciesId === "lobo");
  const hasBear = inventory.some(({ speciesId }) => speciesId === "oso");
  if (
    inventory.length > 4 ||
    dogCount > 3 ||
    (hasWolf && hasBear) ||
    inventory.some(
      ({ speciesId }) => speciesId !== "perro" && inventory.filter(
        (pet) => pet.speciesId === speciesId
      ).length > 1
    )
  ) {
    throw new RangeError("La colección supera los límites permitidos de mascotas.");
  }
}

function eligiblePets(inventory) {
  const ownedDogs = inventory.filter(({ speciesId }) => speciesId === "perro").length;
  const ownsLargeSpecies = inventory.some(
    ({ speciesId }) => speciesId === "lobo" || speciesId === "oso"
  );
  return PET_CATALOG.filter((pet) => {
    if (pet.id === "perro") {
      return ownedDogs < 3;
    }
    return !ownsLargeSpecies;
  });
}

function chooseWeightedPet(seed, domain, candidates, startCounter) {
  const totalWeight = candidates.reduce((total, pet) => total + pet.unlockWeight, 0);
  const draw = drawUniformValue(seed, domain, BigInt(totalWeight), startCounter);
  let selectedWeight = Number(draw.value);
  for (const pet of candidates) {
    selectedWeight -= pet.unlockWeight;
    if (selectedWeight < 0) {
      return { pet, nextCounter: draw.nextCounter };
    }
  }
  throw new Error("No se pudo resolver el sorteo ponderado de mascotas.");
}

export function createInitialPetData(seed, requestId = "fighter-creation-v1") {
  validateSeed(seed);
  if (
    typeof requestId !== "string" ||
    requestId.length === 0 ||
    requestId.length > 128
  ) {
    throw new TypeError("La clave de creación de mascota no es válida.");
  }
  const domain = PET_INITIAL_VERSION;
  const chance = drawUniformValue(seed, domain, 100n);
  const species = Number(chance.value) < 8 ? PET_BY_ID.get("perro") : null;
  const pet = species
    ? {
        petId: createPetId(seed, PET_INITIAL_VERSION, 1, species.id),
        speciesId: species.id,
        catalogVersion: PET_CATALOG_VERSION,
        version: species.version
      }
    : null;

  return {
    pets: pet ? [pet] : [],
    petUnlocks: [
      {
        level: 1,
        seed: Buffer.from(seed),
        version: PET_INITIAL_VERSION,
        petId: pet?.petId ?? null,
        speciesId: pet?.speciesId ?? null,
        catalogVersion: PET_CATALOG_VERSION,
        requestId
      }
    ]
  };
}

export function unlockPetsForLevels({
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
    throw new RangeError("Los niveles del desbloqueo de mascotas no son válidos.");
  }
  if (typeof requestId !== "string" || requestId.length === 0 || requestId.length > 128) {
    throw new TypeError("La clave del desbloqueo de mascotas no es válida.");
  }
  if (typeof seedFactory !== "function") {
    throw new TypeError("seedFactory debe ser una función.");
  }

  const nextInventory = copyPetInventory(inventory);
  const unlocks = existingUnlocks.map((unlock) => ({ ...unlock }));
  const unlockedLevels = new Set(unlocks.map(({ level }) => level));

  for (let level = fromLevel + 1; level <= toLevel; level += 1) {
    if (unlockedLevels.has(level)) {
      continue;
    }

    const seed = seedFactory();
    validateSeed(seed);
    const version = PET_UNLOCK_VERSION;
    const domain = `${version}:${level}`;
    const chance = drawUniformValue(seed, domain, 100n);
    const candidates = eligiblePets(nextInventory);
    let pet = null;

    if (Number(chance.value) < 12 && candidates.length > 0) {
      pet = chooseWeightedPet(seed, domain, candidates, chance.nextCounter).pet;
      const ownedPet = {
        petId: createPetId(seed, version, level, pet.id),
        speciesId: pet.id,
        catalogVersion: PET_CATALOG_VERSION,
        version: pet.version
      };
      nextInventory.push(ownedPet);
    }

    unlocks.push({
      level,
      seed: Buffer.from(seed),
      version,
      petId: pet ? nextInventory.at(-1).petId : null,
      speciesId: pet?.id ?? null,
      catalogVersion: PET_CATALOG_VERSION,
      requestId
    });
  }

  validatePetLimits(nextInventory);
  return { inventory: nextInventory, unlocks };
}

export function calculatePetHealthPenalty(pets = []) {
  return copyPetInventory(pets).reduce(
    (total, { speciesId }) => total + PET_BY_ID.get(speciesId).ownerHealthPenalty,
    0
  );
}

export function applyPetHealthPenalty(stats, pets = []) {
  const healthPenalty = calculatePetHealthPenalty(pets);
  const maximumHealth = Math.max(
    Math.ceil(stats.health * 0.5),
    stats.health - healthPenalty
  );
  return {
    ...stats,
    health: Math.min(stats.health, maximumHealth)
  };
}

export function createPetSnapshot(ownerFighterId, inventory = []) {
  if (typeof ownerFighterId !== "string" || ownerFighterId.length === 0) {
    throw new TypeError("ownerFighterId debe ser texto no vacío.");
  }
  return copyPetInventory(inventory).map(({ petId, speciesId, catalogVersion, version }) => {
    const pet = getPetById(speciesId, catalogVersion, version);
    return {
      petId,
      ownerFighterId,
      speciesId: pet.id,
      catalogVersion,
      version,
      name: pet.name,
      rarity: pet.rarity,
      stats: { ...pet.stats },
      effects: {
        attacksPerAction: { ...pet.attacksPerAction },
        evasionChancePercent: pet.evasionChancePercent,
        ownerHealthPenalty: pet.ownerHealthPenalty
      }
    };
  });
}

export function validatePetSnapshot(snapshot) {
  const snapshotFields = [
    "petId",
    "ownerFighterId",
    "speciesId",
    "catalogVersion",
    "version",
    "name",
    "rarity",
    "stats",
    "effects"
  ];
  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    Array.isArray(snapshot) ||
    Object.keys(snapshot).length !== snapshotFields.length ||
    snapshotFields.some((field) => !Object.hasOwn(snapshot, field)) ||
    typeof snapshot.petId !== "string" ||
    !/^[a-f\d]{24}$/i.test(snapshot.petId) ||
    typeof snapshot.ownerFighterId !== "string" ||
    typeof snapshot.name !== "string" ||
    !snapshot.stats ||
    !snapshot.effects
  ) {
    throw new TypeError("The pet snapshot is invalid.");
  }

  const pet = getPetById(snapshot.speciesId, snapshot.catalogVersion, snapshot.version);
  const expected = {
    name: pet.name,
    rarity: pet.rarity,
    stats: pet.stats,
    effects: {
      attacksPerAction: pet.attacksPerAction,
      evasionChancePercent: pet.evasionChancePercent,
      ownerHealthPenalty: pet.ownerHealthPenalty
    }
  };
  if (
    snapshot.name !== expected.name ||
    snapshot.rarity !== expected.rarity ||
    Object.keys(expected.stats).some(
      (key) => snapshot.stats[key] !== expected.stats[key]
    ) ||
    Object.keys(snapshot.stats).length !== Object.keys(expected.stats).length ||
    snapshot.effects.evasionChancePercent !== expected.effects.evasionChancePercent ||
    snapshot.effects.ownerHealthPenalty !== expected.effects.ownerHealthPenalty ||
    snapshot.effects.attacksPerAction?.min !== expected.effects.attacksPerAction.min ||
    snapshot.effects.attacksPerAction?.max !== expected.effects.attacksPerAction.max ||
    Object.keys(snapshot.effects).length !== 3 ||
    Object.keys(snapshot.effects.attacksPerAction ?? {}).length !== 2
  ) {
    throw new RangeError("The pet snapshot does not match its catalog.");
  }
  return pet;
}
