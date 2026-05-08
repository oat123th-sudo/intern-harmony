import { createServerFn } from "@tanstack/react-start";
import connectDB from "@/lib/db";
import Task from "@/models/Task";

export const getTasksFn = createServerFn({ method: "GET" })
  .inputValidator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    await connectDB();
    const tasks = await Task.find({ userId }).sort({ createdAt: -1 });
    return tasks.map((t: any) => ({
      id: t._id.toString(),
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
    await connectDB();
    
    const hour = new Date().getHours();
    let timeOfDay = "เช้า";
    if (hour >= 12 && hour < 17) timeOfDay = "บ่าย";
    else if (hour >= 17) timeOfDay = "เย็น";

    const task = new Task({
      title: data.title,
      detail: data.detail,
      deadline: new Date(data.deadline),
      timeOfDay,
      userId: data.userId,
      status: "todo",
    });

    await task.save();
    return {
      id: task._id.toString(),
      title: task.title,
      detail: task.detail,
      deadline: task.deadline.toISOString(),
      timeOfDay: task.timeOfDay,
      createdAt: task.createdAt.toISOString(),
      status: task.status,
    };
  });

export const updateTaskStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: "todo" | "doing" | "done" }) => data)
  .handler(async ({ data }) => {
    await connectDB();
    await Task.findByIdAndUpdate(data.id, { status: data.status });
    return { success: true };
  });
