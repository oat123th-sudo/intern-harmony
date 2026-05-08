import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: "admin" | "mentor" | "intern";
  status?: "Pending" | "Accepted" | "Rejected" | "Active";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ["admin", "mentor", "intern"], 
      required: true,
      default: "intern"
    },
    status: { 
      type: String, 
      enum: ["Pending", "Accepted", "Rejected", "Active"],
      default: "Pending"
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
