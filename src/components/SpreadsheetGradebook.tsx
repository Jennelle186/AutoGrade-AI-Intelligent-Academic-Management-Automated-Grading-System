import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  CourseSection,
  GridTaskColumn,
  GridCellData,
  SpecialGradeCode,
  GradeScaleRow,
  WeightConfig,
  GradeComponentWeight,
  BatchGradingResultItem,
  GradebookStudent,
  GradebookStudentRecord,
  StudentLiveSummary,
  ClassLiveMetrics,
} from '../types';
import {
  Table,
  Plus,
  SlidersHorizontal,
  Download,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Sparkles,
  Eye,
  Trash2,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { StudentSubmissionReviewerModal } from './StudentSubmissionReviewerModal';
import { ClassMetricsBar } from './gradebook/ClassMetricsBar';
import { GridMatrixTable } from './gradebook/GridMatrixTable';
import { HierarchicalRosterTable } from './gradebook/HierarchicalRosterTable';
import { AddTaskColumnModal, CategoryOption } from './gradebook/AddTaskColumnModal';
import { BulkFillModal } from './gradebook/BulkFillModal';
import { SectionTaskManagerModal, RecordedTaskItem } from './gradebook/SectionTaskManagerModal';

interface SpreadsheetGradebookProps {
  activeSection: CourseSection | null;
  sections: CourseSection[];
  onSelectSection: (section: CourseSection) => void;
  onFetchGradebook?: (sectionId: string) => Promise<any>;
  onNavigateToTab?: (tab: string) => void;
}

// Internal helper to map overall percentage to numerical scale rating
function computeRatingFromScale(pct: number, scale: GradeScaleRow[]): { rating: string; remarks: string } {
  if (!scale || scale.length === 0) {
    if (pct >= 90) return { rating: '1.00', remarks: 'Passed' };
    if (pct >= 75) return { rating: '2.00', remarks: 'Passed' };
    if (pct >= 60) return { rating: '3.00', remarks: 'Passed' };
    return { rating: '5.00', remarks: 'Failed' };
  }

  for (const row of scale) {
    if (row.is_special_status) continue;
    if (pct >= row.min_percentage && pct <= row.max_percentage) {
      return { rating: row.numerical_rating, remarks: row.remarks };
    }
  }
  return { rating: '5.00', remarks: 'Failed' };
}

export const SpreadsheetGradebook: React.FC<SpreadsheetGradebookProps> = ({
  activeSection,
  sections,
  onSelectSection,
  onNavigateToTab,
}) => {
  // -------------------------------------------------------------
  // STATE MANAGEMENT
  // -------------------------------------------------------------
  const [viewMode, setViewMode] = useState<'matrix' | 'hierarchical'>('matrix');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [gradebookData, setGradebookData] = useState<{
    section?: CourseSection;
    weight_config?: WeightConfig;
    grade_scale?: GradeScaleRow[];
    gradebook?: GradebookStudent[];
    students?: GradebookStudent[];
  } | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [termFilter, setTermFilter] = useState<'All' | 'Midterm' | 'Final'>('All');
  const [classTypeFilter, setClassTypeFilter] = useState<'All' | 'Lecture' | 'Laboratory'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Dynamic Task Columns & Cell Map
  const [taskColumns, setTaskColumns] = useState<GridTaskColumn[]>([]);
  const [cellMap, setCellMap] = useState<Record<string, GridCellData>>({});

  // UI Modals
  const [showAddTaskModal, setShowAddTaskModal] = useState<boolean>(false);
  const [showBulkFillModal, setShowBulkFillModal] = useState<boolean>(false);
  const [showTaskManager, setShowTaskManager] = useState<boolean>(false);

  // Add Task Modal Inputs
  const [newTaskName, setNewTaskName] = useState<string>('');
  const [newTaskTerm, setNewTaskTerm] = useState<'Midterm' | 'Final'>('Midterm');
  const [newTaskClassType, setNewTaskClassType] = useState<'Lecture' | 'Laboratory'>('Laboratory');
  const [newTaskCategory, setNewTaskCategory] = useState<string>('');
  const [newTaskMaxPoints, setNewTaskMaxPoints] = useState<number>(100);

  // Bulk Fill Modal Inputs
  const [bulkFillTaskId, setBulkFillTaskId] = useState<string>('');
  const [bulkFillValue, setBulkFillValue] = useState<string>('100');
  const [bulkFillOnlyEmpty, setBulkFillOnlyEmpty] = useState<boolean>(true);

  // AI Section Summary
  const [sectionSummary, setSectionSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);

  // Reviewer Workbench
  const [isReviewerOpen, setIsReviewerOpen] = useState<boolean>(false);
  const [reviewerStudentIndex, setReviewerStudentIndex] = useState<number>(0);
  const [activeReviewerDataset, setActiveReviewerDataset] = useState<BatchGradingResultItem[]>([]);

  // Expanded student rows in Hierarchical view
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  // Debounce timers reference for autosave (500ms delay)
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // -------------------------------------------------------------
  // DATA FETCHING & DATABASE WEIGHT SYNCHRONIZATION
  // -------------------------------------------------------------
  const loadGradebook = useCallback(async () => {
    if (!activeSection) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sections/${activeSection.id}/gradebook`);
      if (!res.ok) throw new Error('Failed to load gradebook');
      const data = await res.json();
      setGradebookData(data);

      const students: GradebookStudent[] = data.gradebook || data.students || [];
      const weightComponents: GradeComponentWeight[] = data.weight_config?.components || [];
      const discoveredTasks = new Map<string, GridTaskColumn>();
      const initialCells: Record<string, GridCellData> = {};

      // 1. Discover tasks from student records
      students.forEach((std) => {
        const studentId = std.student_id || std.id;
        (std.records || []).forEach((rec) => {
          if (!rec.task_name) return;

          const colId = `${rec.term || 'Midterm'}-${rec.class_type || 'Laboratory'}-${rec.task_name}`;

          if (!discoveredTasks.has(colId)) {
            const matchedComp = weightComponents.find(
              (c) =>
                c.term === (rec.term || 'Midterm') &&
                (c.class_type || '').toLowerCase() === (rec.class_type || 'Laboratory').toLowerCase() &&
                (c.category_name || '').toLowerCase().trim() === (rec.category_name || '').toLowerCase().trim()
            );

            discoveredTasks.set(colId, {
              id: colId,
              name: rec.task_name,
              term: rec.term || 'Midterm',
              classType: rec.class_type || 'Laboratory',
              category: rec.category_name || 'Assignment',
              maxPoints: rec.total_items || 100,
              weightPercentage: matchedComp?.weight_percentage,
            });
          }

          const cellKey = `${studentId}_${colId}`;
          const isSpecial = ['EX', 'M', 'INC', 'UW', 'AW'].includes(rec.grade_status || '');
          initialCells[cellKey] = {
            studentId,
            taskId: colId,
            rawScore: rec.raw_score !== undefined ? rec.raw_score : null,
            totalItems: rec.total_items || 100,
            specialCode: isSpecial ? (rec.grade_status as SpecialGradeCode) : 'NONE',
            feedback: rec.feedback || '',
            syncStatus: 'saved',
            lastSavedAt: rec.timestamp,
            isInvalid: false,
            inputValue: isSpecial ? rec.grade_status : rec.raw_score !== null && rec.raw_score !== undefined ? String(rec.raw_score) : '',
          };
        });
      });

      // 2. If no tasks exist yet in gradebook, dynamically synthesize from database weight setup
      if (discoveredTasks.size === 0 && weightComponents.length > 0) {
        weightComponents.forEach((comp, idx) => {
          const colId = `${comp.term}-${comp.class_type}-${comp.category_name} 1`;
          discoveredTasks.set(colId, {
            id: colId,
            name: `${comp.category_name} 1`,
            term: comp.term,
            classType: comp.class_type,
            category: comp.category_name,
            maxPoints: 100,
            weightPercentage: comp.weight_percentage,
          });
        });
      } else if (discoveredTasks.size === 0) {
        // Fallback default tasks if no DB weight components exist
        const defaults: GridTaskColumn[] = [
          { id: 'Midterm-Laboratory-Lab 1', name: 'Lab 1', term: 'Midterm', classType: 'Laboratory', category: 'Lab Exercises', maxPoints: 100, weightPercentage: 50 },
          { id: 'Midterm-Laboratory-Lab 2', name: 'Lab 2', term: 'Midterm', classType: 'Laboratory', category: 'Lab Exercises', maxPoints: 100, weightPercentage: 50 },
          { id: 'Midterm-Lecture-Quiz 1', name: 'Quiz 1', term: 'Midterm', classType: 'Lecture', category: 'Quizzes', maxPoints: 50, weightPercentage: 30 },
          { id: 'Midterm-Lecture-Midterm Exam', name: 'Midterm Exam', term: 'Midterm', classType: 'Lecture', category: 'Major Exam', maxPoints: 100, weightPercentage: 40 },
          { id: 'Final-Laboratory-Lab 3', name: 'Lab 3', term: 'Final', classType: 'Laboratory', category: 'Lab Exercises', maxPoints: 100, weightPercentage: 50 },
          { id: 'Final-Lecture-Final Exam', name: 'Final Exam', term: 'Final', classType: 'Lecture', category: 'Major Exam', maxPoints: 100, weightPercentage: 40 },
        ];
        defaults.forEach((t) => discoveredTasks.set(t.id, t));
      }

      const taskArray = Array.from(discoveredTasks.values());
      setTaskColumns(taskArray);
      setCellMap(initialCells);
      if (taskArray.length > 0) {
        setBulkFillTaskId(taskArray[0].id);
      }
    } catch (err) {
      console.error('Error fetching gradebook matrix:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection?.id) {
      loadGradebook();
    }
  }, [activeSection?.id, loadGradebook]);

  // Listen for weight updates from Step 2 to immediately refresh gradebook
  useEffect(() => {
    const handleWeightUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<{ sectionId?: string }>;
      if (!customEvt.detail?.sectionId || customEvt.detail.sectionId === activeSection?.id) {
        loadGradebook();
      }
    };
    window.addEventListener('weight-config-updated', handleWeightUpdate);
    return () => {
      window.removeEventListener('weight-config-updated', handleWeightUpdate);
    };
  }, [activeSection?.id, loadGradebook]);

  // Clean up debounce timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach((t) => clearTimeout(t));
      debounceTimers.current.clear();
    };
  }, []);

  // -------------------------------------------------------------
  // DYNAMIC CATEGORIES FOR ADD TASK MODAL (From DB Weight Setup)
  // -------------------------------------------------------------
  const availableCategoriesForModal = useMemo<CategoryOption[]>(() => {
    const comps: GradeComponentWeight[] = gradebookData?.weight_config?.components || [];
    const matched = comps.filter(
      (c) =>
        c.term === newTaskTerm &&
        (c.class_type || '').toLowerCase() === newTaskClassType.toLowerCase()
    );

    if (matched.length > 0) {
      return matched.map((c) => ({
        name: c.category_name,
        weight: c.weight_percentage,
        label: `${c.category_name} (${c.weight_percentage}% weight)`,
      }));
    }

    if (newTaskClassType === 'Laboratory') {
      return [
        { name: 'Lab Exercises', weight: 50, label: 'Lab Exercises (Default 50%)' },
        { name: 'Practical Exam', weight: 30, label: 'Practical Exam (Default 30%)' },
        { name: 'Machine Problem', weight: 20, label: 'Machine Problem (Default 20%)' },
      ];
    }

    return [
      { name: 'Major Exam', weight: 40, label: 'Major Exam (Default 40%)' },
      { name: 'Quizzes', weight: 30, label: 'Quizzes (Default 30%)' },
      { name: 'Assignments', weight: 20, label: 'Assignments (Default 20%)' },
      { name: 'Attendance', weight: 10, label: 'Attendance (Default 10%)' },
    ];
  }, [gradebookData, newTaskTerm, newTaskClassType]);

  useEffect(() => {
    if (availableCategoriesForModal.length > 0) {
      const exists = availableCategoriesForModal.some((c) => c.name === newTaskCategory);
      if (!exists) {
        setNewTaskCategory(availableCategoriesForModal[0].name);
      }
    }
  }, [availableCategoriesForModal, newTaskCategory]);

  // -------------------------------------------------------------
  // AUTOSAVE & STRICT INPUT VALIDATION
  // -------------------------------------------------------------
  const executeSaveCell = async (studentId: string, task: GridTaskColumn, cellData: GridCellData) => {
    if (!activeSection) return;

    setCellMap((prev) => ({
      ...prev,
      [`${studentId}_${task.id}`]: { ...prev[`${studentId}_${task.id}`], syncStatus: 'saving' },
    }));

    try {
      const rawScore = cellData.rawScore ?? 0;
      const totalItems = task.maxPoints || 100;
      const percentage = (rawScore / totalItems) * 100;
      const gradeStatus =
        cellData.specialCode && cellData.specialCode !== 'NONE'
          ? cellData.specialCode
          : percentage >= (activeSection.passing_threshold || 60)
          ? 'PASSED'
          : 'FAILED';

      const payload = {
        grades: [
          {
            student_id: studentId,
            section_id: activeSection.id,
            term: task.term,
            class_type: task.classType,
            category_name: task.category,
            task_name: task.name,
            raw_score: rawScore,
            total_items: totalItems,
            percentage_score: Number(percentage.toFixed(1)),
            grade_status: gradeStatus,
            feedback:
              cellData.specialCode && cellData.specialCode !== 'NONE'
                ? `[${cellData.specialCode}] Manual grade code entered`
                : 'Direct grade entered via Spreadsheet Matrix.',
            timestamp: new Date().toISOString(),
          },
        ],
        overwrite: true,
      };

      const res = await fetch(`/api/sections/${activeSection.id}/gradebook/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Failed to save: ${res.statusText}`);

      setCellMap((prev) => ({
        ...prev,
        [`${studentId}_${task.id}`]: {
          ...prev[`${studentId}_${task.id}`],
          syncStatus: 'saved',
          lastSavedAt: new Date().toISOString(),
        },
      }));
    } catch (err) {
      console.error('Error saving grade cell:', err);
      setCellMap((prev) => ({
        ...prev,
        [`${studentId}_${task.id}`]: { ...prev[`${studentId}_${task.id}`], syncStatus: 'error' },
      }));
    }
  };

  const handleCellChange = useCallback(
    (studentId: string, task: GridTaskColumn, inputStr: string) => {
      const key = `${studentId}_${task.id}`;
      const trimmed = inputStr.trim().toUpperCase();

      let rawScore: number | null = null;
      let specialCode: SpecialGradeCode = 'NONE';
      let isInvalid = false;
      let errorMessage: string | undefined = undefined;

      // 1. Check for valid special codes (EX, M, INC, UW, AW)
      if (['EX', 'M', 'INC', 'UW', 'AW'].includes(trimmed)) {
        specialCode = trimmed as SpecialGradeCode;
        rawScore = trimmed === 'EX' ? null : 0;
        isInvalid = false;
      } else if (trimmed === '') {
        // Empty cell
        rawScore = null;
        specialCode = 'NONE';
        isInvalid = false;
      } else {
        // Numeric input validation
        const parsed = parseFloat(trimmed);
        if (isNaN(parsed)) {
          isInvalid = true;
          errorMessage = 'Must be a valid score or code (EX, M, INC, UW, AW)';
        } else if (parsed < 0) {
          isInvalid = true;
          errorMessage = 'Score cannot be negative';
          rawScore = parsed;
        } else if (parsed > task.maxPoints) {
          isInvalid = true;
          errorMessage = `Score cannot exceed maximum points (${task.maxPoints} pts)`;
          rawScore = parsed;
        } else {
          isInvalid = false;
          rawScore = parsed;
          specialCode = 'NONE';
        }
      }

      const updatedCell: GridCellData = {
        studentId,
        taskId: task.id,
        rawScore,
        totalItems: task.maxPoints,
        specialCode,
        inputValue: inputStr,
        isInvalid,
        errorMessage,
        syncStatus: isInvalid ? 'error' : 'unsaved',
      };

      setCellMap((prev) => ({ ...prev, [key]: updatedCell }));

      // Clear any pending debounce timer
      if (debounceTimers.current.has(key)) {
        clearTimeout(debounceTimers.current.get(key)!);
        debounceTimers.current.delete(key);
      }

      // DO NOT fire autosave if the cell is invalid!
      if (isInvalid) {
        return;
      }

      // Set 500ms debounced autosave for valid inputs
      const timer = setTimeout(() => {
        executeSaveCell(studentId, task, updatedCell);
        debounceTimers.current.delete(key);
      }, 500);

      debounceTimers.current.set(key, timer);
    },
    [activeSection]
  );

  // -------------------------------------------------------------
  // MEMOIZED DERIVED DATA & COMPUTATIONS (DB-Driven Weights)
  // -------------------------------------------------------------
  const studentsList = useMemo<GradebookStudent[]>(() => {
    return gradebookData?.gradebook || gradebookData?.students || [];
  }, [gradebookData]);

  const filteredTasks = useMemo<GridTaskColumn[]>(() => {
    return taskColumns.filter((task) => {
      if (termFilter !== 'All' && task.term !== termFilter) return false;
      if (classTypeFilter !== 'All' && task.classType !== classTypeFilter) return false;
      if (categoryFilter !== 'All' && task.category !== categoryFilter) return false;
      return true;
    });
  }, [taskColumns, termFilter, classTypeFilter, categoryFilter]);

  const filteredStudents = useMemo<GradebookStudent[]>(() => {
    if (!searchQuery.trim()) return studentsList;
    const q = searchQuery.toLowerCase().trim();
    return studentsList.filter(
      (s) =>
        (s.student_name || '').toLowerCase().includes(q) ||
        (s.student_id_number || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q)
    );
  }, [studentsList, searchQuery]);

  const availableCategories = useMemo<string[]>(() => {
    const set = new Set<string>();
    taskColumns.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [taskColumns]);

  const allSubmissionsDataset = useMemo<BatchGradingResultItem[]>(() => {
    if (!gradebookData) return [];
    const results: BatchGradingResultItem[] = [];
    studentsList.forEach((std) => {
      (std.records || []).forEach((rec) => {
        results.push({
          student_id: std.student_id || std.id || std.student_id_number || 'std-1',
          student_id_number: std.student_id_number,
          extracted_id: std.student_id_number,
          student_name: std.student_name,
          identity_unverified: false,
          section_name: activeSection?.section_name || 'Section',
          subject_name: activeSection?.subject_name || 'Subject',
          term: rec.term || 'Midterm',
          class_type: rec.class_type || 'Laboratory',
          component_category: rec.category_name || 'Assignment',
          task_name: rec.task_name || 'Assignment',
          filename: rec.filename || `${rec.task_name || 'Submission'}.txt`,
          raw_score: rec.raw_score ?? 0,
          total_items: rec.total_items || 100,
          percentage_score: rec.percentage_score ?? 0,
          numerical_rating: rec.numerical_rating || '3.00',
          grade_status:
            rec.grade_status ||
            (rec.percentage_score ?? 0 >= (activeSection?.passing_threshold || 60)
              ? 'PASSED'
              : 'FAILED'),
          feedback: rec.feedback || '',
          content:
            rec.content ||
            rec.feedback ||
            `Submission file for ${rec.task_name} by ${std.student_name}`,
          submission_type:
            rec.submission_type ||
            (rec.group_members && rec.group_members.length > 0 ? 'GROUP' : 'INDIVIDUAL'),
          group_members: rec.group_members || [],
          flags: rec.flags || [],
          criterion_scores: rec.criterion_scores || [],
        });
      });
    });
    return results;
  }, [gradebookData, studentsList, activeSection]);

  const distinctRecordedTasks = useMemo<RecordedTaskItem[]>(() => {
    if (!gradebookData || studentsList.length === 0) return [];

    const map = new Map<string, RecordedTaskItem>();

    studentsList.forEach((std) => {
      (std.records || []).forEach((rec) => {
        if (!rec.task_name) return;
        const key = `${rec.term}|${rec.class_type}|${(rec.category_name || '')
          .toLowerCase()
          .trim()}|${rec.task_name.toLowerCase().trim()}`;

        const isRealSubmission =
          (rec.id && !rec.id.startsWith('grd-synth-')) ||
          (rec.filename && rec.filename !== 'No file submitted') ||
          rec.raw_score > 0;

        if (!map.has(key)) {
          map.set(key, {
            task_name: rec.task_name,
            category_name: rec.category_name || 'Assignment',
            term: rec.term || 'Midterm',
            class_type: rec.class_type || 'Laboratory',
            count: 1,
            submittedCount: isRealSubmission ? 1 : 0,
          });
        } else {
          const item = map.get(key)!;
          item.count += 1;
          if (isRealSubmission) item.submittedCount += 1;
        }
      });
    });
    return Array.from(map.values());
  }, [gradebookData, studentsList]);

  const hierarchicalComponents = useMemo(() => {
    const comps: GradeComponentWeight[] = gradebookData?.weight_config?.components || [];
    const midtermLec = comps.filter(
      (c) => c.term === 'Midterm' && (c.class_type || '').toLowerCase() === 'lecture'
    );
    const midtermLab = comps.filter(
      (c) => c.term === 'Midterm' && (c.class_type || '').toLowerCase() !== 'lecture'
    );
    const finalLec = comps.filter(
      (c) => c.term === 'Final' && (c.class_type || '').toLowerCase() === 'lecture'
    );
    const finalLab = comps.filter(
      (c) => c.term === 'Final' && (c.class_type || '').toLowerCase() !== 'lecture'
    );

    return {
      midtermLec,
      midtermLab,
      finalLec,
      finalLab,
      totalColumns:
        2 +
        midtermLec.length +
        midtermLab.length +
        3 +
        finalLec.length +
        finalLab.length +
        3 +
        3,
    };
  }, [gradebookData]);

  // -------------------------------------------------------------
  // LOCKED READ-ONLY SUMMARY COMPUTATIONS (useMemo / useCallback)
  // -------------------------------------------------------------
  const calculateStudentLiveSummary = useCallback(
    (student: GradebookStudent): StudentLiveSummary => {
      const studentId = student.student_id || student.id;
      const weightConfig: WeightConfig = gradebookData?.weight_config || {
        section_id: activeSection?.id || '',
        midterm_weight: 40,
        final_weight: 60,
        lecture_weight: 60,
        laboratory_weight: 40,
        components: [],
      };
      const scale: GradeScaleRow[] = gradebookData?.grade_scale || [];

      const termTypeTotals: Record<string, { totalRaw: number; totalMax: number }> = {
        Midterm_Lecture: { totalRaw: 0, totalMax: 0 },
        Midterm_Laboratory: { totalRaw: 0, totalMax: 0 },
        Final_Lecture: { totalRaw: 0, totalMax: 0 },
        Final_Laboratory: { totalRaw: 0, totalMax: 0 },
      };

      let hasSpecialStatus: string | null = null;

      taskColumns.forEach((task) => {
        const cell = cellMap[`${studentId}_${task.id}`];
        const key = `${task.term}_${task.classType}`;

        if (cell && !cell.isInvalid) {
          if (cell.specialCode === 'INC' || cell.specialCode === 'UW' || cell.specialCode === 'AW') {
            hasSpecialStatus = cell.specialCode;
          }

          if (cell.specialCode !== 'EX' && cell.rawScore !== null && cell.rawScore !== undefined) {
            termTypeTotals[key].totalRaw += cell.rawScore;
            termTypeTotals[key].totalMax += task.maxPoints;
          }
        }
      });

      const getAvg = (raw: number, max: number) => (max > 0 ? (raw / max) * 100 : null);
      const midLecAvg = getAvg(
        termTypeTotals.Midterm_Lecture.totalRaw,
        termTypeTotals.Midterm_Lecture.totalMax
      );
      const midLabAvg = getAvg(
        termTypeTotals.Midterm_Laboratory.totalRaw,
        termTypeTotals.Midterm_Laboratory.totalMax
      );
      const finLecAvg = getAvg(
        termTypeTotals.Final_Lecture.totalRaw,
        termTypeTotals.Final_Lecture.totalMax
      );
      const finLabAvg = getAvg(
        termTypeTotals.Final_Laboratory.totalRaw,
        termTypeTotals.Final_Laboratory.totalMax
      );

      const midTotal =
        midLecAvg !== null || midLabAvg !== null
          ? (midLecAvg ?? 0) * (weightConfig.lecture_weight / 100) +
            (midLabAvg ?? 0) * (weightConfig.laboratory_weight / 100)
          : null;

      const finTotal =
        finLecAvg !== null || finLabAvg !== null
          ? (finLecAvg ?? 0) * (weightConfig.lecture_weight / 100) +
            (finLabAvg ?? 0) * (weightConfig.laboratory_weight / 100)
          : null;

      const overall =
        midTotal !== null || finTotal !== null
          ? (midTotal ?? 0) * (weightConfig.midterm_weight / 100) +
            (finTotal ?? 0) * (weightConfig.final_weight / 100)
          : null;

      let ratingInfo =
        overall !== null
          ? computeRatingFromScale(overall, scale)
          : { rating: '-', remarks: 'No Grades' };

      if (hasSpecialStatus) {
        ratingInfo = {
          rating: hasSpecialStatus,
          remarks:
            hasSpecialStatus === 'INC'
              ? 'Incomplete'
              : hasSpecialStatus === 'UW'
              ? 'Unauthorized Withdrawal'
              : 'Authorized Withdrawal',
        };
      }

      return {
        midLecAvg: midLecAvg !== null ? Number(midLecAvg.toFixed(1)) : null,
        midLabAvg: midLabAvg !== null ? Number(midLabAvg.toFixed(1)) : null,
        midTotal: midTotal !== null ? Number(midTotal.toFixed(1)) : null,
        finLecAvg: finLecAvg !== null ? Number(finLecAvg.toFixed(1)) : null,
        finLabAvg: finLabAvg !== null ? Number(finLabAvg.toFixed(1)) : null,
        finTotal: finTotal !== null ? Number(finTotal.toFixed(1)) : null,
        overall: overall !== null ? Number(overall.toFixed(1)) : null,
        numericalRating: ratingInfo.rating,
        remarks: ratingInfo.remarks,
      };
    },
    [taskColumns, cellMap, gradebookData, activeSection]
  );

  const classLiveStats = useMemo<ClassLiveMetrics>(() => {
    const overalls: number[] = [];
    studentsList.forEach((std) => {
      const summary = calculateStudentLiveSummary(std);
      if (summary.overall !== null) overalls.push(summary.overall);
    });

    const avg = overalls.length > 0 ? overalls.reduce((a, b) => a + b, 0) / overalls.length : 0;
    const passingCount = overalls.filter(
      (v) => v >= (activeSection?.passing_threshold || 60)
    ).length;
    const failingCount = overalls.length - passingCount;

    return {
      avg: Number(avg.toFixed(1)),
      passingCount,
      failingCount,
      totalGraded: overalls.length,
      passingRate: overalls.length > 0 ? ((passingCount / overalls.length) * 100).toFixed(1) : '0',
    };
  }, [studentsList, calculateStudentLiveSummary, activeSection]);

  // -------------------------------------------------------------
  // USER ACTIONS & HANDLERS
  // -------------------------------------------------------------
  const handleCreateTaskColumn = () => {
    if (!newTaskName.trim()) {
      alert('Please enter a task name.');
      return;
    }

    const selectedCategoryOption =
      availableCategoriesForModal.find((c) => c.name === newTaskCategory) ||
      availableCategoriesForModal[0];
    const selectedCategoryName = selectedCategoryOption?.name || 'Lab Exercises';
    const colId = `${newTaskTerm}-${newTaskClassType}-${newTaskName.trim()}`;

    if (taskColumns.some((t) => t.id === colId)) {
      alert(
        `A task column named "${newTaskName.trim()}" already exists for ${newTaskTerm} [${newTaskClassType}].`
      );
      return;
    }

    const newTask: GridTaskColumn = {
      id: colId,
      name: newTaskName.trim(),
      term: newTaskTerm,
      classType: newTaskClassType,
      category: selectedCategoryName,
      maxPoints: newTaskMaxPoints || 100,
      weightPercentage: selectedCategoryOption?.weight,
    };

    setTaskColumns((prev) => [...prev, newTask]);
    setShowAddTaskModal(false);
    setNewTaskName('');
  };

  const handleApplyBulkFill = async () => {
    if (!bulkFillTaskId || !activeSection) return;
    const targetTask = taskColumns.find((t) => t.id === bulkFillTaskId);
    if (!targetTask) return;

    const trimmed = bulkFillValue.trim().toUpperCase();
    let rawScore: number | null = null;
    let specialCode: SpecialGradeCode = 'NONE';

    if (['EX', 'M', 'INC', 'UW', 'AW'].includes(trimmed)) {
      specialCode = trimmed as SpecialGradeCode;
      rawScore = trimmed === 'EX' ? null : 0;
    } else {
      const parsed = parseFloat(trimmed);
      if (!isNaN(parsed)) rawScore = parsed;
    }

    const gradesToSave: any[] = [];
    const updatedCells: Record<string, GridCellData> = { ...cellMap };

    filteredStudents.forEach((std) => {
      const studentId = std.student_id || std.id;
      const cellKey = `${studentId}_${targetTask.id}`;
      const existingCell = cellMap[cellKey];

      if (
        bulkFillOnlyEmpty &&
        existingCell?.rawScore !== null &&
        existingCell?.rawScore !== undefined &&
        existingCell?.specialCode !== 'NONE'
      ) {
        return;
      }

      updatedCells[cellKey] = {
        studentId,
        taskId: targetTask.id,
        rawScore,
        totalItems: targetTask.maxPoints,
        specialCode,
        inputValue: trimmed,
        isInvalid: false,
        syncStatus: 'saving',
      };

      const finalRaw = rawScore ?? 0;
      const pct = (finalRaw / targetTask.maxPoints) * 100;
      gradesToSave.push({
        student_id: studentId,
        section_id: activeSection.id,
        term: targetTask.term,
        class_type: targetTask.classType,
        category_name: targetTask.category,
        task_name: targetTask.name,
        raw_score: finalRaw,
        total_items: targetTask.maxPoints,
        percentage_score: Number(pct.toFixed(1)),
        grade_status:
          specialCode !== 'NONE'
            ? specialCode
            : pct >= (activeSection.passing_threshold || 60)
            ? 'PASSED'
            : 'FAILED',
        feedback: `Bulk entry: ${bulkFillValue}`,
        timestamp: new Date().toISOString(),
      });
    });

    setCellMap(updatedCells);
    setShowBulkFillModal(false);

    try {
      await fetch(`/api/sections/${activeSection.id}/gradebook/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades: gradesToSave, overwrite: true }),
      });

      setCellMap((prev) => {
        const next = { ...prev };
        filteredStudents.forEach((std) => {
          const studentId = std.student_id || std.id;
          const cellKey = `${studentId}_${targetTask.id}`;
          if (next[cellKey]) {
            next[cellKey] = {
              ...next[cellKey],
              syncStatus: 'saved',
              lastSavedAt: new Date().toISOString(),
            };
          }
        });
        return next;
      });
    } catch (err) {
      console.error('Failed bulk fill save:', err);
    }
  };

  const handleDeleteTask = async (task: RecordedTaskItem) => {
    if (!activeSection) return;
    const confirmMsg = `Are you sure you want to delete task "${task.task_name}" (${task.term} [${task.class_type}] — ${task.category_name}) and ALL associated student submissions?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsLoading(true);
      const query = new URLSearchParams({
        task_name: task.task_name || '',
        term: task.term || '',
        class_type: task.class_type || '',
        category_name: task.category_name || '',
      }).toString();

      const res = await fetch(`/api/sections/${activeSection.id}/tasks?${query}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_name: task.task_name,
          term: task.term,
          class_type: task.class_type,
          category_name: task.category_name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete task.');
      } else {
        await loadGradebook();
      }
    } catch (err: any) {
      alert('Error deleting task: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubmission = async (gradeId: string, taskName: string) => {
    if (!activeSection) return;
    if (!gradeId || gradeId.startsWith('grd-synth-')) {
      alert('This is an unsubmitted task placeholder. Use "Tasks" to delete the entire column.');
      return;
    }
    if (!window.confirm(`Delete submission record for task "${taskName}"?`)) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/sections/${activeSection.id}/grades/${gradeId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete submission record.');
      } else {
        await loadGradebook();
      }
    } catch (err: any) {
      alert('Error deleting submission: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSectionSummary = async () => {
    if (!activeSection) return;
    setIsGeneratingSummary(true);
    try {
      const res = await fetch('/api/generate-section-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionName: activeSection.section_name,
          subjectName: activeSection.subject_name,
          totalStudents: studentsList.length,
          passingRate: classLiveStats.passingRate,
          passingThreshold: activeSection.passing_threshold,
          weightConfig: gradebookData?.weight_config,
          gradebook: studentsList,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSectionSummary(data.summary || 'Summary unavailable.');
      } else {
        setSectionSummary('Unable to generate section performance summary at this time.');
      }
    } catch (err) {
      setSectionSummary('Network error while generating section summary.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleExportSpreadsheet = () => {
    if (!activeSection) return;

    const headers = [
      'Student ID',
      'Student Name',
      'Email',
      ...filteredTasks.map(
        (t) => `${t.name} [${t.term} ${t.classType} - ${t.category} /${t.maxPoints}]`
      ),
      'Midterm Total (%)',
      'Final Total (%)',
      'Overall Grade (%)',
      'Numerical Rating',
      'Status',
    ];

    const rows = filteredStudents.map((std) => {
      const studentId = std.student_id || std.id;
      const summary = calculateStudentLiveSummary(std);

      const taskScores = filteredTasks.map((t) => {
        const cell = cellMap[`${studentId}_${t.id}`];
        if (cell?.specialCode && cell.specialCode !== 'NONE') return cell.specialCode;
        return cell?.rawScore !== null && cell?.rawScore !== undefined ? cell.rawScore : '';
      });

      return [
        std.student_id_number || 'N/A',
        std.student_name || 'N/A',
        std.email || 'N/A',
        ...taskScores,
        summary.midTotal !== null ? `${summary.midTotal}%` : '-',
        summary.finTotal !== null ? `${summary.finTotal}%` : '-',
        summary.overall !== null ? `${summary.overall}%` : '-',
        summary.numericalRating,
        summary.remarks,
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gradebook Matrix');

    const fileName = `${activeSection.section_name.replace(/[^a-zA-Z0-9]/g, '_')}_Master_Gradebook.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const toggleStudentExpand = (studentId: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handleInspectSubmission = (record: GradebookStudentRecord, student: GradebookStudent) => {
    const item: BatchGradingResultItem = {
      student_id: student.student_id || student.id,
      student_id_number: student.student_id_number,
      extracted_id: student.student_id_number,
      student_name: student.student_name,
      identity_unverified: false,
      section_name: activeSection?.section_name || '',
      subject_name: activeSection?.subject_name || '',
      term: record.term || 'Midterm',
      class_type: record.class_type || 'Laboratory',
      component_category: record.category_name || 'Task',
      task_name: record.task_name || 'Task',
      filename: record.filename || `${record.task_name}.txt`,
      raw_score: record.raw_score,
      total_items: record.total_items,
      percentage_score: record.percentage_score ?? 0,
      numerical_rating: record.numerical_rating || '3.00',
      grade_status: record.grade_status || 'PASSED',
      feedback: record.feedback || '',
      content: record.content || record.feedback || `Submission content for ${record.task_name}`,
      submission_type: record.submission_type || 'INDIVIDUAL',
      group_members: record.group_members || [],
      flags: record.flags || [],
      criterion_scores: record.criterion_scores || [],
    };
    setActiveReviewerDataset([item]);
    setReviewerStudentIndex(0);
    setIsReviewerOpen(true);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    termFilter !== 'All' ||
    classTypeFilter !== 'All' ||
    categoryFilter !== 'All';

  const clearAllFilters = () => {
    setSearchQuery('');
    setTermFilter('All');
    setClassTypeFilter('All');
    setCategoryFilter('All');
  };

  const allowedClassTypes: ('Lecture' | 'Laboratory')[] = useMemo(() => {
    const wc = gradebookData?.weight_config;
    const lecW = wc?.lecture_weight ?? 60;
    const labW = wc?.laboratory_weight ?? 40;
    const hasLecComps = (wc?.components || []).some(
      (c) => (c.class_type || '').toLowerCase() === 'lecture'
    );
    const hasLabComps = (wc?.components || []).some(
      (c) => (c.class_type || '').toLowerCase() !== 'lecture'
    );

    const isLecOnly =
      (lecW > 0 && labW === 0) ||
      (hasLecComps && !hasLabComps && (lecW === 100 || labW === 0));
    const isLabOnly =
      (labW > 0 && lecW === 0) ||
      (hasLabComps && !hasLecComps && (labW === 100 || lecW === 0));

    if (isLecOnly) return ['Lecture'];
    if (isLabOnly) return ['Laboratory'];
    return ['Laboratory', 'Lecture'];
  }, [gradebookData?.weight_config]);

  const isWeightConfigMissing =
    !isLoading &&
    (!gradebookData?.weight_config ||
      !gradebookData.weight_config.components ||
      gradebookData.weight_config.components.length === 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Section Selector */}
      <section className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-stone-500 text-xs font-mono font-bold uppercase tracking-wider mb-1">
              <Table className="w-4 h-4 text-emerald-600" />
              Master Gradebook Matrix & Weighted Roster
            </div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">
              {activeSection?.section_name || 'Section Gradebook'} — {activeSection?.subject_name || 'Subject'}
            </h1>
            <p className="text-stone-600 text-xs mt-1">
              Database-driven gradebook matrix with term/component grouping, strict inline input validation, locked read-only summaries, and debounced Firestore synchronization.
            </p>
          </div>

          {/* View Mode Toggle & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-stone-100 border border-stone-200 rounded-lg shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-white text-stone-900 shadow-2xs font-black'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-emerald-600" />
                <span>Spreadsheet Grid (Fast Entry)</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('hierarchical')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'hierarchical'
                    ? 'bg-white text-stone-900 shadow-2xs font-black'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Weighted Roster Sheet</span>
              </button>
            </div>

            {/* Manage Tasks Button */}
            <button
              type="button"
              onClick={() => setShowTaskManager(!showTaskManager)}
              className={`text-xs font-bold py-2 px-3 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer border ${
                showTaskManager
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-stone-100 text-stone-800 hover:bg-stone-200 border-stone-200'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Tasks ({distinctRecordedTasks.length})</span>
            </button>

            {/* Launch Reviewer Workbench */}
            {allSubmissionsDataset.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveReviewerDataset(allSubmissionsDataset);
                  setReviewerStudentIndex(0);
                  setIsReviewerOpen(true);
                }}
                className="bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 border border-amber-500/30 shadow-2xs transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Review Workbench ({allSubmissionsDataset.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportSpreadsheet}
              className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-200"
              title="Export matrix to Excel"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span>Export (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={loadGradebook}
              disabled={isLoading}
              className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-200"
              title="Reload from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Section Selector Bar */}
        {sections.length > 0 && (
          <div className="pt-3 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-stone-700" />
              <label htmlFor="active-section-select" className="text-xs font-bold text-stone-800 uppercase tracking-wide font-mono">
                Active Section:
              </label>
              <select
                id="active-section-select"
                value={activeSection?.id || ''}
                onChange={(e) => {
                  const target = sections.find((s) => s.id === e.target.value);
                  if (target) onSelectSection(target);
                }}
                className="text-xs font-bold text-stone-900 bg-white border border-stone-300 rounded px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-stone-900 cursor-pointer"
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.section_name} — {sec.subject_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
              <span>Threshold: <strong className="text-stone-800">{activeSection?.passing_threshold || 60}%</strong></span>
              <span>•</span>
              <span>Weight Setup: <strong className="text-stone-800">{gradebookData?.weight_config?.midterm_weight || 40}% Mid</strong> / <strong className="text-stone-800">{gradebookData?.weight_config?.final_weight || 60}% Fin</strong></span>
            </div>
          </div>
        )}
      </section>

      {/* Class Statistics Overview Cards */}
      <ClassMetricsBar totalStudents={studentsList.length} metrics={classLiveStats} />

      {/* Filter & Search Bar */}
      <section aria-label="Filters and Search" className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, ID or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
            />
          </div>

          {/* Term Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-term" className="text-stone-500 font-bold uppercase text-[10px]">Term:</label>
            <select
              id="filter-term"
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value as 'All' | 'Midterm' | 'Final')}
              className="border border-stone-300 rounded-lg px-2 py-1.5 font-bold bg-white text-xs text-stone-800"
            >
              <option value="All">All Terms</option>
              <option value="Midterm">Midterm</option>
              <option value="Final">Final</option>
            </select>
          </div>

          {/* Class Type Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-class-type" className="text-stone-500 font-bold uppercase text-[10px]">Type:</label>
            <select
              id="filter-class-type"
              value={classTypeFilter}
              onChange={(e) => setClassTypeFilter(e.target.value as 'All' | 'Lecture' | 'Laboratory')}
              className="border border-stone-300 rounded-lg px-2 py-1.5 font-bold bg-white text-xs text-stone-800"
            >
              <option value="All">All Types</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Lecture">Lecture</option>
            </select>
          </div>

          {/* Category Filter */}
          {availableCategories.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-category" className="text-stone-500 font-bold uppercase text-[10px]">Category:</label>
              <select
                id="filter-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-stone-300 rounded-lg px-2 py-1.5 font-bold bg-white text-xs text-stone-800"
              >
                <option value="All">All Categories</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-stone-500 hover:text-stone-900 font-bold text-xs underline cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Matrix Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddTaskModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task Column</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBulkFillModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>Bulk Fill / Preset</span>
          </button>
        </div>
      </section>

      {/* No Weight Setup Error State */}
      {isWeightConfigMissing ? (
        <div className="bg-white border-2 border-amber-300 rounded-xl p-8 shadow-xs text-center max-w-2xl mx-auto my-8">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-stone-900 mb-2">No Weight Setup Found</h2>
          <p className="text-xs text-stone-600 mb-6 leading-relaxed">
            No weight setup found for this class ({activeSection?.section_name || 'Selected Section'}). Please configure the weights in the Weight Setup module before entering grades or generating gradebook metrics.
          </p>
          <div className="flex items-center justify-center gap-3">
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('weights-config')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>Configure Weights in Step 2</span>
              </button>
            )}
            <button
              type="button"
              onClick={loadGradebook}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-lg transition-colors cursor-pointer border border-stone-200"
            >
              <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
              <span>Reload Gradebook</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main View Mode Content */}
          {viewMode === 'matrix' ? (
            <GridMatrixTable
              filteredStudents={filteredStudents}
              filteredTasks={filteredTasks}
              cellMap={cellMap}
              onCellChange={handleCellChange}
              calculateStudentLiveSummary={calculateStudentLiveSummary}
              onOpenAddTaskModal={() => setShowAddTaskModal(true)}
              onOpenBulkFillModal={(taskId) => {
                if (taskId) setBulkFillTaskId(taskId);
                setShowBulkFillModal(true);
              }}
              hasFilters={hasActiveFilters}
              onClearFilters={clearAllFilters}
              weightConfig={gradebookData?.weight_config}
            />
          ) : (
            <HierarchicalRosterTable
              filteredStudents={filteredStudents}
              hierarchicalComponents={hierarchicalComponents}
              calculateStudentLiveSummary={calculateStudentLiveSummary}
              expandedStudents={expandedStudents}
              toggleStudentExpand={toggleStudentExpand}
              onInspectSubmission={handleInspectSubmission}
              onDeleteSubmission={handleDeleteSubmission}
              activeSection={activeSection}
              allSubmissionsDataset={allSubmissionsDataset}
              onOpenReviewerModal={(dataset, startIdx) => {
                setActiveReviewerDataset(dataset);
                setReviewerStudentIndex(startIdx || 0);
                setIsReviewerOpen(true);
              }}
              weightConfig={gradebookData?.weight_config}
            />
          )}
        </>
      )}

      {/* AI Section Performance Summary Card */}
      <section className="bg-stone-900 text-white rounded-xl p-5 border border-stone-800 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-stone-100">AI Section Performance Executive Summary</h3>
          </div>
          <button
            type="button"
            onClick={handleGenerateSectionSummary}
            disabled={isGeneratingSummary}
            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingSummary ? 'animate-spin' : ''}`} />
            <span>{isGeneratingSummary ? 'Analyzing Cohort Data...' : 'Generate Executive Brief'}</span>
          </button>
        </div>

        {sectionSummary ? (
          <div className="bg-stone-950/60 p-4 rounded-lg border border-stone-800 text-xs text-stone-300 leading-relaxed font-sans whitespace-pre-line">
            {sectionSummary}
          </div>
        ) : (
          <p className="text-xs text-stone-400 font-sans">
            Click &quot;Generate Executive Brief&quot; to have Gemini evaluate the section&apos;s distribution, overall passing rate ({classLiveStats.passingRate}%), common performance bottlenecks across lecture and laboratory tasks, and specific interventions.
          </p>
        )}
      </section>

      {/* MODAL: ADD TASK COLUMN */}
      <AddTaskColumnModal
        isOpen={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        newTaskName={newTaskName}
        setNewTaskName={setNewTaskName}
        newTaskTerm={newTaskTerm}
        setNewTaskTerm={setNewTaskTerm}
        newTaskClassType={newTaskClassType}
        setNewTaskClassType={setNewTaskClassType}
        newTaskCategory={newTaskCategory}
        setNewTaskCategory={setNewTaskCategory}
        newTaskMaxPoints={newTaskMaxPoints}
        setNewTaskMaxPoints={setNewTaskMaxPoints}
        availableCategories={availableCategoriesForModal}
        onCreateTask={handleCreateTaskColumn}
        allowedClassTypes={allowedClassTypes}
      />

      {/* MODAL: BULK FILL / PRESET */}
      <BulkFillModal
        isOpen={showBulkFillModal}
        onClose={() => setShowBulkFillModal(false)}
        taskColumns={taskColumns}
        bulkFillTaskId={bulkFillTaskId}
        setBulkFillTaskId={setBulkFillTaskId}
        bulkFillValue={bulkFillValue}
        setBulkFillValue={setBulkFillValue}
        bulkFillOnlyEmpty={bulkFillOnlyEmpty}
        setBulkFillOnlyEmpty={setBulkFillOnlyEmpty}
        studentCount={filteredStudents.length}
        onApply={handleApplyBulkFill}
      />

      {/* MODAL: SECTION TASK MANAGER */}
      <SectionTaskManagerModal
        isOpen={showTaskManager}
        onClose={() => setShowTaskManager(false)}
        tasks={distinctRecordedTasks}
        onDeleteTask={handleDeleteTask}
        onInspectAll={() => {
          setActiveReviewerDataset(allSubmissionsDataset);
          setReviewerStudentIndex(0);
          setIsReviewerOpen(true);
        }}
        totalSubmissions={allSubmissionsDataset.length}
      />

      {/* MODAL: STUDENT SUBMISSION REVIEWER WORKBENCH */}
      <StudentSubmissionReviewerModal
        isOpen={isReviewerOpen}
        onClose={() => setIsReviewerOpen(false)}
        results={activeReviewerDataset}
        currentIndex={reviewerStudentIndex}
        onNavigate={(newIdx) => setReviewerStudentIndex(newIdx)}
        onUpdateResult={(idx, updatedItem) => {
          setActiveReviewerDataset((prev) =>
            prev.map((item, i) => (i === idx ? { ...item, ...updatedItem } : item))
          );
        }}
        sectionId={activeSection?.id || ''}
        taskName="Gradebook Review"
      />
    </div>
  );
};
