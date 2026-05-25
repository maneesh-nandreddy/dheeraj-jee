import { Question, UserResponse, TestAnalytics, ChapterMetric, DifficultyMetric } from "./shared-types";

/**
 * Checks if a response matches the correct answer, with tolerance for numerical values
 */
export function isAnswerCorrect(question: Question, answer: string | number | undefined): boolean {
  if (answer === undefined || answer === "") return false;

  if (question.type === "MCQ") {
    const cleanAnswer = String(answer).trim().toUpperCase();
    const cleanCorrect = String(question.correctAnswer).trim().toUpperCase();

    // 1. Direct string match
    if (cleanAnswer === cleanCorrect) return true;

    // 2. Map standard A/B/C/D indices to option array elements
    const optionLetters = ["A", "B", "C", "D"];
    
    // Case 2a: Student submitted option letter (e.g. "B") but DB stores raw text (e.g. "{3,4}")
    const userIndex = optionLetters.indexOf(cleanAnswer);
    if (userIndex !== -1 && question.options && question.options[userIndex]) {
      const optionContent = String(question.options[userIndex]).trim().toUpperCase();
      if (optionContent === cleanCorrect) return true;
    }

    // Case 2b: DB stores option letter (e.g. "B") but student response is raw option text
    const correctIndex = optionLetters.indexOf(cleanCorrect);
    if (correctIndex !== -1 && question.options && question.options[correctIndex]) {
      const correctContent = String(question.options[correctIndex]).trim().toUpperCase();
      if (correctContent === cleanAnswer) return true;
    }

    return false;
  } else {
    // Numerical answer check with a small epsilon tolerance
    const userVal = Number(answer);
    const correctVal = Number(question.correctAnswer);
    if (isNaN(userVal) || isNaN(correctVal)) return false;
    return Math.abs(userVal - correctVal) < 0.01;
  }
}

/**
 * Generates simulated percentile based on the student's score in a Math paper (out of 100 max)
 */
export function estimatePercentile(score: number, totalMarks: number): number {
  const percentage = (score / totalMarks) * 100;
  
  if (percentage >= 90) return 99.9;
  if (percentage >= 80) return 99.5 + (percentage - 80) * 0.04;
  if (percentage >= 70) return 99.0 + (percentage - 70) * 0.05;
  if (percentage >= 50) return 95.0 + (percentage - 50) * 0.2;
  if (percentage >= 30) return 80.0 + (percentage - 30) * 0.75;
  if (percentage >= 15) return 50.0 + (percentage - 15) * 2.0;
  return Math.max(5.0, percentage * 3.3);
}

/**
 * Analyzes the complete test submission and returns visual metrics
 */
export function calculateTestAnalytics(
  questions: Question[],
  responses: Record<string, UserResponse>,
  totalTimeSpent: number
): TestAnalytics {
  let score = 0;
  let correct = 0;
  let incorrect = 0;
  let attempted = 0;
  const totalQuestions = questions.length;
  const totalMarks = totalQuestions * 4;

  // Chapter mapping: Chapter Name -> Questions & Responses
  const chapterMap: Record<string, { questions: Question[]; attempted: number; correct: number; score: number; timeSpent: number }> = {};
  
  // Difficulty mapping: Difficulty Name -> Questions & Responses
  const difficultyMap: Record<string, { total: number; attempted: number; correct: number }> = {
    Easy: { total: 0, attempted: 0, correct: 0 },
    Medium: { total: 0, attempted: 0, correct: 0 },
    Hard: { total: 0, attempted: 0, correct: 0 },
  };

  questions.forEach((q) => {
    const response = responses[q.id];
    const isAttempted = response && response.answer !== undefined && response.answer !== "";
    const isCorrect = isAttempted && isAnswerCorrect(q, response.answer);
    const timeSpent = response?.timeSpent ?? 0;

    // 1. Scoring
    let questionScore = 0;
    if (isAttempted) {
      attempted++;
      if (isCorrect) {
        correct++;
        questionScore = q.marks;
        score += q.marks;
      } else {
        incorrect++;
        questionScore = -q.negativeMarks;
        score -= q.negativeMarks;
      }
    }

    // 2. Chapter processing
    if (!chapterMap[q.chapter]) {
      chapterMap[q.chapter] = { questions: [], attempted: 0, correct: 0, score: 0, timeSpent: 0 };
    }
    chapterMap[q.chapter].questions.push(q);
    if (isAttempted) {
      chapterMap[q.chapter].attempted++;
      if (isCorrect) chapterMap[q.chapter].correct++;
      chapterMap[q.chapter].score += questionScore;
    }
    chapterMap[q.chapter].timeSpent += timeSpent;

    // 3. Difficulty processing
    difficultyMap[q.difficulty].total++;
    if (isAttempted) {
      difficultyMap[q.difficulty].attempted++;
      if (isCorrect) difficultyMap[q.difficulty].correct++;
    }
  });

  const unattempted = totalQuestions - attempted;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  const avgTimePerQuestion = totalQuestions > 0 ? Math.round(totalTimeSpent / totalQuestions) : 0;

  // Compile Chapter Metrics
  const chapterBreakdown: ChapterMetric[] = Object.entries(chapterMap).map(([chapter, data]) => {
    const totalQ = data.questions.length;
    const accuracyPct = data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0;
    const avgTime = totalQ > 0 ? Math.round(data.timeSpent / totalQ) : 0;
    
    let status: "Strong" | "Moderate" | "Weak" = "Moderate";
    if (data.attempted === 0) {
      status = "Moderate"; // No data
    } else if (accuracyPct >= 80) {
      status = "Strong";
    } else if (accuracyPct < 50) {
      status = "Weak";
    }

    return {
      chapter,
      total: totalQ,
      attempted: data.attempted,
      correct: data.correct,
      incorrect: data.attempted - data.correct,
      score: data.score,
      accuracy: accuracyPct,
      avgTimeSpent: avgTime,
      status,
    };
  });

  // Compile Difficulty Metrics
  const difficultyBreakdown: DifficultyMetric[] = Object.entries(difficultyMap).map(([diff, data]) => {
    const accuracyPct = data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0;
    return {
      difficulty: diff as "Easy" | "Medium" | "Hard",
      total: data.total,
      attempted: data.attempted,
      correct: data.correct,
      accuracy: accuracyPct,
    };
  });

  const rankEstimate = estimatePercentile(score, totalMarks);

  return {
    score,
    totalMarks,
    accuracy,
    totalQuestions,
    attempted,
    correct,
    incorrect,
    unattempted,
    totalTimeSpent,
    avgTimePerQuestion,
    chapterBreakdown,
    difficultyBreakdown,
    rankEstimate,
  };
}
