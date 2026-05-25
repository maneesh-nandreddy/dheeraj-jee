"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Tv, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  User, 
  CheckCircle,
  Clock,
  BookOpen,
  ArrowLeft
} from "lucide-react";
import { useExamStore } from "../../../store/examStore";
import MathRenderer from "../../../components/ui/MathRenderer";
import { calculateTestAnalytics } from "../../../lib/analytics-engine";

export default function TestInterface() {
  const params = useParams();
  const router = useRouter();
  const testId = params?.id as string;
  
  const { 
    activePaper, 
    currentQuestionIndex, 
    responses, 
    timeRemaining, 
    isExamStarted, 
    isExamSubmitted,
    selectQuestion,
    nextQuestion,
    prevQuestion,
    saveResponse,
    markForReview,
    clearResponse,
    tickTimer,
    submitExam,
    resetExam,
    tabSwitchCount,
    incrementTabSwitchCount
  } = useExamStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMCQOption, setSelectedMCQOption] = useState<string>("");
  const [numericalInput, setNumericalInput] = useState<string>("");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Double check session validation on mount
  useEffect(() => {
    if (!activePaper || activePaper.id !== testId) {
      // If store is empty, fallback to home
      router.push("/");
      return;
    }

    // Set up ticking interval
    timerRef.current = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activePaper, testId, tickTimer, router]);

  // Tab switch/blur proctoring tracker
  useEffect(() => {
    if (!isExamStarted || isExamSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        incrementTabSwitchCount();
      }
    };

    const handleBlur = () => {
      incrementTabSwitchCount();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isExamStarted, isExamSubmitted, incrementTabSwitchCount]);

  // 2. Synchronize visual states when the question changes
  const activeQuestion = activePaper?.questions[currentQuestionIndex];
  
  useEffect(() => {
    if (!activeQuestion) return;
    const currentResp = responses[activeQuestion.id];
    
    if (activeQuestion.type === "MCQ") {
      setSelectedMCQOption((currentResp?.answer as string) || "");
      setNumericalInput("");
    } else {
      setNumericalInput(currentResp?.answer !== undefined ? String(currentResp.answer) : "");
      setSelectedMCQOption("");
    }
  }, [activeQuestion, currentQuestionIndex, responses]);

  const [submitting, setSubmitting] = useState(false);

  // 3. Handle Auto-Submit / Manual-Submit flow securely via MongoDB submission API
  useEffect(() => {
    async function submitPaperToServer() {
      if (isExamSubmitted && activePaper && !submitting) {
        if (timerRef.current) clearInterval(timerRef.current);
        setSubmitting(true);
        
        try {
          const totalTimeSpent = (activePaper.durationMinutes * 60) - timeRemaining;
          
          // Send responses securely for evaluation on MongoDB
          const response = await fetch("/api/questions/submit", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              paperId: activePaper.id,
              title: activePaper.title,
              subject: activePaper.subject,
              questions: activePaper.questions,
              responses,
              totalTimeSpent,
              tabSwitchCount
            })
          });

          const data = await response.json();
          if (data.success && data.attemptData) {
            // Save graded attempt directly to localStorage
            const stored = localStorage.getItem("dheerajee_attempts");
            const list = stored ? JSON.parse(stored) : [];
            list.unshift(data.attemptData);
            localStorage.setItem("dheerajee_attempts", JSON.stringify(list));

            // Clean up and route to results page
            resetExam();
            router.push(`/result/${data.attemptData.id}`);
          }
        } catch (e) {
          console.error("Secure examination submission failed:", e);
        } finally {
          setSubmitting(false);
        }
      }
    }
    
    submitPaperToServer();
  }, [isExamSubmitted, activePaper, responses, timeRemaining, router, resetExam, submitting, tabSwitchCount]);

  if (submitting) {
    return (
      <div className="min-h-screen bg-[#070b13] text-[#f1f5f9] flex flex-col items-center justify-center p-4">
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent border-r-transparent animate-spin" />
          <div className="absolute w-12 h-12 rounded-full border-4 border-indigo-500 border-b-transparent border-l-transparent animate-spin duration-1000" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2 animate-pulse">Evaluating CBT Paper...</h2>
        <p className="text-xs text-gray-500 max-w-md text-center leading-relaxed">
          Grading responses on NTA blueprint parameters, calculating chapter masteries, and simulating JEE Main percentile curves securely on MongoDB.
        </p>
      </div>
    );
  }

  if (!activePaper || !activeQuestion) return null;

  // 4. Time Formatting Helper
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // 5. Fullscreen Management
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // 6. Action Handlers
  const handleSaveAndNext = () => {
    const currentVal = activeQuestion.type === "MCQ" ? selectedMCQOption : numericalInput;
    
    if (currentVal !== "" && currentVal !== undefined) {
      const savedAns = activeQuestion.type === "MCQ" ? currentVal : Number(currentVal);
      console.log(`[CBT LOG] Response Saved - Question: ${activeQuestion.id} (${activeQuestion.subject}), Answer:`, savedAns);
      saveResponse(activeQuestion.id, savedAns);
    } else {
      console.log(`[CBT LOG] Response Cleared/Skipped - Question: ${activeQuestion.id} (${activeQuestion.subject})`);
      // If no answer selected, acts as visited but not answered
      clearResponse(activeQuestion.id);
    }
    nextQuestion();
  };

  const handleMarkForReviewAndNext = () => {
    const currentVal = activeQuestion.type === "MCQ" ? selectedMCQOption : numericalInput;
    const hasValue = currentVal !== "" && currentVal !== undefined;
    const savedVal = hasValue ? (activeQuestion.type === "MCQ" ? currentVal : Number(currentVal)) : undefined;

    console.log(`[CBT LOG] Marked for Review - Question: ${activeQuestion.id} (${activeQuestion.subject}), Answer:`, savedVal ?? "None");
    markForReview(activeQuestion.id, savedVal);
    nextQuestion();
  };

  const handleClearResponse = () => {
    console.log(`[CBT LOG] Clear Current Response - Question: ${activeQuestion.id} (${activeQuestion.subject})`);
    clearResponse(activeQuestion.id);
    setSelectedMCQOption("");
    setNumericalInput("");
  };

  return (
    <div className="h-screen bg-[#070b13] text-[#f1f5f9] flex flex-col font-sans select-none">
      
      {/* Top Banner Bar */}
      <header className="bg-[#0b101c] border-b border-gray-800 h-14 flex items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow shadow-blue-500/10">
            DJ
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">{activePaper.title}</span>
          <span className="text-xs text-gray-500 px-2 py-0.5 rounded bg-gray-900 border border-gray-800">{activeQuestion.subject} Portion</span>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-yellow-500 font-bold bg-yellow-950/20 border border-yellow-900/30 px-3 py-1 rounded-lg text-sm">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatTime(timeRemaining)}</span>
          </div>

          <button 
            onClick={toggleFullscreen} 
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent hover:border-gray-700 transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Exam Question Panel */}
        <div className="flex-1 flex flex-col border-r border-gray-800 bg-[#070b13] overflow-y-auto">
          {/* Section Selector Tab */}
          <div className="bg-[#090d16] border-b border-gray-800/80 px-4 h-11 flex items-center space-x-2 text-xs font-bold text-gray-400">
            <span className="text-blue-400 border-b-2 border-blue-500 px-2 py-3">{activeQuestion.subject}</span>
            <span className="text-gray-600">|</span>
            <span className="bg-gray-950 text-gray-500 border border-gray-800 px-2.5 py-1 rounded font-medium">
              {activeQuestion.type === "MCQ" ? "Section A: MCQs" : "Section B: Numericals"}
            </span>
          </div>

          {/* Question Meta Details */}
          <div className="bg-gray-900/10 border-b border-gray-800/50 px-6 py-3 flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold text-gray-400">Question No. {currentQuestionIndex + 1}</span>
            <div className="flex items-center space-x-4">
              <span className="text-green-500 bg-green-950/20 px-2 py-0.5 rounded border border-green-900/20 font-semibold">Marks: +4</span>
              <span className="text-red-500 bg-red-950/20 px-2 py-0.5 rounded border border-red-900/20 font-semibold">Negative: -1</span>
            </div>
          </div>

          {/* Actual Question Text Area */}
          <div className="flex-1 p-6 sm:p-8 space-y-6">
            <div className="prose prose-invert max-w-none text-[#f1f5f9] text-base md:text-lg">
              <MathRenderer text={activeQuestion.question} />
            </div>

            {activeQuestion.diagram && (
              <div className="my-4 p-4 rounded-2xl bg-gray-900/40 border border-gray-800/80 inline-block max-w-md">
                <img
                  src={activeQuestion.diagram}
                  alt="Question Diagram"
                  className="rounded-xl max-h-60 object-contain mx-auto"
                  onError={(e) => {
                    (e.target as HTMLElement).parentElement!.style.display = "none";
                  }}
                />
                <span className="text-[10px] text-gray-500 font-bold block text-center mt-2 tracking-wide uppercase">
                  Figure: Question Geometry / Diagram
                </span>
              </div>
            )}

            {/* Response Input Area */}
            <div className="mt-8 border-t border-gray-800/50 pt-6">
              <span className="text-xs uppercase font-bold text-gray-500 block tracking-wider mb-4">
                Select your response:
              </span>

              {activeQuestion.type === "MCQ" ? (
                // MCQ Option Grid
                <div className="grid grid-cols-1 gap-3.5 max-w-2xl">
                  {activeQuestion.options?.map((option, idx) => {
                    const optionChar = String.fromCharCode(65 + idx); // "A", "B", "C", "D"
                    const isSelected = selectedMCQOption === optionChar;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedMCQOption(optionChar);
                          saveResponse(activeQuestion.id, optionChar);
                        }}
                        className={`flex items-center text-left px-5 py-4 rounded-xl border text-sm sm:text-base font-medium transition-all group ${
                          isSelected
                            ? "bg-blue-600/15 border-blue-500 text-white"
                            : "bg-gray-950 border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold mr-4 flex-shrink-0 transition-all ${
                          isSelected
                            ? "bg-blue-500 border-blue-400 text-white"
                            : "border-gray-700 bg-gray-900 text-gray-400 group-hover:border-gray-600"
                        }`}>
                          {optionChar}
                        </div>
                        <div className="flex-1">
                          <MathRenderer text={option} inline={true} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                // Numerical Input Field
                <div className="max-w-md">
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      placeholder="Enter your numeric answer here (e.g. 1.5, 25, -4)"
                      value={numericalInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNumericalInput(val);
                        if (val !== "" && val !== undefined) {
                          saveResponse(activeQuestion.id, Number(val));
                        } else {
                          clearResponse(activeQuestion.id);
                        }
                      }}
                      className="w-full h-14 px-4 bg-gray-950 border border-gray-800 rounded-xl font-bold font-mono text-white text-base focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-700"
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-2 block font-medium">
                    (Use decimals if fractional. Round answers up to 2 decimals)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Sidebar Navigation Palette */}
        <div className="w-full lg:w-80 bg-[#090d16] flex flex-col border-t lg:border-t-0 border-l border-gray-800/80 overflow-hidden">
          {/* Candidate Profile Info */}
          <div className="p-4 border-b border-gray-800 bg-[#0b101c] flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <User className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-sm block text-white tracking-wide">DheeraJee Candidate</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">ID: DJ-2026-MAIN</span>
            </div>
          </div>

          {/* Legend Table */}
          <div className="p-4 border-b border-gray-800 grid grid-cols-2 gap-3 text-[10px] font-bold text-gray-400">
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 flex items-center justify-center font-bold text-xs nta-badge-answered flex-shrink-0">
                0
              </div>
              <span className="leading-tight">Answered</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 flex items-center justify-center font-bold text-xs nta-badge-not-answered flex-shrink-0">
                0
              </div>
              <span className="leading-tight">Not Answered</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 flex items-center justify-center font-bold text-xs nta-badge-marked flex-shrink-0">
                0
              </div>
              <span className="leading-tight">Marked for Review</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 flex items-center justify-center font-bold text-xs nta-badge-marked-answered flex-shrink-0">
                0
              </div>
              <span className="leading-tight">Ans & Marked for Evaluation</span>
            </div>
            <div className="col-span-2 flex items-center space-x-2.5 pt-1">
              <div className="w-6 h-6 flex items-center justify-center font-bold text-xs nta-badge-not-visited flex-shrink-0">
                0
              </div>
              <span className="leading-tight">Not Visited</span>
            </div>
          </div>

          {/* Palette Grid Title */}
          <div className="bg-[#0b101c] px-4 py-2 border-b border-gray-800/80 text-[10px] uppercase tracking-wider font-extrabold text-gray-500">
            Choose a Question:
          </div>

          {/* 25 Question Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-5 gap-3.5">
              {activePaper.questions.map((q, idx) => {
                const qResp = responses[q.id];
                const isActive = idx === currentQuestionIndex;
                let badgeClass = "nta-badge-not-visited";
                
                if (qResp) {
                  if (qResp.status === "ANSWERED") badgeClass = "nta-badge-answered";
                  else if (qResp.status === "NOT_ANSWERED") badgeClass = "nta-badge-not-answered";
                  else if (qResp.status === "MARKED") badgeClass = "nta-badge-marked";
                  else if (qResp.status === "MARKED_ANSWERED") badgeClass = "nta-badge-marked-answered";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => selectQuestion(idx)}
                    className={`w-10 h-10 flex items-center justify-center font-extrabold text-xs transition-all border cursor-pointer ${badgeClass} ${
                      isActive 
                        ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-[#070b13]" 
                        : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="p-4 border-t border-gray-800 bg-[#0b101c] text-xs font-semibold text-gray-500 space-y-1.5">
            <div className="flex justify-between">
              <span>Total Questions:</span>
              <span className="text-white font-bold">{activePaper.questions.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Answered:</span>
              <span className="text-green-400 font-bold">
                {Object.values(responses).filter((r) => r.status === "ANSWERED" || r.status === "MARKED_ANSWERED").length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Marked for Review:</span>
              <span className="text-purple-400 font-bold">
                {Object.values(responses).filter((r) => r.status === "MARKED" || r.status === "MARKED_ANSWERED").length}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Navigation Bar */}
      <footer className="bg-[#0b101c] border-t border-gray-800 h-16 flex items-center justify-between px-4 sm:px-6 relative z-20">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleMarkForReviewAndNext}
            className="h-10 px-4 sm:px-5 bg-purple-900/50 hover:bg-purple-800 border border-purple-800 rounded-lg text-purple-200 hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Mark for Review & Next
          </button>
          
          <button
            onClick={handleClearResponse}
            className="h-10 px-4 sm:px-5 bg-gray-900 border border-gray-800 hover:bg-gray-800 hover:border-gray-700 rounded-lg text-gray-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Clear Response
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={prevQuestion}
            disabled={currentQuestionIndex === 0}
            className="h-10 w-10 flex items-center justify-center bg-gray-900 border border-gray-800 hover:bg-gray-850 hover:border-gray-700 disabled:opacity-40 rounded-lg text-gray-300 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleSaveAndNext}
            className="h-10 px-6 sm:px-8 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-extrabold shadow shadow-green-500/10 transition-all transform active:scale-98 cursor-pointer"
          >
            Save & Next
          </button>

          <button
            onClick={nextQuestion}
            disabled={currentQuestionIndex === activePaper.questions.length - 1}
            className="h-10 w-10 flex items-center justify-center bg-gray-900 border border-gray-800 hover:bg-gray-850 hover:border-gray-700 disabled:opacity-40 rounded-lg text-gray-300 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="h-10 px-6 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-lg text-xs font-extrabold shadow shadow-red-500/10 transition-colors cursor-pointer"
          >
            Submit Paper
          </button>
        </div>
      </footer>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b13]/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b101c] border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600" />
            
            <h3 className="text-xl font-bold text-white mb-3">Submit Mock Exam?</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              You are about to submit your <strong>{activePaper.title}</strong>. Once submitted, your answers will be evaluated and you can view the complete step-by-step LaTeX solution panel and performance analytics.
            </p>

            <div className="bg-gray-950/50 rounded-2xl p-4 border border-gray-800 text-xs space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">Attempted Questions:</span>
                <span className="font-bold text-white">
                  {Object.values(responses).filter((r) => r.answer !== undefined && r.answer !== "").length} / {activePaper.questions.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time Remaining:</span>
                <span className="font-bold text-yellow-500 font-mono">{formatTime(timeRemaining)}</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-3 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  submitExam();
                }}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Yes, Submit Test
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
