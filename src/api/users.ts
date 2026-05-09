import { createServerFn } from "@tanstack/react-start";
import connectDB from "@/lib/db";
import { ObjectId } from "mongodb";

type UserDoc = {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  role: "admin" | "mentor" | "intern" | "alumni";
  status: "Pending" | "Accepted" | "Rejected" | "Active";
  createdAt: Date;
  updatedAt: Date;
};

type TaskDoc = {
  _id?: ObjectId;
  userId: string;
  title: string;
  status: "todo" | "doing" | "done";
  deadline: Date;
};

async function users() {
  const db = await connectDB();
  return db.collection<UserDoc>("users");
}

async function tasks() {
  const db = await connectDB();
  return db.collection<TaskDoc>("tasks");
}

export const getUsersFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const col = await users();
    const list = await col.find({}).sort({ createdAt: -1 }).toArray();
    return list.map((u) => ({
      id: u._id!.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
    }));
  });

export const getApplicantsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const col = await users();
    const list = await col.find({ role: "intern", status: "Pending" }).sort({ createdAt: -1 }).toArray();
    return list.map((u) => ({
      id: u._id!.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
    }));
  });

export const updateApplicantStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; accept: boolean }) => data)
  .handler(async ({ data }) => {
    const col = await users();
    let oid: ObjectId;
    try { oid = new ObjectId(data.id); } catch { throw new Error("Invalid ID"); }
    const status = data.accept ? "Accepted" : "Rejected";
    await col.updateOne({ _id: oid }, { $set: { status, updatedAt: new Date() } });
    return { success: true };
  });

export const updateUserRoleFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; role: string; currentUserEmail: string }) => data)
  .handler(async ({ data }) => {
    if (data.currentUserEmail !== "admin@gmail.com") {
      throw new Error("Unauthorized: Only admin@gmail.com can update roles.");
    }
    const col = await users();
    let oid: ObjectId;
    try { oid = new ObjectId(data.id); } catch { throw new Error("Invalid ID"); }
    await col.updateOne({ _id: oid }, { $set: { role: data.role as UserDoc["role"], updatedAt: new Date() } });
    return { success: true };
  });

export const deleteUserFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; currentUserEmail: string }) => data)
  .handler(async ({ data }) => {
    if (data.currentUserEmail !== "admin@gmail.com") {
      throw new Error("Unauthorized: Only admin@gmail.com can delete users.");
    }
    const col = await users();
    const taskCol = await tasks();
    let oid: ObjectId;
    try { oid = new ObjectId(data.id); } catch { throw new Error("Invalid ID"); }
    await col.deleteOne({ _id: oid });
    await taskCol.deleteMany({ userId: data.id }); // clean up tasks
    return { success: true };
  });

export const getInternProgressFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const userCol = await users();
    const taskCol = await tasks();
    const interns = await userCol.find({ role: "intern" }).toArray();
    const internIds = interns.map((i) => i._id!.toString());
    const allTasks = await taskCol.find({ userId: { $in: internIds } }).toArray();

    return interns.map((intern) => {
      const id = intern._id!.toString();
      const internTasks = allTasks.filter((t) => t.userId === id);
      return {
        id,
        name: intern.name,
        email: intern.email,
        status: intern.status,
        tasks: internTasks.map((t) => ({
          id: t._id!.toString(),
          title: t.title,
          status: t.status,
          deadline: t.deadline.toISOString(),
        })),
      };
    });
  });
