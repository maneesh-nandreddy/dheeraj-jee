import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Question, UserResponse, TestPaper } from "../lib/shared-types";

interface ExamState {
  // Test details
  activePaper: TestPaper | null;
  currentQuestionIndex: number;
  responses: Record<string, UserResponse>;
  timeRemaining: number; // in seconds
  isExamStarted: boolean;
  isExamSubmitted: boolean;
  totalTimeSpent: number; // in seconds
  lastCompletedTestId: string | null;
  tabSwitchCount: number;

  // Actions
  startExam: (paper: TestPaper) => void;
  selectQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  saveResponse: (questionId: string, answer: string | number) => void;
  markForReview: (questionId: string, answer?: string | number) => void;
  clearResponse: (questionId: string) => void;
  tickTimer: () => void;
  submitExam: () => void;
  resetExam: () => void;
  incrementTabSwitchCount: () => void;
}

export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      activePaper: null,
      currentQuestionIndex: 0,
      responses: {},
      timeRemaining: 0,
      isExamStarted: false,
      isExamSubmitted: false,
      totalTimeSpent: 0,
      lastCompletedTestId: null,
      tabSwitchCount: 0,

      startExam: (paper) => {
        // Initialize standard response sheet for all questions in the paper
        const initialResponses: Record<string, UserResponse> = {};
        paper.questions.forEach((q, idx) => {
          initialResponses[q.id] = {
            questionId: q.id,
            status: idx === 0 ? "NOT_ANSWERED" : "NOT_VISITED", // First question is marked as active and not answered yet
            timeSpent: 0,
          };
        });

        set({
          activePaper: paper,
          currentQuestionIndex: 0,
          responses: initialResponses,
          timeRemaining: paper.durationMinutes * 60,
          isExamStarted: true,
          isExamSubmitted: false,
          totalTimeSpent: 0,
          tabSwitchCount: 0,
        });
      },

      selectQuestion: (index) => {
        const { activePaper, responses, currentQuestionIndex } = get();
        if (!activePaper) return;
        
        const updatedResponses = { ...responses };
        const currentQId = activePaper.questions[currentQuestionIndex].id;
        const targetQId = activePaper.questions[index].id;

        // If we left the current question and it was "NOT_VISITED", mark as "NOT_ANSWERED"
        if (updatedResponses[currentQId].status === "NOT_VISITED") {
          updatedResponses[currentQId].status = "NOT_ANSWERED";
        }

        // Mark the target question as visited / "NOT_ANSWERED" if it was "NOT_VISITED"
        if (updatedResponses[targetQId].status === "NOT_VISITED") {
          updatedResponses[targetQId].status = "NOT_ANSWERED";
        }

        set({
          currentQuestionIndex: index,
          responses: updatedResponses,
        });
      },

      nextQuestion: () => {
        const { currentQuestionIndex, activePaper, selectQuestion } = get();
        if (!activePaper) return;
        if (currentQuestionIndex < activePaper.questions.length - 1) {
          selectQuestion(currentQuestionIndex + 1);
        }
      },

      prevQuestion: () => {
        const { currentQuestionIndex, selectQuestion } = get();
        if (currentQuestionIndex > 0) {
          selectQuestion(currentQuestionIndex - 1);
        }
      },

      saveResponse: (questionId, answer) => {
        const { responses } = get();
        const updatedResponses = { ...responses };

        updatedResponses[questionId] = {
          ...updatedResponses[questionId],
          answer,
          status: "ANSWERED",
        };

        set({ responses: updatedResponses });
      },

      markForReview: (questionId, answer) => {
        const { responses } = get();
        const updatedResponses = { ...responses };
        const hasAnswer = answer !== undefined && answer !== "";

        updatedResponses[questionId] = {
          ...updatedResponses[questionId],
          answer: hasAnswer ? answer : undefined,
          status: hasAnswer ? "MARKED_ANSWERED" : "MARKED",
        };

        set({ responses: updatedResponses });
      },

      clearResponse: (questionId) => {
        const { responses } = get();
        const updatedResponses = { ...responses };

        updatedResponses[questionId] = {
          ...updatedResponses[questionId],
          answer: undefined,
          status: "NOT_ANSWERED",
        };

        set({ responses: updatedResponses });
      },

      tickTimer: () => {
        const { timeRemaining, isExamStarted, isExamSubmitted, activePaper, responses, currentQuestionIndex } = get();
        if (!isExamStarted || isExamSubmitted) return;

        if (timeRemaining <= 1) {
          // Time is up! Auto submit
          get().submitExam();
          return;
        }

        // Accumulate time spent for the currently active question
        const updatedResponses = { ...responses };
        if (activePaper && activePaper.questions[currentQuestionIndex]) {
          const activeQId = activePaper.questions[currentQuestionIndex].id;
          if (updatedResponses[activeQId]) {
            updatedResponses[activeQId].timeSpent += 1;
          }
        }

        set((state) => ({
          timeRemaining: state.timeRemaining - 1,
          totalTimeSpent: state.totalTimeSpent + 1,
          responses: updatedResponses,
        }));
      },

      submitExam: () => {
        const { activePaper } = get();
        if (!activePaper) return;

        set({
          isExamSubmitted: true,
          isExamStarted: false,
          lastCompletedTestId: activePaper.id,
        });
      },

      resetExam: () => {
        set({
          activePaper: null,
          currentQuestionIndex: 0,
          responses: {},
          timeRemaining: 0,
          isExamStarted: false,
          isExamSubmitted: false,
          totalTimeSpent: 0,
          tabSwitchCount: 0,
        });
      },

      incrementTabSwitchCount: () => {
        const { isExamStarted, isExamSubmitted } = get();
        if (!isExamStarted || isExamSubmitted) return;
        set((state) => ({ tabSwitchCount: state.tabSwitchCount + 1 }));
      },
    }),
    {
      name: "dheerajee-exam-session",
    }
  )
);
