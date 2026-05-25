import mongoose, { Schema, Document } from "mongoose";
import { Question as IQuestion } from "../shared-types";

export interface QuestionDocument extends Omit<IQuestion, "_id">, Document {}

const QuestionSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    subject: { 
      type: String, 
      required: true, 
      enum: ["Physics", "Chemistry", "Mathematics"] 
    },
    chapter: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    difficulty: { 
      type: String, 
      required: true, 
      enum: ["Easy", "Medium", "Hard"] 
    },
    type: { 
      type: String, 
      required: true, 
      enum: ["MCQ", "NUMERICAL"] 
    },
    examType: { 
      type: String, 
      required: true, 
      enum: ["JEE_MAIN", "JEE_ADVANCED"],
      default: "JEE_MAIN"
    },
    question: { type: String, required: true },
    options: { type: [String], required: false },
    correctAnswer: { type: Schema.Types.Mixed, required: true },
    solution: { type: String, required: true },
    marks: { type: Number, required: true, default: 4 },
    negativeMarks: { type: Number, required: true, default: 1 },
    estimatedTime: { type: Number, required: true, default: 120 },
    concepts: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    pyq: { type: Boolean, default: false },
    year: { type: Number, required: false },
    diagram: { type: String, required: false },
    latex: { type: Boolean, required: false },
    equation: { type: String, required: false },
    moleculeType: { type: String, required: false }
  },
  {
    timestamps: true,
  }
);

// Prevent mongoose from compiling model again upon fast-refresh in dev server
const Question = mongoose.models.Question || mongoose.model<QuestionDocument>("Question", QuestionSchema);

export default Question;
