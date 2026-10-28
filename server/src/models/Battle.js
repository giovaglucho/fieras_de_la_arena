import mongoose from "mongoose";
import growthEventSchema from "./growthEventSchema.js";
import {
  PET_CATALOG_VERSION,
  PET_RULES_VERSION,
  PET_SNAPSHOT_VERSION,
  PET_VERSION
} from "../game-engine/petCatalog.js";
import {
  TECHNIQUE_CATALOG_VERSIONS,
  TECHNIQUE_LOADOUT_VERSIONS
} from "../game-engine/techniqueCatalog.js";

const fighterStatsSchema = new mongoose.Schema(
  {
    health: { type: Number, required: true, min: 0 },
    attack: { type: Number, required: true, min: 0 },
    defense: { type: Number, required: true, min: 0 },
    speed: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const equipmentModifiersSchema = new mongoose.Schema(
  {
    attack: Number,
    defense: Number,
    initiative: Number,
    piercing: Number,
    criticalChance: Number
  },
  { _id: false }
);

const equipmentSnapshotSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true },
    catalogVersion: { type: String, required: true },
    name: { type: String, required: true },
    slot: { type: String, enum: ["weapon", "armor"], required: true },
    modifiers: { type: equipmentModifiersSchema, required: true }
  },
  { _id: false }
);

const loadoutSnapshotSchema = new mongoose.Schema(
  {
    version: { type: String, required: true },
    catalogVersion: { type: String, required: true },
    weapon: { type: equipmentSnapshotSchema, default: null },
    armor: { type: equipmentSnapshotSchema, default: null }
  },
  { _id: false }
);

const techniqueEffectSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "damage_bonus",
        "damage_reduction",
        "heal",
        "pet_fear",
        "pet_trap",
        "pet_hypnosis"
      ],
      required: true
    },
    amount: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const techniqueSnapshotSchema = new mongoose.Schema(
  {
    techniqueId: { type: String, required: true },
    catalogVersion: { type: String, enum: TECHNIQUE_CATALOG_VERSIONS },
    techniqueVersion: { type: String, required: true },
    category: { type: String, enum: ["passive", "active"], required: true },
    minLevel: { type: Number, required: true, min: 1 },
    effect: { type: techniqueEffectSchema, required: true }
  },
  { _id: false }
);

const techniqueLoadoutSnapshotSchema = new mongoose.Schema(
  {
    version: { type: String, required: true, enum: TECHNIQUE_LOADOUT_VERSIONS },
    catalogVersion: {
      type: String,
      required: true,
      enum: TECHNIQUE_CATALOG_VERSIONS
    },
    passive: { type: techniqueSnapshotSchema, default: null },
    active: { type: techniqueSnapshotSchema, default: null }
  },
  { _id: false }
);

