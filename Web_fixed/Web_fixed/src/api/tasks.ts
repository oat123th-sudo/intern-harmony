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

// ─── Helper: resolve timeOfDay from a Date ────────────────────────────────────
function resolveTimeOfDay(date: Date): TaskDoc["timeOfDay"] {
  const hour = date.getHours();
  if (hour >= 17) return "เย็น";
  if (hour >= 12) return "บ่าย";
  return "เช้า";
}

// ─── Get Tasks ────────────────────────────────────────────────────────────────
export const getTasksFn = createServerFn({ method: "GET" })
  .inputValidator((userId: unknown) => z.string().min(1).parse(userId))
  .handler(async ({ data: userId }) => {
    const col = await tasks();
    // Compound index on (userId, createdAt) handles this query efficiently
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
  });

// ─── Create Task ──────────────────────────────────────────────────────────────
const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  detail: z.string().max(2000).optional(),
  // Accept ISO string from frontend; must be a valid date
  deadline: z
    .string()
    .min(1, "Deadline is required")
    .refine((s) => !isNaN(Date.parse(s)), { message: "Invalid deadline date" }),
  userId: z.string().min(1, "User ID is required"),
});

export const createTaskFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CreateTaskSchema.parse(data))
  .handler(async ({ data }) => {
    const col = await tasks();
    const now = new Date();
    const deadlineDate = new Date(data.deadline);

    const doc: TaskDoc = {
      title: data.title.trim(),
      detail: data.detail?.trim() || undefined,
      deadline: deadlineDate,
      timeOfDay: resolveTimeOfDay(now),
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

// ─── Update Task Status ───────────────────────────────────────────────────────
const UpdateStatusSchema = z.object({
  id: z.string().min(1),
  status: TaskStatusSchema,
});

export const updateTaskStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => UpdateStatusSchema.parse(data))
  .handler(async ({ data }) => {
    if (!ObjectId.isValid(data.id)) throw new Error("Invalid task ID");

    const col = await tasks();
    const oid = new ObjectId(data.id);

    const result = await col.updateOne(
      { _id: oid },
      { $set: { status: data.status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) throw new Error("Task not found");
    return { success: true };
  });

// ─── Delete Task ──────────────────────────────────────────────────────────────
const DeleteTaskSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1), // ownership check
});

export const deleteTaskFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => DeleteTaskSchema.parse(data))
  .handler(async ({ data }) => {
    if (!ObjectId.isValid(data.id)) throw new Error("Invalid task ID");

    const col = await tasks();
    const oid = new ObjectId(data.id);

    // Only delete if the task belongs to the requesting user
    const result = await col.deleteOne({ _id: oid, userId: data.userId });
    if (result.deletedCount === 0) throw new Error("Task not found or access denied");
    return { success: true };
  });
