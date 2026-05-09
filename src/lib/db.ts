import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env");
}

// Global variable to persist client across hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(MONGODB_URI).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(MONGODB_URI).connect();
}

let indexesInitialized = false;

async function connectDB(): Promise<Db> {
  const client = await clientPromise;
  const db = client.db();
  
  if (!indexesInitialized) {
    // Fire and forget index initialization to not block the first request too long
    // but ensure it happens.
    initIndexes().catch(err => console.error("Index init failed:", err));
    indexesInitialized = true;
  }
  
  return db;
}

/**
 * Initializes database indexes for performance and data integrity.
 * Call this during application startup or once.
 */
export async function initIndexes() {
  const db = await connectDB();
  
  // Users: Unique email is critical for security and performance
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  
  // Tasks: Index on userId for fast lookups
  await db.collection("tasks").createIndex({ userId: 1 });
  await db.collection("tasks").createIndex({ createdAt: -1 });

  console.log("✅ Database indexes initialized");
}

export default connectDB;
