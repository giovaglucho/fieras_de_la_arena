// Ejecuta las pruebas del servidor contra una base de datos NUEVA y desechable,
// con replica set verificado y un tiempo máximo por prueba. Así una base de
// pruebas antigua (por ejemplo con índices legados) no puede romper ni colgar la suite.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { checkReplicaSet } from "./checkMongoReplicaSet.js";

try { process.loadEnvFile(new URL("../../.env", import.meta.url)); } catch { /* sin .env */ }

const baseUri = process.env.MONGODB_URI;
if (!baseUri) {
  console.error("MONGODB_URI no está configurada (revisa .env).");
  process.exit(2);
}

const testUrl = new URL(baseUri);
const testDbName = `fieras_test_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
testUrl.pathname = `/${testDbName}`;
const testUri = testUrl.toString();

let replica;
try {
  replica = await checkReplicaSet(testUri);
} catch (error) {
  console.error(`No se pudo conectar con MongoDB: ${error.message}`);
  process.exit(2);
}
if (!replica.ok) {
  console.error(
    "MongoDB no es un replica set: las pruebas de integración requieren transacciones.\n" +
      "Consulta la sección 'Requisitos' del README para configurar rs0."
  );
  process.exit(2);
}

const extraArgs = process.argv.slice(2);
const timeout = process.env.TEST_TIMEOUT_MS ?? "60000";
console.log(`Base de pruebas desechable: ${testDbName}`);

const child = spawn(
  process.execPath,
  ["--test", `--test-timeout=${timeout}`, "--test-force-exit", ...extraArgs],
  { stdio: "inherit", env: { RATE_LIMIT_STORE: "memory", ...process.env, MONGODB_URI: testUri } }
);

const exitCode = await new Promise((resolve) => child.on("exit", (code) => resolve(code ?? 1)));

try {
  const connection = await mongoose.createConnection(testUri, { serverSelectionTimeoutMS: 5000 }).asPromise();
  await connection.dropDatabase();
  await connection.close();
} catch (error) {
  console.warn(`No se pudo eliminar la base ${testDbName}: ${error.message}`);
}
process.exit(exitCode);
