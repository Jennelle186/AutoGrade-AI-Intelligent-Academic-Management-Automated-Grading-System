import React, { useState, useEffect } from 'react';
import { 
  Assignment, 
  Student, 
  Rubric, 
  Submission, 
  ActiveTab, 
  CourseSection,
  WeightConfig,
  GradeScaleRow,
  BatchGradingResultItem
} from './types';
import { 
  INITIAL_ASSIGNMENTS, 
  INITIAL_STUDENTS, 
  INITIAL_GRADES, 
  INITIAL_RUBRICS, 
  SAMPLE_SUBMISSIONS 
} from './data/mockGradebook';
import { Header } from './components/Header';
import { CoursesSectionsPage } from './components/CoursesSectionsPage';
import { WeightConfiguratorPage } from './components/WeightConfiguratorPage';
import { GradeScalePage } from './components/GradeScalePage';
import { BatchGradingPage } from './components/BatchGradingPage';
import { SpreadsheetGradebook } from './components/SpreadsheetGradebook';
import { RubricManager } from './components/RubricManager';
import { IndividualReport } from './components/IndividualReport';
import { AiStudioPromptModal } from './components/AiStudioPromptModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('courses-sections');

  // Backend state
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [activeSection, setActiveSection] = useState<CourseSection | null>(null);
  const [activeWeightConfig, setActiveWeightConfig] = useState<WeightConfig | null>(null);
  const [activeGradeScale, setActiveGradeScale] = useState<GradeScaleRow[]>([]);
  const [classAverage, setClassAverage] = useState<number>(0);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);

  // State populated directly from database
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<string, Record<string, number | null>>>({});
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // Helper for safe JSON fetching with error handling
  const safeFetchJson = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      if (contentType.includes('application/json')) {
        const err = await res.json();
        throw new Error(err.error || err.message || `Server error (${res.status})`);
      } else {
        const text = await res.text();
        throw new Error(`Server returned HTTP ${res.status}: ${text.slice(0, 100)}`);
      }
    }
    if (contentType.includes('application/json')) {
      return await res.json();
    } else {
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`Expected JSON response but received non-JSON: ${text.slice(0, 100)}`);
      }
    }
  };

  // Load rubrics from API
  const loadRubrics = async () => {
    try {
      const data = await safeFetchJson('/api/rubrics');
      setRubrics(data);
    } catch (err) {
      console.error('Failed to load rubrics:', err);
    }
  };

  // Load sections from API on mount
  const loadSections = async () => {
    try {
      const data = await safeFetchJson('/api/sections');
      setSections(data);
      if (data.length > 0 && !activeSection) {
        setActiveSection(data[0]);
        loadSectionDetails(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load sections:', err);
    }
  };

  const loadSectionDetails = async (sectionId: string) => {
    try {
      const data = await safeFetchJson(`/api/sections/${sectionId}/gradebook`);
      if (data) {
        if (data.weight_config) setActiveWeightConfig(data.weight_config);
        if (data.grade_scale) setActiveGradeScale(data.grade_scale || []);
        if (data.class_average !== undefined) setClassAverage(data.class_average);
      }
    } catch (err) {
      console.error('Failed to load section details:', err);
    }
  };

  useEffect(() => {
    loadSections();
    loadRubrics();
  }, []);

  const handleSelectSection = (sec: CourseSection) => {
    setActiveSection(sec);
    loadSectionDetails(sec.id);
  };

  // Section Management API Handlers
  const handleCreateSection = async (section_name: string, subject_name: string, passing_threshold: number) => {
    const newSec = await safeFetchJson('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_name, subject_name, passing_threshold }),
    });
    await loadSections();
    handleSelectSection(newSec);
  };

  const handleDeleteSection = async (sectionId: string) => {
    await safeFetchJson(`/api/sections/${sectionId}`, { method: 'DELETE' });
    await loadSections();
    if (activeSection?.id === sectionId) {
      setActiveSection(null);
    }
  };

  const handleSaveRoster = async (sectionId: string, rosterStudents: any[]) => {
    await safeFetchJson(`/api/sections/${sectionId}/roster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: rosterStudents, overwrite: false }),
    });
    await loadSections();
  };

  // Weight Configurator API Handler
  const handleSaveWeights = async (
    sectionId: string,
    midtermWeight: number,
    finalWeight: number,
    lectureWeight: number,
    labWeight: number,
    components: any[],
    treeData?: any
  ) => {
    await safeFetchJson(`/api/sections/${sectionId}/weights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        midterm_weight: midtermWeight,
        final_weight: finalWeight,
        lecture_weight: lectureWeight,
        laboratory_weight: labWeight,
        components,
        tree_data: treeData,
      }),
    });
    await loadSectionDetails(sectionId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('weight-config-updated', { detail: { sectionId } }));
    }
  };

  // Grade Scale API Handler
  const handleSaveScale = async (sectionId: string, scale: GradeScaleRow[]) => {
    await safeFetchJson(`/api/sections/${sectionId}/scale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scale }),
    });
    await loadSectionDetails(sectionId);
  };

  // Batch Grading API Handler
  const handleProcessBatchGrading = async (payload: any): Promise<BatchGradingResultItem[]> => {
    return await safeFetchJson('/api/grading/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  };

  const handleSaveApprovedGrades = async (sectionId: string, approvedGrades: any[]) => {
    await safeFetchJson(`/api/sections/${sectionId}/gradebook/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grades: approvedGrades }),
    });
    await loadSectionDetails(sectionId);
  };

  // Gradebook Sheet API Fetcher
  const handleFetchGradebook = async (sectionId: string) => {
    return await safeFetchJson(`/api/sections/${sectionId}/gradebook`);
  };

  // Rubric Management
  const handleAddRubric = async (rubric: Rubric) => {
    try {
      const res = await fetch('/api/rubrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rubric),
      });
      if (res.ok) {
        await loadRubrics();
      }
    } catch (err) {
      console.error('Failed to save rubric:', err);
    }
  };

  const handleUpdateRubric = async (updated: Rubric) => {
    try {
      const res = await fetch('/api/rubrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        await loadRubrics();
      }
    } catch (err) {
      console.error('Failed to update rubric:', err);
    }
  };

  const handleDeleteRubric = async (rubricId: string) => {
    try {
      const res = await fetch(`/api/rubrics/${rubricId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadRubrics();
      }
    } catch (err) {
      console.error('Failed to delete rubric:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans antialiased flex flex-col">
      {/* Global Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        className={activeSection ? `${activeSection.section_name} (${activeSection.subject_name})` : 'ACT - NT A'}
        teacherName="Faculty Professor"
        studentCount={activeSection?.studentCount || students.length}
        assignmentCount={assignments.length}
        classAveragePercentage={classAverage}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'courses-sections' && (
          <CoursesSectionsPage
            sections={sections}
            activeSection={activeSection}
            onSelectSection={handleSelectSection}
            onCreateSection={handleCreateSection}
            onDeleteSection={handleDeleteSection}
            onSaveRoster={handleSaveRoster}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'weights-config' && (
          <WeightConfiguratorPage
            activeSection={activeSection}
            initialConfig={activeWeightConfig}
            onSaveWeights={handleSaveWeights}
          />
        )}

        {activeTab === 'grade-scales' && (
          <GradeScalePage
            activeSection={activeSection}
            initialScale={activeGradeScale}
            onSaveScale={handleSaveScale}
          />
        )}

        {activeTab === 'batch-grading' && (
          <BatchGradingPage
            activeSection={activeSection}
            sections={sections}
            rubrics={rubrics}
            onProcessBatchGrading={handleProcessBatchGrading}
            onSaveApprovedGrades={handleSaveApprovedGrades}
            onNavigateToTab={setActiveTab}
          />
        )}

        {(activeTab === 'spreadsheet-grid' || activeTab === 'gradebook-sheet') && (
          <SpreadsheetGradebook
            activeSection={activeSection}
            sections={sections}
            onSelectSection={handleSelectSection}
            onFetchGradebook={handleFetchGradebook}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'rubrics' && (
          <RubricManager
            rubrics={rubrics}
            sections={sections}
            onAddRubric={handleAddRubric}
            onUpdateRubric={handleUpdateRubric}
            onDeleteRubric={handleDeleteRubric}
          />
        )}

        {activeTab === 'individual-reports' && (
          <IndividualReport
            activeSection={activeSection}
            sections={sections}
            onSelectSection={handleSelectSection}
            onFetchGradebook={handleFetchGradebook}
          />
        )}

        {activeTab === 'ai-studio-prompt' && <AiStudioPromptModal />}
      </main>

      {/* High Density Footer */}
      <footer className="bg-[#E4E3E0] border-t-2 border-[#141414] text-[#141414] py-3 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 uppercase font-mono tracking-wider text-[11px]">
          <span>Academic Gradebook System • Multi-Section Management & Gemini 3.6 Engine</span>
          <span className="font-bold bg-[#141414] text-[#E4E3E0] px-2 py-0.5">Google AI Studio Build</span>
        </div>
      </footer>
    </div>
  );
}

