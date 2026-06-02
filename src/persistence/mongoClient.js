const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'razao-livre';
const collectionName = process.env.MONGODB_COLLECTION || 'lancamentos';
let client;

async function getClient() {
  if (client) {
    return client;
  }
  client = new MongoClient(uri);
  await client.connect();
  return client;
}

async function getCollection() {
  const dbClient = await getClient();
  return dbClient.db(dbName).collection(collectionName);
}

module.exports = { getCollection };
