import { createServerFn } from "@tanstack/react-start";
import connectDB from "@/lib/db";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

// ─── Types ────────────────────────────────────────────────────────────────────
type UserDoc = {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  role: "admin" | "mentor" | "intern" | "alumni";
  status: "Pending" | "Accepted" | "Rejected" | "Active";
  phoneNumber?: string;
  lineId?: string;
  facebook?: string;
  instagram?: string;
  resumeUrl?: string;
  createdAt: Date;
  updatedAt: Date;
};

async function users() {
  const db = await connectDB();
  return db.collection<UserDoc>("users");
}

// ─── Signup ───────────────────────────────────────────────────────────────────
export const signupFn = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const col = await users();
    const existing = await col.findOne({ email: data.email });
    if (existing) throw new Error("Email is already in use");

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const now = new Date();
    const doc: UserDoc = {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.email === "admin@gmail.com" ? "admin" : "intern",
      status: data.email === "admin@gmail.com" ? "Active" : "Pending",
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
  });

// ─── Login ────────────────────────────────────────────────────────────────────
export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const col = await users();
    const user = await col.findOne({ email: data.email });
    if (!user) throw new Error("Invalid email or password");

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) throw new Error("Invalid email or password");

    // Auto-promote admin email
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
  });

// ─── Get Current User ─────────────────────────────────────────────────────────
export const getCurrentUserFn = createServerFn({ method: "GET" })
  .inputValidator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    if (!userId) return null;
    const col = await users();
    let oid: ObjectId;
    try { oid = new ObjectId(userId); } catch { return null; }
    const user = await col.findOne({ _id: oid });
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
  });

// ─── Update Profile ───────────────────────────────────────────────────────────
export const updateProfileFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      name: string;
      phoneNumber?: string;
      lineId?: string;
      facebook?: string;
      instagram?: string;
      resumeUrl?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const col = await users();
    let oid: ObjectId;
    try { oid = new ObjectId(data.id); } catch { throw new Error("Invalid user ID"); }

    await col.updateOne(
      { _id: oid },
      {
        $set: {
          name: data.name,
          phoneNumber: data.phoneNumber,
          lineId: data.lineId,
          facebook: data.facebook,
          instagram: data.instagram,
          resumeUrl: data.resumeUrl,
          updatedAt: new Date(),
        },
      }
    );
    const updated = await col.findOne({ _id: oid });
    if (!updated) throw new Error("User not found");
    return {
      id: updated._id!.toString(),
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      phoneNumber: updated.phoneNumber,
      lineId: updated.lineId,
      facebook: updated.facebook,
      instagram: updated.instagram,
      resumeUrl: updated.resumeUrl,
    };
  });
