"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Eye, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle,
  Database,
  Layers,
  Search,
  BookOpen,
  EyeOff
} from "lucide-react";
import { Question } from "../../lib/shared-types";
import { 
  getAllQuestions, 
  addCustomQuestion, 
  deleteCustomQuestion, 
  validateQuestion 
} from "../../lib/question-engine";
import MathRenderer from "../../components/ui/MathRenderer";

export default function AdminPanel() {
  const router = useRouter();

  // Load questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("All");
  const [filterType, setFilterType] = useState("All");

  // Form states
  const [formId, setFormId] = useState("");
  const [formChapter, setFormChapter] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [formDifficulty, setFormDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [formType, setFormType] = useState<"MCQ" | "NUMERICAL">("MCQ");
  const [formQuestion, setFormQuestion] = useState("");
  const [formOptionA, setFormOptionA] = useState("");
  const [formOptionB, setFormOptionB] = useState("");
  const [formOptionC, setFormOptionC] = useState("");
  const [formOptionD, setFormOptionD] = useState("");
  const [formCorrectAnswer, setFormCorrectAnswer] = useState("A");
  const [formSolution, setFormSolution] = useState("");
  const [formConcepts, setFormConcepts] = useState("");
  const [formTags, setFormTags] = useState("");
  
  // UX states
  const [activePreviewTab, setActivePreviewTab] = useState<"Edit" | "Preview">("Edit");
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);

  // Reload questions helper
  const reloadQuestions = () => {
    setQuestions(getAllQuestions());
  };

  useEffect(() => {
    reloadQuestions();
  }, []);

  // Set default unique ID when form values shift
  useEffect(() => {
    const code = formChapter.toLowerCase().replace(/[^a-z]/g, "").slice(0, 5) || "cust";
    const typeCode = formType === "MCQ" ? "mcq" : "num";
    setFormId(`m-${code}-${typeCode}-${Date.now().toString().slice(-4)}`);
  }, [formChapter, formType]);

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMsg("");

    const newQuestion: Question = {
      id: formId,
      subject: "Mathematics",
      chapter: formChapter || "General Mathematics",
      topic: formTopic || "Practice Topic",
      difficulty: formDifficulty,
      type: formType,
      examType: "JEE_MAIN",
      question: formQuestion,
      options: formType === "MCQ" ? [formOptionA, formOptionB, formOptionC, formOptionD] : undefined,
      correctAnswer: formType === "MCQ" ? formCorrectAnswer : Number(formCorrectAnswer),
      solution: formSolution,
      marks: 4,
      negativeMarks: 1,
      estimatedTime: formDifficulty === "Easy" ? 90 : formDifficulty === "Medium" ? 140 : 200,
      concepts: formConcepts ? formConcepts.split(",").map(c => c.trim()) : ["Mathematics"],
      tags: formTags ? formTags.split(",").map(t => t.trim()) : ["Custom"],
      pyq: false,
      createdAt: new Date().toISOString()
    };

    // Validate using question-engine helper
    const valResult = validateQuestion(newQuestion);
    if (!valResult.valid) {
      setErrors(valResult.errors);
      return;
    }

    // Persist via question-engine local storage CRUD
    const success = addCustomQuestion(newQuestion);
    if (success) {
      setSuccessMsg(`Question ${newQuestion.id} successfully seeded to persistent store!`);
      reloadQuestions();
      
      // Clear specific form states
      setFormQuestion("");
      setFormOptionA("");
      setFormOptionB("");
      setFormOptionC("");
      setFormOptionD("");
      setFormSolution("");
      setFormConcepts("");
      setFormTags("");
      setActivePreviewTab("Edit");
    } else {
      setErrors(["A question with this ID already exists."]);
    }
  };

  // Handle Question Deletion
  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this custom question?")) {
      const deleted = deleteCustomQuestion(id);
      if (deleted) {
        reloadQuestions();
        if (viewingQuestion?.id === id) setViewingQuestion(null);
      } else {
        alert("Cannot delete seeded core questions! Only custom-added questions can be removed.");
      }
    }
  };

  // Filtering list
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          q.chapter.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiff = filterDifficulty === "All" || q.difficulty === filterDifficulty;
    const matchesType = filterType === "All" || q.type === filterType;
    return matchesSearch && matchesDiff && matchesType;
  });

  // Count breakdowns
  const totalCount = questions.length;
  const mcqCount = questions.filter(q => q.type === "MCQ").length;
  const numCount = questions.filter(q => q.type === "NUMERICAL").length;
  const customCount = questions.filter(q => q.id.includes("cust") || q.id.includes("-custom-") || isNaN(Number(q.id.split("-").pop() || "")) === false).length; 
  // Let's count questions with non-standard IDs as custom: standard IDs are e.g. "m-alg-001" or "m-alg-num-001"
  const actualCustomCount = questions.filter(q => !q.id.match(/^m-[a-z]+-(num-)?\d{3}$/)).length;

  return (
    <div className="min-h-screen bg-[#070b13] text-[#f1f5f9] pb-16">
      
      {/* Header Bar */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-[#070b13]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={() => router.push("/")}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Student Portal</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-500" />
            <span className="font-extrabold text-sm text-gray-300">Question Bank Manager</span>
          </div>

          <div className="w-20" /> {/* Spacer */}
        </div>
      </header>

      {/* Main Content container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Quick Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Total Pool size</span>
            <span className="text-xl font-extrabold text-white mt-1 block">{totalCount} Questions</span>
          </div>
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Multiple Choice MCQs</span>
            <span className="text-xl font-extrabold text-green-400 mt-1 block">{mcqCount} Seeded</span>
          </div>
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Numerical Response</span>
            <span className="text-xl font-extrabold text-blue-400 mt-1 block">{numCount} Seeded</span>
          </div>
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Custom User-Added</span>
            <span className="text-xl font-extrabold text-purple-400 mt-1 block">{actualCustomCount} Active</span>
          </div>
        </section>

        {/* Workspace Partition */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left panel: Add Question Form (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
              
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Add New Question</h2>
                <div className="flex bg-gray-950 p-1 border border-gray-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab("Edit")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      activePreviewTab === "Edit"
                        ? "bg-blue-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab("Preview")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      activePreviewTab === "Preview"
                        ? "bg-blue-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    LaTeX Preview
                  </button>
                </div>
              </div>

              {/* Success and Error Banners */}
              {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-green-950/50 border border-green-900 text-xs text-green-400 font-semibold flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errors.length > 0 && (
                <div className="mb-4 p-4 rounded-xl bg-red-950/50 border border-red-900 text-xs text-red-400 font-semibold space-y-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="font-bold">Validation Failures:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {errors.map((e, idx) => <li key={idx}>{e}</li>)}
                  </ul>
                </div>
              )}

              {/* Form Input View */}
              {activePreviewTab === "Edit" ? (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  
                  {/* Subject and ID */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-500 font-bold block mb-1">Subject</label>
                      <input 
                        type="text" 
                        value="Mathematics" 
                        disabled 
                        className="w-full h-10 px-3 bg-gray-950/40 border border-gray-800 rounded-lg text-gray-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 font-bold block mb-1">Question ID</label>
                      <input 
                        type="text" 
                        value={formId} 
                        onChange={(e) => setFormId(e.target.value)}
                        className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-lg text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                        placeholder="Automatic ID"
                      />
                    </div>
                  </div>

                  {/* Chapter and Topic */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 font-bold block mb-1">Chapter</label>
                      <input 
                        type="text" 
                        value={formChapter} 
                        onChange={(e) => setFormChapter(e.target.value)}
                        className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-lg text-white font-medium focus:outline-none focus:border-blue-500"
                        placeholder="e.g. Calculus"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 font-bold block mb-1">Topic</label>
                      <input 
                        type="text" 
                        value={formTopic} 
                        onChange={(e) => setFormTopic(e.target.value)}
                        className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-lg text-white font-medium focus:outline-none focus:border-blue-500"
                        placeholder="e.g. Limits"
                        required
                      />
                    </div>
                  </div>

                  {/* Difficulty and Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 font-bold block mb-1">Difficulty</label>
                      <select 
                        value={formDifficulty} 
                        onChange={(e) => setFormDifficulty(e.target.value as any)}
                        className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-lg text-white font-medium focus:outline-none focus:border-blue-500"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 font-bold block mb-1">Format Type</label>
                      <select 
                        value={formType} 
                        onChange={(e) => setFormType(e.target.value as any)}
                        className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-lg text-white font-medium focus:outline-none focus:border-blue-500"
                      >
                        <option value="MCQ">Single Choice MCQ</option>
                        <option value="NUMERICAL">Numerical Response</option>
                      </select>
                    </div>
                  </div>

                  {/* Question Text Area */}
                  <div>
                    <label className="text-gray-400 font-bold block mb-1">
                      Question Text (Supports LaTeX inline $ or display $$)
                    </label>
                    <textarea 
                      rows={4}
                      value={formQuestion}
                      onChange={(e) => setFormQuestion(e.target.value)}
                      className="w-full p-3 bg-gray-950 border border-gray-800 rounded-lg text-white font-medium focus:outline-none focus:border-blue-500 placeholder-gray-700"
                      placeholder="Type question. Example: Find limit of $\lim_{x \to 0} \frac{\sin x}{x}$."
                      required
                    />
                  </div>

                  {/* MCQ Options (Only if MCQ) */}
                  {formType === "MCQ" && (
                    <div className="space-y-2.5 bg-gray-950/20 p-4 border border-gray-800 rounded-2xl">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                        MCQ Options (Supports LaTeX math):
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-gray-400 font-bold mb-0.5 block">Option A</label>
                          <input 
                            type="text" 
                            value={formOptionA} 
                            onChange={(e) => setFormOptionA(e.target.value)}
                            className="w-full h-9 px-2 bg-gray-950 border border-gray-800 rounded-lg text-white"
                            placeholder="Option A value"
                            required={formType === "MCQ"}
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 font-bold mb-0.5 block">Option B</label>
                          <input 
                            type="text" 
                            value={formOptionB} 
                            onChange={(e) => setFormOptionB(e.target.value)}
                            className="w-full h-9 px-2 bg-gray-950 border border-gray-800 rounded-lg text-white"
                            placeholder="Option B value"
                            required={formType === "MCQ"}
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 font-bold mb-0.5 block">Option C</label>
                          <input 
                            type="text" 
                            value={formOptionC} 
                            onChange={(e) => setFormOptionC(e.target.value)}
                            className="w-full h-9 px-2 bg-gray-950 border border-gray-800 rounded-lg text-white"
                            placeholder="Option C value"
                            required={formType === "MCQ"}
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 font-bold mb-0.5 block">Option D</label>
                          <input 
                            type="text" 
                            value={formOptionD} 
                            onChange={(e) => setFormOptionD(e.target.value)}
                            className="w-full h-9 px-2 bg-gray-950 border border-gray-800 rounded-lg text-white"
                            placeholder="Option D value"
                            required={formType === "MCQ"}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Correct Answer Selector */}
                  <div>
                    <label className="text-gray-400 font-bold block mb-1">Correct Answer key</label>
                    {formType === "MCQ" ? (
                      <select 
                        value={formCorrectAnswer} 
                        onChange={(e) => setFormCorrectAnswer(e.target.value)}
                        className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-lg text-white font-medium"
                      >
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                      </select>
                    ) : (
                      <input 
                        type="number" 
                        step="any"
                        value={formCorrectAnswer === "A" ? "" : formCorrectAnswer} 
                        onChange={(e) => setFormCorrectAnswer(e.target.value)}
                        className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-lg text-white font-mono"
                        placeholder="Enter the numerical result (e.g. 1.5)"
                        required={formType === "NUMERICAL"}
                      />
                    )}
                  </div>

                  {/* Solution Explanations */}
                  <div>
                    <label className="text-gray-400 font-bold block mb-1">
                      Step-by-step Solution (Supports LaTeX Math)
                    </label>
                    <textarea 
                      rows={4}
                      value={formSolution}
                      onChange={(e) => setFormSolution(e.target.value)}
                      className="w-full p-3 bg-gray-950 border border-gray-800 rounded-lg text-white font-medium focus:outline-none focus:border-blue-500 placeholder-gray-700"
                      placeholder="Write how to solve the question step-by-step using formulas."
                      required
                    />
                  </div>

                  {/* Concepts & Tags */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 font-bold block mb-1">Concepts (comma-separated)</label>
                      <input 
                        type="text" 
                        value={formConcepts} 
                        onChange={(e) => setFormConcepts(e.target.value)}
                        className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-lg text-white"
                        placeholder="e.g. Indeterminate, Limits"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 font-bold block mb-1">Tags (comma-separated)</label>
                      <input 
                        type="text" 
                        value={formTags} 
                        onChange={(e) => setFormTags(e.target.value)}
                        className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-lg text-white"
                        placeholder="e.g. Algebra, Limits"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md cursor-pointer text-xs"
                  >
                    Create persistent Question
                  </button>

                </form>
              ) : (
                // Live LaTeX Compilation Preview View
                <div className="space-y-6 text-xs bg-gray-950/20 p-4 border border-gray-800 rounded-2xl min-h-[400px]">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">Question Text Rendering</span>
                    <div className="p-4 rounded-xl border border-gray-800 bg-[#070b13] text-sm text-gray-200">
                      {formQuestion ? (
                        <MathRenderer text={formQuestion} />
                      ) : (
                        <span className="text-gray-700 font-medium italic">Type in the Question Text field to see real-time compilation...</span>
                      )}
                    </div>
                  </div>

                  {formType === "MCQ" && (formOptionA || formOptionB || formOptionC || formOptionD) && (
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">MCQ Options rendering</span>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {[formOptionA, formOptionB, formOptionC, formOptionD].map((opt, idx) => (
                          <div key={idx} className="p-2 border border-gray-800 bg-[#070b13] rounded-lg text-gray-300">
                            <strong className="text-blue-400 mr-1.5">{String.fromCharCode(65 + idx)}:</strong>
                            <MathRenderer text={opt || ""} inline={true} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">Step-by-step Solution rendering</span>
                    <div className="p-4 rounded-xl border border-purple-900/20 bg-purple-950/5 text-sm text-gray-300">
                      {formSolution ? (
                        <MathRenderer text={formSolution} />
                      ) : (
                        <span className="text-gray-700 font-medium italic">Type in the step-by-step solution explanation to see preview...</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right panel: Table list (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#090d16] border border-gray-800 rounded-3xl p-6">
              
              {/* Table search filters */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-600" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ID, text or chapter..."
                    className="w-full pl-10 pr-4 h-10 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-0 placeholder-gray-700"
                  />
                </div>

                <div className="flex space-x-3 w-full sm:w-auto text-xs">
                  {/* Difficulty filter */}
                  <select
                    value={filterDifficulty}
                    onChange={(e) => setFilterDifficulty(e.target.value)}
                    className="h-10 px-3 bg-gray-950 border border-gray-800 rounded-xl text-gray-400 font-semibold"
                  >
                    <option value="All">All Difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>

                  {/* Type filter */}
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="h-10 px-3 bg-gray-950 border border-gray-800 rounded-xl text-gray-400 font-semibold"
                  >
                    <option value="All">All Formats</option>
                    <option value="MCQ">MCQ</option>
                    <option value="NUMERICAL">Numerical</option>
                  </select>
                </div>
              </div>

              {/* Table list */}
              <div className="overflow-x-auto min-h-[450px]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 font-extrabold uppercase tracking-wider pb-3">
                      <th className="pb-3">ID</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Chapter</th>
                      <th className="pb-3">Difficulty</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {filteredQuestions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-600 font-medium italic">
                          No matching questions found in pool.
                        </td>
                      </tr>
                    ) : (
                      filteredQuestions.map((q) => {
                        const isSeeded = !q.id.match(/^m-[a-z]+-cust-/); 
                        // Standard seeded questions cannot be deleted
                        const isSeededCore = !q.id.includes("cust") && !q.id.includes("-custom-") && !isNaN(Number(q.id.split("-").pop() || ""));

                        return (
                          <tr key={q.id} className="hover:bg-gray-800/10 group transition-colors">
                            <td className="py-4 font-bold text-white font-mono">{q.id}</td>
                            <td className="py-4">
                              <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                                q.type === "MCQ" 
                                  ? "bg-green-950 text-green-400 border border-green-900/30" 
                                  : "bg-blue-950 text-blue-400 border border-blue-900/30"
                              }`}>
                                {q.type}
                              </span>
                            </td>
                            <td className="py-4 text-gray-300 font-medium">{q.chapter}</td>
                            <td className="py-4">
                              <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                                q.difficulty === "Easy" 
                                  ? "bg-blue-500/10 text-blue-400" 
                                  : q.difficulty === "Medium"
                                    ? "bg-yellow-500/10 text-yellow-400"
                                    : "bg-red-500/10 text-red-400"
                              }`}>
                                {q.difficulty}
                              </span>
                            </td>
                            <td className="py-4 text-right flex items-center justify-end space-x-2">
                              <button
                                onClick={() => setViewingQuestion(q)}
                                className="p-1.5 rounded bg-gray-900 border border-gray-800 hover:bg-gray-850 hover:border-gray-700 text-gray-400 hover:text-white transition-all cursor-pointer"
                                title="Preview Question"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              
                              {!isSeededCore ? (
                                <button
                                  onClick={() => handleDelete(q.id)}
                                  className="p-1.5 rounded bg-red-950/20 border border-red-900/10 hover:bg-red-900 hover:border-red-800 text-red-400 hover:text-white transition-all cursor-pointer"
                                  title="Delete Custom Question"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-[9px] uppercase font-bold tracking-wider text-gray-600 px-2 py-1 bg-gray-950 rounded border border-gray-800">
                                  Seeded
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>

        </div>

      </main>

      {/* Floating Detailed Question Viewer Modal */}
      {viewingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b13]/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b101c] border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4 flex-shrink-0">
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-extrabold text-white font-mono bg-gray-950 border border-gray-800 px-2.5 py-1 rounded">
                  {viewingQuestion.id}
                </span>
                <span className="bg-blue-950/60 border border-blue-900/40 px-2.5 py-1 rounded text-blue-300 font-extrabold uppercase text-[10px]">
                  {viewingQuestion.chapter}
                </span>
              </div>
              <button 
                onClick={() => setViewingQuestion(null)}
                className="p-1 rounded bg-gray-900 hover:bg-gray-800 border border-gray-850 hover:border-gray-700 text-gray-400 hover:text-white transition-all text-xs font-bold px-3 py-1 cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto space-y-6 text-sm pr-1">
              
              {/* Question Text */}
              <div className="prose prose-invert max-w-none text-gray-200">
                <MathRenderer text={viewingQuestion.question} />
              </div>

              {/* Options (If MCQ) */}
              {viewingQuestion.type === "MCQ" && (
                <div className="grid grid-cols-1 gap-2.5 max-w-xl text-xs">
                  {viewingQuestion.options?.map((opt, idx) => {
                    const optChar = String.fromCharCode(65 + idx);
                    const isCorrect = viewingQuestion.correctAnswer === optChar;
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center p-3 rounded-xl border font-semibold ${
                          isCorrect 
                            ? "bg-green-600/15 border-green-500 text-green-300 shadow" 
                            : "bg-gray-950 border-gray-800 text-gray-400"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] mr-3 flex-shrink-0 ${
                          isCorrect 
                            ? "bg-green-500 text-white" 
                            : "bg-gray-900 border border-gray-800 text-gray-500"
                        }`}>
                          {optChar}
                        </div>
                        <div className="flex-1">
                          <MathRenderer text={opt} inline={true} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Correct answer key metadata */}
              <div className="p-4 bg-gray-950/40 border border-gray-800 rounded-2xl grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 font-bold uppercase block tracking-wider mb-0.5">Correct Answer Key</span>
                  <span className="text-sm font-extrabold text-green-400">
                    {viewingQuestion.type === "MCQ" ? `Option ${viewingQuestion.correctAnswer}` : viewingQuestion.correctAnswer}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 font-bold uppercase block tracking-wider mb-0.5">Question Format</span>
                  <span className="text-sm font-extrabold text-blue-400 uppercase">
                    {viewingQuestion.type}
                  </span>
                </div>
              </div>

              {/* Explanation solution panel */}
              <div className="border-t border-gray-800/60 pt-5 space-y-3">
                <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider block">
                  Detailed Explanation
                </span>
                <div className="p-4 bg-purple-950/5 border border-purple-900/10 rounded-2xl text-gray-300 leading-relaxed overflow-x-auto text-xs sm:text-sm">
                  <MathRenderer text={viewingQuestion.solution} />
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
