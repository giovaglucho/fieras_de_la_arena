import mongoose from "mongoose";

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
    }
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
