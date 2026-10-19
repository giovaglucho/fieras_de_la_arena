import app from "./app.js";
import { connectToDatabase } from "./database.js";

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT debe ser un número entero entre 1 y 65535.");
}

async function startServer() {
  try {
    await connectToDatabase();
  } catch (error) {
    console.error(`No se pudo iniciar el servidor: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
  });
}

startServer();
