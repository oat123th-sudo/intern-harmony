import { createServerFn } from "@tanstack/react-start";
import connectDB from "@/lib/db";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { UserRoleSchema, UserStatusSchema } from "./auth";

// ─── Schemas & Types ──────────────────────────────────────────────────────────
const UserDocSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  name: z.string(),
  email: z.string(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

type UserDoc = z.infer<typeof UserDocSchema>;

async function users() {
  const db = await connectDB();
  return db.collection<UserDoc>("users");
}

async function tasks() {
  const db = await connectDB();
  return db.collection("tasks");
}

// ─── Admin: List All Users ────────────────────────────────────────────────────
export const getUsersFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
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
    } catch (error) {
      console.error("GetUsers error:", error);
      throw new Error("Failed to load users.");
    }
  });

// ─── Admin: List Pending Applicants ───────────────────────────────────────────
export const getApplicantsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
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
    } catch (error) {
      console.error("GetApplicants error:", error);
      throw new Error("Failed to load applicants.");
    }
  });

// ─── Admin: Accept/Reject Applicant ───────────────────────────────────────────
const UpdateStatusSchema = z.object({
  id: z.string(),
  accept: z.boolean(),
});

export const updateApplicantStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => UpdateStatusSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const col = await users();
      let oid: ObjectId;
      try { oid = new ObjectId(data.id); } catch { throw new Error("Invalid ID"); }
      
      const status = data.accept ? "Accepted" : "Rejected";
      const result = await col.updateOne(
        { _id: oid }, 
        { $set: { status, updatedAt: new Date() } }
      );
      
      if (result.matchedCount === 0) throw new Error("Applicant not found");
      return { success: true };
    } catch (error: any) {
      console.error("UpdateApplicantStatus error:", error);
      throw new Error(error.message || "Failed to update status.");
    }
  });

// ─── Admin: Update Role ───────────────────────────────────────────────────────
const UpdateRoleSchema = z.object({
  id: z.string(),
  role: UserRoleSchema,
  currentUserEmail: z.string().email(),
});

export const updateUserRoleFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => UpdateRoleSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      if (data.currentUserEmail !== "admin@gmail.com") {
        throw new Error("Unauthorized: Only admin@gmail.com can update roles.");
      }
      
      const col = await users();
      let oid: ObjectId;
      try { oid = new ObjectId(data.id); } catch { throw new Error("Invalid ID"); }
      
      const result = await col.updateOne(
        { _id: oid }, 
        { $set: { role: data.role, updatedAt: new Date() } }
      );
      
      if (result.matchedCount === 0) throw new Error("User not found");
      return { success: true };
    } catch (error: any) {
      console.error("UpdateUserRole error:", error);
      throw new Error(error.message || "Failed to update role.");
    }
  });

// ─── Admin: Delete User ───────────────────────────────────────────────────────
const DeleteUserSchema = z.object({
  id: z.string(),
  currentUserEmail: z.string().email(),
});

export const deleteUserFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => DeleteUserSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      if (data.currentUserEmail !== "admin@gmail.com") {
        throw new Error("Unauthorized: Only admin@gmail.com can delete users.");
      }
      
      const col = await users();
      const taskCol = await tasks();
      let oid: ObjectId;
      try { oid = new ObjectId(data.id); } catch { throw new Error("Invalid ID"); }
      
      await col.deleteOne({ _id: oid });
      await taskCol.deleteMany({ userId: data.id }); // Clean up related tasks
      
      return { success: true };
    } catch (error: any) {
      console.error("DeleteUser error:", error);
      throw new Error(error.message || "Failed to delete user.");
    }
  });

// ─── Mentor/Admin: Get Intern Progress ────────────────────────────────────────
export const getInternProgressFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const userCol = await users();
      const taskCol = await tasks();
      
      // Fetch all interns
      const interns = await userCol
        .find({ role: "intern" }, { projection: { password: 0 } })
        .toArray();
      
      const internIds = interns.map((i) => i._id!.toString());
      
      // Fetch tasks for all these interns in one query for efficiency
      const allTasks = await taskCol
        .find({ userId: { $in: internIds } })
        .sort({ createdAt: -1 })
        .toArray();

      return interns.map((intern) => {
        const id = intern._id!.toString();
        const internTasks = allTasks.filter((t: any) => t.userId === id);
        return {
          id,
          name: intern.name,
          email: intern.email,
          status: intern.status,
          tasks: internTasks.map((t: any) => ({
            id: t._id!.toString(),
            title: t.title,
            status: t.status,
            deadline: t.deadline.toISOString(),
          })),
        };
      });
    } catch (error) {
      console.error("GetInternProgress error:", error);
      throw new Error("Failed to load progress data.");
    }
  });
