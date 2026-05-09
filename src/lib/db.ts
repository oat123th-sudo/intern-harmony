import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env");
}

let client: MongoClient;
let dbInstance: Db;

// Singleton: reuse existing connection across hot-reloads (dev) and requests (prod)
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

async function connectDB(): Promise<Db> {
  if (dbInstance) return dbInstance;

  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(MONGODB_URI);
    await global._mongoClient.connect();
  }

  client = global._mongoClient;
  dbInstance = client.db(); // uses the database name from the URI path (BotnoiAcademy)
  return dbInstance;
}

export default connectDB;
