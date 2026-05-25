import { Question, TestPaper } from "./shared-types";
import { getQuestionsBySubject } from "./question-engine";

interface GeneratorOptions {
  subject: "Physics" | "Chemistry" | "Mathematics" | "Full Syllabus";
  totalQuestions?: number;
  pattern?: {
    mcq: number;
    numerical: number;
  };
  difficulty?: {
    easy: number;
    medium: number;
    hard: number;
  };
  candidates?: Question[]; // Optional list of live candidate questions from MongoDB
}

/**
 * Shuffles an array in place using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates a mock paper based on NTA guidelines and current question bank
 */
export function generatePaper(options: GeneratorOptions): TestPaper {
  const subject = options.subject;

  if (subject === "Full Syllabus") {
    // Generate Mathematics portion (25 Qs)
    const mathPaper = generatePaper({
      ...options,
      subject: "Mathematics",
      totalQuestions: 25,
      pattern: { mcq: 20, numerical: 5 },
      difficulty: { easy: 7, medium: 12, hard: 6 }
    });

    // Generate Physics portion (25 Qs)
    const physicsPaper = generatePaper({
      ...options,
      subject: "Physics",
      totalQuestions: 25,
      pattern: { mcq: 20, numerical: 5 },
      difficulty: { easy: 7, medium: 12, hard: 6 }
    });

    // Generate Chemistry portion (25 Qs)
    const chemistryPaper = generatePaper({
      ...options,
      subject: "Chemistry",
      totalQuestions: 25,
      pattern: { mcq: 20, numerical: 5 },
      difficulty: { easy: 7, medium: 12, hard: 6 }
    });

    const combinedQuestions = [
      ...mathPaper.questions,
      ...physicsPaper.questions,
      ...chemistryPaper.questions
    ];

    return {
      id: `paper-full-${Date.now()}`,
      title: "JEE Main 3-Subject Full Mock Test",
      subject: "Full Syllabus",
      questions: combinedQuestions,
      totalQuestions: combinedQuestions.length,
      durationMinutes: 180, // 3 hours exactly!
      totalMarks: combinedQuestions.length * 4,
      createdAt: new Date().toISOString()
    };
  }

  const totalQuestions = options.totalQuestions ?? 25;
  const pattern = options.pattern ?? { mcq: 20, numerical: 5 };
  const targetDifficulty = options.difficulty ?? { easy: 7, medium: 12, hard: 6 };

  // Fetch candidate questions for the subject from options or fall back to static
  let candidates = options.candidates && options.candidates.length > 0
    ? options.candidates.filter((q) => q.subject === subject)
    : [];

  if (candidates.length === 0) {
    candidates = getQuestionsBySubject(subject as any);
  }

  // If we have fewer total questions than requested, return all of them shuffled
  if (candidates.length <= totalQuestions) {
    const shuffled = shuffleArray(candidates);
    return {
      id: `paper-${subject.toLowerCase()}-${Date.now()}`,
      title: `${subject} Practice Test`,
      subject,
      questions: shuffled,
      totalQuestions: shuffled.length,
      durationMinutes: shuffled.length * 3.6, // 3.6 mins per question (Standard JEE: 3 hours for 75 questions = 2.4 mins/q. But standard practice is 90 mins for 25 questions = 3.6 min/q)
      totalMarks: shuffled.length * 4,
      createdAt: new Date().toISOString(),
    };
  }

  // Group candidates by Type
  const mcqPool = candidates.filter((q) => q.type === "MCQ");
  const numericalPool = candidates.filter((q) => q.type === "NUMERICAL");

  // Helper to select from a specific pool with difficulty ratio
  const selectFromPool = (
    pool: Question[],
    targetCount: number,
    easyCount: number,
    mediumCount: number,
    hardCount: number
  ): Question[] => {
    const easyCandidates = shuffleArray(pool.filter((q) => q.difficulty === "Easy"));
    const mediumCandidates = shuffleArray(pool.filter((q) => q.difficulty === "Medium"));
    const hardCandidates = shuffleArray(pool.filter((q) => q.difficulty === "Hard"));

    const selected: Question[] = [];
    const counts = { Easy: easyCount, Medium: mediumCount, Hard: hardCount };

    // 1st Pass: Fill exactly what we can from each difficulty
    const fill = (diff: "Easy" | "Medium" | "Hard", source: Question[]) => {
      const needed = counts[diff];
      const items = source.splice(0, Math.min(needed, source.length));
      selected.push(...items);
      counts[diff] -= items.length;
    };

    fill("Easy", easyCandidates);
    fill("Medium", mediumCandidates);
    fill("Hard", hardCandidates);

    // 2nd Pass: If we still need more questions, drain remaining candidates in order of difficulty
    const remaining = [...easyCandidates, ...mediumCandidates, ...hardCandidates];
    const shufRemaining = shuffleArray(remaining);
    
    const remainingNeeded = targetCount - selected.length;
    if (remainingNeeded > 0) {
      selected.push(...shufRemaining.slice(0, remainingNeeded));
    }

    return selected;
  };

  // Divide the difficulty target proportionally:
  // MCQs represent 80% (20/25), Numericals represent 20% (5/25)
  const mcqEasy = Math.round(targetDifficulty.easy * 0.8);
  const mcqMedium = Math.round(targetDifficulty.medium * 0.8);
  const mcqHard = Math.round(targetDifficulty.hard * 0.8);

  const numEasy = Math.max(0, targetDifficulty.easy - mcqEasy);
  const numMedium = Math.max(0, targetDifficulty.medium - mcqMedium);
  const numHard = Math.max(0, targetDifficulty.hard - mcqHard);

  const selectedMCQs = selectFromPool(mcqPool, pattern.mcq, mcqEasy, mcqMedium, mcqHard);
  const selectedNumericals = selectFromPool(
    numericalPool,
    pattern.numerical,
    numEasy,
    numMedium,
    numHard
  );

  // Combine and shuffle to make the test feel organic, or order them MCQ first then Numerical (Real JEE CBT has MCQ 1-20, then Numerical 21-25)
  // Let's sort: MCQ first, then Numerical to mimic the real CBT!
  const finalQuestions = [...selectedMCQs, ...selectedNumericals];

  return {
    id: `paper-${subject.toLowerCase()}-${Date.now()}`,
    title: `${subject} CBT Mock Test`,
    subject,
    questions: finalQuestions,
    totalQuestions: finalQuestions.length,
    durationMinutes: finalQuestions.length === 25 ? 180 : finalQuestions.length * 3.6, // 180 mins for full paper, or proportional
    totalMarks: finalQuestions.length * 4,
    createdAt: new Date().toISOString(),
  };
}