const petSnapshotStatsSchema = new mongoose.Schema(
  {
    health: { type: Number, required: true, min: 1 },
    strength: { type: Number, required: true, min: 0 },
    agility: { type: Number, required: true, min: 0 },
    speed: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const petSnapshotEffectsSchema = new mongoose.Schema(
  {
    attacksPerAction: {
      min: { type: Number, required: true, min: 1 },
      max: { type: Number, required: true, min: 1 }
    },
    evasionChancePercent: { type: Number, required: true, min: 0, max: 100 },
    ownerHealthPenalty: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const petSnapshotSchema = new mongoose.Schema(
  {
    petId: { type: String, required: true, match: /^[a-f\d]{24}$/i },
    ownerFighterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fighter",
      required: true
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
    version: { type: String, required: true, enum: [PET_VERSION] },
    name: { type: String, required: true },
    rarity: { type: String, enum: ["comun", "rara", "muy_rara"], required: true },
    stats: { type: petSnapshotStatsSchema, required: true },
    effects: { type: petSnapshotEffectsSchema, required: true }
  },
  { _id: false }
);

const fighterSnapshotSchema = new mongoose.Schema(
  {
    fighterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fighter",
      required: true
    },
    name: { type: String, required: true },
    level: { type: Number, required: true, min: 1 },
    elo: { type: Number, required: true, min: 0 },
    stats: { type: fighterStatsSchema, required: true },
    equipment: { type: loadoutSnapshotSchema, default: undefined },
    techniques: { type: techniqueLoadoutSnapshotSchema, default: undefined },
    pets: { type: [petSnapshotSchema], default: undefined },
    initiative: { type: Number, min: 1 }
  },
  { _id: false }
);

const progressionSnapshotSchema = new mongoose.Schema(
  {
    levelBefore: { type: Number, required: true, min: 1 },
    levelAfter: { type: Number, required: true, min: 1 },
    xpBefore: { type: Number, required: true, min: 0 },
    xpAfter: { type: Number, required: true, min: 0 },
    levelsGained: { type: Number, required: true, min: 0 },
    statsBefore: { type: fighterStatsSchema, required: true },
    statsAfter: { type: fighterStatsSchema, required: true }
  },
  { _id: false }
);

const participantResultSchema = new mongoose.Schema(
  {
    xpGained: { type: Number, required: true, min: 0 },
    eloChange: { type: Number, required: true },
    eloAfter: { type: Number, required: true, min: 0 },
    progression: { type: progressionSnapshotSchema, default: undefined },
    growthEvents: { type: [growthEventSchema], default: [] }
  },
  { _id: false }
);

const participantSchema = new mongoose.Schema(
  {
    snapshot: { type: fighterSnapshotSchema, required: true },
    result: { type: participantResultSchema, required: true }
  },
  { _id: false }
);

const battleSchema = new mongoose.Schema(
  {
    battleType: {
      type: String,
      enum: ["pvp", "training"],
      required: true
    },
    status: {
      type: String,
      enum: ["completed"],
      required: true,
      default: "completed"
    },
    participants: {
      type: [participantSchema],
      required: true,
      validate: {
        validator(participants) {
          return (
            participants.length === 2 &&
            new Set(
              participants.map((participant) => participant.snapshot.fighterId.toString())
            ).size === 2
          );
        },
        message: "A battle must have two distinct fighter participants."
      }
    },
    winnerFighterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fighter",
      default: null
    },
    requesterFighterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fighter"
    },
    requestId: {
      type: String,
      minlength: 1,
      maxlength: 128
    },
    challengeDateKey: {
      type: String,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    challengePairKey: {
      type: String
    },
    actionCount: { type: Number, required: true, min: 1 },
    seed: { type: String, required: true, minlength: 1 },
    engineVersion: { type: String, required: true, minlength: 1 },
    snapshotVersion: { type: String },
    equipmentCatalogVersion: { type: String },
    loadoutVersion: { type: String },
    techniqueCatalogVersion: { type: String },
    techniqueRulesVersion: { type: String },
    petCatalogVersion: { type: String, enum: [PET_CATALOG_VERSION] },
    petSnapshotVersion: { type: String, enum: [PET_SNAPSHOT_VERSION] },
    petRulesVersion: { type: String, enum: [PET_RULES_VERSION] },
    // Keep version-specific event payloads intact for replay and historical display.
    events: {
      type: [mongoose.Schema.Types.Mixed],
      required: true,
      validate: {
        validator(events) {
          return events.length > 0;
        },
        message: "A completed battle must contain events."
      }
    }
  },
  { timestamps: true }
);

battleSchema.pre("validate", function validateWinner() {
  for (const [participantIndex, participant] of this.participants.entries()) {
    const fighterId = participant.snapshot.fighterId;
    if (
      participant.snapshot.pets?.some(
        (pet) => pet.ownerFighterId?.equals?.(fighterId) !== true
      )
    ) {
      this.invalidate(
        `participants.${participantIndex}.snapshot.pets`,
        "Cada mascota del snapshot debe pertenecer al luchador participante."
      );
    }
  }

  if (
    this.winnerFighterId &&
    !this.participants.some(
      (participant) =>
        participant.snapshot.fighterId.toString() === this.winnerFighterId.toString()
    )
  ) {
    this.invalidate("winnerFighterId", "The winner must be a battle participant.");
  }

  if (Boolean(this.requesterFighterId) !== Boolean(this.requestId)) {
    this.invalidate(
      "requestId",
      "requesterFighterId and requestId must be provided together."
    );
  }

  if (
    this.requesterFighterId &&
    !this.participants.some(
      (participant) =>
        participant.snapshot.fighterId.toString() === this.requesterFighterId.toString()
    )
  ) {
    this.invalidate(
      "requesterFighterId",
      "The requester must be a battle participant."
    );
  }
});

battleSchema.index({ createdAt: -1 });
battleSchema.index({ "participants.snapshot.fighterId": 1, createdAt: -1 });
battleSchema.index(
  { requesterFighterId: 1, requestId: 1 },
  {
    unique: true,
    partialFilterExpression: { requestId: { $type: "string" } }
  }
);
battleSchema.index(
  { challengeDateKey: 1, challengePairKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      challengeDateKey: { $type: "string" },
      challengePairKey: { $type: "string" }
    }
  }
);

const Battle = mongoose.model("Battle", battleSchema);

export default Battle;
