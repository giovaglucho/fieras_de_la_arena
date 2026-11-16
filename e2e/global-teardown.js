const { dropE2eDatabase } = require('./db');

module.exports = async () => {
  await dropE2eDatabase();
};
