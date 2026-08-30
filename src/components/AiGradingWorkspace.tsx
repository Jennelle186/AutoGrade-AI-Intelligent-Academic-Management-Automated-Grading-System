import React, { useState } from 'react';
import { Assignment, Student, Rubric, Submission, EvaluationResult } from '../types';
import { SAMPLE_SUBMISSIONS } from '../data/mockGradebook';
import { 
  Sparkles, 
  FileText, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Play, 
  RefreshCw, 
  User, 
  Award, 
  MinusCircle, 
  PlusCircle, 
  Layers
} from 'lucide-react';

interface AiGradingWorkspaceProps {
  assignments: Assignment[];
  students: Student[];
  rubrics: Rubric[];
  submissions: Submission[];
  onSaveGrade: (studentId: string, assignmentId: string, score: number, evaluation: EvaluationResult) => void;
  onAddSubmission: (submission: Submission) => void;
}

export const AiGradingWorkspace: React.FC<AiGradingWorkspaceProps> = ({
  assignments,
  students,
  rubrics,
  submissions,
  onSaveGrade,
  onAddSubmission,
}) => {
  // Active selected assignment
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(assignments[0]?.id || 'test1');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || 's1');
  const [selectedRubricId, setSelectedRubricId] = useState<string>(rubrics[0]?.id || 'rubric-3');
  
  // Submission Text Content
  const activeAssignment = assignments.find(a => a.id === selectedAssignmentId);
  const activeRubric = rubrics.find(r => r.id === selectedRubricId) || rubrics[0];

  const initialSample = submissions.find(s => s.assignmentId === selectedAssignmentId && s.studentId === selectedStudentId);

  const [submissionContent, setSubmissionContent] = useState<string>(
    initialSample?.content || `Student Name: Juan Dela Cruz
Course: ACT - NT A
Assignment: TEST 1 - Comprehensive Midterm Analysis

SECTION 1: Core Derivations
Using the state transition equation: x(k+1) = A x(k) + B u(k).
We derive the controllability matrix C = [B | AB | A^2 B].
Rank of C is 3, which matches matrix dimension n=3. Hence, the system is fully controllable.

SECTION 2: Stability and Lyapunov Functions
V(x) = x^T P x where P > 0.
Taking derivative: V_dot(x) = x^T (A^T P + P A) x.
For stability, A^T P + P A = -Q where Q is positive definite.
We chose Q = I (Identity matrix) and solved P:
P = [2.1, 0.5; 0.5, 1.8], which is positive definite.

SECTION 3: Edge Case Analysis
Missing edge case derivation for zero-input response with initial state non-zero limit boundaries.
`
  );

  const [customInstructions, setCustomInstructions] = useState<string>(
    "Strictly enforce deduction of 15 points if section 3 edge case handling is missing or incomplete."
  );

  // Loading & Result States
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(initialSample?.evaluation || null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Batch Mode
  const [isBatchGrading, setIsBatchGrading] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Load sample content when student / assignment changes
  const handleStudentOrAssignmentChange = (newAssId: string, newStudId: string) => {
    setSelectedAssignmentId(newAssId);
    setSelectedStudentId(newStudId);
    
    // Find matching submission or set default template
    const match = submissions.find(s => s.assignmentId === newAssId && s.studentId === newStudId);
    const studentObj = students.find(s => s.id === newStudId);
    const assObj = assignments.find(a => a.id === newAssId);

    if (match) {
      setSubmissionContent(match.content);
      setEvaluation(match.evaluation || null);
    } else {
      setSubmissionContent(`Student Name: ${studentObj?.name || 'Student Name'}
Course: ACT - NT A
Assignment: ${assObj?.name || 'Assignment'}

--- SUBMISSION CONTENT ---
Please paste the student's solution, essay text, code, or answers here...
`);
      setEvaluation(null);
    }
    setIsSaved(false);
    setErrorMsg(null);
  };

  // Format Rubric into text prompt
  const buildRubricText = (rubric: Rubric) => {
    let txt = `Rubric Title: ${rubric.title}\nTotal Possible Points: ${rubric.totalPoints}\nCriteria:\n`;
    rubric.criteria.forEach((c, idx) => {
      txt += `${idx + 1}. ${c.title} (${c.max_points} pts): ${c.description}\n`;
      if (c.expectations && c.expectations.length > 0) {
        txt += `   Expectations: ${c.expectations.join(', ')}\n`;
      }
    });
    return txt;
  };

  // Execute AI Grading
  const handleRunAiGrading = async () => {
    if (!submissionContent.trim()) {
      setErrorMsg("Please paste or type a student submission before running AI grading.");
      return;
    }

    setIsGrading(true);
    setErrorMsg(null);
    setIsSaved(false);

    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionText: submissionContent,
          rubricText: buildRubricText(activeRubric),
          assignmentTitle: activeAssignment?.name || 'Assignment',
          maxScore: activeAssignment?.maxPoints || 100,
          customInstructions: customInstructions.trim(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData?.error || 'Failed to grade submission');
      }

      const result: EvaluationResult = await response.json();
      result.evaluatedAt = new Date().toLocaleTimeString();
      setEvaluation(result);
    } catch (err: any) {
      setErrorMsg(err?.message || "An error occurred while connecting to Gemini AI.");
    } finally {
      setIsGrading(false);
    }
  };

  // Save Score & Sync to Gradebook
  const handleSaveToGradebook = () => {
    if (!evaluation) return;
    onSaveGrade(selectedStudentId, selectedAssignmentId, evaluation.score, evaluation);

    // Save as submission record
    const studentObj = students.find(s => s.id === selectedStudentId);
    onAddSubmission({
      id: `sub-${Date.now()}`,
      studentId: selectedStudentId,
      studentName: evaluation.student_name || studentObj?.name || 'Student',
      assignmentId: selectedAssignmentId,
      content: submissionContent,
      submittedAt: new Date().toLocaleString(),
      status: 'GRADED',
      evaluation: evaluation,
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Run Batch Grading for all pending submissions
  const handleRunBatchGrading = async () => {
    const pendingSubs = submissions.filter(s => s.status === 'PENDING' || !s.evaluation);
    if (pendingSubs.length === 0) {
      alert("All submissions in queue are already graded!");
      return;
    }

    setIsBatchGrading(true);
    setBatchProgress({ current: 0, total: pendingSubs.length });

    for (let i = 0; i < pendingSubs.length; i++) {
      const sub = pendingSubs[i];
      setBatchProgress({ current: i + 1, total: pendingSubs.length });

      try {
        const assObj = assignments.find(a => a.id === sub.assignmentId) || activeAssignment;
        const rubObj = rubrics.find(r => r.id === assObj?.rubricId) || activeRubric;

        const response = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionText: sub.content,
            rubricText: buildRubricText(rubObj),
            assignmentTitle: assObj?.name || 'Assignment',
            maxScore: assObj?.maxPoints || 100,
            customInstructions: customInstructions,
          }),
        });

        if (response.ok) {
          const evalRes: EvaluationResult = await response.json();
          onSaveGrade(sub.studentId, sub.assignmentId, evalRes.score, evalRes);
        }
      } catch (err) {
        console.error("Error batch grading submission:", sub.id, err);
      }
    }

    setIsBatchGrading(false);
    setBatchProgress(null);
    alert(`Batch evaluation completed for ${pendingSubs.length} submissions!`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#141414] text-[#E4E3E0] p-6 border-2 border-[#141414] shadow-[4px_4px_0px_#141414] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-[#E4E3E0]" />
            <h2 className="text-sm font-bold font-serif italic tracking-wide uppercase">AI Submission Grading Workspace</h2>
          </div>
          <p className="text-xs text-[#E4E3E0]/80 font-mono max-w-2xl">
            Evaluate student submissions against rubric criteria using Gemini 3.6 Flash. Extracts student names, calculates score breakdowns, identifies point deductions, and syncs directly to your Gradebook.
          </p>
        </div>

        <button
          id="batch-grade-btn"
          disabled={isBatchGrading}
          onClick={handleRunBatchGrading}
          className="hd-btn-secondary px-4 py-2 flex items-center space-x-2 disabled:opacity-50 whitespace-nowrap"
        >
          <Layers className="w-4 h-4" />
          <span>{isBatchGrading ? `Grading (${batchProgress?.current}/${batchProgress?.total})...` : 'Batch Grade Pending'}</span>
        </button>
      </div>

      {/* Main Grid: Controls & Input (Left) | Evaluation Result (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Submission Input & Rubric Context (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Controls Selector Card */}
          <div className="bg-white p-4 border border-[#141414] shadow-[3px_3px_0px_#141414] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            {/* Student Dropdown */}
            <div>
              <label className="block text-[#141414] font-bold mb-1 uppercase">Select Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => handleStudentOrAssignmentChange(selectedAssignmentId, e.target.value)}
                className="w-full px-3 py-2 border border-[#141414] bg-[#E4E3E0]/30 text-[#141414] font-bold outline-none focus:outline-2 focus:outline-[#141414]"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignment Dropdown */}
            <div>
              <label className="block text-[#141414] font-bold mb-1 uppercase">Select Assignment</label>
              <select
                value={selectedAssignmentId}
                onChange={(e) => handleStudentOrAssignmentChange(e.target.value, selectedStudentId)}
                className="w-full px-3 py-2 border border-[#141414] bg-[#E4E3E0]/30 text-[#141414] font-bold outline-none focus:outline-2 focus:outline-[#141414]"
              >
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.maxPoints} pts)
                  </option>
                ))}
              </select>
            </div>

            {/* Rubric Dropdown */}
            <div>
              <label className="block text-[#141414] font-bold mb-1 uppercase">Active Rubric</label>
              <select
                value={selectedRubricId}
                onChange={(e) => setSelectedRubricId(e.target.value)}
                className="w-full px-3 py-2 border border-[#141414] bg-[#E4E3E0]/30 text-[#141414] font-bold outline-none focus:outline-2 focus:outline-[#141414]"
              >
                {rubrics.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.totalPoints} pts)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submission Text Area Card */}
          <div className="bg-white border border-[#141414] shadow-[3px_3px_0px_#141414] p-4 space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#141414] uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-[#141414]" />
                <span>Student Submission Content</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  const sample = SAMPLE_SUBMISSIONS[0];
                  setSubmissionContent(sample.content);
                }}
                className="text-[11px] font-bold text-[#141414] underline hover:bg-[#E4E3E0] px-2 py-0.5"
              >
                Load Sample Work
              </button>
            </div>

            <textarea
              rows={12}
              value={submissionContent}
              onChange={(e) => setSubmissionContent(e.target.value)}
              placeholder="Paste student submission text, essay, derivation, code, or answers here..."
              className="w-full p-3 font-mono text-xs border border-[#141414] bg-[#E4E3E0]/20 text-[#141414] outline-none focus:outline-2 focus:outline-[#141414] leading-relaxed"
            />

            {/* Custom Instructions Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#141414] mb-1">
                Special Grading Focus / Deductions Override (Optional):
              </label>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Deduct 10 points for missing diagram, verify derivations step-by-step"
                className="w-full px-3 py-2 border border-[#141414] bg-white text-xs outline-none focus:outline-2 focus:outline-[#141414]"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-[#141414]">
              <span className="text-[11px] uppercase tracking-wider text-[#141414]/70">
                Engine: <span className="font-bold text-[#141414]">Gemini 3.6 Flash</span>
              </span>

              <button
                id="run-ai-grade-btn"
                disabled={isGrading}
                onClick={handleRunAiGrading}
                className="hd-btn-primary px-5 py-2.5 flex items-center space-x-2 disabled:opacity-50"
              >
                {isGrading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Evaluating Submission...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Evaluate with Gemini AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner if any */}
          {errorMsg && (
            <div className="bg-rose-100 border-2 border-[#141414] p-3.5 text-rose-950 font-mono text-xs flex items-center space-x-2 shadow-[2px_2px_0px_#141414]">
              <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Right Column: AI Structured Evaluation Output (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {evaluation ? (
            <div className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_#141414] overflow-hidden space-y-4 font-mono">
              {/* Output Header */}
              <div className="bg-[#141414] text-[#E4E3E0] p-4 flex items-center justify-between border-b border-[#141414]">
                <div className="flex items-center space-x-2">
                  <Award className="w-5 h-5 text-[#E4E3E0]" />
                  <h3 className="font-serif italic font-bold text-sm uppercase">AI Evaluation Result</h3>
                </div>
                <span className="hd-badge-outline text-[10px] bg-white text-[#141414]">
                  JSON PARSED
                </span>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Score & Student Extracted Info */}
                <div className="p-4 bg-[#E4E3E0]/40 border border-[#141414] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#141414]/70 font-bold block">
                      Extracted Student
                    </span>
                    <span className="text-sm font-bold text-[#141414] flex items-center space-x-1 mt-0.5">
                      <User className="w-4 h-4 text-[#141414]" />
                      <span>{evaluation.student_name}</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-[#141414]/70 font-bold block">
                      Score Awarded
                    </span>
                    <div className="text-xl font-black text-[#141414]">
                      {evaluation.score} <span className="text-xs font-normal text-[#141414]/70">/ {activeAssignment?.maxPoints || 100} pts</span>
                    </div>
                  </div>
                </div>

                {/* Feedback Box */}
                <div>
                  <h4 className="font-bold text-[#141414] mb-1 flex items-center space-x-1.5 uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-[#141414]" />
                    <span>Summary Feedback</span>
                  </h4>
                  <p className="p-3 bg-[#E4E3E0]/30 border border-[#141414] text-[#141414] leading-relaxed italic">
                    "{evaluation.feedback}"
                  </p>
                </div>

                {/* Criterion Breakdown Table */}
                {evaluation.criterion_scores && evaluation.criterion_scores.length > 0 && (
                  <div>
                    <h4 className="font-bold text-[#141414] mb-2 uppercase">Criterion Score Breakdown</h4>
                    <div className="border border-[#141414] divide-y divide-[#141414]">
                      {evaluation.criterion_scores.map((c, idx) => (
                        <div key={idx} className="p-2.5 bg-white space-y-0.5">
                          <div className="flex items-center justify-between font-bold text-[#141414]">
                            <span>{c.criterion}</span>
                            <span className="text-[#141414] font-black">
                              {c.points_awarded} / {c.points_possible} pts
                            </span>
                          </div>
                          {c.feedback && <p className="text-[11px] text-[#141414]/70">{c.feedback}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deductions List */}
                {evaluation.deductions && evaluation.deductions.length > 0 && (
                  <div>
                    <h4 className="font-bold mb-1 text-rose-900 flex items-center space-x-1 uppercase">
                      <MinusCircle className="w-3.5 h-3.5 text-rose-700" />
                      <span>Point Deductions Applied</span>
                    </h4>
                    <ul className="space-y-1">
                      {evaluation.deductions.map((d, idx) => (
                        <li key={idx} className="p-2 bg-rose-50 border border-[#141414] text-rose-950 flex items-start justify-between font-bold">
                          <span>{d.reason}</span>
                          <span className="font-mono text-rose-900 ml-2">-{d.points} pts</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Strengths List */}
                {evaluation.strengths && evaluation.strengths.length > 0 && (
                  <div>
                    <h4 className="font-bold mb-1 text-emerald-900 flex items-center space-x-1 uppercase">
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Key Strengths Identified</span>
                    </h4>
                    <ul className="list-disc list-inside space-y-0.5 text-emerald-950 bg-emerald-50/60 p-2.5 border border-[#141414]">
                      {evaluation.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Save & Sync Button */}
                <div className="pt-2 border-t border-[#141414]">
                  <button
                    id="save-to-gradebook-btn"
                    onClick={handleSaveToGradebook}
                    className={`w-full py-3 px-4 font-bold text-xs uppercase flex items-center justify-center space-x-2 border border-[#141414] shadow-[2px_2px_0px_#141414] transition-all ${
                      isSaved
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90'
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Saved to Gradebook Matrix!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Score to Gradebook</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-[#141414] p-8 text-center space-y-3 flex flex-col items-center justify-center min-h-[400px] font-mono">
              <div className="p-3 bg-[#141414] text-[#E4E3E0]">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-[#141414] text-sm uppercase">READY FOR EVALUATION</h3>
              <p className="text-xs text-[#141414]/70 max-w-xs">
                Select a student submission on the left and click "Evaluate with Gemini AI" to calculate rubric scores, point deductions, and summary feedback.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
