import React, { useState } from 'react';
import { Code, Copy, Check, Sparkles, Terminal, FileCode, Layers, Database } from 'lucide-react';

export const AiStudioPromptModal: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const systemInstructionsText = `You are the AI grading engine for a multi-section academic management system. Your job is to process course configurations, auto-identify students from mass file uploads, evaluate student work against rubrics, and output database-ready structured records.

======================================================================
1. SYSTEM ARCHITECTURE & DATABASE DATA MODEL
======================================================================
You operate on a system structured around 5 primary entities/tables:

1. Courses/Sections Table:
   - Stores section_id, section_name (e.g., "ACT - NT A"), course_subject (e.g., "Web Development"), and passing_threshold (e.g., 60%).

2. Students Table (Roster):
   - Stores student_id, student_name, and section_id. Maps students to their respective section rosters.

3. Grade Component Weights Table:
   - Configurable per section/subject. Breakdown includes:
     * Lecture vs. Laboratory split (e.g., Lecture 60%, Lab 40%)
     * Term split (e.g., Midterm 40%, Final Term 60%)
     * Sub-components (e.g., Lecture: Major Exam 40%, Quizzes 30%, Activities 30% | Lab: Major Exam 40%, Lab Exercises 50%, Attendance/Assignments 10%)

4. Grade Conversion Scale Table:
   - Maps percentage ranges to numerical ratings (1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 5.00).
   - Supports special administrative status codes:
     * "INC" (Incomplete - missing major requirement despite passing marks)
     * "UW" (Unauthorized Withdrawal - unofficial stoppage)
     * "AW" (Authorized Withdrawal - officially dropped)

5. Student Task Grades Table:
   - Stores record_id, student_id, section_id, course_subject, term, class_type, component_category, task_name, raw_score, total_items, percentage_score, numerical_rating, remarks, feedback, and timestamp.

======================================================================
2. MODE 1: SECTION & WEIGHT CONFIGURATION (SETUP MODE)
======================================================================
When given course details, rosters, and weight setups:
- Validate that component weights total 100% per section/class_type.
- Generate and output database records/INSERT structures to initialize the section, student roster, weight configuration, and conversion scale.

======================================================================
3. MODE 2: BATCH SUBMISSION IDENTIFICATION & AUTOMATED GRADING
======================================================================
When mass-uploaded student files (PDFs, Word documents, images, code files) are submitted:

A. AUTOMATED STUDENT IDENTIFICATION:
   - Scan internal document text, headers, title blocks, code comments, and file metadata to identify the Student Name and Student ID.
   - Match the identified student against the active Section Roster.
   - If internal details are missing, parse the document filename.
   - If the identity cannot be matched with certainty, set student_id to "UNKNOWN" and flag "identity_unverified": true.

B. EVALUATION & SCORE COMPUTATION:
   - Evaluate each submission against the provided subject rubric.
   - Extract raw_score earned out of total_items available.
   - Calculate percentage_score = (raw_score / total_items) * 100.
   - Assign the task to its designated term (Midterm/Final), class_type (Lecture/Laboratory), and component_category (e.g., Major Exam, Quizzes, Lab Exercises, Activities).
   - Lookup the numerical_rating and remarks based on the section's Grade Conversion Scale.

C. ADMINISTRATIVE STATUS HANDLING:
   - If a submission indicates or requires an administrative mark, assign the appropriate status code ("INC", "UW", "AW") in the grade status field.

======================================================================
4. OUTPUT FORMATTING RULES
======================================================================
- For batch grading, return strictly a valid JSON ARRAY of objects (one per file).
- Do NOT wrap output in markdown code blocks (no \`\`\`json).
- Do NOT include conversational text, intro remarks, or commentary outside the JSON payload.`;

  const jsonSchemaText = `[
  {
    "filename": "Lab1_JuanDelaCruz.pdf",
    "student_id": "2024-00123",
    "student_name": "Juan Dela Cruz",
    "identity_unverified": false,
    "section_name": "ACT - NT A",
    "subject_name": "Web Development",
    "term": "Midterm",
    "class_type": "Laboratory",
    "component_category": "Lab Exercises",
    "task_name": "Lab Exercise 1",
    "raw_score": 40,
    "total_items": 50,
    "percentage_score": 80.0,
    "numerical_rating": "2.00",
    "grade_status": "PASSED",
    "feedback": "Clear logic and valid structure. Deducted 10 points for missing inline comments."
  }
]`;

  const userPromptText = `INSTRUCTIONS:
1. Process all attached student submission files simultaneously.
2. Auto-identify the owner of each file by scanning headers, text signatures, and filenames against the course roster.
3. Grade each submission according to the attached Rubric using the following parameters:

COURSE METADATA:
- Section Name: ACT - NT A
- Subject Name: Web Development
- Term: Midterm
- Class Type: Laboratory
- Component: Lab Exercises

COMPONENT WEIGHT CONFIGURATION:
- Lecture Grade (60%): Major Exam (40%), Quizzes (30%), Activities/Assignments (30%)
- Laboratory Grade (40%): Major Exam (40%), Lab Exercises (50%), Attendance/Assignments (10%)
- Final Rating: Midterm (40%), Final Term (60%)
- Passing Grade: 60%

SPECIAL STATUSES TO SUPPORT:
- INC (Incomplete)
- UW (Unauthorized Withdrawal)
- AW (Authorized Withdrawal)

--- ATTACHED RUBRIC & ROSTER ---
[Insert/Attach Rubric & Student Roster File Here]

--- MASS UPLOAD STUDENT SUBMISSIONS ---
[Drag and Drop / Attach All Student Submission Files Here]`;

  const handleCopy = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="bg-[#141414] text-[#E4E3E0] p-6 border-2 border-[#141414] shadow-[4px_4px_0px_#141414] space-y-2">
        <div className="flex items-center space-x-2">
          <Code className="w-5 h-5 text-[#E4E3E0]" />
          <h2 className="text-sm font-bold uppercase font-serif italic">Complete Google AI Studio System Instructions & Schema Suite</h2>
        </div>
        <p className="text-xs text-[#E4E3E0]/80 max-w-3xl leading-relaxed font-mono">
          Copy these production-grade System Instructions, JSON Output Schema, and Master Batch Prompt to configure multi-section grading, student auto-identification, component weight calculations, and status codes (INC, UW, AW) directly in <span className="font-bold underline text-[#E4E3E0]">Google AI Studio</span>.
        </p>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3 bg-white border border-[#141414] shadow-[2px_2px_0px_#141414] space-y-1">
          <div className="flex items-center space-x-1.5 font-bold uppercase text-[#141414]">
            <Layers className="w-4 h-4" />
            <span>Mass Auto-Identification</span>
          </div>
          <p className="text-[11px] text-[#141414]/70">Parses internal document text & filenames against rosters automatically.</p>
        </div>

        <div className="p-3 bg-white border border-[#141414] shadow-[2px_2px_0px_#141414] space-y-1">
          <div className="flex items-center space-x-1.5 font-bold uppercase text-[#141414]">
            <Database className="w-4 h-4" />
            <span>Multi-Section Schema</span>
          </div>
          <p className="text-[11px] text-[#141414]/70">Includes SQL database initialization rules for courses, rosters, and scale ranges.</p>
        </div>

        <div className="p-3 bg-white border border-[#141414] shadow-[2px_2px_0px_#141414] space-y-1">
          <div className="flex items-center space-x-1.5 font-bold uppercase text-[#141414]">
            <Sparkles className="w-4 h-4" />
            <span>INC / UW / AW Support</span>
          </div>
          <p className="text-[11px] text-[#141414]/70">Recognizes official administrative status codes and incomplete grade states.</p>
        </div>
      </div>

      {/* Section 1: System Instructions */}
      <div className="bg-white border border-[#141414] shadow-[3px_3px_0px_#141414] overflow-hidden space-y-2">
        <div className="p-4 bg-[#E4E3E0] border-b border-[#141414] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-[#141414]" />
            <h3 className="font-bold text-xs text-[#141414] uppercase">1. System Instructions (Paste into Google AI Studio System Field)</h3>
          </div>

          <button
            onClick={() => handleCopy(systemInstructionsText, 'system')}
            className="hd-btn-secondary px-3 py-1.5 flex items-center space-x-1.5"
          >
            {copiedSection === 'system' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-800" />
                <span className="text-emerald-800 font-bold">COPIED!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>COPY INSTRUCTIONS</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4">
          <pre className="p-4 bg-[#141414] text-[#E4E3E0] font-mono text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap border border-[#141414] max-h-[400px]">
            {systemInstructionsText}
          </pre>
        </div>
      </div>

      {/* Section 2: Structured JSON Schema */}
      <div className="bg-white border border-[#141414] shadow-[3px_3px_0px_#141414] overflow-hidden space-y-2">
        <div className="p-4 bg-[#E4E3E0] border-b border-[#141414] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-[#141414]" />
            <h3 className="font-bold text-xs text-[#141414] uppercase">2. Response JSON Schema (Set Response MIME: application/json)</h3>
          </div>

          <button
            onClick={() => handleCopy(jsonSchemaText, 'schema')}
            className="hd-btn-secondary px-3 py-1.5 flex items-center space-x-1.5"
          >
            {copiedSection === 'schema' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-800" />
                <span className="text-emerald-800 font-bold">COPIED!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>COPY JSON SCHEMA</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4">
          <pre className="p-4 bg-[#141414] text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed border border-[#141414]">
            {jsonSchemaText}
          </pre>
        </div>
      </div>

      {/* Section 3: Master Setup & Test Prompt */}
      <div className="bg-white border border-[#141414] shadow-[3px_3px_0px_#141414] overflow-hidden space-y-2">
        <div className="p-4 bg-[#E4E3E0] border-b border-[#141414] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#141414]" />
            <h3 className="font-bold text-xs text-[#141414] uppercase">3. Master Setup & Batch Test Prompt (Paste in Prompt Box)</h3>
          </div>

          <button
            onClick={() => handleCopy(userPromptText, 'user')}
            className="hd-btn-secondary px-3 py-1.5 flex items-center space-x-1.5"
          >
            {copiedSection === 'user' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-800" />
                <span className="text-emerald-800 font-bold">COPIED!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>COPY PROMPT TEMPLATE</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4">
          <pre className="p-4 bg-[#141414] text-amber-300 font-mono text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap border border-[#141414]">
            {userPromptText}
          </pre>
        </div>
      </div>
    </div>
  );
};

