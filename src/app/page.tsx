"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  BookOpen, 
  Award, 
  Settings, 
  Clock, 
  Activity, 
  Flame, 
  ChevronRight, 
  Plus, 
  ChevronDown, 
  Sliders, 
  TrendingUp, 
  CheckCircle2,
  Calendar,
  Layers
} from "lucide-react";
import { useExamStore } from "../store/examStore";
import { generatePaper } from "../lib/paper-generator";
import { getQuestionsBySubject } from "../lib/question-engine";

export default function Dashboard() {
  const router = useRouter();
  const { startExam, resetExam, lastCompletedTestId } = useExamStore();
  const [questionPoolCount, setQuestionPoolCount] = useState(0);
  
  // MongoDB live question bank states
  const [dbQuestions, setDbQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<"Mathematics" | "Physics" | "Chemistry">("Mathematics");
  const [seedingInProgress, setSeedingInProgress] = useState(false);
  
  // Custom generator states
  const [selectedCount, setSelectedCount] = useState<number>(25);
  const [selectedProfile, setSelectedProfile] = useState<"Balanced" | "Foundation" | "Advanced">("Balanced");
  const [showHistory, setShowHistory] = useState<any[]>([]);

  useEffect(() => {
    // Reset any active exam when returning to dashboard
    resetExam();
    
    // Retrieve past test attempts from localStorage
    try {
      const storedAttempts = localStorage.getItem("dheerajee_attempts");
      if (storedAttempts) {
        setShowHistory(JSON.parse(storedAttempts));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, [resetExam]);

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your entire attempt history? This will delete all past mock results.")) {
      localStorage.removeItem("dheerajee_attempts");
      setShowHistory([]);
    }
  };

  useEffect(() => {
    async function loadQuestions() {
      try {
        setLoadingQuestions(true);
        const res = await fetch("/api/questions");
        const data = await res.json();
        if (data.success) {
          if (data.count === 0) {
            // Auto-seed if database is empty! Zero setup.
            setSeedingInProgress(true);
            const seedRes = await fetch("/api/seed", { method: "POST" });
            const seedData = await seedRes.json();
            if (seedData.success) {
              const refetchRes = await fetch("/api/questions");
              const refetchData = await refetchRes.json();
              if (refetchData.success) {
                setDbQuestions(refetchData.questions);
              }
            }
            setSeedingInProgress(false);
          } else {
            setDbQuestions(data.questions);
          }
        }
      } catch (e) {
        console.error("Failed to load questions from database", e);
      } finally {
        setLoadingQuestions(false);
      }
    }
    loadQuestions();
  }, []);

  // Update visual counters based on live DB questions and selected subject
  useEffect(() => {
    const matching = dbQuestions.filter((q) => q.subject === selectedSubject);
    setQuestionPoolCount(matching.length);
  }, [selectedSubject, dbQuestions]);

  // Launches the standard NTA JEE Mock (25 Questions)
  const handleLaunchOfficialMock = () => {
    const paper = generatePaper({
      subject: selectedSubject,
      totalQuestions: 25,
      difficulty: { easy: 7, medium: 12, hard: 6 },
      candidates: dbQuestions
    });
    
    startExam(paper);
    router.push(`/test/${paper.id}`);
  };

  // Launches the full 3-Subject NTA JEE Mock (75 Questions, 3 Hours)
  const handleLaunchFullMock = () => {
    const paper = generatePaper({
      subject: "Full Syllabus",
      totalQuestions: 75,
      candidates: dbQuestions
    });
    
    startExam(paper);
    router.push(`/test/${paper.id}`);
  };

  // Launches custom generated paper
  const handleLaunchCustomTest = () => {
    let diff = { easy: 7, medium: 12, hard: 6 };
    if (selectedProfile === "Foundation") {
      // Easy-heavy
      diff = {
        easy: Math.round(selectedCount * 0.5),
        medium: Math.round(selectedCount * 0.4),
        hard: Math.round(selectedCount * 0.1),
      };
    } else if (selectedProfile === "Advanced") {
      // Hard-heavy
      diff = {
        easy: Math.round(selectedCount * 0.1),
        medium: Math.round(selectedCount * 0.4),
        hard: Math.round(selectedCount * 0.5),
      };
    } else {
      // Balanced
      diff = {
        easy: Math.round(selectedCount * 0.28),
        medium: Math.round(selectedCount * 0.48),
        hard: Math.round(selectedCount * 0.24),
      };
    }

    const paper = generatePaper({
      subject: selectedSubject,
      totalQuestions: selectedCount,
      pattern: {
        mcq: Math.round(selectedCount * 0.8),
        numerical: selectedCount - Math.round(selectedCount * 0.8),
      },
      difficulty: diff,
      candidates: dbQuestions
    });

    startExam(paper);
    router.push(`/test/${paper.id}`);
  };

  // Quick launch helper for re-attempts
  const handleViewAttempt = (attemptId: string) => {
    router.push(`/result/${attemptId}`);
  };

  // Calculate quick stats from past history
  const totalAttempts = showHistory.length;
  const bestScore = totalAttempts > 0 ? Math.max(...showHistory.map(h => h.score)) : 0;
  const avgAccuracy = totalAttempts > 0 ? Math.round(showHistory.reduce((acc, h) => acc + h.accuracy, 0) / totalAttempts) : 0;

  return (
    <div className="min-h-screen bg-[#070b13] text-[#f1f5f9] pb-12">
      {/* Dynamic Sleek Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-[#070b13]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-500/20">
              DJ
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">DheeraJee</span>
              <span className="text-xs block text-gray-500 font-medium tracking-wide uppercase">CBT Exam Engine</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Admin configs button hidden visually per request */}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 relative z-10">
        
        {/* Welcome Section / Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-blue-900/30 bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-gray-950 p-8 sm:p-10 shadow-2xl mb-8">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-blue-800 bg-blue-950/80 text-blue-300 text-xs font-semibold mb-4">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>AI-First JEE Mock Platform</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
                Welcome Dheeraj, hope you are doing great!
              </h1>
              <p className="text-gray-400 text-base leading-relaxed mb-1">
                Wishing you the absolute best for your upcoming exams! Let's master the mock journey. Our CBT simulation replicates the physical testing environment with standard 25-question layouts, precise timers, double-pane KaTeX formatting, and server-side negative scoring. Toggle subjects (Mathematics, Physics, or Chemistry) to construct mock papers, practice problems, and inspect comprehensive speed masteries and solutions!
              </p>
              <div className="text-xs text-gray-500 font-semibold mt-2">
                ACTIVE BANK: <span className="text-blue-400">{questionPoolCount} High-Quality {selectedSubject} Questions</span>
                {loadingQuestions && <span className="text-gray-600 ml-2 animate-pulse">(Connecting to MongoDB...)</span>}
                {seedingInProgress && <span className="text-yellow-500 ml-2 animate-pulse">(Seeding DB on first load...)</span>}
              </div>
            </div>
            
            <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleLaunchOfficialMock}
                disabled={loadingQuestions}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-4 bg-gray-900 border border-gray-800 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 rounded-2xl font-bold transition-all cursor-pointer text-sm"
              >
                <span>Launch 25-Q {selectedSubject} Mock</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleLaunchFullMock}
                disabled={loadingQuestions}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-bold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-sm"
              >
                <Award className="w-4 h-4 text-yellow-300 animate-pulse" />
                <span>Launch Full 3-Subject Mock (3h / 75 Qs)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Subject Selection Tabs */}
        <section className="bg-gray-900/20 border border-gray-800/80 rounded-3xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-extrabold uppercase text-gray-400 tracking-wider">Select Practice Subject</h2>
            <p className="text-xs text-gray-500 mt-0.5">Toggle between Mathematics, Physics, and Chemistry question banks.</p>
          </div>
          <div className="flex space-x-3 w-full sm:w-auto">
            {(["Mathematics", "Physics", "Chemistry"] as const).map((sub) => {
              const isActive = selectedSubject === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2.5 px-6 py-3 rounded-2xl font-bold text-sm border transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                      : "bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-850 hover:text-white"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{sub}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 flex items-center space-x-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-gray-500 font-bold block uppercase tracking-wider">Total Mocks Taken</span>
              <span className="text-2xl font-black text-white">{totalAttempts}</span>
            </div>
          </div>

          <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 flex items-center space-x-4">
            <div className="p-3 bg-green-500/10 text-green-400 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-gray-500 font-bold block uppercase tracking-wider">Best Score</span>
              <span className="text-2xl font-black text-white">{bestScore} <span className="text-xs text-gray-500 font-bold">/ {totalAttempts > 0 ? showHistory[0].totalMarks : 100}</span></span>
            </div>
          </div>

          <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 flex items-center space-x-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-gray-500 font-bold block uppercase tracking-wider">Avg. Accuracy</span>
              <span className="text-2xl font-black text-white">{avgAccuracy}%</span>
            </div>
          </div>

          <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 flex items-center space-x-4">
            <div className="p-3 bg-orange-500/10 text-orange-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-gray-500 font-bold block uppercase tracking-wider">Avg. Solve Speed</span>
              <span className="text-2xl font-black text-white">
                {totalAttempts > 0 
                  ? `${Math.round(showHistory.reduce((acc, h) => acc + h.avgTimePerQuestion, 0) / totalAttempts)}s` 
                  : "0s"}
              </span>
            </div>
          </div>
        </section>

        {/* Lower Content Division */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Custom Exam Builder (Left 2 columns or Right 1 Column depending on styling) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Custom Exam Generator Panel */}
            <div className="bg-gray-900/40 border border-gray-800/80 rounded-3xl p-6 sm:p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Custom Paper Generator</h2>
                  <p className="text-xs text-gray-500">Configure parameters to focus on weak topics or test speeds</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                {/* Question Count Selector */}
                <div>
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-wider block mb-3">
                    Number of Questions
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[10, 15, 25].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSelectedCount(count)}
                        className={`py-3 rounded-xl font-bold text-sm border transition-all ${
                          selectedCount === count
                            ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                            : "bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white"
                        }`}
                      >
                        {count} Qs
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-2 block font-medium">
                    (Standard Main is 25 questions total)
                  </span>
                </div>

                {/* Difficulty Profile Selector */}
                <div>
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-wider block mb-3">
                    Difficulty Profile
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["Balanced", "Foundation", "Advanced"] as const).map((profile) => (
                      <button
                        key={profile}
                        type="button"
                        onClick={() => setSelectedProfile(profile)}
                        className={`py-3 rounded-xl font-bold text-xs border transition-all ${
                          selectedProfile === profile
                            ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                            : "bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white"
                        }`}
                      >
                        {profile}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-2 block font-medium">
                    {selectedProfile === "Balanced" && "Standard Ratio: 28% Easy, 48% Med, 24% Hard"}
                    {selectedProfile === "Foundation" && "Easiest practice: 50% Easy, 40% Med, 10% Hard"}
                    {selectedProfile === "Advanced" && "Intense simulation: 10% Easy, 40% Med, 50% Hard"}
                  </span>
                </div>
              </div>

              {/* Action Launch */}
              <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3 text-xs text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Calculates marks dynamically with exact NTA negative markings</span>
                </div>
                
                <button
                  type="button"
                  onClick={handleLaunchCustomTest}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 hover:bg-white text-gray-950 rounded-xl font-bold transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate & Start</span>
                </button>
              </div>
            </div>

            {/* Past attempts list */}
            <div className="bg-gray-900/40 border border-gray-800/80 rounded-3xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500/10 text-green-400 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Performance History</h2>
                    <p className="text-xs text-gray-500">Track scores, solve accuracies and analyze weak areas</p>
                  </div>
                </div>
                {showHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="px-3.5 py-1.5 rounded-lg border border-red-950 bg-red-950/20 hover:bg-red-950/40 text-[10px] font-extrabold uppercase tracking-wider text-red-400 transition-all cursor-pointer animate-fade-in"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {showHistory.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-gray-800 rounded-2xl bg-gray-950/20">
                  <Calendar className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-semibold">No tests attempted yet</p>
                  <p className="text-xs text-gray-600 mt-1">Generate a custom paper or launch the official mock above to get started!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-500 text-xs font-bold uppercase tracking-wider">
                        <th className="pb-3">Test Title</th>
                        <th className="pb-3">Score</th>
                        <th className="pb-3">Accuracy</th>
                        <th className="pb-3">Percentile</th>
                        <th className="pb-3">Completed On</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {showHistory.map((h, idx) => (
                        <tr key={h.id || idx} className="hover:bg-gray-800/10 group transition-colors">
                          <td className="py-4 font-bold text-white">
                            <div>{h.title}</div>
                            {h.tabSwitchCount !== undefined && h.tabSwitchCount > 0 && (
                              <span className="inline-block mt-1 text-[9px] font-bold bg-red-950/40 border border-red-900/30 text-red-400 px-1.5 py-0.5 rounded animate-pulse">
                                Warning: {h.tabSwitchCount} Tab Switches
                              </span>
                            )}
                          </td>
                          <td className="py-4 text-gray-200">
                            <span className="font-extrabold text-blue-400">{h.score}</span> / {h.totalMarks}
                          </td>
                          <td className="py-4 font-semibold text-green-400">{h.accuracy}%</td>
                          <td className="py-4 font-black text-purple-400">{(typeof h.rankEstimate === 'number' ? h.rankEstimate : parseFloat(h.rankEstimate ?? '0')).toFixed(2)} %ile</td>
                          <td className="py-4 text-xs text-gray-500 font-medium">
                            {new Date(h.completedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => handleViewAttempt(h.id)}
                              className="px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900 group-hover:bg-blue-600 group-hover:border-blue-500 text-xs font-bold text-gray-300 group-hover:text-white transition-all"
                            >
                              View Analysis
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Guidelines Sidebar (Right 1 column) */}
          <div className="space-y-6">
            
            {/* Real NTA Exam Pattern Card */}
            <div className="bg-gradient-to-br from-indigo-950/20 to-gray-950 border border-gray-800/80 rounded-3xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <span>NTA Exam Blueprint</span>
              </h3>

              <ul className="space-y-4 text-xs">
                <li className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-white block">Question Distribution</span>
                    <span className="text-gray-400">Total 25 questions for {selectedSubject} subject (20 MCQs and 5 Numerical Response).</span>
                  </div>
                </li>

                <li className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-white block">Correct & Incorrect Scoring</span>
                    <span className="text-gray-400">MCQs and Numericals both carry <strong>+4 marks</strong> for correct and <strong>-1 mark</strong> for incorrect. Unattempted is <strong>0 marks</strong>.</span>
                  </div>
                </li>

                <li className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-white block">Official Palette Navigation</span>
                    <span className="text-gray-400">Color states mimic NTA: Gray (Not Visited), Red (Not Answered), Green (Answered), Purple (Marked), and Purple+Green Dot (Answered & Marked).</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Pro Tips / Preparation Advice */}
            <div className="bg-gray-900/20 border border-gray-800/80 rounded-3xl p-6">
              <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-4 flex items-center space-x-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>Test-Taking Advice</span>
              </h3>

              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-gray-950 border border-gray-800">
                  <span className="font-semibold text-white block mb-1">🚀 Save & Next Priority</span>
                  <span className="text-gray-400">Always click "Save & Next" to record your responses. Merely selecting an option doesn't save it if you switch questions via the palette!</span>
                </div>

                <div className="p-3 rounded-xl bg-gray-950 border border-gray-800">
                  <span className="font-semibold text-white block mb-1">⏱️ Pace Yourself</span>
                  <span className="text-gray-400">Target an average of 3 to 4 minutes per {selectedSubject} question. Use the Speed Analytics breakdown post-test to find which chapters slowed you down.</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
