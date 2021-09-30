const { MongoClient } = require('mongodb');

const createConnection = async (host = 'localhost', port = 27017) => {
  const dbURL = `mongodb://${host}:${port}`;
  const instance = await MongoClient.connect(dbURL);
  return instance;
};

module.exports = { createConnection };
