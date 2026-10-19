import mongoose from "mongoose";

const fighterStatsSchema = new mongoose.Schema(
  {
    health: { type: Number, required: true, min: 0 },
    attack: { type: Number, required: true, min: 0 },
    defense: { type: Number, required: true, min: 0 },
    speed: { type: Number, required: true, min: 0 }
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
    stats: { type: fighterStatsSchema, required: true }
  },
  { _id: false }
);

const participantResultSchema = new mongoose.Schema(
  {
    xpGained: { type: Number, required: true, min: 0 },
    eloChange: { type: Number, required: true },
    eloAfter: { type: Number, required: true, min: 0 }
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
    actionCount: { type: Number, required: true, min: 1 },
    seed: { type: String, required: true, minlength: 1 },
    engineVersion: { type: String, required: true, minlength: 1 },
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
  if (
    this.winnerFighterId &&
    !this.participants.some(
      (participant) =>
        participant.snapshot.fighterId.toString() === this.winnerFighterId.toString()
    )
  ) {
    this.invalidate("winnerFighterId", "The winner must be a battle participant.");
  }
});

battleSchema.index({ createdAt: -1 });
battleSchema.index({ "participants.snapshot.fighterId": 1, createdAt: -1 });

const Battle = mongoose.model("Battle", battleSchema);

export default Battle;
