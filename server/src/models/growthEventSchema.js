import mongoose from "mongoose";

const growthEventSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true, min: 2 },
    seed: {
      type: Buffer,
      required: true,
      validate: {
        validator: (seed) => Buffer.isBuffer(seed) && seed.length === 32,
        message: "La semilla de crecimiento debe contener exactamente 32 bytes."
      }
    },
    version: {
      type: String,
      required: true,
      enum: ["fighter-growth-v1"]
    },
    stat: {
      type: String,
      enum: ["health", "attack", "defense", "speed"]
    },
    amount: { type: Number, required: true, min: 0, max: 1 },
    requestId: { type: String, required: true, minlength: 1, maxlength: 128 }
  },
  { _id: false }
);

export default growthEventSchema;
