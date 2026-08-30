# 🎓 AutoGrade AI — Intelligent Academic Management & Automated Grading System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-000000.svg?logo=express)](https://expressjs.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase Firestore](https://img.shields.io/badge/Firebase-Firestore-FFCA28.svg?logo=firebase)](https://firebase.google.com/)
[![Gemini / Vertex AI](https://img.shields.io/badge/Gemini_API-2.5_Flash-8E75B2.svg?logo=google)](https://ai.google.dev/)

> Afull-stack Academic Management & Automated Grading platform engineered for higher education and secondary institutions. Combines **multimodal AI document intelligence (Gemini 2.5 Flash / Vertex AI)**, an **interactive multi-language code execution sandbox**, **human-in-the-loop review workbenches**, **dynamic rubric creation**, and **weighted institutional gradebook synchronization** across Firebase Firestore and Google Drive.

---

## 📌 Project Overview & Value Proposition

Grading hundreds of varied student submissions (PDFs, Word documents, source code in multiple languages, compressed ZIPs, or spreadsheets) while maintaining institutional rubric standards and providing timely, constructive feedback is one of the biggest bottlenecks for educators.

**AutoGrade AI** solves this by automating:
1. **Automated Multi-Modal Document & Code Ingestion**: Extracts text, structure, source code, and metadata across PDF, DOCX, ZIP, CSV, XLSX, and raw programming source files.
2. **Metadata Intelligence & Entity Resolution**: Accurately extracts Student IDs, names, detects team submissions (recursively mapping group members to official rosters), and flags unmatched students.
3. **Multi-Criterion Rubric Evaluation**: Leverages Gemini 2.5 Flash / Vertex AI with strict JSON schema enforcement to grade criterion-by-criterion with transparent scoring breakdowns and qualitative feedback.
4. **Interactive Code & Document Reviewer Sandbox**: Split-screen human-in-the-loop review workstation with live in-browser code execution for JavaScript, Python, C++, Java, Rust, and HTML/CSS with emulated console I/O.
5. **Weighted Institutional Grade Calculation**: Flexible grading system supporting CHED/DepEd/University 1.00–5.00 numerical rating scales, transmutation tables, attendance/marks adjustments (e.g. Absent, Cheating, Excused), and weighted lecture/laboratory midterm/final formulas.
6. **Cloud & Cloud Storage Synchronization**: Persistent two-way sync with Firebase Firestore and automated batch retrieval from shared Google Drive folders.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (React 19 + Vite + Tailwind v4)        │
│                                                                        │
│  ┌───────────────────────┐  ┌──────────────────────┐  ┌──────────────┐ │
│  │ Batch Grading Studio  │  │ Interactive Reviewer  │  │  Gradebook   │ │
│  │  - File/ZIP Dropzone  │  │  - Code Sandbox (IDE) │  │  - Matrix    │ │
│  │  - Drive Batch Ingest │  │  - Criterion Override │  │  - Analytics │ │
│  │  - Excel/CSV Parser   │  │  - Quick Presets      │  │  - Transmute │ │
│  └──────────┬────────────┘  └──────────┬───────────┘  └──────┬───────┘ │
└─────────────┼──────────────────────────┼─────────────────────┼─────────┘
              │                          │                     │
              ▼                          ▼                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FULL-STACK SERVER (Express + Node.js)           │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ RESTful API Layer (/api/*)                                       │  │
│  │  • /api/grade-batch           • /api/grade-single-submission     │  │
│  │  • /api/generate-rubric       • /api/sync-gdrive-batch           │  │
│  │  • /api/transcribe-handwriting • /api/generate-progress-report   │  │
│  └──────────────────┬───────────────────────────────────────────────┘  │
│                     │                                                  │
│         ┌───────────┴──────────┐            ┌────────────────────────┐ │
│         ▼                      ▼            ▼                        ▼ │
│  ┌──────────────┐      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │ Gemini 2.5   │      │ Vertex AI   │ │ Google Auth │ │ Document    │ │
│  │ Flash (GenAI)│      │ Enterprise  │ │ Drive v3 API│ │ Ingestion   │ │
│  └──────────────┘      └─────────────┘ └─────────────┘ └─────────────┘ │
└────────────────────────────────┼───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    DATABASE & STORAGE (Firebase Firestore)             │
│                                                                        │
│  • sections        • students (rosters)      • grades_sync             │
│  • rubrics         • weight_configs          • historical_logs         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Key Modules & Capabilities

### 1. Multi-Modal Batch AI Grading Pipeline
- **File Format Support**: Native text and binary parsing for `.pdf`, `.docx`, `.zip`, `.js`, `.ts`, `.py`, `.cpp`, `.java`, `.rs`, `.html`, `.css`, `.csv`, `.xlsx`, and `.txt`.
- **Entity & Group Detection**: Identifies whether a submission is *INDIVIDUAL* or *GROUP*, extracts all student names/IDs, and mirrors group grades automatically across all co-authors in the section roster upon confirmation.
- **Academic Integrity & Anomaly Flagging**: Highlights zero scores, unverified roster matches, suspected plagiarism/code similarities, late penalties, and formatting errors.

### 2. Interactive Reviewer Workbench & Multi-Language Code Sandbox
- **Side-by-Side Review**: View student files and formatted code alongside AI scoring breakdowns and qualitative rationales.
- **Live Code Execution**: Run student submissions in browser sandboxes (JavaScript, Python, C++, Java, Rust, HTML/CSS) with real-time stdout/stderr capture.
- **One-Click Quick Presets**: Rapidly record institutional marks such as:
  - `Absent (0)` — 0 points + Absent note
  - `No Sub (0)` — 0 points + Missing submission note
  - `Cheated (0)` — 0 points + Academic Integrity violation flag
  - `Excused (EX)` — Excused status with medical/university slip note
  - `Late (-10)` — Automatic score deduction with late penalty note
- **Manual Grade Overrides**: Point-and-click criterion slider adjustments with instantaneous recalculation.

### 3. Class Gradebook & Institutional Weight Computation
- **Hierarchical Grade Components**: Configurable weighted structures (Quizzes, Laboratory Exercises, Assignments, Projects, Midterm & Final Exams).
- **Official Transmutation Tables**: Accurate CHED/DepEd grading scales (1.00–5.00 numerical grades, percentage ratings, and Pass/Fail/INC/UW status).
- **Roster Alignment**: Match scores against official student lists via Student ID or fuzzy name resolution (handling "Surname, Firstname" vs "Firstname Surname").

### 4. Dynamic AI Rubric Architect
- **Learning Outcome Mapping**: Generates structured, weighted grading rubrics from course syllabus objectives or assignment prompts.
- **Criteria Tiers**: Defines explicit performance levels (Exemplary, Proficient, Developing, Beginning) with quantitative point ranges and actionable evaluation rubrics.

### 5. Student Progress & Diagnostic Report Generator
- **Personalized Feedback Synthesis**: Aggregates assignment performance, attendance marks, and category trends into constructive student progress reports.
- **Export Formats**: One-click export to formatted Excel spreadsheets (`.xlsx`), JSON data, and printable academic summaries.

---

## 🛠️ Tech Stack & Engineering Highlights

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4, Motion (Framer Motion), Lucide Icons |
| **Backend** | Express 4.21, Node.js (ESM/CJS bundled with esbuild), Google GenAI SDK (`@google/genai`), Google Cloud Vertex AI (`@google-cloud/vertexai`) |
| **Database** | Firebase Firestore (Realtime database & document sync), Google Auth Library |
| **File Processing** | `pdf-parse`, `mammoth` (DOCX), `jszip` (ZIP extraction), `xlsx` (Excel engine) |
| **Code Sandbox** | Multi-language sandbox engine with browser-safe emulation and terminal output |
| **Tooling & Build** | `tsx` dev server, `esbuild` production bundler, ESLint, TypeScript Strict Mode |

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
- **Node.js** v18.0.0 or higher (`node -v`)
- **npm** v9+ (or `pnpm` / `yarn`)
- **Google AI Studio API Key** (or Google Cloud Vertex AI credentials)

### 2. Installation
```bash
# 1. Clone repository
git clone https://github.com/<your-username>/autograde-ai.git
cd autograde-ai

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
```

### 3. Environment Variables (`.env`)
```env
# Google AI Studio API Key (Required for server-side AI features)
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"

# Optional: Google Cloud Vertex AI Configuration
GCP_PROJECT="your-gcp-project-id"
LOCATION="asia-southeast1" # or "us-central1"
# GOOGLE_APPLICATION_CREDENTIALS="./gcp-key.json"

# Optional: Firebase Firestore Configuration
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIRESTORE_DATABASE_ID="(default)"
```

### 4. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 5. Production Build
```bash
npm run build
npm run start
```

## Acknowledgments & Development Note
This project was built as a hands-on exploration of Google Cloud's ecosystem. I wanted to test out **Google AI Studio** and **Gemini 2.5 Flash** to see how effectively multimodal AI could handle complex document intelligence and automated academic grading workflows.
