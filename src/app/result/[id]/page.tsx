"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ArrowLeft, 
  ChevronRight, 
  BookOpen, 
  Brain,
  Activity,
  BarChart2,
  ListOrdered,
  RotateCcw
} from "lucide-react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from "recharts";
import confetti from "canvas-confetti";
import MathRenderer from "../../../components/ui/MathRenderer";
import { isAnswerCorrect } from "../../../lib/analytics-engine";

export default function ResultDashboard() {
  const params = useParams();
  const router = useRouter();
  const testId = params?.id as string;

  const [attemptData, setAttemptData] = useState<any | null>(null);
  const [selectedQIdx, setSelectedQIdx] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Load result from localStorage
    try {
      const stored = localStorage.getItem("dheerajee_attempts");
      if (stored) {
        const attempts = JSON.parse(stored);
        const decodedTestId = decodeURIComponent(testId);
        const match = attempts.find((a: any) => a.id === decodedTestId || a.id === testId);
        if (match) {
          setAttemptData(match);
          
          // Confetti explosion on positive scoring!
          if (match.score > 0) {
            triggerConfetti();
          }
        } else {
          setErrorMsg("Test session result not found.");
        }
      } else {
        setErrorMsg("No mock attempt records found.");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to read test results.");
    }
  }, [testId]);

  // Celebratory confetti trigger
  const triggerConfetti = () => {
    const duration = 2.5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, animate a bit higher than random
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  };

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#070b13] text-[#f1f5f9] flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">{errorMsg}</h2>
        <button 
          onClick={() => router.push("/")}
          className="mt-4 flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>
    );
  }

  if (!attemptData) return null;

  const {
    title,
    score,
    totalMarks,
    accuracy,
    rankEstimate,
    totalQuestions,
    attempted,
    correct,
    incorrect,
    unattempted,
    totalTimeSpent,
    avgTimePerQuestion,
    responses,
    paperQuestions,
    tabSwitchCount
  } = attemptData;

  // 1. Chart Data: Pie Chart for Question distribution
  const pieData = [
    { name: "Correct", value: correct, color: "#22c55e" },
    { name: "Incorrect", value: incorrect, color: "#ef4444" },
    { name: "Unattempted", value: unattempted, color: "#4b5563" }
  ].filter(item => item.value > 0);

  // 2. Chart Data: Chapter breakdowns (Dynamic calculations from saved attempt questions)
  const chapterDataMap: Record<string, { chapter: string; total: number; attempted: number; correct: number; timeSpent: number }> = {};
  paperQuestions.forEach((q: any) => {
    const resp = responses[q.id];
    const isAtt = resp && resp.answer !== undefined && resp.answer !== "";
    const isCorr = isAtt && isAnswerCorrect(q, resp.answer);
    const time = resp?.timeSpent ?? 0;

    if (!chapterDataMap[q.chapter]) {
      chapterDataMap[q.chapter] = { chapter: q.chapter, total: 0, attempted: 0, correct: 0, timeSpent: 0 };
    }
    chapterDataMap[q.chapter].total++;
    if (isAtt) {
      chapterDataMap[q.chapter].attempted++;
      if (isCorr) chapterDataMap[q.chapter].correct++;
    }
    chapterDataMap[q.chapter].timeSpent += time;
  });

  const chapterChartData = Object.values(chapterDataMap).map(d => ({
    name: d.chapter.split(" ")[0] || d.chapter, // Shorten chapter names
    "Accuracy (%)": d.attempted > 0 ? Math.round((d.correct / d.attempted) * 100) : 0,
    "Avg Time (s)": Math.round(d.timeSpent / d.total)
  }));

  // Selected Question analytics details
  const activeQuestion = paperQuestions[selectedQIdx];
  const activeResponse = responses[activeQuestion.id];
  const isSelectedAttempted = activeResponse && activeResponse.answer !== undefined && activeResponse.answer !== "";
  const isSelectedCorrect = isSelectedAttempted && isAnswerCorrect(activeQuestion, activeResponse.answer);

  // Format total exam duration
  const formatMinutes = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-[#f1f5f9] pb-16">
      
      {/* Sticky Header Nav */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-[#070b13]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={() => router.push("/")}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
          
          <span className="font-extrabold text-sm text-gray-300">Exam Performance Report</span>

          <button
            onClick={() => router.push("/")}
            className="flex items-center space-x-2 px-4 py-1.5 border border-gray-800 bg-gray-900/50 hover:bg-gray-800 rounded-lg text-xs font-bold text-gray-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Practice Exam</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Banner Section */}
        <section className="relative overflow-hidden rounded-3xl border border-indigo-900/20 bg-gradient-to-r from-blue-950/20 via-indigo-950/10 to-gray-950 p-6 sm:p-8 shadow-2xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-amber-500/10">
              <Award className="w-9 h-9" />
            </div>
            <div>
              <span className="text-[10px] text-yellow-400 font-extrabold uppercase tracking-wider block">CONGRATULATIONS! Mock Completed</span>
              <h1 className="text-2xl font-black text-white">{title}</h1>
              <p className="text-xs text-gray-500 mt-1">Evaluated at NTA parameters with negative mark calculations.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
            <div className="bg-purple-600/15 border border-purple-500/30 rounded-2xl px-6 py-3 text-center">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-purple-400 block mb-0.5">Estimated Percentile</span>
              <span className="text-3xl font-black text-purple-300 font-mono tracking-tight">{rankEstimate.toFixed(2)} %ile</span>
            </div>

            <div className={`border rounded-2xl px-6 py-3 text-center ${
              (tabSwitchCount || 0) > 0 
                ? "bg-red-500/10 border-red-500/20 text-red-400 animate-pulse" 
                : "bg-green-500/10 border-green-500/20 text-green-400"
            }`}>
              <span className="text-[9px] uppercase tracking-wider font-extrabold block mb-0.5">Tab Focus Lost</span>
              <span className="text-3xl font-black font-mono tracking-tight">{(tabSwitchCount || 0)} times</span>
            </div>
          </div>
        </section>

        {/* Primary Metrics Dashboard */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#0b101c] border border-gray-800/80 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">Final Score</span>
              <span className="text-3xl font-black text-blue-400 mt-1 block">{score} <span className="text-sm font-semibold text-gray-500">/ {totalMarks}</span></span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-gray-400 block">MCQ & Num</span>
              <span className="text-[10px] text-gray-600 block">(Incorrect is -1)</span>
            </div>
          </div>

          <div className="bg-[#0b101c] border border-gray-800/80 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">Solve Accuracy</span>
              <span className="text-3xl font-black text-green-400 mt-1 block">{accuracy}%</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-gray-400 block">{correct} Correct</span>
              <span className="text-[10px] text-red-500 block">{incorrect} Incorrect</span>
            </div>
          </div>

          <div className="bg-[#0b101c] border border-gray-800/80 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">Total Duration</span>
              <span className="text-2xl font-black text-orange-400 mt-1.5 block">{formatMinutes(totalTimeSpent)}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-gray-400 block">3h Allowed</span>
              <span className="text-[10px] text-gray-600 block">(180 mins total)</span>
            </div>
          </div>

          <div className="bg-[#0b101c] border border-gray-800/80 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">Solve Speed</span>
              <span className="text-3xl font-black text-purple-400 mt-1 block">{avgTimePerQuestion}s <span className="text-xs text-gray-500 font-bold">/ q</span></span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-gray-400 block">Syllabus Focus</span>
              <span className="text-[10px] text-purple-400 font-bold uppercase block">Math Only</span>
            </div>
          </div>
        </section>

        {/* Graphical Insights Dashboard */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          
          {/* Chapter Mastery Breakdown BarChart */}
          <div className="lg:col-span-2 bg-[#090d16] border border-gray-800/80 rounded-3xl p-6 flex flex-col justify-between">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Chapter-wise Performance profile</h3>
                <p className="text-[10px] text-gray-500">Comparison of solve accuracies across mathematical topics</p>
              </div>
            </div>

            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chapterChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f29370f" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0b101c", borderColor: "#1f2937", borderRadius: "12px", color: "#f1f5f9" }}
                  />
                  <Bar dataKey="Accuracy (%)" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {chapterChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#3b82f6" : "#4f46e5"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Question Status Pie Chart */}
          <div className="bg-[#090d16] border border-gray-800/80 rounded-3xl p-6 flex flex-col justify-between">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-500/10 text-green-400 rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Question Status Distribution</h3>
                <p className="text-[10px] text-gray-500">Visual breakdown of attempted questions</p>
              </div>
            </div>

            <div className="h-48 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0b101c", borderColor: "#1f2937", borderRadius: "12px", color: "#f1f5f9" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-white">{attempted}</span>
                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Attempted</span>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-gray-400 pt-4 border-t border-gray-800/50">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded bg-[#22c55e]" />
                <span>{correct} Correct</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded bg-[#ef4444]" />
                <span>{incorrect} Incorrect</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded bg-[#4b5563]" />
                <span>{unattempted} Unatt.</span>
              </div>
            </div>
          </div>

        </section>

        {/* Detailed Solutions Panel (Side-by-Side Selector & Solver) */}
        <section className="bg-[#090d16] border border-gray-800/80 rounded-3xl overflow-hidden">
          <div className="bg-[#0b101c] p-6 border-b border-gray-800 flex items-center space-x-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">LaTeX Mathematical Solution Panel</h2>
              <p className="text-xs text-gray-500">Examine detailed step-by-step mathematical answers to learn from mistakes</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row min-h-[500px]">
            {/* Left selector palette */}
            <div className="w-full lg:w-64 border-r border-gray-800 p-6 bg-[#070b13] overflow-y-auto">
              <span className="text-xs uppercase font-extrabold tracking-wider text-gray-500 block mb-4">
                Select Question:
              </span>
              
              <div className="grid grid-cols-5 gap-3.5">
                {paperQuestions.map((q: any, idx: number) => {
                  const resp = responses[q.id];
                  const isAtt = resp && resp.answer !== undefined && resp.answer !== "";
                  const isCorr = isAtt && isAnswerCorrect(q, resp.answer);
                  const isCurSelected = idx === selectedQIdx;

                  let borderClr = "border-gray-800";
                  let bgClr = "bg-gray-950 hover:bg-gray-800/50 text-gray-400";

                  if (isAtt) {
                    if (isCorr) {
                      bgClr = "bg-green-600/15 text-green-400";
                      borderClr = "border-green-500/30";
                    } else {
                      bgClr = "bg-red-600/15 text-red-400";
                      borderClr = "border-red-500/30";
                    }
                  } else {
                    bgClr = "bg-gray-900/40 text-gray-500";
                    borderClr = "border-gray-800/50";
                  }

                  if (isCurSelected) {
                    borderClr = "border-blue-500 ring-1 ring-blue-500";
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setSelectedQIdx(idx)}
                      className={`w-10 h-10 flex items-center justify-center font-extrabold text-xs transition-all border rounded-xl cursor-pointer ${bgClr} ${borderClr}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right solver details */}
            <div className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto bg-[#090d16]">
              {/* Question status tags */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800/60 pb-4">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="bg-gray-900 border border-gray-800 px-3 py-1 rounded-lg text-gray-400 font-bold">
                    Question {selectedQIdx + 1}
                  </span>
                  <span className="bg-blue-950/60 border border-blue-900/40 px-3 py-1 rounded-lg text-blue-300 font-bold uppercase tracking-wider text-[10px]">
                    {activeQuestion.chapter}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  {/* Status Tag */}
                  {!isSelectedAttempted ? (
                    <span className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-gray-900 text-gray-400 font-bold border border-gray-800">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Unattempted (0 Marks)</span>
                    </span>
                  ) : isSelectedCorrect ? (
                    <span className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-green-950 text-green-400 font-bold border border-green-900">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Correct (+4 Marks)</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-red-950 text-red-400 font-bold border border-red-900">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Incorrect (-1 Mark)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Question text */}
              <div className="prose prose-invert max-w-none text-gray-100 text-base md:text-lg">
                <MathRenderer text={activeQuestion.question} />
              </div>

              {activeQuestion.diagram && (
                <div className="my-4 p-4 rounded-2xl bg-gray-950/40 border border-gray-800/80 inline-block max-w-md">
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

              {/* Chosen response details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-950/40 border border-gray-800/80 rounded-2xl p-4 text-xs">
                <div>
                  <span className="text-gray-500 font-bold block uppercase tracking-wider mb-1">Your Response</span>
                  <span className={`text-base font-extrabold ${
                    !isSelectedAttempted 
                      ? "text-gray-500" 
                      : isSelectedCorrect 
                        ? "text-green-400" 
                        : "text-red-400"
                  }`}>
                    {isSelectedAttempted ? String(activeResponse.answer) : "None"}
                  </span>
                </div>

                <div>
                  <span className="text-gray-500 font-bold block uppercase tracking-wider mb-1">Correct Answer</span>
                  <span className="text-base font-extrabold text-green-400">
                    {String(activeQuestion.correctAnswer)}
                  </span>
                </div>
              </div>

              {/* Step-by-Step Explanation Block */}
              <div className="border-t border-gray-800/60 pt-6 space-y-4">
                <h3 className="text-sm font-black uppercase text-purple-400 tracking-wider flex items-center space-x-2">
                  <ListOrdered className="w-4 h-4" />
                  <span>Detailed Mathematical Solution</span>
                </h3>

                <div className="p-5 sm:p-6 bg-purple-950/5 border border-purple-900/10 rounded-2xl text-gray-300 leading-relaxed max-w-none prose prose-invert overflow-x-auto">
                  <MathRenderer text={activeQuestion.solution} />
                </div>
              </div>

            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
