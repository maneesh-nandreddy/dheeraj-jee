import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import Question from "../../../../lib/models/Question";
import { isAnswerCorrect } from "../../../../lib/analytics-engine";

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { 
      paperId, 
      title, 
      subject, 
      questions: paperQuestionsBrief, // Array of brief question structures without answers
      responses, // Map of questionId -> UserResponse (answer, status, timeSpent)
      totalTimeSpent,
      tabSwitchCount
    } = body;

    if (!paperQuestionsBrief || !responses) {
      return NextResponse.json(
        { success: false, error: "Invalid payload. Missing questions or responses." },
        { status: 400 }
      );
    }

    // Retrieve full questions from database including their answers and solutions!
    const questionIds = paperQuestionsBrief.map((q: any) => q.id);
    const dbQuestions = await Question.find({ id: { $in: questionIds } }).lean();

    // Map questions in order of the original paperQuestionsBrief to preserve test arrangement
    const paperQuestionsFull = paperQuestionsBrief.map((briefQ: any) => {
      const dbQ = dbQuestions.find((q) => q.id === briefQ.id);
      if (!dbQ) {
        // Fallback in case a question wasn't found in DB (should not happen in normal flows)
        return {
          ...briefQ,
          correctAnswer: "",
          solution: "Explanation not available.",
        };
      }
      return {
        ...briefQ,
        ...dbQ, // Copy all database properties (options, type, subject, difficulty, etc.)
        correctAnswer: dbQ.correctAnswer,
        solution: dbQ.solution,
      };
    });

    // Score evaluation
    let score = 0;
    let correct = 0;
    let incorrect = 0;
    let attempted = 0;
    let unattempted = 0;

    paperQuestionsFull.forEach((q: any) => {
      const resp = responses[q.id];
      const isAtt = resp && resp.answer !== undefined && resp.answer !== "";

      if (isAtt) {
        attempted++;
        const isCorr = isAnswerCorrect(q, resp.answer);
        if (isCorr) {
          correct++;
          score += 4;
        } else {
          incorrect++;
          score -= 1; // Negative marking
        }
      } else {
        unattempted++;
      }
    });

    const totalQuestions = paperQuestionsFull.length;
    const totalMarks = totalQuestions * 4;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const avgTimePerQuestion = totalQuestions > 0 ? Math.round(totalTimeSpent / totalQuestions) : 0;

    // Estimate Percentile: Custom JEE Main simulation formula
    // Standard Math percentile mapping (score vs percentile curve):
    // 80+ marks is ~99.5%ile, 50+ is ~98%ile, 30+ is ~95%ile, etc.
    let rankEstimate = 50.0; // Default baseline
    if (score >= totalMarks * 0.8) {
      rankEstimate = 99.5 + ((score - totalMarks * 0.8) / (totalMarks * 0.2)) * 0.49;
    } else if (score >= totalMarks * 0.5) {
      rankEstimate = 98.0 + ((score - totalMarks * 0.5) / (totalMarks * 0.3)) * 1.5;
    } else if (score >= totalMarks * 0.3) {
      rankEstimate = 92.0 + ((score - totalMarks * 0.3) / (totalMarks * 0.2)) * 6.0;
    } else if (score >= 0) {
      rankEstimate = 50.0 + (score / (totalMarks * 0.3)) * 42.0;
    } else {
      rankEstimate = Math.max(1.0, 50.0 + (score / totalQuestions) * 15.0);
    }

    // Attempt identifier
    const attemptId = `attempt-${subject.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

    // Compile evaluated attempt document
    const attemptData = {
      id: attemptId,
      paperId,
      title,
      subject,
      score,
      totalMarks,
      accuracy,
      rankEstimate: parseFloat(rankEstimate.toFixed(2)),
      totalQuestions,
      attempted,
      correct,
      incorrect,
      unattempted,
      totalTimeSpent,
      avgTimePerQuestion,
      responses,
      paperQuestions: paperQuestionsFull, // Returning FULL details (questions + correct answers + solution explanations)
      completedAt: new Date().toISOString(),
      tabSwitchCount: tabSwitchCount || 0
    };

    return NextResponse.json({
      success: true,
      attemptData
    });
  } catch (error: any) {
    console.error("Evaluation endpoint error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
