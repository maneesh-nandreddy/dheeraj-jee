import { Question } from "./shared-types";
import rawQuestions from "../data/questionBank.json";

// Explicitly type the loaded questions
const staticQuestionBank: Question[] = rawQuestions as Question[];

/**
 * Get all questions in the bank (static JSON + custom localStorage questions)
 */
export function getAllQuestions(): Question[] {
  let customQuestions: Question[] = [];
  
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("dheerajee_custom_questions");
      if (stored) {
        customQuestions = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to parse custom questions from localStorage", e);
    }
  }

  return [...staticQuestionBank, ...customQuestions];
}

/**
 * Get question by ID
 */
export function getQuestionById(id: string): Question | undefined {
  return getAllQuestions().find((q) => q.id === id);
}

/**
 * Get questions by subject
 */
export function getQuestionsBySubject(subject: "Physics" | "Chemistry" | "Mathematics"): Question[] {
  return getAllQuestions().filter((q) => q.subject === subject);
}

/**
 * Get all chapters for a subject
 */
export function getChapters(subject: "Physics" | "Chemistry" | "Mathematics"): string[] {
  const chapters = getAllQuestions()
    .filter((q) => q.subject === subject)
    .map((q) => q.chapter);
  return Array.from(new Set(chapters));
}

/**
 * Add a custom question persistently
 */
export function addCustomQuestion(q: Question): boolean {
  if (typeof window === "undefined") return false;
  
  try {
    const stored = localStorage.getItem("dheerajee_custom_questions");
    const list = stored ? JSON.parse(stored) : [];
    
    // Check if ID already exists
    if (getAllQuestions().some((item) => item.id === q.id)) {
      return false;
    }

    list.push(q);
    localStorage.setItem("dheerajee_custom_questions", JSON.stringify(list));
    return true;
  } catch (e) {
    console.error("Failed to write custom question", e);
    return false;
  }
}

/**
 * Delete a custom question persistently (returns false if question is static)
 */
export function deleteCustomQuestion(id: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const stored = localStorage.getItem("dheerajee_custom_questions");
    if (!stored) return false;

    const list: Question[] = JSON.parse(stored);
    const filtered = list.filter((q) => q.id !== id);

    if (list.length === filtered.length) {
      // Question wasn't custom or didn't exist
      return false;
    }

    localStorage.setItem("dheerajee_custom_questions", JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error("Failed to delete custom question", e);
    return false;
  }
}

/**
 * Validate a question schema
 */
export function validateQuestion(q: Partial<Question>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!q.id) errors.push("Question ID is required.");
  if (!q.subject) errors.push("Subject is required.");
  if (!q.chapter) errors.push("Chapter is required.");
  if (!q.topic) errors.push("Topic is required.");
  if (!q.difficulty) errors.push("Difficulty ('Easy' | 'Medium' | 'Hard') is required.");
  if (!q.type) errors.push("Type ('MCQ' | 'NUMERICAL') is required.");
  if (!q.question) errors.push("Question text is required.");

  if (q.type === "MCQ") {
    if (!q.options || q.options.length !== 4) {
      errors.push("MCQ must have exactly 4 options.");
    }
    if (typeof q.correctAnswer !== "string" || !["A", "B", "C", "D"].includes(q.correctAnswer)) {
      errors.push("MCQ correctAnswer must be A, B, C, or D.");
    }
  } else if (q.type === "NUMERICAL") {
    if (q.correctAnswer === undefined || isNaN(Number(q.correctAnswer))) {
      errors.push("Numerical question must have a valid numeric correctAnswer.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
