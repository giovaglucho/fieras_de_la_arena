const path = require('node:path');

// mongoose vive en server/node_modules; se reutiliza para recrear la base de pruebas E2E.
async function dropE2eDatabase() {
  const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
  const base = process.env.E2E_MONGODB_BASE ?? 'mongodb://127.0.0.1:27017';
  const connection = await mongoose
    .createConnection(`${base}/fieras_e2e`, { serverSelectionTimeoutMS: 5000 })
    .asPromise();
  try {
    await connection.dropDatabase();
  } finally {
    await connection.close();
  }
}

module.exports = { dropE2eDatabase };
