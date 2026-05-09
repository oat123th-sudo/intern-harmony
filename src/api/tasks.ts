import { createServerFn } from "@tanstack/react-start";
import connectDB from "@/lib/db";
import { ObjectId } from "mongodb";

type TaskDoc = {
  _id?: ObjectId;
  title: string;
  detail?: string;
  deadline: Date;
  timeOfDay: "เช้า" | "บ่าย" | "เย็น";
  status: "todo" | "doing" | "done";
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

async function tasks() {
  const db = await connectDB();
  return db.collection<TaskDoc>("tasks");
}

export const getTasksFn = createServerFn({ method: "GET" })
  .inputValidator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    const col = await tasks();
    const list = await col.find({ userId }).sort({ createdAt: -1 }).toArray();
    return list.map((t) => ({
      id: t._id!.toString(),
      title: t.title,
      detail: t.detail,
      deadline: t.deadline.toISOString(),
      timeOfDay: t.timeOfDay,
      createdAt: t.createdAt.toISOString(),
      status: t.status,
    }));
  });

export const createTaskFn = createServerFn({ method: "POST" })
  .inputValidator((data: { title: string; detail?: string; deadline: string; userId: string }) => data)
  .handler(async ({ data }) => {
    const col = await tasks();
    const hour = new Date().getHours();
    let timeOfDay: TaskDoc["timeOfDay"] = "เช้า";
    if (hour >= 12 && hour < 17) timeOfDay = "บ่าย";
    else if (hour >= 17) timeOfDay = "เย็น";

    const now = new Date();
    const doc: TaskDoc = {
      title: data.title,
      detail: data.detail,
      deadline: new Date(data.deadline),
      timeOfDay,
      status: "todo",
      userId: data.userId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await col.insertOne(doc);
    return {
      id: result.insertedId.toString(),
      title: doc.title,
      detail: doc.detail,
      deadline: doc.deadline.toISOString(),
      timeOfDay: doc.timeOfDay,
      createdAt: doc.createdAt.toISOString(),
      status: doc.status,
    };
  });

export const updateTaskStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: "todo" | "doing" | "done" }) => data)
  .handler(async ({ data }) => {
    const col = await tasks();
    let oid: ObjectId;
    try { oid = new ObjectId(data.id); } catch { throw new Error("Invalid task ID"); }
    await col.updateOne({ _id: oid }, { $set: { status: data.status, updatedAt: new Date() } });
    return { success: true };
  });
