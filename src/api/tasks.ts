import { createServerFn } from "@tanstack/react-start";
import connectDB from "@/lib/db";
import { ObjectId } from "mongodb";
import { z } from "zod";

// ─── Schemas & Types ──────────────────────────────────────────────────────────
const TaskStatusSchema = z.enum(["todo", "doing", "done"]);
const TimeOfDaySchema = z.enum(["เช้า", "บ่าย", "เย็น"]);

const TaskDocSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  title: z.string().min(1),
  detail: z.string().optional(),
  deadline: z.date(),
  timeOfDay: TimeOfDaySchema,
  status: TaskStatusSchema,
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type TaskDoc = z.infer<typeof TaskDocSchema>;

async function tasks() {
  const db = await connectDB();
  return db.collection<TaskDoc>("tasks");
}

// ─── Get Tasks ────────────────────────────────────────────────────────────────
export const getTasksFn = createServerFn({ method: "GET" })
  .inputValidator((userId: unknown) => z.string().parse(userId))
  .handler(async ({ data: userId }) => {
    try {
      const col = await tasks();
      // Indexed on userId and createdAt
      const list = await col
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
        
      return list.map((t) => ({
        id: t._id!.toString(),
        title: t.title,
        detail: t.detail,
        deadline: t.deadline.toISOString(),
        timeOfDay: t.timeOfDay,
        createdAt: t.createdAt.toISOString(),
        status: t.status,
      }));
    } catch (error) {
      console.error("GetTasks error:", error);
      throw new Error("Failed to fetch tasks.");
    }
  });

// ─── Create Task ──────────────────────────────────────────────────────────────
const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  detail: z.string().optional(),
  deadline: z.string(), // ISO string from frontend
  userId: z.string(),
});

export const createTaskFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CreateTaskSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const col = await tasks();
      const now = new Date();
      const hour = now.getHours();
      
      let timeOfDay: TaskDoc["timeOfDay"] = "เช้า";
      if (hour >= 12 && hour < 17) timeOfDay = "บ่าย";
      else if (hour >= 17) timeOfDay = "เย็น";

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
    } catch (error: any) {
      console.error("CreateTask error:", error);
      throw new Error("Failed to create task.");
    }
  });

// ─── Update Status ────────────────────────────────────────────────────────────
const UpdateStatusSchema = z.object({
  id: z.string(),
  status: TaskStatusSchema,
});

export const updateTaskStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => UpdateStatusSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const col = await tasks();
      let oid: ObjectId;
      try { oid = new ObjectId(data.id); } catch { throw new Error("Invalid task ID"); }
      
      const result = await col.updateOne(
        { _id: oid }, 
        { $set: { status: data.status, updatedAt: new Date() } }
      );
      
      if (result.matchedCount === 0) throw new Error("Task not found");
      return { success: true };
    } catch (error: any) {
      console.error("UpdateTaskStatus error:", error);
      throw new Error(error.message || "Failed to update task status.");
    }
  });
