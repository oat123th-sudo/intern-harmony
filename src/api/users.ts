"use server";
import { createServerFn } from "@tanstack/react-start";
import connectDB from "@/lib/db";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { UserRoleSchema, UserStatusSchema } from "./auth";

// ─── Schemas & Types ──────────────────────────────────────────────────────────

export type UserDoc = {
  _id?: ObjectId;
  name: string;
  email: string;
  role: z.infer<typeof UserRoleSchema>;
  status: z.infer<typeof UserStatusSchema>;
  createdAt: Date;
  updatedAt: Date;
};

// Single source of truth for privileged email
const ADMIN_EMAIL = "admin@gmail.com";

async function users() {
  const db = await connectDB();
  return db.collection<UserDoc>("users");
}

async function tasksCol() {
  const db = await connectDB();
  return db.collection("tasks");
}

// ─── Admin: List All Users ─────────────────────────────────────────────────────
export const getUsersFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const col = await users();
    const list = await col
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return list.map((u) => ({
      id: u._id!.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
    }));
  });

// ─── Admin: List Pending Applicants ───────────────────────────────────────────
export const getApplicantsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const col = await users();
    const list = await col
      .find({ role: "intern", status: "Pending" }, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return list.map((u) => ({
      id: u._id!.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
    }));
  });

// ─── Admin/Mentor: Accept or Reject Applicant ─────────────────────────────────
const UpdateApplicantStatusSchema = z.object({
  id: z.string().min(1),
  accept: z.boolean(),
});

export const updateApplicantStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => UpdateApplicantStatusSchema.parse(data))
  .handler(async ({ data }) => {
    if (!ObjectId.isValid(data.id)) throw new Error("Invalid ID");

    const col = await users();
    const oid = new ObjectId(data.id);
    const status = data.accept ? "Accepted" : "Rejected";

    const result = await col.updateOne(
      { _id: oid },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) throw new Error("Applicant not found");
    return { success: true };
  });

// ─── Admin: Update Role ────────────────────────────────────────────────────────
// NOTE: Authorization is enforced SERVER-SIDE by looking up the currentUserId
// in the database, never trusting the email string sent from the client.
const UpdateRoleSchema = z.object({
  id: z.string().min(1),
  role: UserRoleSchema,
  currentUserId: z.string().min(1), // send ID, not email
});

export const updateUserRoleFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => UpdateRoleSchema.parse(data))
  .handler(async ({ data }) => {
    if (!ObjectId.isValid(data.currentUserId))
      throw new Error("Unauthorized");
    if (!ObjectId.isValid(data.id)) throw new Error("Invalid user ID");

    const col = await users();

    // Verify the acting user is actually an admin in the DB
    const actor = await col.findOne(
      { _id: new ObjectId(data.currentUserId) },
      { projection: { role: 1, email: 1 } }
    );
    if (!actor || actor.role !== "admin")
      throw new Error("Unauthorized: admin access required");

    const oid = new ObjectId(data.id);

    // Prevent demoting the protected admin account
    const target = await col.findOne({ _id: oid }, { projection: { email: 1 } });
    if (target?.email === ADMIN_EMAIL && data.role !== "admin")
      throw new Error("Cannot change the role of the primary admin account");

    const result = await col.updateOne(
      { _id: oid },
      { $set: { role: data.role, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) throw new Error("User not found");
    return { success: true };
  });

// ─── Admin: Delete User ────────────────────────────────────────────────────────
const DeleteUserSchema = z.object({
  id: z.string().min(1),
  currentUserId: z.string().min(1), // send ID, not email
});

export const deleteUserFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => DeleteUserSchema.parse(data))
  .handler(async ({ data }) => {
    if (!ObjectId.isValid(data.currentUserId))
      throw new Error("Unauthorized");
    if (!ObjectId.isValid(data.id)) throw new Error("Invalid user ID");

    const col = await users();

    // Verify actor is admin in DB
    const actor = await col.findOne(
      { _id: new ObjectId(data.currentUserId) },
      { projection: { role: 1, email: 1 } }
    );
    if (!actor || actor.role !== "admin")
      throw new Error("Unauthorized: admin access required");

    const oid = new ObjectId(data.id);

    // Prevent deleting the primary admin account
    const target = await col.findOne({ _id: oid }, { projection: { email: 1 } });
    if (target?.email === ADMIN_EMAIL)
      throw new Error("Cannot delete the primary admin account");

    // Prevent self-deletion
    if (data.id === data.currentUserId)
      throw new Error("Cannot delete your own account");

    const tc = await tasksCol();
    // Run in parallel for speed
    await Promise.all([
      col.deleteOne({ _id: oid }),
      tc.deleteMany({ userId: data.id }),
    ]);

    return { success: true };
  });

// ─── Mentor/Admin: Get Intern Progress ────────────────────────────────────────
export const getInternProgressFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const userCol = await users();
    const tc = await tasksCol();

    // Fetch all interns (exclude password)
    const interns = await userCol
      .find({ role: "intern" }, { projection: { password: 0 } })
      .toArray();

    if (interns.length === 0) return [];

    const internIds = interns.map((i) => i._id!.toString());

    // Single aggregated query for all intern tasks
    const allTasks = await tc
      .find(
        { userId: { $in: internIds } },
        { projection: { _id: 1, userId: 1, title: 1, status: 1, deadline: 1 } }
      )
      .sort({ createdAt: -1 })
      .toArray();

    // Group tasks by userId using a Map for O(n) lookup
    const tasksByUser = new Map<string, typeof allTasks>();
    for (const task of allTasks) {
      const uid = task.userId as string;
      if (!tasksByUser.has(uid)) tasksByUser.set(uid, []);
      tasksByUser.get(uid)!.push(task);
    }

    return interns.map((intern) => {
      const id = intern._id!.toString();
      const internTasks = tasksByUser.get(id) ?? [];
      return {
        id,
        name: intern.name,
        email: intern.email,
        status: intern.status,
        tasks: internTasks.map((t: any) => ({
          id: t._id!.toString(),
          title: t.title,
          status: t.status,
          deadline: t.deadline instanceof Date
            ? t.deadline.toISOString()
            : new Date(t.deadline).toISOString(),
        })),
      };
    });
  });
