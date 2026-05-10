"use server";
import { createServerFn } from "@tanstack/react-start";
import connectDB from "@/lib/db";
import { ObjectId } from "mongodb";
import { z } from "zod";

// ─── Schemas & Types ──────────────────────────────────────────────────────────
const TaskStatusSchema = z.enum(["todo", "doing", "done"]);
const TimeOfDaySchema = z.enum(["เช้า", "บ่าย", "เย็น"]);

export type TaskDoc = {
  _id?: ObjectId;
  title: string;
  detail?: string;
  deadline: Date;
  timeOfDay: z.infer<typeof TimeOfDaySchema>;
  status: z.infer<typeof TaskStatusSchema>;
  userId: string;      // intern's user id (task owner)
  assignedById?: string; // admin/mentor who assigned it
  createdAt: Date;
  updatedAt: Date;
};

type UserDocLight = {
  _id?: ObjectId;
  role: string;
  team?: string;
};

async function tasks() {
  const db = await connectDB();
  return db.collection<TaskDoc>("tasks");
}

async function usersCol() {
  const db = await connectDB();
  return db.collection<UserDocLight>("users");
}

// ─── Helper: resolve timeOfDay from a Date ────────────────────────────────────
function resolveTimeOfDay(date: Date): TaskDoc["timeOfDay"] {
  const hour = date.getHours();
  if (hour >= 17) return "เย็น";
  if (hour >= 12) return "บ่าย";
  return "เช้า";
}

// ─── Get Tasks (for a specific intern) ────────────────────────────────────────
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

// ─── Assign Task (Admin or Mentor only) ──────────────────────────────────────
const AssignTaskSchema = z.object({
  internId: z.string().min(1, "Intern ID is required"),
  title: z.string().min(1, "Title is required").max(200),
  detail: z.string().max(2000).optional(),
  deadline: z
    .string()
    .min(1, "Deadline is required")
    .refine((s) => !isNaN(Date.parse(s)), { message: "Invalid deadline date" }),
  assignedById: z.string().min(1, "Assigner ID is required"),
});

export const assignTaskFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => AssignTaskSchema.parse(data))
  .handler(async ({ data }) => {
    if (!ObjectId.isValid(data.internId)) throw new Error("Invalid intern ID");
    if (!ObjectId.isValid(data.assignedById)) throw new Error("Unauthorized");

    const uc = await usersCol();

    // 1. Verify the assigner exists and is admin or mentor
    const assigner = await uc.findOne(
      { _id: new ObjectId(data.assignedById) },
      { projection: { role: 1, team: 1 } }
    );
    if (!assigner || (assigner.role !== "admin" && assigner.role !== "mentor")) {
      throw new Error("Unauthorized: only admin or mentor can assign tasks");
    }

    // 2. If mentor, verify intern is in the same team
    if (assigner.role === "mentor") {
      const intern = await uc.findOne(
        { _id: new ObjectId(data.internId) },
        { projection: { team: 1, role: 1 } }
      );
      if (!intern || intern.role !== "intern") {
        throw new Error("Target user is not an intern");
      }
      if (intern.team !== assigner.team) {
        throw new Error("You can only assign tasks to interns in your team");
      }
    }

    const col = await tasks();
    const now = new Date();
    const deadlineDate = new Date(data.deadline);

    const doc: TaskDoc = {
      title: data.title.trim(),
      detail: data.detail?.trim() || undefined,
      deadline: deadlineDate,
      timeOfDay: resolveTimeOfDay(now),
      status: "todo",
      userId: data.internId,
      assignedById: data.assignedById,
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

// ─── Assign Task to Multiple Interns (Admin or Mentor) ────────────────────────
const AssignTaskManySchema = z.object({
  internIds: z.array(z.string().min(1, "Intern ID is required")).min(1, "At least one intern is required"),
  title: z.string().min(1, "Title is required").max(200),
  detail: z.string().max(2000).optional(),
  deadline: z
    .string()
    .min(1, "Deadline is required")
    .refine((s) => !isNaN(Date.parse(s)), { message: "Invalid deadline date" }),
  assignedById: z.string().min(1, "Assigner ID is required"),
});

export const assignTaskManyFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => AssignTaskManySchema.parse(data))
  .handler(async ({ data }) => {
    if (!ObjectId.isValid(data.assignedById)) throw new Error("Unauthorized");
    const validInternIds = data.internIds.filter((id) => ObjectId.isValid(id));
    if (validInternIds.length === 0) throw new Error("No valid intern IDs provided");

    const uc = await usersCol();

    // 1. Verify assigner
    const assigner = await uc.findOne(
      { _id: new ObjectId(data.assignedById) },
      { projection: { role: 1, team: 1 } }
    );
    if (!assigner || (assigner.role !== "admin" && assigner.role !== "mentor")) {
      throw new Error("Unauthorized: only admin or mentor can assign tasks");
    }

    // 2. Fetch interns to verify they exist and are interns
    const targetObjectIds = validInternIds.map((id) => new ObjectId(id));
    const interns = await uc
      .find({ _id: { $in: targetObjectIds }, role: "intern" }, { projection: { team: 1 } })
      .toArray();

    if (interns.length === 0) {
      throw new Error("No valid interns found");
    }

    // 3. If mentor, verify ALL interns are in their team
    if (assigner.role === "mentor") {
      const allInTeam = interns.every((intern) => intern.team === assigner.team);
      if (!allInTeam) {
        throw new Error("You can only assign tasks to interns in your own team");
      }
    }

    const col = await tasks();
    const now = new Date();
    const deadlineDate = new Date(data.deadline);
    const timeOfDay = resolveTimeOfDay(now);

    const docs: TaskDoc[] = interns.map((intern) => ({
      title: data.title.trim(),
      detail: data.detail?.trim() || undefined,
      deadline: deadlineDate,
      timeOfDay,
      status: "todo",
      userId: intern._id!.toString(),
      assignedById: data.assignedById,
      createdAt: now,
      updatedAt: now,
    }));

    await col.insertMany(docs);
    return { success: true, count: docs.length };
  });

// ─── Update Task Status (intern can move own tasks) ───────────────────────────
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

// ─── Delete Task (admin/mentor or task owner) ─────────────────────────────────
const DeleteTaskSchema = z.object({
  id: z.string().min(1),
  requesterId: z.string().min(1),
});

export const deleteTaskFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => DeleteTaskSchema.parse(data))
  .handler(async ({ data }) => {
    if (!ObjectId.isValid(data.id)) throw new Error("Invalid task ID");
    if (!ObjectId.isValid(data.requesterId)) throw new Error("Unauthorized");

    const col = await tasks();
    const uc = await usersCol();
    const oid = new ObjectId(data.id);

    // Check who is requesting
    const requester = await uc.findOne(
      { _id: new ObjectId(data.requesterId) },
      { projection: { role: 1 } }
    );

    if (!requester) throw new Error("Unauthorized");

    let result;
    if (requester.role === "admin" || requester.role === "mentor") {
      // Admin/Mentor can delete any task
      result = await col.deleteOne({ _id: oid });
    } else {
      // Intern can only delete their own tasks
      result = await col.deleteOne({ _id: oid, userId: data.requesterId });
    }

    if (result.deletedCount === 0) throw new Error("Task not found or access denied");
    return { success: true };
  });
