import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env");
}

// ── Singleton client (safe for serverless / Cloudflare Workers) ──────────────
// We keep ONE Promise<MongoClient> per isolate. In development Vite hot-reloads
// recycle the module, so we stash the promise on globalThis to survive HMR.

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  return new MongoClient(MONGODB_URI, {
    maxPoolSize: 5,           // keep pool small for edge / serverless
    minPoolSize: 1,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 30_000,
    serverSelectionTimeoutMS: 10_000,
  }).connect();
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!globalThis._mongoClientPromise) {
    globalThis._mongoClientPromise = createClientPromise();
  }
  clientPromise = globalThis._mongoClientPromise;
} else {
  // In production / edge each isolate has its own module scope.
  // Using a module-level variable is correct here.
  clientPromise = createClientPromise();
}

// ── Index initialisation ─────────────────────────────────────────────────────
// Tracks whether we've already kicked off index creation for THIS isolate.
// Uses a Promise so concurrent first-requests don't double-initialise.
let indexInitPromise: Promise<void> | undefined;

async function _runInitIndexes(db: Db): Promise<void> {
  try {
    await Promise.all([
      db.collection("users").createIndex({ email: 1 }, { unique: true }),
      db.collection("tasks").createIndex({ userId: 1, createdAt: -1 }),
      db.collection("tasks").createIndex({ userId: 1, status: 1 }),
    ]);
    console.log("✅ Database indexes ready");
  } catch (err) {
    // Index creation errors (e.g. duplicate-key on existing data) should not
    // crash the app — log and continue.
    console.error("⚠️ Index init warning:", err);
    // Reset so next request retries, unless it's an unrecoverable auth error.
    indexInitPromise = undefined;
  }
}

async function connectDB(): Promise<Db> {
  const client = await clientPromise;
  const db = client.db();

  // Fire-and-forget, but deduplicated: only one initialisation per isolate.
  if (!indexInitPromise) {
    indexInitPromise = _runInitIndexes(db);
  }

  return db;
}

/** Exposed for tests / startup scripts that want to await index creation. */
export async function initIndexes(): Promise<void> {
  const client = await clientPromise;
  const db = client.db();
  await _runInitIndexes(db);
}

export default connectDB;
