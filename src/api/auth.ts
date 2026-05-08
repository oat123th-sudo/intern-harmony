import { createServerFn } from "@tanstack/react-start";
import connectDB from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export const signupFn = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; email: string; password: string }) => data)
  .handler(async ({ data }) => {
    await connectDB();
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new Error("Email is already in use");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = new User({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.email === "admin@gmail.com" ? "admin" : "intern",
      status: data.email === "admin@gmail.com" ? "Active" : "Pending",
    });

    await user.save();
    
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  });

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    await connectDB();
    const user = await User.findOne({ email: data.email });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      throw new Error("Invalid email or password");
    }

    // Auto-promote if it's the admin email but role is wrong
    if (user.email === "admin@gmail.com" && user.role !== "admin") {
      user.role = "admin";
      user.status = "Active";
      await user.save();
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  });
