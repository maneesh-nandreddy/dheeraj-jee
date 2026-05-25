export interface Question {
  id: string;
  subject: "Physics" | "Chemistry" | "Mathematics";
  chapter: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  type: "MCQ" | "NUMERICAL";
  examType: "JEE_MAIN" | "JEE_ADVANCED";
  question: string;
  options?: string[];
  correctAnswer: string | number;
  solution: string;
  marks: number;
  negativeMarks: number;
  estimatedTime: number;
  concepts: string[];
  tags: string[];
  pyq: boolean;
  year?: number;
  diagram?: string;
  latex?: boolean;
  equation?: string;
  moleculeType?: string;
  createdAt: string;
}

export interface UserResponse {
  questionId: string;
  answer?: string | number; // Chosen option "A", "B", "C", "D" or numerical value
  status: "ANSWERED" | "MARKED" | "MARKED_ANSWERED" | "NOT_ANSWERED" | "NOT_VISITED";
  timeSpent: number; // in seconds
}

export interface TestPaper {
  id: string;
  title: string;
  subject: "Physics" | "Chemistry" | "Mathematics" | "Syllabus" | "Full Syllabus";
  questions: Question[];
  totalQuestions: number;
  durationMinutes: number;
  totalMarks: number;
  createdAt: string;
}

export interface TestSubmission {
  testId: string;
  responses: Record<string, UserResponse>; // questionId -> response
  timeRemaining: number; // in seconds
  completedAt: string;
}

export interface ChapterMetric {
  chapter: string;
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  score: number;
  accuracy: number; // percentage
  avgTimeSpent: number; // seconds
  status: "Strong" | "Moderate" | "Weak";
}

export interface DifficultyMetric {
  difficulty: "Easy" | "Medium" | "Hard";
  total: number;
  attempted: number;
  correct: number;
  accuracy: number;
}

export interface TestAnalytics {
  score: number;
  totalMarks: number;
  accuracy: number; // percentage
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  totalTimeSpent: number; // seconds
  avgTimePerQuestion: number; // seconds
  chapterBreakdown: ChapterMetric[];
  difficultyBreakdown: DifficultyMetric[];
  rankEstimate: number; // simulated percentile or rank
}
