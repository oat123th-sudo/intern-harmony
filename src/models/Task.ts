import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
  title: string;
  detail?: string;
  deadline: Date;
  timeOfDay: "เช้า" | "บ่าย" | "เย็น";
  status: "todo" | "doing" | "done";
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    detail: { type: String },
    deadline: { type: Date, required: true },
    timeOfDay: { type: String, enum: ["เช้า", "บ่าย", "เย็น"], required: true },
    status: { 
      type: String, 
      enum: ["todo", "doing", "done"], 
      required: true,
      default: "todo"
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
