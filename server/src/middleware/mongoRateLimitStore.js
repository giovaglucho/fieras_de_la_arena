import mongoose from "mongoose";

const COLLECTION = "ratelimits";

// Store de express-rate-limit respaldado por MongoDB: los contadores sobreviven a los
// reinicios y se comparten entre instancias. Cada limitador usa su propio prefijo.
// Los documentos caducan solos mediante un índice TTL sobre `resetAt`.
export class MongoRateLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.localKeys = false;
    this.windowMs = 60_000;
    this.indexReady = null;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  get collection() {
    return mongoose.connection.collection(COLLECTION);
  }

  id(key) {
    return `${this.prefix}:${key}`;
  }

  async ensureIndex() {
    this.indexReady ??= this.collection
      .createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 })
      .catch((error) => {
        this.indexReady = null;
        throw error;
      });
    return this.indexReady;
  }

  async increment(key) {
    await this.ensureIndex();
    const now = new Date();
    const expired = { $lte: ["$resetAt", now] }; // también verdadero si resetAt no existe (null < fecha)
    const document = await this.collection.findOneAndUpdate(
      { _id: this.id(key) },
      [
        {
          $set: {
            count: { $cond: [expired, 1, { $add: [{ $ifNull: ["$count", 0] }, 1] }] },
            resetAt: { $cond: [expired, new Date(now.getTime() + this.windowMs), "$resetAt"] }
          }
        }
      ],
      { upsert: true, returnDocument: "after" }
    );

    return { totalHits: document.count, resetTime: document.resetAt };
  }

  async decrement(key) {
    await this.collection.updateOne(
      { _id: this.id(key), count: { $gt: 0 } },
      { $inc: { count: -1 } }
    );
  }

  async resetKey(key) {
    await this.collection.deleteOne({ _id: this.id(key) });
  }

  async resetAll() {
    await this.collection.deleteMany({ _id: { $regex: `^${this.prefix}:` } });
  }
}
