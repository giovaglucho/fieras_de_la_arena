import mongoose from "mongoose";

const dailyActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: undefined
    },
    fighterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fighter",
      default: undefined
    },
    dateKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    limit: {
      type: Number,
      required: true,
      default: 3,
      min: 1,
      validate: Number.isInteger
    },
    battlesUsed: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: Number.isInteger
    },
    requestIds: {
      type: [{ type: String, minlength: 1, maxlength: 128 }],
      default: []
    }
  },
  { timestamps: true }
);

dailyActivitySchema.index(
  { fighterId: 1, dateKey: 1 },
  {
    unique: true,
    partialFilterExpression: { fighterId: { $type: "objectId" } }
  }
);

const DailyActivity = mongoose.model("DailyActivity", dailyActivitySchema);

export default DailyActivity;
