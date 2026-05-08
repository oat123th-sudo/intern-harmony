import { createServerFn } from "@tanstack/react-start";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Task from "@/models/Task";

export const getUsersFn = createServerFn({ method: "GET" })
  .handler(async () => {
    await connectDB();
    const users = await User.find({}).sort({ createdAt: -1 });
    return users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
    }));
  });

export const getApplicantsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    await connectDB();
    const applicants = await User.find({ role: "intern", status: "Pending" }).sort({ createdAt: -1 });
    return applicants.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
    }));
  });

export const updateApplicantStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; accept: boolean }) => data)
  .handler(async ({ data }) => {
    await connectDB();
    const status = data.accept ? "Accepted" : "Rejected";
    await User.findByIdAndUpdate(data.id, { status });
    return { success: true };
  });

export const updateUserRoleFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; role: string; currentUserEmail: string }) => data)
  .handler(async ({ data }) => {
    await connectDB();
    // In a real app we'd check session, but here we just check if passed email is admin@gmail.com
    if (data.currentUserEmail !== "admin@gmail.com") {
      throw new Error("Unauthorized: Only admin@gmail.com can update roles.");
    }
    await User.findByIdAndUpdate(data.id, { role: data.role });
    return { success: true };
  });

export const deleteUserFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; currentUserEmail: string }) => data)
  .handler(async ({ data }) => {
    await connectDB();
    if (data.currentUserEmail !== "admin@gmail.com") {
      throw new Error("Unauthorized: Only admin@gmail.com can delete users.");
    }
    await User.findByIdAndDelete(data.id);
    await Task.deleteMany({ userId: data.id }); // Clean up tasks
    return { success: true };
  });

export const getInternProgressFn = createServerFn({ method: "GET" })
  .handler(async () => {
    await connectDB();
    const interns = await User.find({ role: "intern" });
    const internIds = interns.map(i => i._id);
    const tasks = await Task.find({ userId: { $in: internIds } });

    return interns.map(intern => {
      const internTasks = tasks.filter(t => t.userId.toString() === intern._id.toString());
      return {
        id: intern._id.toString(),
        name: intern.name,
        email: intern.email,
        status: intern.status,
        tasks: internTasks.map(t => ({
          id: t._id.toString(),
          title: t.title,
          status: t.status,
          deadline: t.deadline.toISOString(),
        })),
      };
    });
  });
