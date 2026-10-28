import mongoose from "mongoose";
import growthEventSchema from "./growthEventSchema.js";
import {
  TECHNIQUE_UNLOCK_VERSIONS,
  TECHNIQUE_CATALOG_VERSIONS
} from "../game-engine/techniqueCatalog.js";
import {
  PET_CATALOG_VERSION,
  PET_INITIAL_VERSION,
  PET_UNLOCK_VERSION,
  PET_VERSION
} from "../game-engine/petCatalog.js";

const baseStatsSchema = new mongoose.Schema(
  {
    health: { type: Number, required: true, default: 100, min: 0 },
    attack: { type: Number, required: true, default: 10, min: 0 },
    defense: { type: Number, required: true, default: 4, min: 0 },
    speed: { type: Number, required: true, default: 5, min: 0 }
  },
  { _id: false }
);

const appearanceSchema = new mongoose.Schema(
  {
    tone: {
      type: String,
      enum: ["arena", "arcilla", "cobre", "pizarra", "marfil"],
      default: "arena"
    },
    hair: {
      type: String,
      enum: ["rapado", "corto", "trenzas", "melena", "cresta"],
      default: "rapado"
    },
    clothing: {
      type: String,
      enum: ["tunica-cruzada", "manto-corto", "faldon-tejido", "chaleco-tejido"],
      default: "tunica-cruzada"
    },
    accessory: {
      type: String,
      enum: ["ninguno", "cinta", "collar-cuentas", "brazaletes", "pendientes"],
      default: "ninguno"
    }
  },
  { _id: false }
);

const progressionSchema = new mongoose.Schema(
  {
    version: {
      type: String,
      required: true,
      enum: ["fighter-growth-v1"]
    },
    startingStats: { type: baseStatsSchema, required: true },
    legacyStats: { type: baseStatsSchema, default: null },
    growthEvents: { type: [growthEventSchema], default: [] }
  },
  { _id: false }
);

const creationSchema = new mongoose.Schema(
  {
    version: {
      type: String,
      required: true,
      enum: ["fighter-creation-v1"]
    },
    seed: {
      type: Buffer,
      required: true,
      validate: {
        validator: (seed) => Buffer.isBuffer(seed) && seed.length === 32,
        message: "La semilla de creación debe contener exactamente 32 bytes."
      }
    },
    profile: {
      type: String,
      required: true,
      enum: ["resistente", "equilibrado", "vitalidad"]
    },
    initialWeaponId: {
      type: String
    },
    equipmentCatalogVersion: {
      type: String,
      enum: ["equipment-v1"]
    },
    initialTechniqueId: {
      type: String
    },
    techniqueCatalogVersion: {
      type: String,
      enum: TECHNIQUE_CATALOG_VERSIONS
    }
  },
  { _id: false }
);

const equipmentItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true },
    catalogVersion: {
      type: String,
      required: true,
      enum: ["equipment-v1"]
    }
  },
  { _id: false }
);

const equipmentUnlockSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true, min: 2 },
    seed: {
      type: Buffer,
      required: true,
      validate: {
        validator: (seed) => Buffer.isBuffer(seed) && seed.length === 32,
        message: "La semilla de desbloqueo debe contener exactamente 32 bytes."
      }
    },
    version: {
      type: String,
      required: true,
      enum: ["equipment-unlock-v1"]
    },
    itemId: { type: String, default: null },
    catalogVersion: {
      type: String,
      required: true,
      enum: ["equipment-v1"]
    },
    requestId: { type: String, required: true, minlength: 1, maxlength: 128 }
  },
  { _id: false }
);

const techniqueItemSchema = new mongoose.Schema(
  {
    techniqueId: { type: String, required: true },
    catalogVersion: {
      type: String,
      required: true,
      enum: TECHNIQUE_CATALOG_VERSIONS
    },
    techniqueVersion: { type: String, required: true }
  },
  { _id: false }
);

const techniqueUnlockSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true, min: 2 },
    seed: {
      type: Buffer,
      required: true,
      validate: {
        validator: (seed) => Buffer.isBuffer(seed) && seed.length === 32,
        message: "La semilla de desbloqueo debe contener exactamente 32 bytes."
      }
    },
    version: {
      type: String,
      required: true,
      enum: TECHNIQUE_UNLOCK_VERSIONS
    },
    techniqueId: { type: String, default: null },
    catalogVersion: {
      type: String,
      required: true,
      enum: TECHNIQUE_CATALOG_VERSIONS
    },
    requestId: { type: String, required: true, minlength: 1, maxlength: 128 }
  },
  { _id: false }
);

const petItemSchema = new mongoose.Schema(
  {
    petId: {
      type: String,
      required: true,
      match: /^[a-f\d]{24}$/i
    },
    speciesId: {
      type: String,
      required: true,
      enum: ["perro", "lobo", "oso"]
    },
    catalogVersion: {
      type: String,
      required: true,
      enum: [PET_CATALOG_VERSION]
    },
    version: {
      type: String,
      required: true,
      enum: [PET_VERSION]
    }
  },
  { _id: false }
);

const petUnlockSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true, min: 1 },
    seed: {
      type: Buffer,
      required: true,
      validate: {
        validator: (seed) => Buffer.isBuffer(seed) && seed.length === 32,
        message: "La semilla de desbloqueo debe contener exactamente 32 bytes."
      }
    },
    version: {
      type: String,
      required: true,
      enum: [PET_INITIAL_VERSION, PET_UNLOCK_VERSION]
    },
    petId: { type: String, default: null, match: /^[a-f\d]{24}$/i },
    speciesId: {
      type: String,
      default: null,
      enum: ["perro", "lobo", "oso", null]
    },
    catalogVersion: {
      type: String,
      required: true,
      enum: [PET_CATALOG_VERSION]
    },
    requestId: { type: String, required: true, minlength: 1, maxlength: 128 }
  },
  { _id: false }
);

const fighterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    creationRequestId: {
      type: String,
      minlength: 1,
      maxlength: 128
    },
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minLength: 3,
      maxLength: 18,
      unique: true
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active"
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public"
    },
    level: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    xp: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    elo: {
      type: Number,
      required: true,
      default: 1000,
      min: 0
    },
    baseStats: {
      type: baseStatsSchema,
      required: true,
      default: () => ({})
    },
    appearance: {
      type: appearanceSchema,
      default: () => ({})
    },
    creation: {
      type: creationSchema
    },
    progression: {
      type: progressionSchema
    },
    equipment: {
      type: [equipmentItemSchema],
      default: undefined,
      validate: {
        validator(items) {
          return new Set(items.map(({ itemId }) => itemId)).size === items.length;
        },
        message: "La colección de equipo no puede contener duplicados."
      }
    },
    equipmentUnlocks: {
      type: [equipmentUnlockSchema],
      default: undefined,
      validate: {
        validator(unlocks) {
          return new Set(unlocks.map(({ level }) => level)).size === unlocks.length;
        },
        message: "Un nivel no puede producir más de un desbloqueo de equipo."
      }
    },
    techniques: {
      type: [techniqueItemSchema],
      default: undefined,
      validate: {
        validator(techniques) {
          return (
            new Set(techniques.map(({ techniqueId }) => techniqueId)).size ===
            techniques.length
          );
        },
        message: "La colección de técnicas no puede contener duplicados."
      }
    },
    pets: {
      type: [petItemSchema],
      default: undefined,
      validate: {
        validator(pets) {
          const petIds = new Set(pets.map(({ petId }) => petId));
          const dogs = pets.filter(({ speciesId }) => speciesId === "perro").length;
          const hasWolf = pets.some(({ speciesId }) => speciesId === "lobo");
          const hasBear = pets.some(({ speciesId }) => speciesId === "oso");
          return (
            petIds.size === pets.length &&
            pets.length <= 4 &&
            dogs <= 3 &&
            !(hasWolf && hasBear) &&
            pets.filter(({ speciesId }) => speciesId === "lobo").length <= 1 &&
            pets.filter(({ speciesId }) => speciesId === "oso").length <= 1
          );
        },
        message: "La colección supera los límites permitidos de mascotas."
      }
    },
    petUnlocks: {
      type: [petUnlockSchema],
      default: undefined,
      validate: {
        validator(unlocks) {
          return new Set(unlocks.map(({ level }) => level)).size === unlocks.length;
        },
        message: "Un nivel no puede producir más de un desbloqueo de mascota."
      }
    },
    techniqueUnlocks: {
      type: [techniqueUnlockSchema],
      default: undefined,
      validate: {
        validator(unlocks) {
          return new Set(unlocks.map(({ level }) => level)).size === unlocks.length;
        },
        message: "Un nivel no puede producir más de un desbloqueo de técnica."
      }
    },
    wins: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    losses: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    draws: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    referralCode: {
      type: String,
      required: true,
      unique: true
    }
  },
  { timestamps: true }
);

fighterSchema.pre("validate", function validatePetAcquisitions() {
  const pets = this.pets ?? [];
  const unlocks = this.petUnlocks ?? [];
  const petsById = new Map(pets.map((pet) => [pet.petId, pet]));

  for (const unlock of unlocks) {
    if (Boolean(unlock.petId) !== Boolean(unlock.speciesId)) {
      this.invalidate(
        "petUnlocks",
        "Cada desbloqueo debe guardar tanto la mascota obtenida como la ausencia de premio."
      );
      return;
    }
    if (unlock.petId) {
      const acquiredPet = petsById.get(unlock.petId);
      if (!acquiredPet || acquiredPet.speciesId !== unlock.speciesId) {
        this.invalidate(
          "petUnlocks",
          "El desbloqueo de mascota no coincide con la colección del luchador."
        );
        return;
      }
    }
  }

  if (pets.some((pet) => !unlocks.some((unlock) => unlock.petId === pet.petId))) {
    this.invalidate(
      "pets",
      "Cada mascota poseída debe tener un registro de adquisición reproducible."
    );
  }
});

fighterSchema.index({ userId: 1 });
fighterSchema.index({ userId: 1, createdAt: 1, _id: 1 });
fighterSchema.index(
  { userId: 1, creationRequestId: 1 },
  {
    unique: true,
    partialFilterExpression: { creationRequestId: { $type: "string" } }
  }
);
fighterSchema.index({ elo: -1 });

const Fighter = mongoose.model("Fighter", fighterSchema);

export default Fighter;
