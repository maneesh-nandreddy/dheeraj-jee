import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";
import Question from "../../../lib/models/Question";

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const includeAnswers = searchParams.get("includeAnswers") === "true";

    // Build DB query
    const query: any = {};
    if (subject) {
      // Normalize subject parameter (e.g., Mathematics, Physics)
      query.subject = subject;
    }

    // Retrieve questions from MongoDB
    const questions = await Question.find(query).lean();

    // Map questions to hide correct answers and solutions by default to prevent network inspections!
    const sanitizedQuestions = questions.map((q: any) => {
      // Convert MongoDB object to standard structure
      const formatted: any = {
        id: q.id,
        subject: q.subject,
        chapter: q.chapter,
        topic: q.topic,
        difficulty: q.difficulty,
        type: q.type,
        examType: q.examType || "JEE_MAIN",
        question: q.question,
        options: q.options,
        marks: q.marks || 4,
        negativeMarks: q.negativeMarks || 1,
        estimatedTime: q.estimatedTime || 120,
        concepts: q.concepts || [],
        tags: q.tags || [],
        pyq: q.pyq || false,
        year: q.year
      };

      // Only include answers and explanations if explicitly requested with verification
      if (includeAnswers) {
        formatted.correctAnswer = q.correctAnswer;
        formatted.solution = q.solution;
      }

      return formatted;
    });

    return NextResponse.json({
      success: true,
      count: sanitizedQuestions.length,
      questions: sanitizedQuestions
    });
  } catch (error: any) {
    console.error("Failed to retrieve questions from database:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
