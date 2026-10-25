import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { TRAINING_OPPONENT } from "../src/config/trainingOpponent.js";

const FIGHTERS_COLLECTION = "fighters";
const USERS_COLLECTION = "users";
const DAILY_ACTIVITY_COLLECTION = "dailyactivities";
const BATTLES_COLLECTION = "battles";
const FIGHTER_OWNER_KEY = { userId: 1 };
const LEGACY_DAILY_KEY = { userId: 1, dateKey: 1 };
const FIGHTER_DAILY_KEY = { fighterId: 1, dateKey: 1 };
const FIGHTER_DAILY_INDEX_OPTIONS = {
  name: "fighterId_1_dateKey_1",
  unique: true,
  partialFilterExpression: { fighterId: { $type: "objectId" } }
};

function hasKey(index, expectedKey) {
  const entries = Object.entries(index.key ?? {});
  return (
    entries.length === Object.keys(expectedKey).length &&
    entries.every(([key, direction], indexPosition) => {
      const [expectedName, expectedDirection] = Object.entries(expectedKey)[indexPosition];
      return key === expectedName && direction === expectedDirection;
    })
  );
}

function idString(value) {
  return value?.toString();
}

function findDuplicate(values) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
  }
  return null;
}

async function getIndexes(database, collectionName) {
  const collectionExists = await database
    .listCollections({ name: collectionName }, { nameOnly: true })
    .hasNext();
  if (!collectionExists) {
    return [];
  }
  return database.collection(collectionName).listIndexes().toArray();
}

function getOneIndex(indexes, key, label) {
  const matchingIndexes = indexes.filter((index) => hasKey(index, key));
  if (matchingIndexes.length > 1) {
    throw new Error(`Hay más de un índice con claves ${label}.`);
  }
  return matchingIndexes[0] ?? null;
}

function assertUniqueActivityKeys(activities, fighterById, fighterByUserId) {
  const keys = [];
  for (const activity of activities) {
    let fighterId = activity.fighterId;
    if (fighterId == null) {
      if (activity.userId == null) {
        throw new Error(`La actividad ${idString(activity._id)} no tiene dueño.`);
      }
      const ownedFighters = fighterByUserId.get(idString(activity.userId)) ?? [];
      if (ownedFighters.length !== 1) {
        throw new Error(
          `La actividad ${idString(activity._id)} no se puede asociar a un único luchador.`
        );
      }
      fighterId = ownedFighters[0]._id;
    } else {
      if (!(fighterId instanceof mongoose.Types.ObjectId)) {
        throw new Error(
          `La actividad ${idString(activity._id)} tiene un ID de luchador inválido.`
        );
      }
      const fighter = fighterById.get(idString(fighterId));
      if (!fighter) {
        throw new Error(
          `La actividad ${idString(activity._id)} apunta a un luchador inexistente.`
        );
      }
      if (
        activity.userId != null &&
        idString(fighter.userId) !== idString(activity.userId)
      ) {
        throw new Error(
          `La actividad ${idString(activity._id)} no coincide con el dueño del luchador.`
        );
      }
    }

    keys.push(`${idString(fighterId)}:${activity.dateKey}`);
  }

  const duplicateKey = findDuplicate(keys);
  if (duplicateKey) {
    throw new Error(`Hay actividades diarias duplicadas para ${duplicateKey}.`);
  }
}

async function restoreIndex(collection, index) {
  const options = { name: index.name };
  if (index.unique) {
    options.unique = true;
  }
  if (index.sparse) {
    options.sparse = true;
  }
  if (index.partialFilterExpression) {
    options.partialFilterExpression = index.partialFilterExpression;
  }
  await collection.createIndex(index.key, options);
}

