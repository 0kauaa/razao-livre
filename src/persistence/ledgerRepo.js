const path = require('path');
const fs = require('fs').promises;
const { getCollection } = require('./mongoClient');

const dataDir = path.join(__dirname, '..', '..', 'data');
const filePath = path.join(dataDir, 'lancamentos.json');

async function writeJsonFile(targetPath, data) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(targetPath, JSON.stringify(data, null, 2), 'utf8');
}

async function persistEntries(entries) {
  try {
    const collection = await getCollection();
    await collection.deleteMany({});
    if (entries.length) {
      await collection.insertMany(entries);
    }
  } catch (error) {
    console.error('erro ao persistir no mongodb:', error.message);
    console.warn('não foi possível persistir no mongodb local, gravando apenas o json', error.message);
  }
  await writeJsonFile(filePath, entries);
  return entries;
}

async function readEntries() {
  try {
    const collection = await getCollection();
    const docs = await collection.find({}).toArray();
    if (docs && docs.length) {
      return docs;
    }
  } catch (error) {
    console.warn('não foi possível ler do mongodb, usando arquivo local', error.message);
  }

  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch {
    return [];
  }
}

module.exports = { persistEntries, readEntries };
