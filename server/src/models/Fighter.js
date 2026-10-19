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

const fighterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
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

fighterSchema.index({ elo: -1 });

const Fighter = mongoose.model("Fighter", fighterSchema);

export default Fighter;
