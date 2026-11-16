import mongoose from "mongoose";

const SERVER_SELECTION_TIMEOUT_MS = 5000;

mongoose.connection.on("disconnected", () => {
  console.warn("La conexión con MongoDB está desconectada.");
});

export async function connectToDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error("Falta configurar la variable MONGODB_URI.");
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS
    });
  } catch (error) {
    throw new Error(
      "No se pudo conectar con MongoDB. Comprueba MONGODB_URI y que el servicio esté disponible.",
      { cause: error }
    );
  }

  console.log("Conexión con MongoDB establecida.");
  await warnIfNotReplicaSet();
}

// Las transacciones (crear luchador, combates) exigen un replica set; se avisa al arrancar
// en vez de fallar más tarde con errores poco claros.
async function warnIfNotReplicaSet() {
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!hello.setName && hello.msg !== "isdbgrid") {
      console.warn(
        "AVISO: MongoDB no es un replica set. Las transacciones del juego fallarán. " +
          "Consulta la sección Requisitos del README (comando: npm run check:mongo)."
      );
    }
  } catch {
    // Si no se puede consultar (permisos), no se bloquea el arranque.
  }
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
