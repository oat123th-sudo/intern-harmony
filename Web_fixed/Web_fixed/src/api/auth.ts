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

// ─── Hardcoded admin email (single source of truth) ──────────────────────────
const ADMIN_EMAIL = "admin@gmail.com";

async function users() {
  const db = await connectDB();
  return db.collection<UserDoc>("users");
}

// ─── Signup ───────────────────────────────────────────────────────────────────
const SignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(254),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128),
});

export const signupFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SignupSchema.parse(data))
  .handler(async ({ data }) => {
    const col = await users();
    const normEmail = data.email.toLowerCase().trim();

    // Check duplicate (unique index also guards this, but gives a cleaner message)
    const existing = await col.findOne(
      { email: normEmail },
      { projection: { _id: 1 } }
    );
    if (existing) throw new Error("Email is already in use");

    const hashedPassword = await bcrypt.hash(data.password, 12); // 12 rounds
    const now = new Date();
    const isAdmin = normEmail === ADMIN_EMAIL;

    const doc: UserDoc = {
      name: data.name.trim(),
      email: normEmail,
      password: hashedPassword,
      role: isAdmin ? "admin" : "intern",
      status: isAdmin ? "Active" : "Pending",
      createdAt: now,
      updatedAt: now,
    };

    try {
      const result = await col.insertOne(doc);
      return {
        id: result.insertedId.toString(),
        name: doc.name,
        email: doc.email,
        role: doc.role,
        status: doc.status,
      };
    } catch (err: any) {
      // MongoDB duplicate-key error code 11000
      if (err?.code === 11000) throw new Error("Email is already in use");
      console.error("Signup DB error:", err);
      throw new Error("Failed to create account. Please try again.");
    }
  });

// ─── Login ────────────────────────────────────────────────────────────────────
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => LoginSchema.parse(data))
  .handler(async ({ data }) => {
    const col = await users();
    const normEmail = data.email.toLowerCase().trim();
    const user = await col.findOne({ email: normEmail });

    // Use a constant-time comparison path to prevent timing attacks
    const placeholder = "$2a$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const isMatch = user
      ? await bcrypt.compare(data.password, user.password)
      : await bcrypt.compare(data.password, placeholder); // dummy compare

    if (!user || !isMatch) throw new Error("Invalid email or password");

    // Auto-promote admin email if role was somehow downgraded
    if (normEmail === ADMIN_EMAIL && user.role !== "admin") {
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
  .inputValidator((userId: unknown) => z.string().min(1).parse(userId))
  .handler(async ({ data: userId }) => {
    if (!ObjectId.isValid(userId)) return null;

    const col = await users();
    const oid = new ObjectId(userId);

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
  });

// ─── Update Profile ───────────────────────────────────────────────────────────
const UpdateProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phoneNumber: z.string().max(20).optional(),
  lineId: z.string().max(50).optional(),
  facebook: z.string().max(200).optional(),
  instagram: z.string().max(100).optional(),
  resumeUrl: z.string().url("Resume URL must be a valid URL").max(500).optional().or(z.literal("")),
});

export const updateProfileFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => UpdateProfileSchema.parse(data))
  .handler(async ({ data }) => {
    if (!ObjectId.isValid(data.id)) throw new Error("Invalid user ID");

    const col = await users();
    const oid = new ObjectId(data.id);

    // Strip empty strings → undefined so they're omitted from DB
    const updateData: Partial<UserDoc> = {
      name: data.name.trim(),
      phoneNumber: data.phoneNumber || undefined,
      lineId: data.lineId || undefined,
      facebook: data.facebook || undefined,
      instagram: data.instagram || undefined,
      resumeUrl: data.resumeUrl || undefined,
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
  });
