import { createHash, randomBytes } from "node:crypto";

export const FIGHTER_CREATION_VERSION = "fighter-creation-v1";

export const NEUTRAL_FIGHTER_APPEARANCE = Object.freeze({
  tone: "arena",
  hair: "rapado",
  clothing: "tunica-cruzada",
  accessory: "ninguno"
});

const APPEARANCE_OPTIONS = Object.freeze({
  tone: Object.freeze(["arena", "arcilla", "cobre", "pizarra", "marfil"]),
  hair: Object.freeze(["rapado", "corto", "trenzas", "melena", "cresta"]),
  clothing: Object.freeze([
    "tunica-cruzada",
    "manto-corto",
    "faldon-tejido",
    "chaleco-tejido"
  ]),
  accessory: Object.freeze([
    "ninguno",
    "cinta",
    "collar-cuentas",
    "brazaletes",
    "pendientes"
  ])
});

const INITIAL_PROFILES = Object.freeze([
  Object.freeze({
    id: "resistente",
    baseStats: Object.freeze({ health: 85, attack: 10, defense: 5, speed: 5 })
  }),
  Object.freeze({
    id: "equilibrado",
    baseStats: Object.freeze({ health: 100, attack: 10, defense: 4, speed: 5 })
  }),
  Object.freeze({
    id: "vitalidad",
    baseStats: Object.freeze({ health: 115, attack: 10, defense: 3, speed: 5 })
  })
]);

const MAX_UINT32 = 0xffffffff;
const UINT256_RANGE = 1n << 256n;

function drawUniformIndex(seed, domain, size) {
  const divisor = BigInt(size);
  const acceptanceLimit = (UINT256_RANGE / divisor) * divisor;

  for (let counter = 0; counter <= MAX_UINT32; counter += 1) {
    const counterBytes = Buffer.alloc(4);
    counterBytes.writeUInt32BE(counter);
    const digest = createHash("sha256")
      .update(seed)
      .update(domain, "utf8")
      .update(counterBytes)
      .digest();
    const value = BigInt(`0x${digest.toString("hex")}`);

    if (value < acceptanceLimit) {
      return Number(value % divisor);
    }
  }

  throw new Error("Se agotaron los contadores al generar atributos iniciales.");
}

export function validateFighterAppearance(appearance) {
  const value =
    typeof appearance?.toObject === "function"
      ? appearance.toObject()
      : appearance;
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== Object.keys(APPEARANCE_OPTIONS).length ||
    Object.keys(value).some((field) => !Object.hasOwn(APPEARANCE_OPTIONS, field))
  ) {
    return null;
  }

  for (const [field, options] of Object.entries(APPEARANCE_OPTIONS)) {
    if (!options.includes(value[field])) {
      return null;
    }
  }

  return {
    tone: value.tone,
    hair: value.hair,
    clothing: value.clothing,
    accessory: value.accessory
  };
}

export function getFighterAppearance(appearance) {
  return (
    validateFighterAppearance(appearance) ?? {
      ...NEUTRAL_FIGHTER_APPEARANCE
    }
  );
}

export function createInitialFighterData(seed = randomBytes(32)) {
  if (!Buffer.isBuffer(seed) || seed.length !== 32) {
    throw new TypeError("La semilla de creación debe contener exactamente 32 bytes.");
  }

  const profile = INITIAL_PROFILES[
    drawUniformIndex(seed, "fighter-profile", INITIAL_PROFILES.length)
  ];

  return {
    baseStats: { ...profile.baseStats },
    creation: {
      version: FIGHTER_CREATION_VERSION,
      seed: Buffer.from(seed),
      profile: profile.id
    }
  };
}
