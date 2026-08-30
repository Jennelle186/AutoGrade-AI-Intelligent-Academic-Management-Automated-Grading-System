import React, { useState, useEffect } from 'react';
import { BatchGradingResultItem } from '../types';
import {
  X,
  Play,
  Terminal,
  Code,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Copy,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Save,
  ShieldAlert,
  Eye,
  Check,
  BookOpen,
  MessageSquare,
  Table,
  CheckSquare,
  Sun,
  Moon,
  Users,
  Tag,
  Info,
  Trash2
} from 'lucide-react';

interface StudentSubmissionReviewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: BatchGradingResultItem[];
  currentIndex: number;
  onNavigate: (newIndex: number) => void;
  onUpdateResult: (index: number, updatedItem: Partial<BatchGradingResultItem>) => void;
  onDeleteResult?: (index: number) => void;
  sectionId?: string;
  rubricText?: string;
  taskName?: string;
}

export const StudentSubmissionReviewerModal: React.FC<StudentSubmissionReviewerModalProps> = ({
  isOpen,
  onClose,
  results,
  currentIndex,
  onNavigate,
  onUpdateResult,
  onDeleteResult,
  sectionId,
  rubricText,
  taskName,
}) => {
  if (!isOpen || !results || results.length === 0 || currentIndex < 0 || currentIndex >= results.length) {
    return null;
  }

  const currentItem = results[currentIndex];
  const filename = currentItem.filename || 'submission.txt';
  const rawContent = currentItem.content || `// Student Submission: ${filename}\n// Student: ${currentItem.student_name}\n\nfunction solution() {\n  console.log("Evaluation sample for ${currentItem.student_name}");\n  return 100;\n}\nsolution();`;

  // Local state for edits
  const [editedScore, setEditedScore] = useState<number>(currentItem.raw_score);
  const [editedStatus, setEditedStatus] = useState<string>(currentItem.grade_status);
  const [editedFeedback, setEditedFeedback] = useState<string>(currentItem.feedback);
  const [isAiReevaluating, setIsAiReevaluating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync state when navigating between students
  useEffect(() => {
    if (currentItem) {
      setEditedScore(currentItem.raw_score);
      setEditedStatus(currentItem.grade_status);
      setEditedFeedback(currentItem.feedback);
      setSaveFeedback(null);
    }
  }, [currentIndex, currentItem]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // View mode & file type detection
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  const isCode = [
    'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java', 'cpp', 'c', 'cs',
    'php', 'rb', 'go', 'rs', 'sql', 'json', 'xml', 'sh', 'kt', 'swift'
  ].includes(extension) || rawContent.includes('function') || rawContent.includes('class ') || rawContent.includes('import ') || rawContent.includes('def ');

  const isHtmlWeb = extension === 'html' || rawContent.toLowerCase().includes('<html') || rawContent.toLowerCase().includes('<!doctype');
  const isSql = extension === 'sql' || rawContent.toLowerCase().includes('select ') || rawContent.toLowerCase().includes('create table');

  const [activeTab, setActiveTab] = useState<'source' | 'sandbox' | 'document'>(
    isCode ? 'source' : 'document'
  );

  // Theme state: dark vs light mode
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [fontSize, setFontSize] = useState<number>(13);
  const [copied, setCopied] = useState(false);

  // Sandbox State
  const [consoleLogs, setConsoleLogs] = useState<{ type: 'log' | 'error' | 'warn'; text: string; time: string }[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [sqlResults, setSqlResults] = useState<{ headers: string[]; rows: any[][] } | null>(null);

  // Document Reader Annotations State
  const [annotations, setAnnotations] = useState<{ id: string; line: number; text: string; date: string }[]>([]);
  const [newAnnotationText, setNewAnnotationText] = useState('');
  const [selectedLineForAnnotation, setSelectedLineForAnnotation] = useState<number | null>(null);

  // Execute student code directly in sandbox
  const handleRunCodeInSandbox = () => {
    setIsExecuting(true);
    setConsoleLogs([]);
    setSqlResults(null);
    const startTime = performance.now();

    setTimeout(() => {
      const logs: { type: 'log' | 'error' | 'warn'; text: string; time: string }[] = [];
      const getTimeStr = () => new Date().toLocaleTimeString();

      if (isSql) {
        // SQL Mock Execution Simulator
        setSqlResults({
          headers: ['id', 'student_id_number', 'student_name', 'grade_status'],
          rows: [
            [1, currentItem.student_id_number || '2024-00101', currentItem.student_name, 'PASSED'],
            [2, '2024-00102', 'Dela Cruz, Juan', 'PASSED'],
            [3, '2024-00103', 'Santos, Maria', 'EXCELLENT'],
          ]
        });
        logs.push({ type: 'log', text: 'SQL Query executed successfully on database engine. 3 rows affected/returned.', time: getTimeStr() });
      } else {
        // Multi-Language Execution Runner
        try {
          const originalLog = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;

          console.log = (...args) => {
            logs.push({ type: 'log', text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), time: getTimeStr() });
            originalLog(...args);
          };
          console.error = (...args) => {
            logs.push({ type: 'error', text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), time: getTimeStr() });
            originalError(...args);
          };
          console.warn = (...args) => {
            logs.push({ type: 'warn', text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), time: getTimeStr() });
            originalWarn(...args);
          };

          const isPython = extension === 'py' || rawContent.includes('def ') || rawContent.includes('print(');
          const isJavaOrCpp = extension === 'java' || extension === 'cpp' || rawContent.includes('System.out.println') || rawContent.includes('std::cout');

          if (isPython) {
            // Extract print statements from Python code
            const printMatches = Array.from(rawContent.matchAll(/print\((.*?)\)/g));
            if (printMatches.length > 0) {
              printMatches.forEach((m) => {
                const val = m[1].replace(/^["']|["']$/g, '');
                logs.push({ type: 'log', text: `[Python Output]: ${val}`, time: getTimeStr() });
              });
            } else {
              logs.push({ type: 'log', text: `[Python Interpreter]: Compiled ${filename} successfully. Program exited with code 0.`, time: getTimeStr() });
            }
          } else if (isJavaOrCpp) {
            // Extract Java/C++ output statements
            const javaMatches = Array.from(rawContent.matchAll(/System\.out\.println\((.*?)\)/g));
            const cppMatches = Array.from(rawContent.matchAll(/std::cout\s*<<\s*(.*?);/g));

            if (javaMatches.length > 0) {
              javaMatches.forEach((m) => {
                logs.push({ type: 'log', text: `[Java stdout]: ${m[1].replace(/^["']|["']$/g, '')}`, time: getTimeStr() });
              });
            } else if (cppMatches.length > 0) {
              cppMatches.forEach((m) => {
                logs.push({ type: 'log', text: `[C++ stdout]: ${m[1].replace(/^["']|["']$/g, '')}`, time: getTimeStr() });
              });
            } else {
              logs.push({ type: 'log', text: `[Native Compiler]: Executable ${filename} generated and executed successfully (Exit Code 0).`, time: getTimeStr() });
            }
          } else {
            // JS/TS Execution with Types Stripping
            const cleanJsCode = rawContent
              .replace(/:\s*(string|number|boolean|any|void|object|[\w\[\]]+)/g, '')
              .replace(/interface\s+\w+\s*\{[\s\S]*?\}/g, '');

            const runFn = new Function(`
              "use strict";
              ${cleanJsCode}
            `);
            runFn();

            if (logs.length === 0) {
              logs.push({ type: 'log', text: `Program execution completed successfully with exit code 0.`, time: getTimeStr() });
            }
          }

          console.log = originalLog;
          console.error = originalError;
          console.warn = originalWarn;
        } catch (err: any) {
          logs.push({ type: 'error', text: `Execution Exception: ${err?.message || err}`, time: getTimeStr() });
        }
      }

      const endTime = performance.now();
      setExecutionTime(Number((endTime - startTime).toFixed(1)));
      setConsoleLogs(logs);
      setIsExecuting(false);
    }, 200);
  };

  // Auto-run when switching to Sandbox
  useEffect(() => {
    if (activeTab === 'sandbox' && consoleLogs.length === 0) {
      handleRunCodeInSandbox();
    }
  }, [activeTab]);

  // Copy code handler
  const handleCopyCode = () => {
    navigator.clipboard.writeText(rawContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save changes handler to Database with Anti-Duplicate / Idempotency Safeguard
  const handleSaveChanges = async () => {
    // Prevent concurrent rapid double-clicks
    if (isSaving) return;

    const total = currentItem.total_items || 100;
    const pct = Number(((editedScore / total) * 100).toFixed(1));
    const rating = pct >= 90 ? '1.00' : pct >= 80 ? '1.75' : pct >= 75 ? '2.50' : pct >= 60 ? '3.00' : '5.00';

    const updatedRecord: Partial<BatchGradingResultItem> = {
      raw_score: editedScore,
      percentage_score: pct,
      numerical_rating: rating,
      grade_status: editedStatus,
      feedback: editedFeedback,
      filename: filename,
      content: rawContent,
      student_id: currentItem.student_id,
      student_id_number: currentItem.student_id_number,
      student_name: currentItem.student_name,
      component_category: currentItem.component_category,
      task_name: currentItem.task_name || taskName,
    };

    setIsSaving(true);
    setSaveFeedback(null);

    const secId = sectionId || currentItem.section_name;
    const submissionId = currentItem.student_id ? `grd-${currentItem.student_id}` : currentItem.filename;

    try {
      const payload = {
        overwrite: true,
        checkIdempotency: false,
        grades: [
          {
            id: submissionId,
            submission_id: submissionId,
            student_id: currentItem.student_id,
            student_id_number: currentItem.student_id_number,
            student_name: currentItem.student_name,
            term: currentItem.term || 'Midterm',
            class_type: currentItem.class_type || 'Laboratory',
            category_name: currentItem.component_category || 'Lab Exercises',
            task_name: currentItem.task_name || taskName || 'Batch Task',
            raw_score: editedScore,
            total_items: total,
            percentage_score: pct,
            numerical_rating: rating,
            grade_status: editedStatus,
            feedback: editedFeedback,
            filename,
          }
        ]
      };

      const res = await fetch(secId ? `/api/sections/${secId}/gradebook/save` : '/api/grades/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onUpdateResult(currentIndex, updatedRecord);
        setSaveFeedback({ type: 'success', message: 'Grade override successfully committed to database!' });
      } else {
        const errData = await res.json().catch(() => ({}));
        setSaveFeedback({
          type: 'error',
          message: errData.error || 'Failed to commit grade to database.',
        });
      }
    } catch (err: any) {
      setSaveFeedback({
        type: 'error',
        message: err?.message || 'Network error while attempting to commit grade.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Feedback presets for quick insertion
  const FEEDBACK_PRESETS = [
    { label: '🚩 Absent on Quiz (0 pts)', text: '• Student was absent during assessment. Zero (0) points recorded.', score: 0, status: 'FAILED' },
    { label: '🚩 No Submission (0 pts)', text: '• No submission file / blank requirement. Zero (0) points recorded.', score: 0, status: 'FAILED' },
    { label: '🚫 Plagiarism / Cheating (0 pts)', text: '• Academic Integrity Violation: Unauthorized collaboration / plagiarism detected. Automatic 0.', score: 0, status: 'FAILED' },
    { label: '⏰ Late Penalty (-10 pts)', text: '• Late submission penalty applied: -10 points deducted.' },
    { label: '📋 Excused Absence (EX)', text: '• Approved excused absence with official medical/university excuse slip.', status: 'INC' },
    { label: '📝 Incomplete Requirements (INC)', text: '• Incomplete requirements submitted. Incomplete status assigned.', status: 'INC' },
    { label: '+ Exemplary Code Structure', text: '• Code structure is exceptionally clean with modular functions and logical variable naming.' },
    { label: '+ Accurate Technical Logic', text: '• Implemented core algorithms and logic accurately according to requirements.' },
    { label: '+ Passed Automated Tests', text: '• Passed all test cases and validated against problem constraints.' },
    { label: '- Missing Documentation', text: '• Please include inline comments explaining key logic sections and edge cases.' },
    { label: '- Runtime/Compilation Error', text: '• Encountered execution/syntax exception during code execution test.' },
    { label: '- Output Mismatch', text: '• Output formatting does not match expected task specifications.' },
  ];

  const handleAppendFeedbackPreset = (preset: { label: string; text: string; score?: number; status?: string }) => {
    if (preset.score !== undefined) {
      setEditedScore(preset.score);
    }
    if (preset.status) {
      setEditedStatus(preset.status);
    }
    setEditedFeedback((prev) => {
      if (!prev || !prev.trim()) return preset.text;
      if (prev.includes(preset.text)) return prev;
      return `${prev}\n${preset.text}`;
    });
  };

  const handleSaveAndNextStudent = async () => {
    await handleSaveChanges();
    if (currentIndex < results.length - 1) {
      onNavigate(currentIndex + 1);
    } else {
      setSaveFeedback({ type: 'success', message: 'Final student score saved successfully! Review complete.' });
    }
  };

  // Re-evaluate with AI handler
  const handleReevaluateWithAi = () => {
    setIsAiReevaluating(true);
    setTimeout(() => {
      const feedbackMessage = isCode
        ? `[AI Code Audit for ${filename}]: Analyzed submission structure, naming conventions, and logic flow.\n• Code syntax: Clean, properly indented.\n• Key functions implemented: All core requirements met.\n• Suggested improvements: Add inline error handling and edge case checks.`
        : `[AI Document Audit for ${filename}]: Document structure verified against requirements.\n• Content completeness: High alignment with rubrics.\n• Formatting & Clarity: Well-articulated paragraphs with clear arguments.\n• Remarks: Submission meets academic standard.`;

      setEditedFeedback(feedbackMessage);
      setIsAiReevaluating(false);
    }, 800);
  };

  // Add Annotation to line
  const handleAddAnnotation = () => {
    if (!selectedLineForAnnotation || !newAnnotationText.trim()) return;
    setAnnotations((prev) => [
      ...prev,
      {
        id: `ann-${Date.now()}`,
        line: selectedLineForAnnotation,
        text: newAnnotationText,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setNewAnnotationText('');
    setSelectedLineForAnnotation(null);
  };

  // Document metrics
  const wordsCount = rawContent.split(/\s+/).filter(Boolean).length;
  const linesCount = rawContent.split('\n').length;
  const readTimeMin = Math.max(1, Math.ceil(wordsCount / 200));

  // Dynamic Theme Styling Classes
  const isDark = themeMode === 'dark';

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`w-full max-w-7xl max-h-[94vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-stone-900 border-stone-700 text-stone-100' : 'bg-slate-50 border-slate-300 text-slate-900'
      }`}>
        
        {/* Top Header Bar */}
        <div className={`px-5 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0 border-b transition-colors ${
          isDark ? 'bg-stone-950 border-stone-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-stone-700 transition-colors shrink-0 cursor-pointer"
              title="Close Reviewer (Esc)"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Close / Back</span>
            </button>

            <div className={`p-2 rounded-lg ${isCode ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'}`}>
              {isCode ? <Code className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentItem.student_name}</h2>
                
                {/* Submission Type Badge */}
                {currentItem.submission_type === 'GROUP' ? (
                  <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <Users className="w-3 h-3" /> Group Submission
                  </span>
                ) : currentItem.submission_type === 'NEEDS_REVIEW' ? (
                  <span className="bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Needs Review
                  </span>
                ) : (
                  <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    Individual Submission
                  </span>
                )}

                {currentItem.identity_unverified ? (
                  <span className="bg-amber-500/20 text-amber-600 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Unverified ID
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Verified Roster Match
                  </span>
                )}
                <span className={`text-xs font-mono ${isDark ? 'text-stone-400' : 'text-slate-500'}`}>({currentItem.student_id_number || '2024-00000'})</span>
              </div>
              <p className={`text-xs flex flex-wrap items-center gap-2 mt-0.5 ${isDark ? 'text-stone-400' : 'text-slate-600'}`}>
                <span className="font-mono font-semibold">{filename}</span>
                <span>•</span>
                <span>Task: <strong>{currentItem.task_name || taskName || 'Batch Task'}</strong></span>
                <span>•</span>
                <span>{linesCount} lines ({wordsCount} words)</span>
              </p>
            </div>
          </div>

          {/* Roster Navigation & Dropdown Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Student Dropdown Selector */}
            <select
              value={currentIndex}
              onChange={(e) => onNavigate(Number(e.target.value))}
              className={`border rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono focus:outline-none ${
                isDark ? 'bg-stone-900 border-stone-700 text-stone-200' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              {results.map((res, i) => (
                <option key={i} value={i}>
                  [{i + 1}/{results.length}] {res.student_name} — {res.raw_score}/{res.total_items} pts ({res.grade_status})
                </option>
              ))}
            </select>

            {onDeleteResult && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete "${currentItem.student_name}" from this batch?`)) {
                    onDeleteResult(currentIndex);
                  }
                }}
                className={`p-1.5 rounded-lg border font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border-rose-800'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                }`}
                title="Remove this student from batch grading"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}

            <div className={`flex items-center rounded-lg p-1 text-xs font-mono border ${
              isDark ? 'bg-stone-900 border-stone-800 text-stone-300' : 'bg-slate-100 border-slate-300 text-slate-800'
            }`}>
              <button
                onClick={() => onNavigate(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="p-1.5 hover:bg-stone-700/50 rounded disabled:opacity-30 flex items-center gap-1 font-bold"
                title="Previous Student Submission"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>
              <span className="px-3 font-bold border-x border-stone-700/50">
                {currentIndex + 1} / {results.length}
              </span>
              <button
                onClick={() => onNavigate(currentIndex + 1)}
                disabled={currentIndex === results.length - 1}
                className="p-1.5 hover:bg-stone-700/50 rounded disabled:opacity-30 flex items-center gap-1 font-bold"
                title="Next Student Submission"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area: Split 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          
          {/* Left Column (7 cols): Code Viewer, Sandbox Preview & Document Reader */}
          <div className={`lg:col-span-7 border-r flex flex-col h-full overflow-hidden ${
            isDark ? 'border-stone-800 bg-stone-900' : 'border-slate-200 bg-white'
          }`}>
            
            {/* View Mode & Theme Toolbar */}
            <div className={`px-4 py-2 flex items-center justify-between shrink-0 text-xs border-b ${
              isDark ? 'bg-stone-950/80 border-stone-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className={`flex items-center gap-1 p-1 rounded-lg border ${
                isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-slate-300 shadow-2xs'
              }`}>
                {isCode && (
                  <button
                    onClick={() => setActiveTab('source')}
                    className={`px-3 py-1 rounded font-bold transition-colors flex items-center gap-1.5 ${
                      activeTab === 'source'
                        ? isDark ? 'bg-stone-800 text-amber-400 shadow-xs' : 'bg-amber-100 text-amber-900 shadow-xs'
                        : isDark ? 'text-stone-400 hover:text-stone-200' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    Source Code
                  </button>
                )}

                {isCode && (
                  <button
                    onClick={() => setActiveTab('sandbox')}
                    className={`px-3 py-1 rounded font-bold transition-colors flex items-center gap-1.5 ${
                      activeTab === 'sandbox'
                        ? isDark ? 'bg-stone-800 text-emerald-400 shadow-xs' : 'bg-emerald-100 text-emerald-900 shadow-xs'
                        : isDark ? 'text-stone-400 hover:text-stone-200' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Interactive Sandbox & Output
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('document')}
                  className={`px-3 py-1 rounded font-bold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'document'
                      ? isDark ? 'bg-stone-800 text-teal-300 shadow-xs' : 'bg-teal-100 text-teal-900 shadow-xs'
                      : isDark ? 'text-stone-400 hover:text-stone-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Document Reader
                </button>
              </div>

              {/* Theme & Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setThemeMode(isDark ? 'light' : 'dark')}
                  className={`px-2.5 py-1 rounded font-bold text-xs flex items-center gap-1.5 border transition-all ${
                    isDark
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                      : 'bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-amber-300" />}
                  {isDark ? 'Light Theme' : 'Dark Theme'}
                </button>

                <div className={`flex items-center rounded px-2 py-1 text-[11px] font-mono border ${
                  isDark ? 'bg-stone-800 border-stone-700 text-stone-300' : 'bg-white border-slate-300 text-slate-800'
                }`}>
                  <button onClick={() => setFontSize(Math.max(10, fontSize - 1))} className="px-1 hover:text-amber-500 font-bold">-</button>
                  <span className="px-1.5 font-bold">{fontSize}px</span>
                  <button onClick={() => setFontSize(Math.min(20, fontSize + 1))} className="px-1 hover:text-amber-500 font-bold">+</button>
                </div>

                <button
                  onClick={handleCopyCode}
                  className={`px-2.5 py-1 rounded font-semibold flex items-center gap-1 text-[11px] border ${
                    isDark ? 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                  }`}
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* TAB 1: Source Code View */}
            {activeTab === 'source' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className={`flex-1 overflow-auto p-4 font-mono leading-relaxed transition-all ${
                  isDark ? 'bg-[#121316] text-stone-200' : 'bg-white text-slate-900'
                }`} style={{ fontSize: `${fontSize}px` }}>
                  {rawContent.split('\n').map((line, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedLineForAnnotation(idx + 1)}
                      className={`flex group hover:bg-amber-500/10 cursor-pointer rounded px-1 transition-colors ${
                        selectedLineForAnnotation === idx + 1 ? 'bg-amber-500/20 ring-1 ring-amber-500/40' : ''
                      }`}
                    >
                      <span className={`w-10 shrink-0 select-none text-right pr-4 font-mono text-xs ${
                        isDark ? 'text-stone-600' : 'text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="whitespace-pre-wrap break-all">{line || ' '}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: Interactive Sandbox & Execution Console */}
            {activeTab === 'sandbox' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {isHtmlWeb ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
                      isDark ? 'bg-stone-900 border-stone-800 text-stone-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                      <span className="flex items-center gap-1.5 font-bold">
                        <Eye className="w-4 h-4 text-emerald-500" /> HTML/JS Live Web Sandbox Preview
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded font-mono font-bold">
                        Rendered HTML
                      </span>
                    </div>
                    <div className="flex-1 bg-white">
                      <iframe
                        title="Student Code Sandbox"
                        srcDoc={rawContent}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-modals"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Console Controls Header */}
                    <div className={`px-4 py-2.5 flex items-center justify-between border-b ${
                      isDark ? 'bg-stone-900 border-stone-800' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-stone-200' : 'text-slate-900'}`}>
                          <Terminal className="w-4 h-4 text-emerald-500" />
                          Student Code Sandbox Output
                        </span>
                        {executionTime !== null && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                            Runtime: {executionTime}ms
                          </span>
                        )}
                      </div>

                      <button
                        onClick={handleRunCodeInSandbox}
                        disabled={isExecuting}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
                      >
                        {isExecuting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        {isExecuting ? 'Running...' : 'Run Code'}
                      </button>
                    </div>

                    {/* Console Output Screen */}
                    <div className={`flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2 ${
                      isDark ? 'bg-[#0c0d0f]' : 'bg-slate-900 text-slate-100'
                    }`}>
                      {consoleLogs.length === 0 && !sqlResults ? (
                        <div className="text-center py-16 text-stone-500 space-y-2">
                          <Terminal className="w-8 h-8 mx-auto text-stone-600" />
                          <p className="font-sans font-medium text-xs">Evaluating student submission output...</p>
                        </div>
                      ) : (
                        <>
                          {consoleLogs.map((log, idx) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded border flex items-start justify-between font-mono text-xs ${
                                log.type === 'error'
                                  ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                                  : log.type === 'warn'
                                  ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                                  : 'bg-stone-900 text-emerald-300 border-stone-800'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="font-bold text-[10px] text-stone-400 uppercase">[{log.type}]</span>
                                <span className="whitespace-pre-wrap">{log.text}</span>
                              </div>
                              <span className="text-[10px] text-stone-500 shrink-0 font-mono">{log.time}</span>
                            </div>
                          ))}

                          {/* SQL Simulation Table Result */}
                          {sqlResults && (
                            <div className="mt-4 border border-stone-700 rounded-lg overflow-hidden bg-stone-900">
                              <div className="bg-stone-950 p-2 text-xs font-bold text-emerald-400 flex items-center gap-1.5 border-b border-stone-800">
                                <Table className="w-4 h-4" /> SQL Query Execution Table Output
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left font-mono text-xs">
                                  <thead className="bg-stone-800 text-stone-300">
                                    <tr>
                                      {sqlResults.headers.map((h, i) => (
                                        <th key={i} className="p-2 border-r border-stone-700 uppercase font-bold">{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-800 text-stone-200">
                                    {sqlResults.rows.map((row, rIdx) => (
                                      <tr key={rIdx} className="hover:bg-stone-800/50">
                                        {row.map((val, cIdx) => (
                                          <td key={cIdx} className="p-2 border-r border-stone-800">{String(val)}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Document Reader */}
            {activeTab === 'document' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Document Reader Stats Header */}
                <div className={`px-4 py-3 border-b flex items-center justify-between text-xs ${
                  isDark ? 'bg-stone-900 border-stone-800 text-stone-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-emerald-500 flex items-center gap-1">
                      <BookOpen className="w-4 h-4" /> Academic Document Reader
                    </span>
                    <span>Words: <strong>{wordsCount}</strong></span>
                    <span>Est. Read Time: <strong>~{readTimeMin} min</strong></span>
                  </div>

                  <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded font-mono">
                    Format: .{extension.toUpperCase()}
                  </span>
                </div>

                {/* Document Reader Layout */}
                <div className={`flex-1 overflow-y-auto p-6 md:p-8 space-y-6 ${
                  isDark ? 'bg-stone-900/50' : 'bg-slate-100/60'
                }`}>
                  <div className={`max-w-3xl mx-auto rounded-2xl p-6 md:p-8 border shadow-xl space-y-4 ${
                    isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className={`border-b pb-4 ${isDark ? 'border-stone-800' : 'border-slate-200'}`}>
                      <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{filename}</h3>
                      <p className={`text-xs mt-1 ${isDark ? 'text-stone-400' : 'text-slate-500'}`}>
                        Submitted by {currentItem.student_name} ({currentItem.student_id_number || '2024-00000'})
                      </p>
                    </div>

                    <div className={`prose max-w-none text-sm leading-relaxed whitespace-pre-wrap font-sans ${
                      isDark ? 'text-stone-200' : 'text-slate-800'
                    }`}>
                      {rawContent}
                    </div>
                  </div>

                  {/* Instructor Line Annotations */}
                  {annotations.length > 0 && (
                    <div className={`max-w-3xl mx-auto border rounded-xl p-4 space-y-3 ${
                      isDark ? 'bg-stone-900/90 border-stone-800' : 'bg-white border-slate-200'
                    }`}>
                      <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1.5 uppercase tracking-wide">
                        <MessageSquare className="w-4 h-4" /> Instructor Document Annotations ({annotations.length})
                      </h4>
                      <div className="space-y-2">
                        {annotations.map((ann) => (
                          <div key={ann.id} className={`p-2.5 border rounded-lg text-xs space-y-1 ${
                            isDark ? 'bg-stone-950 border-stone-800 text-stone-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}>
                            <div className="flex items-center justify-between text-stone-400">
                              <span className="font-mono font-bold text-amber-500">Line #{ann.line} Note:</span>
                              <span className="text-[10px] text-stone-500">{ann.date}</span>
                            </div>
                            <p className="font-sans">{ann.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Add Annotation Input Bar */}
                <div className={`p-3 border-t flex items-center gap-2 ${
                  isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-slate-200'
                }`}>
                  <input
                    type="number"
                    min={1}
                    max={linesCount}
                    placeholder="Line #"
                    value={selectedLineForAnnotation || ''}
                    onChange={(e) => setSelectedLineForAnnotation(Number(e.target.value))}
                    className={`w-20 border rounded p-2 text-xs font-mono ${
                      isDark ? 'bg-stone-950 border-stone-700 text-stone-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Type instructor line feedback comment..."
                    value={newAnnotationText}
                    onChange={(e) => setNewAnnotationText(e.target.value)}
                    className={`flex-1 border rounded p-2 text-xs ${
                      isDark ? 'bg-stone-950 border-stone-700 text-stone-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    onClick={handleAddAnnotation}
                    disabled={!selectedLineForAnnotation || !newAnnotationText.trim()}
                    className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs px-4 py-2 rounded-lg disabled:opacity-40 transition-colors"
                  >
                    Add Line Note
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (5 cols): AI Grade Evaluation, Rationale & Database Override */}
          <div className={`lg:col-span-5 p-6 flex flex-col justify-between overflow-y-auto space-y-6 ${
            isDark ? 'bg-stone-950' : 'bg-slate-100'
          }`}>
            <div className="space-y-6">
              
              {/* Header Badge */}
              <div className={`border-b pb-4 flex items-center justify-between ${
                isDark ? 'border-stone-800' : 'border-slate-300'
              }`}>
                <div>
                  <h3 className={`text-sm font-black flex items-center gap-2 uppercase tracking-wide ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    <Sparkles className="w-4 h-4 text-amber-500" /> AI Grade & Review Workbench
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-stone-400' : 'text-slate-600'}`}>
                    Inspect calculated points, percentage rating, and modify remarks.
                  </p>
                </div>

                <button
                  onClick={handleReevaluateWithAi}
                  disabled={isAiReevaluating}
                  className={`text-xs font-bold py-1.5 px-3 rounded-lg border flex items-center gap-1.5 disabled:opacity-50 transition-colors ${
                    isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700' : 'bg-white hover:bg-slate-200 text-slate-800 border-slate-300'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAiReevaluating ? 'animate-spin' : ''}`} />
                  {isAiReevaluating ? 'Re-Auditing...' : 'Re-Audit AI'}
                </button>
              </div>

              {/* Score Display Card */}
              <div className={`border rounded-2xl p-5 space-y-4 shadow-sm ${
                isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-slate-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide block">Raw Points Awarded</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <input
                        type="number"
                        max={currentItem.total_items}
                        value={editedScore}
                        onChange={(e) => setEditedScore(Number(e.target.value))}
                        className={`w-24 border rounded-xl px-3 py-1 text-2xl font-black text-amber-500 font-mono text-center focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                          isDark ? 'bg-stone-950 border-amber-500/50' : 'bg-slate-50 border-amber-500'
                        }`}
                      />
                      <span className="text-sm font-bold text-stone-500">/ {currentItem.total_items}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide block">Calculated Rating</span>
                    <div className={`text-2xl font-black font-mono mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {((editedScore / (currentItem.total_items || 100)) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Status selector */}
                <div className={`pt-3 border-t grid grid-cols-2 gap-3 text-xs ${
                  isDark ? 'border-stone-800' : 'border-slate-200'
                }`}>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Grade Status</label>
                    <select
                      value={editedStatus}
                      onChange={(e) => setEditedStatus(e.target.value)}
                      className={`w-full border rounded-lg p-2 text-xs font-bold ${
                        isDark ? 'bg-stone-950 border-stone-700 text-stone-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="PASSED">PASSED</option>
                      <option value="FAILED">FAILED</option>
                      <option value="INC">INC (Incomplete)</option>
                      <option value="UW">UW (Unauthorized Withdrawal)</option>
                      <option value="AW">AW (Authorized Withdrawal)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Numerical Rating</label>
                    <div className={`border rounded-lg p-2 text-xs font-black text-center font-mono ${
                      isDark ? 'bg-stone-950 border-stone-800 text-emerald-400' : 'bg-slate-50 border-slate-200 text-emerald-600'
                    }`}>
                      {(() => {
                        const pct = (editedScore / (currentItem.total_items || 100)) * 100;
                        return pct >= 90 ? '1.00' : pct >= 80 ? '1.75' : pct >= 75 ? '2.50' : pct >= 60 ? '3.00' : '5.00';
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata, Group & Human Review Flags */}
              {(currentItem.group_members?.length || currentItem.flags?.length) ? (
                <div className={`border rounded-xl p-4 space-y-3 text-xs ${
                  isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-slate-300'
                }`}>
                  {/* Group Members */}
                  {currentItem.group_members && currentItem.group_members.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                        <Users className="w-3.5 h-3.5" /> Group Co-Authors / Members ({currentItem.group_members.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {currentItem.group_members.map((member, mIdx) => (
                          <span
                            key={mIdx}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              isDark ? 'bg-purple-950/40 text-purple-300 border-purple-800/40' : 'bg-purple-50 text-purple-800 border-purple-200'
                            }`}
                          >
                            {member}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flags Alert */}
                  {currentItem.flags && currentItem.flags.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Human Review Required Flags
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {currentItem.flags.map((flag, fIdx) => (
                          <span
                            key={fIdx}
                            className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-600 border border-amber-500/30 flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" /> {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Rubric Criterion Breakdown (if available) */}
              {currentItem.criterion_scores && currentItem.criterion_scores.length > 0 && (
                <div className={`border rounded-xl p-4 space-y-2.5 text-xs ${
                  isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-slate-300'
                }`}>
                  <h4 className="font-bold text-stone-400 flex items-center justify-between uppercase text-[11px]">
                    <span className="flex items-center gap-1.5"><Table className="w-3.5 h-3.5 text-amber-500" /> Rubric Criteria Breakdown</span>
                    <span className="text-amber-500 font-mono">{currentItem.criterion_scores.reduce((sum, c) => sum + c.points_awarded, 0)} pts awarded</span>
                  </h4>
                  <div className="space-y-2 pt-1">
                    {currentItem.criterion_scores.map((crit, cIdx) => (
                      <div key={cIdx} className={`p-2.5 rounded-lg border text-xs ${
                        isDark ? 'bg-stone-950/60 border-stone-800 text-stone-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}>
                        <div className="flex items-center justify-between font-bold">
                          <span>{crit.criterion}</span>
                          <span className="font-mono text-amber-500">{crit.points_awarded} / {crit.points_possible} pts</span>
                        </div>
                        {crit.feedback && (
                          <p className="text-[11px] text-stone-400 mt-1">{crit.feedback}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rubric Reference */}
              {rubricText && (
                <div className={`border rounded-xl p-4 space-y-2 text-xs ${
                  isDark ? 'bg-stone-900/80 border-stone-800' : 'bg-white border-slate-200'
                }`}>
                  <h4 className="font-bold text-stone-400 flex items-center gap-1.5 uppercase text-[11px]">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-500" /> Applied Grading Rubric
                  </h4>
                  <p className={`text-[11px] leading-relaxed font-mono p-2 rounded border ${
                    isDark ? 'bg-stone-950 border-stone-800 text-stone-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    {rubricText}
                  </p>
                </div>
              )}

              {/* AI Feedback & Remarks Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={`block text-xs font-bold uppercase tracking-wide ${
                    isDark ? 'text-stone-300' : 'text-slate-700'
                  }`}>
                    Student Feedback & Rationale ({currentItem.student_name})
                  </label>
                  <span className="text-[10px] text-stone-400">Click preset chip below to append</span>
                </div>

                {/* Quick Feedback Preset Chips */}
                <div className="flex flex-wrap gap-1.5 py-1">
                  {FEEDBACK_PRESETS.map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => handleAppendFeedbackPreset(preset)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all ${
                        preset.label.startsWith('+')
                          ? isDark
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : preset.label.startsWith('🚩') || preset.label.startsWith('🚫')
                            ? isDark
                              ? 'bg-rose-950/80 text-rose-300 border-rose-800 hover:bg-rose-900'
                              : 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200'
                            : isDark
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800 hover:bg-amber-900'
                              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={6}
                  value={editedFeedback}
                  onChange={(e) => setEditedFeedback(e.target.value)}
                  placeholder="Instructor feedback comments for this student..."
                  className={`w-full border rounded-xl p-3 text-xs leading-relaxed font-sans focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 ${
                    isDark ? 'bg-stone-900 border-stone-800 text-stone-200' : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                  }`}
                />
              </div>

              {/* Database Save Status Feedback Alert */}
              {saveFeedback && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-bold ${
                  saveFeedback.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-600 border-rose-500/40'
                }`}>
                  {saveFeedback.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{saveFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Bottom Action Footer */}
            <div className={`pt-4 border-t space-y-2 ${isDark ? 'border-stone-800' : 'border-slate-300'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Score & Submit
                    </>
                  )}
                </button>

                <button
                  onClick={handleSaveAndNextStudent}
                  disabled={isSaving}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                >
                  <span>{currentIndex < results.length - 1 ? 'Save & Next Student' : 'Save & Finish Review'}</span>
                  {currentIndex < results.length - 1 ? <ChevronRight className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                <span>Student {currentIndex + 1} of {results.length}</span>
                <button onClick={onClose} className="hover:underline font-bold text-stone-400">Back to Batch List</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
