// Comprueba que MongoDB sea un replica set (necesario para las transacciones).
// Uso: node --env-file=../.env scripts/checkMongoReplicaSet.js
import mongoose from "mongoose";

export async function checkReplicaSet(uri, { timeoutMs = 5000 } = {}) {
  const connection = await mongoose
    .createConnection(uri, { serverSelectionTimeoutMS: timeoutMs })
    .asPromise();
  try {
    const hello = await connection.db.admin().command({ hello: 1 });
    return { ok: Boolean(hello.setName), setName: hello.setName ?? null };
  } finally {
    await connection.close();
  }
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/").split("/").pop());
if (isMain) {
  if (!process.env.MONGODB_URI) {
    try { process.loadEnvFile(new URL("../../.env", import.meta.url)); } catch { /* sin .env */ }
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI no está configurada.");
    process.exit(2);
  }
  try {
    const result = await checkReplicaSet(uri);
    if (!result.ok) {
      console.error(
        "MongoDB responde, pero NO es un replica set. Las transacciones del juego fallarán.\n" +
          "Configura un replica set (por ejemplo rs0) siguiendo la sección 'Requisitos' del README."
      );
      process.exit(1);
    }
    console.log(`MongoDB OK: replica set "${result.setName}".`);
  } catch (error) {
    console.error(`No se pudo conectar con MongoDB: ${error.message}`);
    process.exit(2);
  }
}