export async function migrateFighterOwnership(database) {
  if (!database?.collection || !database?.listCollections) {
    throw new TypeError("Se requiere una conexión a la base de datos MongoDB.");
  }

  const fightersCollection = database.collection(FIGHTERS_COLLECTION);
  const usersCollection = database.collection(USERS_COLLECTION);
  const activitiesCollection = database.collection(DAILY_ACTIVITY_COLLECTION);
  const battlesCollection = database.collection(BATTLES_COLLECTION);
  const [fighters, fighterIndexes, activityIndexes] = await Promise.all([
    fightersCollection.find({}, {
      projection: { _id: 1, userId: 1, name: 1, referralCode: 1 }
    }).toArray(),
    getIndexes(database, FIGHTERS_COLLECTION),
    getIndexes(database, DAILY_ACTIVITY_COLLECTION)
  ]);
  const activityCollectionExists = await database
    .listCollections({ name: DAILY_ACTIVITY_COLLECTION }, { nameOnly: true })
    .hasNext();
  const activities = activityCollectionExists
    ? await activitiesCollection.find({}).sort({ _id: 1 }).toArray()
    : [];
  const battlesCollectionExists = await database
    .listCollections({ name: BATTLES_COLLECTION }, { nameOnly: true })
    .hasNext();
  const battles = battlesCollectionExists
    ? await battlesCollection.find({}, {
        projection: { "participants.snapshot.fighterId": 1 }
      }).toArray()
    : [];

  const fighterById = new Map(fighters.map((fighter) => [idString(fighter._id), fighter]));
  const fighterByUserId = new Map();
  const normalizedNames = [];
  const referralCodes = [];

  for (const fighter of fighters) {
    if (fighter.userId == null) {
      throw new Error(`El luchador ${idString(fighter._id)} no tiene dueño.`);
    }
    const ownerId = idString(fighter.userId);
    const ownedFighters = fighterByUserId.get(ownerId) ?? [];
    ownedFighters.push(fighter);
    fighterByUserId.set(ownerId, ownedFighters);
    normalizedNames.push(String(fighter.name ?? "").trim().toLowerCase());
    referralCodes.push(String(fighter.referralCode ?? ""));
  }

  const duplicateOwner = [...fighterByUserId.entries()].find(([, owned]) => owned.length > 1);
  if (duplicateOwner) {
    throw new Error(
      `La cuenta ${duplicateOwner[0]} ya tiene varios luchadores; resuelve el conflicto antes de migrar.`
    );
  }
  if (findDuplicate(normalizedNames) || normalizedNames.some((name) => !name)) {
    throw new Error("Hay nombres de luchador vacíos o duplicados tras normalizarlos.");
  }
  if (findDuplicate(referralCodes) || referralCodes.some((code) => !code)) {
    throw new Error("Hay códigos de invitación vacíos o duplicados.");
  }

  const ownerIds = [...fighterByUserId.keys()].map((ownerId) =>
    new mongoose.Types.ObjectId(ownerId)
  );
  const owners = await usersCollection.find(
    {
      $or: [
        { _id: { $in: ownerIds } },
        { activeFighterId: { $exists: true, $ne: null } }
      ]
    },
    { projection: { _id: 1, activeFighterId: 1 } }
  ).toArray();
  const ownerById = new Map(owners.map((owner) => [idString(owner._id), owner]));
  for (const ownerId of fighterByUserId.keys()) {
    const owner = ownerById.get(ownerId);
    if (!owner) {
      throw new Error(`El dueño ${ownerId} de un luchador no existe.`);
    }
  }
  for (const owner of owners) {
    if (owner.activeFighterId == null) {
      continue;
    }
    const activeFighter = fighterById.get(idString(owner.activeFighterId));
    if (!activeFighter || idString(activeFighter.userId) !== idString(owner._id)) {
      throw new Error(
        `La selección activa de la cuenta ${idString(owner._id)} no le pertenece.`
      );
    }
  }

  for (const battle of battles) {
    for (const participant of battle.participants ?? []) {
      const fighterId = idString(participant.snapshot?.fighterId);
      if (
        fighterId !== TRAINING_OPPONENT._id &&
        !fighterById.has(fighterId)
      ) {
        throw new Error(
          `El combate ${idString(battle._id)} referencia a un luchador inexistente.`
        );
      }
    }
  }

  assertUniqueActivityKeys(activities, fighterById, fighterByUserId);

  const ownerIndex = getOneIndex(fighterIndexes, FIGHTER_OWNER_KEY, "Fighter.userId");
  const legacyActivityIndex = getOneIndex(activityIndexes, LEGACY_DAILY_KEY, "DailyActivity.userId+dateKey");
  const fighterActivityIndex = getOneIndex(activityIndexes, FIGHTER_DAILY_KEY, "DailyActivity.fighterId+dateKey");
  if (
    ownerIndex?.unique &&
    (ownerIndex.sparse || ownerIndex.partialFilterExpression)
  ) {
    throw new Error("El índice único de Fighter.userId tiene opciones no compatibles.");
  }
  if (
    legacyActivityIndex?.unique &&
    (legacyActivityIndex.sparse || legacyActivityIndex.partialFilterExpression)
  ) {
    throw new Error("El índice legado de actividad diaria tiene opciones no compatibles.");
  }
  if (
    fighterActivityIndex &&
    (!fighterActivityIndex.unique ||
      JSON.stringify(fighterActivityIndex.partialFilterExpression) !==
        JSON.stringify(FIGHTER_DAILY_INDEX_OPTIONS.partialFilterExpression))
  ) {
    throw new Error("El índice de actividad por luchador existe con opciones incompatibles.");
  }

  const activitiesToConvert = activities.filter((activity) => activity.fighterId == null);
  const convertedIds = [];
  let droppedOwnerIndex = null;
  let droppedLegacyActivityIndex = null;
  let createdOwnerIndex = false;
  let createdFighterActivityIndex = false;

  try {
    if (!fighterActivityIndex) {
      await activitiesCollection.createIndex(
        FIGHTER_DAILY_KEY,
        FIGHTER_DAILY_INDEX_OPTIONS
      );
      createdFighterActivityIndex = true;
    }

    for (const activity of activitiesToConvert) {
      const fighter = fighterByUserId.get(idString(activity.userId))?.[0];
      const result = await activitiesCollection.updateOne(
        {
          _id: activity._id,
          $or: [{ fighterId: { $exists: false } }, { fighterId: null }]
        },
        { $set: { fighterId: fighter._id } }
      );
      if (result.modifiedCount !== 1) {
        throw new Error(
          `No se pudo asociar la actividad diaria ${idString(activity._id)}.`
        );
      }
      convertedIds.push(activity._id);
    }

    const unlinkedActivities = await activitiesCollection.countDocuments({
      $or: [
        { fighterId: { $exists: false } },
        { fighterId: null }
      ]
    });
    if (unlinkedActivities !== 0) {
      throw new Error("Quedaron actividades diarias sin asociar a un luchador.");
    }

    if (legacyActivityIndex) {
      await activitiesCollection.dropIndex(legacyActivityIndex.name);
      droppedLegacyActivityIndex = legacyActivityIndex;
    }

    if (ownerIndex?.unique) {
      await fightersCollection.dropIndex(ownerIndex.name);
      droppedOwnerIndex = ownerIndex;
    }
    if (!ownerIndex || ownerIndex.unique) {
      await fightersCollection.createIndex(FIGHTER_OWNER_KEY, { name: "userId_1" });
      createdOwnerIndex = true;
    }

    return {
      fighters: fighters.length,
      activitiesConverted: convertedIds.length,
      ownerIndexChanged: !ownerIndex || Boolean(ownerIndex.unique),
      legacyActivityIndexRemoved: Boolean(droppedLegacyActivityIndex)
    };
  } catch (error) {
    const rollbackErrors = [];
    for (const activity of activitiesToConvert) {
      try {
        const fighterId = fighterByUserId.get(idString(activity.userId))?.[0]?._id;
        const filter = { _id: activity._id, fighterId };
        const update = activity.fighterId === null
          ? { $set: { fighterId: null } }
          : { $unset: { fighterId: 1 } };
        await activitiesCollection.updateOne(
          filter,
          update
        );
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (createdOwnerIndex) {
      try {
        await fightersCollection.dropIndex("userId_1");
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (droppedOwnerIndex) {
      try {
        await restoreIndex(fightersCollection, droppedOwnerIndex);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (droppedLegacyActivityIndex) {
      try {
        await restoreIndex(activitiesCollection, droppedLegacyActivityIndex);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (createdFighterActivityIndex) {
      try {
        await activitiesCollection.dropIndex(FIGHTER_DAILY_INDEX_OPTIONS.name);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }

    if (rollbackErrors.length > 0) {
      throw new AggregateError(
        [error, ...rollbackErrors],
        "Falló la migración y también su rollback; se requiere recuperación manual."
      );
    }
    throw error;
  }
}

async function runMigration() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Falta configurar MONGODB_URI.");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Esta migración no puede ejecutarse en producción.");
  }
  if (process.env.MIGRATION_WRITES_PAUSED !== "true") {
    throw new Error("Detén las escrituras y define MIGRATION_WRITES_PAUSED=true.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });
  try {
    const result = await migrateFighterOwnership(mongoose.connection.db);
    console.info(JSON.stringify({ event: "fighter.ownership_migration.completed", ...result }));
  } finally {
    await mongoose.disconnect();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await runMigration();
}
