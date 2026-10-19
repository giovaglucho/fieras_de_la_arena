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
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
