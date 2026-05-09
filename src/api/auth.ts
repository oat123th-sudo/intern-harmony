import { createServerFn } from "@tanstack/react-start";
import connectDB from "@/lib/db";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { z } from "zod";

// ─── Schemas & Types ──────────────────────────────────────────────────────────
export const UserRoleSchema = z.enum(["admin", "mentor", "intern", "alumni"]);
export const UserStatusSchema = z.enum(["Pending", "Accepted", "Rejected", "Active"]);

const UserDocSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: UserRoleSchema,
  status: UserStatusSchema,
  phoneNumber: z.string().optional(),
  lineId: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  resumeUrl: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type UserDoc = z.infer<typeof UserDocSchema>;

async function users() {
  const db = await connectDB();
  return db.collection<UserDoc>("users");
}

// ─── Signup ───────────────────────────────────────────────────────────────────
const SignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SignupSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const col = await users();
      
      // Check if user exists (already indexed for performance)
      const existing = await col.findOne({ email: data.email }, { projection: { _id: 1 } });
      if (existing) throw new Error("Email is already in use");

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const now = new Date();
      
      const doc: UserDoc = {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        role: data.email.toLowerCase() === "admin@gmail.com" ? "admin" : "intern",
        status: data.email.toLowerCase() === "admin@gmail.com" ? "Active" : "Pending",
        createdAt: now,
        updatedAt: now,
      };

      const result = await col.insertOne(doc);
      return {
        id: result.insertedId.toString(),
        name: doc.name,
        email: doc.email,
        role: doc.role,
        status: doc.status,
      };
    } catch (error: any) {
      console.error("Signup error:", error);
      throw new Error(error.message || "Failed to create account. Please try again.");
    }
  });

// ─── Login ────────────────────────────────────────────────────────────────────
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => LoginSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const col = await users();
      const user = await col.findOne({ email: data.email.toLowerCase() });
      if (!user) throw new Error("Invalid email or password");

      const isMatch = await bcrypt.compare(data.password, user.password);
      if (!isMatch) throw new Error("Invalid email or password");

      // Auto-promote admin email if needed
      if (user.email === "admin@gmail.com" && user.role !== "admin") {
        await col.updateOne(
          { _id: user._id },
          { $set: { role: "admin", status: "Active", updatedAt: new Date() } }
        );
        user.role = "admin";
        user.status = "Active";
      }

      return {
        id: user._id!.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      };
    } catch (error: any) {
      console.error("Login error:", error);
      throw new Error(error.message || "Login failed. Check your credentials.");
    }
  });

// ─── Get Current User ─────────────────────────────────────────────────────────
export const getCurrentUserFn = createServerFn({ method: "GET" })
  .inputValidator((userId: unknown) => z.string().parse(userId))
  .handler(async ({ data: userId }) => {
    try {
      if (!userId) return null;
      const col = await users();
      let oid: ObjectId;
      try { oid = new ObjectId(userId); } catch { return null; }
      
      const user = await col.findOne(
        { _id: oid },
        { projection: { password: 0 } } // NEVER return password
      );
      
      if (!user) return null;
      return {
        id: user._id!.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        phoneNumber: user.phoneNumber,
        lineId: user.lineId,
        facebook: user.facebook,
        instagram: user.instagram,
        resumeUrl: user.resumeUrl,
      };
    } catch (error) {
      console.error("GetCurrentUser error:", error);
      return null;
    }
  });

// ─── Update Profile ───────────────────────────────────────────────────────────
const UpdateProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  phoneNumber: z.string().optional(),
  lineId: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  resumeUrl: z.string().optional(),
});

export const updateProfileFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => UpdateProfileSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const col = await users();
      let oid: ObjectId;
      try { oid = new ObjectId(data.id); } catch { throw new Error("Invalid user ID"); }

      const updateData: Partial<UserDoc> = {
        name: data.name,
        phoneNumber: data.phoneNumber,
        lineId: data.lineId,
        facebook: data.facebook,
        instagram: data.instagram,
        resumeUrl: data.resumeUrl,
        updatedAt: new Date(),
      };

      const result = await col.findOneAndUpdate(
        { _id: oid },
        { $set: updateData },
        { returnDocument: "after", projection: { password: 0 } }
      );

      if (!result) throw new Error("User not found");
      
      return {
        id: result._id!.toString(),
        name: result.name,
        email: result.email,
        role: result.role,
        status: result.status,
        phoneNumber: result.phoneNumber,
        lineId: result.lineId,
        facebook: result.facebook,
        instagram: result.instagram,
        resumeUrl: result.resumeUrl,
      };
    } catch (error: any) {
      console.error("UpdateProfile error:", error);
      throw new Error(error.message || "Failed to update profile.");
    }
  });
