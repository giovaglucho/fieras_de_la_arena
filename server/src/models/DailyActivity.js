import mongoose from "mongoose";

const dailyActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    dateKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    battlesUsed: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: Number.isInteger
    }
  },
  { timestamps: true }
);

dailyActivitySchema.index({ userId: 1, dateKey: 1 }, { unique: true });

const DailyActivity = mongoose.model("DailyActivity", dailyActivitySchema);

export default DailyActivity;
