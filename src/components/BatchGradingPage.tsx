import React, { useState, useMemo, useEffect } from 'react';
import { 
  CourseSection, 
  BatchGradingResultItem, 
  Rubric, 
  GradeComponentWeight, 
  GradeComponentNode, 
  GradebookStudent, 
  StudentGradeRecord,
  WeightConfig
} from '../types';
import { FileCode, Upload, Sparkles, CheckCircle, AlertTriangle, Layers, Save, Edit, RefreshCw, UserCheck, ShieldAlert, FileSpreadsheet, Download, Table, Plus, PieChart, Percent, ChevronRight, Info, ListTree, Check, Eye, Code, Terminal, BookOpen, Play, Users, Filter, LayoutGrid, SlidersHorizontal, Trash2, Tag, MessageSquare, AlertOctagon, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { StudentSubmissionReviewerModal } from './StudentSubmissionReviewerModal';
import { syncGoogleDriveBatchAPI } from '../lib/gradingEngine';

interface BatchGradingPageProps {
  activeSection: CourseSection | null;
  sections: CourseSection[];
  rubrics: Rubric[];
  onProcessBatchGrading: (payload: {
    section_id: string;
    term: 'Midterm' | 'Final';
    class_type: 'Lecture' | 'Laboratory';
    component_category: string;
    task_name: string;
    total_items: number;
    rubricText: string;
    customInstructions: string;
    files: { filename: string; content: string }[];
  }) => Promise<BatchGradingResultItem[]>;
  onSaveApprovedGrades: (sectionId: string, grades: StudentGradeRecord[] | BatchGradingResultItem[] | any[]) => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
}

export const BatchGradingPage: React.FC<BatchGradingPageProps> = ({
  activeSection,
  sections,
  rubrics,
  onProcessBatchGrading,
  onSaveApprovedGrades,
  onNavigateToTab,
}) => {
  // Mode switch: AI Submission Files vs Excel Direct Scores
  const [gradingMode, setGradingMode] = useState<'ai_files' | 'excel_scores'>('ai_files');

  // Task configuration state
  const [selectedSectionId, setSelectedSectionId] = useState(activeSection?.id || sections[0]?.id || '');
  const [term, setTerm] = useState<'Midterm' | 'Final'>('Midterm');
  const [classType, setClassType] = useState<'Lecture' | 'Laboratory'>('Laboratory');
  const [weightConfig, setWeightConfig] = useState<WeightConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(false);
  const [configuredComponents, setConfiguredComponents] = useState<GradeComponentWeight[]>([]);
  const [treeData, setTreeData] = useState<GradeComponentNode | null>(null);
  const [sectionRoster, setSectionRoster] = useState<GradebookStudent[]>([]);
  const [componentCategory, setComponentCategory] = useState('Lab Exercises');
  const [taskName, setTaskName] = useState('Quiz 1');
  const [totalItems, setTotalItems] = useState(50);
  const [selectedRubricId, setSelectedRubricId] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');

  // Results filtering and layout state
  const [resultsFilter, setResultsFilter] = useState<'all' | 'individual' | 'group' | 'flagged'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Sync totalItems when selectedRubricId or rubrics change
  React.useEffect(() => {
    if (selectedRubricId) {
      const selectedRubric = rubrics.find((r) => r.id === selectedRubricId);
      if (selectedRubric && typeof selectedRubric.totalPoints === 'number' && selectedRubric.totalPoints > 0) {
        setTotalItems(selectedRubric.totalPoints);
      }
    }
  }, [selectedRubricId, rubrics]);

  // Fetch section grade components & roster when selected section changes
  const loadSectionConfig = React.useCallback(() => {
    if (!selectedSectionId) return;
    setIsLoadingConfig(true);
    fetch(`/api/sections/${selectedSectionId}/gradebook`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.weight_config) {
          setWeightConfig(data.weight_config);
          if (data.weight_config.components) {
            setConfiguredComponents(data.weight_config.components);
          }
          if (data.weight_config.tree_data) {
            setTreeData(data.weight_config.tree_data);
          }
        }
        if (data?.gradebook) {
          setSectionRoster(data.gradebook);
        }
      })
      .catch((err) => console.error('Error fetching section grade components:', err))
      .finally(() => setIsLoadingConfig(false));
  }, [selectedSectionId]);

  React.useEffect(() => {
    loadSectionConfig();
  }, [loadSectionConfig]);

  // Listen for weight updates from Step 2
  React.useEffect(() => {
    const handleWeightUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<{ sectionId?: string }>;
      if (!customEvt.detail?.sectionId || customEvt.detail.sectionId === selectedSectionId) {
        loadSectionConfig();
      }
    };
    window.addEventListener('weight-config-updated', handleWeightUpdate);
    return () => {
      window.removeEventListener('weight-config-updated', handleWeightUpdate);
    };
  }, [selectedSectionId, loadSectionConfig]);

  // Dynamic Teaching Structure & Weights
  const lecWeight = weightConfig?.lecture_weight ?? 60;
  const labWeight = weightConfig?.laboratory_weight ?? 40;
  const midTermWeight = weightConfig?.midterm_weight ?? 40;
  const finTermWeight = weightConfig?.final_weight ?? 60;

  const hasLecComps = (configuredComponents || []).some(
    (c) => (c.class_type || '').toLowerCase() === 'lecture'
  );
  const hasLabComps = (configuredComponents || []).some(
    (c) => (c.class_type || '').toLowerCase() !== 'lecture'
  );

  const isLecOnly =
    (lecWeight > 0 && labWeight === 0) ||
    (hasLecComps && !hasLabComps && (lecWeight === 100 || labWeight === 0));
  const isLabOnly =
    (labWeight > 0 && lecWeight === 0) ||
    (hasLabComps && !hasLecComps && (labWeight === 100 || lecWeight === 0));
  const isBoth = !isLecOnly && !isLabOnly;

  // Ensure classType conforms to teaching structure
  useEffect(() => {
    if (isLecOnly && classType !== 'Lecture') {
      setClassType('Lecture');
    } else if (isLabOnly && classType !== 'Laboratory') {
      setClassType('Laboratory');
    }
  }, [isLecOnly, isLabOnly, classType]);

  // Filter components by selected term and classType
  const termComponents = configuredComponents.filter((c) => c.term === term);
  const classComponents = termComponents.filter((c) => c.class_type === classType);
  const activeComponentList = classComponents.length > 0 ? classComponents : termComponents;

  // Helper to extract leaf tasks from hierarchical tree
  const getLeafTasksFromTree = (node: any, currentCategory = ''): { id: string; name: string; total_items: number; category_name: string; term?: string; class_type?: string }[] => {
    if (!node) return [];
    if (node.is_leaf) {
      return [{
        id: node.id,
        name: node.name,
        total_items: Number(node.total_items) || 50,
        category_name: node.category_name || currentCategory || 'General Task',
        term: node.term,
        class_type: node.class_type,
      }];
    }
    let leaves: any[] = [];
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any) => {
        leaves = leaves.concat(getLeafTasksFromTree(child, child.is_leaf ? currentCategory : child.name));
      });
    }
    return leaves;
  };

  const leafTasks = getLeafTasksFromTree(treeData);

  // Breakdown Table Filter State
  const [breakdownTermFilter, setBreakdownTermFilter] = useState<'All' | 'Midterm' | 'Final'>('All');
  const [breakdownClassFilter, setBreakdownClassFilter] = useState<'All' | 'Lecture' | 'Laboratory'>('All');

  // Compute selected category weight and contribution stats
  const currentCategoryObj = activeComponentList.find(
    (c) => c.category_name.toLowerCase().trim() === componentCategory.toLowerCase().trim()
  );
  const currentCategoryWeight = currentCategoryObj ? Number(currentCategoryObj.weight_percentage) : 20;

  // Term & ClassType multipliers based on dynamic database weights
  const termWeightPct = term === 'Midterm' ? midTermWeight : finTermWeight;
  const classTypeWeightPct = isLecOnly ? 100 : isLabOnly ? 100 : classType === 'Lecture' ? lecWeight : labWeight;

  // Calculations
  const effectiveTermContrib = (currentCategoryWeight * classTypeWeightPct) / 100;
  const effectiveFinalContrib = (effectiveTermContrib * termWeightPct) / 100;

  // Sub-tasks for current category
  const subTasksForCategory = leafTasks.filter(
    (t) =>
      (t.category_name.toLowerCase().trim() === componentCategory.toLowerCase().trim() ||
        t.name.toLowerCase().trim() === taskName.toLowerCase().trim()) &&
      (!t.term || t.term === term) &&
      (!t.class_type || t.class_type === classType)
  );

  // Build complete list of grade components & sub-components for the breakdown table
  const allBreakdownItems = React.useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      category_name: string;
      task_name?: string;
      term: string;
      class_type: string;
      weight_percentage: number;
      is_leaf: boolean;
      total_items?: number;
      subTasks: Array<{ id: string; name: string; total_items: number }>;
      effectiveTermContrib: number;
      effectiveFinalContrib: number;
    }> = [];

    if (configuredComponents && configuredComponents.length > 0) {
      configuredComponents.forEach((comp, idx) => {
        const cTerm = comp.term || 'Midterm';
        const cClass = comp.class_type || 'Lecture';
        const cWeight = Number(comp.weight_percentage) || 10;
        const cTermPct = cTerm === 'Midterm' ? midTermWeight : finTermWeight;
        const cClassPct = isLecOnly ? 100 : isLabOnly ? 100 : (cClass === 'Lecture' ? lecWeight : labWeight);

        const termContrib = (cWeight * cClassPct) / 100;
        const finalContrib = (termContrib * cTermPct) / 100;

        const matchedLeaves = leafTasks.filter(
          (t) =>
            t.category_name.toLowerCase().trim() === comp.category_name.toLowerCase().trim() &&
            (!t.term || t.term === cTerm) &&
            (!t.class_type || t.class_type === cClass)
        );

        list.push({
          id: `bd-comp-${comp.id || idx}-${cTerm}-${cClass}-${idx}`,
          name: comp.category_name,
          category_name: comp.category_name,
          term: cTerm,
          class_type: cClass,
          weight_percentage: cWeight,
          is_leaf: false,
          subTasks: matchedLeaves,
          effectiveTermContrib: termContrib,
          effectiveFinalContrib: finalContrib,
        });
      });
    }

    // Include standalone leaf tasks from treeData if not present
    leafTasks.forEach((leaf, lIdx) => {
      const lTerm = leaf.term || term;
      const lClass = leaf.class_type || classType;
      const exists = list.some(
        (item) =>
          item.category_name.toLowerCase().trim() === (leaf.category_name || leaf.name).toLowerCase().trim() &&
          item.term === lTerm &&
          item.class_type === lClass
      );

      if (!exists) {
        const lTermPct = lTerm === 'Midterm' ? midTermWeight : finTermWeight;
        const lClassPct = isLecOnly ? 100 : isLabOnly ? 100 : (lClass === 'Lecture' ? lecWeight : labWeight);
        const termContrib = (15 * lClassPct) / 100;
        const finalContrib = (termContrib * lTermPct) / 100;

        list.push({
          id: `bd-leaf-${leaf.id || leaf.name}-${lTerm}-${lClass}-${lIdx}`,
          name: leaf.name,
          category_name: leaf.category_name || leaf.name,
          task_name: leaf.name,
          term: lTerm,
          class_type: lClass,
          weight_percentage: 15,
          is_leaf: true,
          total_items: leaf.total_items,
          subTasks: [leaf],
          effectiveTermContrib: termContrib,
          effectiveFinalContrib: finalContrib,
        });
      }
    });

    return list;
  }, [configuredComponents, leafTasks, term, classType]);

  const filteredBreakdownItems = allBreakdownItems.filter((item) => {
    if (breakdownTermFilter !== 'All' && item.term !== breakdownTermFilter) return false;
    if (breakdownClassFilter !== 'All' && item.class_type !== breakdownClassFilter) return false;
    return true;
  });

  // Auto select default category if current selection doesn't exist in current filter
  React.useEffect(() => {
    if (activeComponentList.length > 0) {
      const exists = activeComponentList.some((c) => c.category_name === componentCategory);
      if (!exists) {
        setComponentCategory(activeComponentList[0].category_name);
        if (activeComponentList[0].class_type) {
          setClassType(activeComponentList[0].class_type);
        }
      }
    }
  }, [term, classType, configuredComponents]);

  // Google Drive Sync State
  const [driveFolderId, setDriveFolderId] = useState<string>('');
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  // Submission Files State (AI Mode)
  const [uploadedFiles, setUploadedFiles] = useState<{ filename: string; content: string }[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Excel Upload State (Excel Mode)
  const [uploadedExcelName, setUploadedExcelName] = useState<string>('');

  // Processing & Approval Matrix State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [gradingResults, setGradingResults] = useState<BatchGradingResultItem[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(false);

  // Student Reviewer Workbench Modal State
  const [isReviewerOpen, setIsReviewerOpen] = useState(false);
  const [reviewerStudentIndex, setReviewerStudentIndex] = useState<number>(0);

  // Download Excel Score Sheet Template
  const handleDownloadExcelTemplate = () => {
    const currentSec = sections.find((s) => s.id === selectedSectionId);
    const taskColHeader = taskName ? `${taskName} Score` : 'Quiz 1 Score';
    const templateRows = sectionRoster.length > 0
      ? sectionRoster.map((s) => ({
          'Student ID': s.student_id_number || s.student_id || '',
          'Student Name': s.student_name || '',
          [taskColHeader]: '',
          'Remarks / Reason': '',
        }))
      : [
          { 'Student ID': '2024-00101', 'Student Name': 'Dela Cruz, Juan', [taskColHeader]: 45, 'Remarks / Reason': 'Excellent work' },
          { 'Student ID': '2024-00102', 'Student Name': 'Santos, Maria', [taskColHeader]: 0, 'Remarks / Reason': 'Absent on quiz date' },
          { 'Student ID': '2024-00103', 'Student Name': 'Reyes, Carlo', [taskColHeader]: 38, 'Remarks / Reason': 'Late (-5 pts)' },
        ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Scores');
    const filename = `${currentSec ? currentSec.section_name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Section'}_${taskName.replace(/\s+/g, '_')}_Scores.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  // Helper: Normalize keys for comparison
  const cleanHeaderKey = (k: string): string => {
    return k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  // Helper: Robust score parser (numbers, strings, fractions like '45/50', percentages, special codes)
  const parseRawScoreValue = (val: any): { score: number; specialCode?: string; maxDetected?: number } => {
    if (val === null || val === undefined) {
      return { score: 0 };
    }

    if (typeof val === 'number') {
      return { score: isNaN(val) ? 0 : val };
    }

    const str = String(val).trim();
    if (!str) return { score: 0 };

    const upper = str.toUpperCase();
    if (['EX', 'EXCUSED'].includes(upper)) {
      return { score: 0, specialCode: 'EX' };
    }
    if (['M', 'MISSING', 'ABSENT', 'ABS'].includes(upper)) {
      return { score: 0, specialCode: 'M' };
    }
    if (['INC', 'INCOMPLETE'].includes(upper)) {
      return { score: 0, specialCode: 'INC' };
    }
    if (['UW', 'UNAUTHORIZED WITHDRAWAL', 'DROP', 'DROPPED'].includes(upper)) {
      return { score: 0, specialCode: 'UW' };
    }

    // Fraction format e.g. "45/50", "45 / 50", "45 of 50"
    const fractionMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:\/|\bof\b)\s*(\d+(?:\.\d+)?)/i);
    if (fractionMatch) {
      const num = parseFloat(fractionMatch[1]);
      const den = parseFloat(fractionMatch[2]);
      return {
        score: isNaN(num) ? 0 : num,
        maxDetected: !isNaN(den) && den > 0 ? den : undefined,
      };
    }

    // Points / Items string format e.g. "45 pts", "45 points", "45 items"
    const ptsMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:pts?\.?|points?|items?|marks?)?/i);
    if (ptsMatch) {
      const num = parseFloat(ptsMatch[1]);
      if (!isNaN(num)) return { score: num };
    }

    // Percentage format e.g. "90%"
    if (str.endsWith('%')) {
      const pct = parseFloat(str.replace('%', '').trim());
      if (!isNaN(pct)) {
        return { score: pct };
      }
    }

    // Cleaned float number
    const cleaned = str.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return { score: isNaN(parsed) ? 0 : parsed };
  };

  // Helper: Detect column keys for Student ID, Student Name, and Task/Quiz Score
  const detectRowColumns = (row: Record<string, any>, currentTaskName: string, currentCategory: string) => {
    const keys = Object.keys(row);
    const targetTaskNorm = cleanHeaderKey(currentTaskName || '');
    const targetCategoryNorm = cleanHeaderKey(currentCategory || '');

    let idKey: string | null = null;
    let nameKey: string | null = null;
    let firstNameKey: string | null = null;
    let lastNameKey: string | null = null;
    let scoreKey: string | null = null;

    // 1. Detect ID Key
    for (const k of keys) {
      const norm = cleanHeaderKey(k);
      if (
        norm === 'studentid' ||
        norm === 'studentidnumber' ||
        norm === 'studentno' ||
        norm === 'studentnumber' ||
        norm === 'idnumber' ||
        norm === 'idno' ||
        norm === 'studid' ||
        norm === 'lrn' ||
        norm === 'rollno' ||
        norm === 'rollnumber' ||
        norm === 'id' ||
        norm === 'schoolid' ||
        norm === 'regno' ||
        norm === 'registrationnumber'
      ) {
        idKey = k;
        break;
      }
    }
    if (!idKey) {
      for (const k of keys) {
        const norm = cleanHeaderKey(k);
        if (norm.includes('id') && (norm.includes('student') || norm.includes('stud') || norm.includes('num'))) {
          idKey = k;
          break;
        }
      }
    }

    // 2. Detect Name Key
    for (const k of keys) {
      const norm = cleanHeaderKey(k);
      if (
        norm === 'studentname' ||
        norm === 'studentfullname' ||
        norm === 'fullname' ||
        norm === 'completename' ||
        norm === 'name' ||
        norm === 'student' ||
        norm === 'learnername' ||
        norm === 'learner' ||
        norm === 'pupilname'
      ) {
        nameKey = k;
        break;
      }
      if (norm === 'firstname' || norm === 'givenname' || norm === 'fname') {
        firstNameKey = k;
      }
      if (norm === 'lastname' || norm === 'surname' || norm === 'familyname' || norm === 'lname') {
        lastNameKey = k;
      }
    }

    // 3. Detect Score / Quiz / Task Key
    // Priority A: Exact match with currentTaskName (e.g. "Quiz 1", "Quiz 1 Score", "Quiz 1 (50 pts)")
    if (targetTaskNorm) {
      for (const k of keys) {
        const norm = cleanHeaderKey(k);
        if (
          norm === targetTaskNorm ||
          norm.startsWith(targetTaskNorm) ||
          norm === `${targetTaskNorm}score` ||
          norm === `${targetTaskNorm}rawscore` ||
          norm === `${targetTaskNorm}points`
        ) {
          scoreKey = k;
          break;
        }
      }
    }

    // Priority B: Match by component category name (e.g. "quiz", "quizzes", "lab")
    if (!scoreKey && targetCategoryNorm) {
      for (const k of keys) {
        const norm = cleanHeaderKey(k);
        if (norm.includes(targetCategoryNorm) && k !== idKey && k !== nameKey) {
          scoreKey = k;
          break;
        }
      }
    }

    // Priority C: Match by explicit score/grade keywords
    if (!scoreKey) {
      const scoreKeywords = [
        'rawscore',
        'score',
        'points',
        'pts',
        'grade',
        'marks',
        'mark',
        'result',
        'results',
        'total',
        'rating',
        'earned',
        'totalscore',
        'actualscore',
        'studentscore',
        'quizscore',
        'examscore',
        'testscore',
        'labscore',
      ];
      for (const k of keys) {
        const norm = cleanHeaderKey(k);
        if (scoreKeywords.includes(norm) && k !== idKey && k !== nameKey) {
          scoreKey = k;
          break;
        }
      }
    }

    // Priority D: Match by task keywords (quiz, exam, test, act, lab, assignment, pt, homework, etc.)
    if (!scoreKey) {
      const taskKeywords = ['quiz', 'exam', 'test', 'activity', 'act', 'lab', 'laboratory', 'assignment', 'seatwork', 'pt', 'task', 'exercise', 'assessment', 'project'];
      for (const k of keys) {
        const norm = cleanHeaderKey(k);
        if (taskKeywords.some((kw) => norm.includes(kw)) && k !== idKey && k !== nameKey) {
          scoreKey = k;
          break;
        }
      }
    }

    // Priority E: Fallback to any remaining column with numeric values that is not ID or Name
    if (!scoreKey) {
      const ignoreList = ['email', 'emailaddress', 'section', 'sectionname', 'subject', 'course', 'gender', 'sex', 'remarks', 'status', 'no', 'number', '#', 'note', 'notes', 'reason', 'reasons', 'comment', 'comments', 'feedback'];
      for (const k of keys) {
        if (k === idKey || k === nameKey || k === firstNameKey || k === lastNameKey) continue;
        const norm = cleanHeaderKey(k);
        if (!ignoreList.includes(norm)) {
          const val = row[k];
          if (typeof val === 'number' || (typeof val === 'string' && val.trim() !== '' && !isNaN(parseFloat(val.replace(/[^0-9.]/g, ''))))) {
            scoreKey = k;
            break;
          }
        }
      }
    }

    // 4. Detect Remarks / Reason / Marks / Notes Key
    let remarksKey: string | null = null;
    const remarksKeywords = [
      'remarks',
      'remark',
      'notes',
      'note',
      'reason',
      'reasons',
      'comment',
      'comments',
      'feedback',
      'marks',
      'mark',
      'marksreason',
      'marksnotes',
      'excuse',
      'penalty',
      'explanation',
      'justification',
      'whyzero',
      'statusreason',
      'mark',
    ];
    for (const k of keys) {
      const norm = cleanHeaderKey(k);
      if (remarksKeywords.includes(norm) && k !== idKey && k !== nameKey && k !== scoreKey) {
        remarksKey = k;
        break;
      }
    }
    if (!remarksKey) {
      for (const k of keys) {
        const norm = cleanHeaderKey(k);
        if (
          (norm.includes('remark') || norm.includes('reason') || norm.includes('note') || norm.includes('comment') || norm.includes('excuse')) &&
          k !== idKey &&
          k !== nameKey &&
          k !== scoreKey
        ) {
          remarksKey = k;
          break;
        }
      }
    }

    return { idKey, nameKey, firstNameKey, lastNameKey, scoreKey, remarksKey };
  };

  // Helper: Match imported student against course roster
  const findMatchingRosterStudent = (rawId: string, rawName: string, roster: GradebookStudent[]): GradebookStudent | undefined => {
    if (!roster || roster.length === 0) return undefined;

    const normId = rawId.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // 1. Match by Student ID
    if (normId) {
      const byId = roster.find((s) => {
        const sIdNum = (s.student_id_number || '').trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const sId = (s.student_id || s.id || '').trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return (sIdNum && sIdNum === normId) || (sId && sId === normId);
      });
      if (byId) return byId;
    }

    // 2. Match by Student Name (handles "Dela Cruz, Juan" vs "Juan Dela Cruz")
    if (rawName && rawName.trim()) {
      const cleanUploadName = rawName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const uploadTokens = cleanUploadName.split(' ').filter((t) => t.length > 1);

      if (uploadTokens.length > 0) {
        const byName = roster.find((s) => {
          const cleanRosterName = (s.student_name || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
          if (!cleanRosterName) return false;

          // Direct substring
          if (cleanRosterName.includes(cleanUploadName) || cleanUploadName.includes(cleanRosterName)) {
            return true;
          }

          // Token intersection (surname + given name matching)
          const rosterTokens = cleanRosterName.split(' ').filter((t) => t.length > 1);
          const matchCount = uploadTokens.filter((t) => rosterTokens.includes(t)).length;
          return matchCount >= Math.min(2, uploadTokens.length);
        });
        if (byName) return byName;
      }
    }

    return undefined;
  };

  // Process uploaded Excel / CSV file
  const handleExcelFileUpload = (file: File) => {
    setUploadedExcelName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rows || rows.length === 0) {
          alert('Excel file is empty or formatted incorrectly.');
          return;
        }

        // Global detection across first row
        const firstRowCols = detectRowColumns(rows[0], taskName, componentCategory);
        let activeScoreCol = firstRowCols.scoreKey;
        let detectedMaxPoints = totalItems > 0 ? totalItems : 100;

        // If score column header has max points in title e.g. "Quiz 1 (50)" or "Quiz 1 / 50"
        if (activeScoreCol) {
          const titleMaxMatch = activeScoreCol.match(/[\(\/\[]\s*(\d+(?:\.\d+)?)\s*(?:pts?\.?|points?|items?)?[\)\]]/i);
          if (titleMaxMatch && parseFloat(titleMaxMatch[1]) > 0) {
            detectedMaxPoints = parseFloat(titleMaxMatch[1]);
            setTotalItems(detectedMaxPoints);
          }
          
          // Auto-align task name if currently default or empty
          if (!taskName || taskName === 'Quiz 1' || taskName === 'Lab Exercise 1') {
            const cleanedTaskTitle = activeScoreCol.replace(/[\(\/\[].*?[\)\]]/g, '').replace(/\b(?:score|raw score|points)\b/gi, '').trim();
            if (cleanedTaskTitle) {
              setTaskName(cleanedTaskTitle);
            }
          }
        }

        const parsedResults: BatchGradingResultItem[] = rows.map((row: any, idx: number) => {
          // Dynamic column resolution for this row
          const cols = detectRowColumns(row, taskName, componentCategory);
          const idKey = cols.idKey || firstRowCols.idKey;
          const nameKey = cols.nameKey || firstRowCols.nameKey;
          const scoreKey = cols.scoreKey || activeScoreCol;
          const remarksKey = cols.remarksKey || firstRowCols.remarksKey;

          // Extract Student ID
          const rawId = idKey && row[idKey] !== undefined ? String(row[idKey]).trim() : '';

          // Extract Student Name (or combine first + last name)
          let rawName = '';
          if (nameKey && row[nameKey]) {
            rawName = String(row[nameKey]).trim();
          } else if (cols.lastNameKey && cols.firstNameKey && (row[cols.lastNameKey] || row[cols.firstNameKey])) {
            rawName = `${row[cols.lastNameKey] || ''}, ${row[cols.firstNameKey] || ''}`.trim().replace(/^,\s*|,\s*$/g, '');
          } else {
            rawName = rawId ? `Student (${rawId})` : `Student #${idx + 1}`;
          }

          // Extract and parse numeric score
          const rawScoreEntry = scoreKey && row[scoreKey] !== undefined ? row[scoreKey] : 0;
          const parsedScoreInfo = parseRawScoreValue(rawScoreEntry);

          if (parsedScoreInfo.maxDetected && parsedScoreInfo.maxDetected > 0 && (!totalItems || totalItems === 100)) {
            detectedMaxPoints = parsedScoreInfo.maxDetected;
            setTotalItems(detectedMaxPoints);
          }

          const effectiveMax = detectedMaxPoints > 0 ? detectedMaxPoints : 100;
          const numScore = Math.min(Math.max(0, parsedScoreInfo.score), effectiveMax);
          const pct = (numScore / effectiveMax) * 100;

          // Extract Remarks / Reason / Marks
          const rawRemarks = remarksKey && row[remarksKey] !== undefined ? String(row[remarksKey]).trim() : '';

          // Build feedback & reason rationale
          let itemFeedback = rawRemarks;
          if (!itemFeedback) {
            if (numScore === 0) {
              if (parsedScoreInfo.specialCode === 'EX') {
                itemFeedback = 'Excused (EX) - Approved absence.';
              } else if (parsedScoreInfo.specialCode === 'M') {
                itemFeedback = 'Missing / Absent (M) - 0 points recorded.';
              } else if (parsedScoreInfo.specialCode === 'INC') {
                itemFeedback = 'Incomplete (INC) - Pending requirements.';
              } else if (parsedScoreInfo.specialCode === 'UW') {
                itemFeedback = 'Unauthorized Withdrawal (UW).';
              } else {
                itemFeedback = 'Zero score (0 pts) recorded from spreadsheet.';
              }
            } else {
              itemFeedback = `Direct score uploaded via Excel/CSV (${file.name}) column [${scoreKey || 'Score'}]. Score: ${numScore}/${effectiveMax}.`;
            }
          }

          // Generate initial flags
          const rowFlags: string[] = [];
          if (numScore === 0 && !rawRemarks.toLowerCase().includes('excuse')) {
            rowFlags.push('Zero Score');
          }
          if (rawRemarks) {
            const lowRem = rawRemarks.toLowerCase();
            if (lowRem.includes('cheat') || lowRem.includes('plagiar') || lowRem.includes('dishonest')) {
              rowFlags.push('Plagiarism / Code Similarity');
            }
            if (lowRem.includes('late')) {
              rowFlags.push('Late Submission');
            }
            if (lowRem.includes('absent') || lowRem.includes('miss')) {
              rowFlags.push('Absent');
            }
          }

          // Robust match with section roster
          const matchedStudent = findMatchingRosterStudent(rawId, rawName, sectionRoster);
          const currentSec = sections.find((s) => s.id === selectedSectionId);

          let initialStatus = pct >= 60 ? 'PASSED' : 'FAILED';
          if (parsedScoreInfo.specialCode === 'INC' || (rawRemarks && rawRemarks.toLowerCase().includes('incomplete'))) {
            initialStatus = 'INC';
          } else if (parsedScoreInfo.specialCode === 'UW') {
            initialStatus = 'UW';
          }

          return {
            student_id: matchedStudent ? matchedStudent.student_id : (rawId ? `std-${rawId}` : `std-${idx + 1}`),
            student_name: matchedStudent ? matchedStudent.student_name : String(rawName),
            identity_unverified: !matchedStudent,
            section_name: currentSec ? currentSec.section_name : 'Section',
            subject_name: currentSec ? currentSec.subject_name : 'Subject',
            term,
            class_type: classType,
            component_category: componentCategory,
            task_name: taskName || (scoreKey ? String(scoreKey) : 'Imported Assessment'),
            raw_score: Number(numScore.toFixed(2)),
            total_items: effectiveMax,
            percentage_score: Number(pct.toFixed(1)),
            numerical_rating: pct >= 90 ? '1.00' : pct >= 80 ? '1.75' : pct >= 75 ? '2.50' : pct >= 60 ? '3.00' : '5.00',
            grade_status: initialStatus,
            feedback: itemFeedback,
            flags: rowFlags,
            filename: file.name,
          };
        });

        setGradingResults(parsedResults);
      } catch (err: any) {
        alert('Failed to parse Excel/CSV file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (filesList: FileList) => {
    Array.from(filesList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const textContent = (e.target?.result as string) || '';
        setUploadedFiles((prev) => [
          ...prev,
          { filename: file.name, content: textContent },
        ]);
      };
      reader.readAsText(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
    }
  };

  const handleLoadSampleFiles = () => {
    setUploadedFiles([
      {
        filename: 'Lab1_JuanDelaCruz_202400123.js',
        content: `// Student: Juan Dela Cruz (ID: 2024-00123)
// Course: Web Development (ACT - NT A)
// Lab Exercise 1: DOM Manipulation & Event Listeners

function handleSubmitForm(event) {
  event.preventDefault();
  const studentName = document.getElementById('name').value;
  const gradeValue = parseFloat(document.getElementById('grade').value);

  if (!studentName || isNaN(gradeValue)) {
    alert('Please complete all required fields.');
    return;
  }

  const tableBody = document.querySelector('#gradeTable tbody');
  const row = document.createElement('tr');
  row.innerHTML = \`<td>\${studentName}</td><td>\${gradeValue.toFixed(2)}</td>\`;
  tableBody.appendChild(row);
}`,
      },
      {
        filename: 'Lab1_MariaSantos_202400124.js',
        content: `// Student: Maria Santos (ID: 2024-00124)
// Section: ACT - NT A

const validateAndRender = (data) => {
  const container = document.getElementById('app');
  container.innerHTML = data.map(item => \`<div className="card">\${item.title}</div>\`).join('');
};
`,
      },
      {
        filename: 'Lab1_MarkBautista_Submission.py',
        content: `# Student: Mark Bautista
# Section: ACT - NT A
def calculate_grade(raw_score, total_items=50):
    pct = (raw_score / total_items) * 100
    if pct >= 90:
        return '1.00'
    return '3.00'
`,
      },
    ]);
  };

  const handleProcessGrading = async () => {
    if (!selectedSectionId) {
      alert('Please select a course section.');
      return;
    }
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one submission file.');
      return;
    }

    setIsEvaluating(true);
    setCommitSuccess(false);

    const rubricObj = rubrics.find((r) => r.id === selectedRubricId);
    const rubricText = rubricObj
      ? `Rubric: ${rubricObj.title} (${rubricObj.totalPoints} pts)\n` +
        rubricObj.criteria.map((c) => `- ${c.title} (${c.max_points} pts): ${c.description}`).join('\n')
      : '';

    try {
      const results = await onProcessBatchGrading({
        section_id: selectedSectionId,
        term,
        class_type: classType,
        component_category: componentCategory,
        task_name: taskName,
        total_items: totalItems,
        rubricText,
        customInstructions,
        files: uploadedFiles,
      });

      setGradingResults(results);
    } catch (err: any) {
      alert(err.message || 'Error executing batch AI evaluation.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleDeleteResultItem = (index: number) => {
    setGradingResults((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleClearAllResults = () => {
    if (window.confirm('Are you sure you want to clear all imported grading records from this batch?')) {
      setGradingResults([]);
    }
  };

  const handleUpdateResultFeedback = (index: number, newFeedback: string) => {
    setGradingResults((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, feedback: newFeedback } : item))
    );
  };

  const handleSetPresetReason = (
    index: number,
    preset: { label: string; text: string; score?: number; status?: string }
  ) => {
    setGradingResults((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const newScore = preset.score !== undefined ? preset.score : item.raw_score;
        const pct = (newScore / (item.total_items || 100)) * 100;
        const newStatus = preset.status || (pct >= 60 ? 'PASSED' : 'FAILED');

        // Append text if not already present
        let updatedFeedback = item.feedback || '';
        if (!updatedFeedback.trim()) {
          updatedFeedback = preset.text;
        } else if (!updatedFeedback.includes(preset.text)) {
          updatedFeedback = `${updatedFeedback}\n${preset.text}`;
        }

        // Add flag if preset indicates special condition
        const updatedFlags = [...(item.flags || [])];
        if (newScore === 0 && !updatedFlags.includes('Zero Score')) {
          updatedFlags.push('Zero Score');
        }
        if (preset.label.includes('Plagiarism') && !updatedFlags.includes('Plagiarism / Code Similarity')) {
          updatedFlags.push('Plagiarism / Code Similarity');
        }
        if (preset.label.includes('Late') && !updatedFlags.includes('Late Submission')) {
          updatedFlags.push('Late Submission');
        }
        if (preset.label.includes('Absent') && !updatedFlags.includes('Absent')) {
          updatedFlags.push('Absent');
        }

        return {
          ...item,
          raw_score: newScore,
          percentage_score: Number(pct.toFixed(1)),
          numerical_rating: pct >= 90 ? '1.00' : pct >= 80 ? '1.75' : pct >= 75 ? '2.50' : pct >= 60 ? '3.00' : '5.00',
          grade_status: newStatus,
          feedback: updatedFeedback,
          flags: updatedFlags,
        };
      })
    );
  };

  const handleUpdateResultScore = (index: number, newScore: number) => {
    setGradingResults((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const raw = Math.min(newScore, item.total_items || 100);
        const pct = (raw / (item.total_items || 100)) * 100;
        return {
          ...item,
          raw_score: raw,
          percentage_score: Number(pct.toFixed(1)),
          numerical_rating: pct >= 90 ? '1.00' : pct >= 80 ? '1.75' : pct >= 75 ? '2.50' : pct >= 60 ? '3.00' : '5.00',
          grade_status: pct >= 60 ? 'PASSED' : 'FAILED',
        };
      })
    );
  };

  const handleUpdateResultStatus = (index: number, newStatus: string) => {
    setGradingResults((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, grade_status: newStatus } : item))
    );
  };

  const handleCommitGrades = async () => {
    if (gradingResults.length === 0) return;
    setIsCommitting(true);
    try {
      const dbPayload = gradingResults.map((res) => ({
        student_id: res.student_id,
        student_id_number: res.student_id_number,
        student_name: res.student_name,
        section_id: selectedSectionId,
        term,
        class_type: classType,
        category_name: componentCategory,
        task_name: taskName,
        raw_score: res.raw_score,
        total_items: res.total_items,
        percentage_score: res.percentage_score,
        numerical_rating: res.numerical_rating,
        grade_status: res.grade_status,
        feedback: res.feedback,
        filename: res.filename,
        identity_unverified: res.identity_unverified,
      }));

      await onSaveApprovedGrades(selectedSectionId, dbPayload);
      setCommitSuccess(true);
      setTimeout(() => setCommitSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to commit grades.');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-stone-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <FileCode className="w-4 h-4 text-stone-700" />
            Module 4: Batch Grading Engine
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Batch Submission Grading & Auto-Roster Matching</h1>
          <p className="text-stone-600 text-sm mt-1">
            Evaluate student papers/code via Gemini AI OR import recorded student scores directly via Excel spreadsheet.
          </p>
        </div>

        {gradingMode === 'ai_files' && (
          <button
            onClick={handleLoadSampleFiles}
            className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            Load Sample Submissions
          </button>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => {
            setGradingMode('ai_files');
            setGradingResults([]);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            gradingMode === 'ai_files'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          AI Submission Evaluation (PDF / Code Files)
        </button>

        <button
          onClick={() => {
            setGradingMode('excel_scores');
            setGradingResults([]);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            gradingMode === 'excel_scores'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
          Excel / CSV Direct Score Import
        </button>
      </div>

      {/* No Weight Setup Error Alert */}
      {!isLoadingConfig && (!configuredComponents || configuredComponents.length === 0) && (
        <div className="bg-white border-2 border-amber-300 rounded-xl p-8 shadow-xs text-center max-w-2xl mx-auto my-6">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-stone-900 mb-2">No Weight Setup Found for Active Section</h2>
          <p className="text-xs text-stone-600 mb-6 leading-relaxed">
            No grading weight setup was found for this class in Firestore. Please configure the lecture/lab weights and grade components in the Weight Setup module before processing batch submissions.
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
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Config & Dropper Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Assignment Setup Card */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-stone-700" />
                Task & Target Section Setup
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Select Course Section</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full text-xs border border-stone-300 rounded-lg p-2.5 bg-white font-bold text-stone-900"
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.section_name} ({sec.subject_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Term</label>
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value as any)}
                  className="w-full text-xs border border-stone-300 rounded-lg p-2 bg-white"
                >
                  <option value="Midterm">Midterm</option>
                  <option value="Final">Final Term</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Class Type</label>
                <select
                  value={classType}
                  onChange={(e) => setClassType(e.target.value as any)}
                  disabled={isLecOnly || isLabOnly}
                  className="w-full text-xs border border-stone-300 rounded-lg p-2 bg-white disabled:bg-stone-100 disabled:text-stone-500 font-semibold"
                >
                  {isLecOnly && <option value="Lecture">Lecture Only (100%)</option>}
                  {isLabOnly && <option value="Laboratory">Laboratory Only (100%)</option>}
                  {isBoth && (
                    <>
                      <option value="Laboratory">Laboratory ({labWeight}%)</option>
                      <option value="Lecture">Lecture ({lecWeight}%)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Component Category</label>
                {activeComponentList.length > 0 ? (
                  <select
                    value={componentCategory}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      setComponentCategory(selectedName);
                      const found = activeComponentList.find((c) => c.category_name === selectedName);
                      if (found && found.class_type) {
                        setClassType(found.class_type);
                      }
                    }}
                    className="w-full text-xs border border-stone-300 rounded-lg p-2 font-semibold bg-white text-stone-900"
                  >
                    {activeComponentList.map((comp) => (
                      <option key={comp.id || comp.category_name} value={comp.category_name}>
                        [{comp.class_type}] {comp.category_name} ({comp.weight_percentage}%)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={componentCategory}
                    onChange={(e) => setComponentCategory(e.target.value)}
                    placeholder="e.g. Quizzes, Lab Exercises"
                    className="w-full text-xs border border-stone-300 rounded-lg p-2 font-semibold"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Total Possible Score</label>
                <input
                  type="number"
                  value={totalItems}
                  onChange={(e) => setTotalItems(Number(e.target.value))}
                  className="w-full text-xs border border-stone-300 rounded-lg p-2 font-mono font-bold text-center bg-white text-stone-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-stone-700 uppercase">Task Title / Assessment Name</label>
                {leafTasks.some((t) => t.name.toLowerCase() === taskName.toLowerCase()) && (
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                    ✓ Synced with Leaf Task ({totalItems} pts)
                  </span>
                )}
              </div>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g. Quiz 1, Quiz 2, Lab Exercise 1"
                className="w-full text-xs border border-stone-300 rounded-lg p-2 font-bold text-stone-900"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Total possible score ({totalItems} pts) is derived directly from the weight setup when selecting a task.
              </p>
            </div>

            {/* Task Contribution Breakdown Banner */}
            <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-white border border-emerald-200/90 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-stone-900">Task Weight Contribution</span>
                </div>
                <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                  {componentCategory}: {currentCategoryWeight}%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center bg-white/90 p-2.5 rounded-lg border border-stone-200/80 shadow-2xs">
                <div>
                  <p className="text-[10px] uppercase font-bold text-stone-500">In {classType}</p>
                  <p className="text-sm font-black text-emerald-950">{currentCategoryWeight}%</p>
                  <p className="text-[9px] text-stone-500 font-medium">Category Weight</p>
                </div>
                <div className="border-x border-stone-200">
                  <p className="text-[10px] uppercase font-bold text-stone-500">In {term} Grade</p>
                  <p className="text-sm font-black text-emerald-800">{effectiveTermContrib.toFixed(1)}%</p>
                  <p className="text-[9px] text-stone-500 font-medium">Term Share</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-stone-500">In Final Rating</p>
                  <p className="text-sm font-black text-teal-800">{effectiveFinalContrib.toFixed(1)}%</p>
                  <p className="text-[9px] text-stone-500 font-medium">Subject Overall</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-600">
                <span className="flex items-center gap-1 font-medium">
                  <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  {subTasksForCategory.length > 0
                    ? `${subTasksForCategory.length} sub-task(s) defined under [${componentCategory}]`
                    : `Assessments under [${componentCategory}] contribute ${currentCategoryWeight}% to the ${classType} component.`}
                </span>
                <span className="font-mono font-bold text-stone-900 shrink-0">{totalItems} Max Points</span>
              </div>
            </div>

            {gradingMode === 'ai_files' && (
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Link Rubric (Optional)</label>
                <select
                  value={selectedRubricId}
                  onChange={(e) => {
                    const rId = e.target.value;
                    setSelectedRubricId(rId);
                    if (rId) {
                      const found = rubrics.find((r) => r.id === rId);
                      if (found && typeof found.totalPoints === 'number' && found.totalPoints > 0) {
                        setTotalItems(found.totalPoints);
                      }
                    }
                  }}
                  className="w-full text-xs border border-stone-300 rounded-lg p-2 bg-white"
                >
                  <option value="">-- No Rubric / Use General Standard --</option>
                  {(() => {
                    const currentSec = sections.find((s) => s.id === selectedSectionId);
                    const applicableRubrics = rubrics.filter((r) => {
                      if (!r.subjects || r.subjects.length === 0 || r.subjects.includes('All Subjects') || r.subjects.includes('*')) return true;
                      return currentSec ? r.subjects.includes(currentSec.subject_name) : true;
                    });

                    return applicableRubrics.map((r) => {
                      const tagText = r.subjects && r.subjects.length > 0 ? ` [${r.subjects.join(', ')}]` : ' [All Subjects]';
                      return (
                        <option key={r.id} value={r.id}>
                          {r.title} ({r.totalPoints} pts){tagText}
                        </option>
                      );
                    });
                  })()}
                </select>
              </div>
            )}
          </div>

          {/* All Grade Components & Sub-Grade Components Breakdown Card */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <ListTree className="w-4 h-4 text-emerald-700" />
                  Section Grade Components & Weights Breakdown
                </h2>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Click any grade component or sub-task to quickly select it for batch grading.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={breakdownTermFilter}
                  onChange={(e) => setBreakdownTermFilter(e.target.value as any)}
                  className="text-[11px] font-bold border border-stone-200 rounded-lg px-2 py-1 bg-stone-50 text-stone-800"
                >
                  <option value="All">All Terms</option>
                  <option value="Midterm">Midterm Only</option>
                  <option value="Final">Final Term Only</option>
                </select>
                <select
                  value={breakdownClassFilter}
                  onChange={(e) => setBreakdownClassFilter(e.target.value as any)}
                  disabled={isLecOnly || isLabOnly}
                  className="text-[11px] font-bold border border-stone-200 rounded-lg px-2 py-1 bg-stone-50 text-stone-800 disabled:opacity-60"
                >
                  {isBoth && <option value="All">All Class Types</option>}
                  {!isLabOnly && (
                    <option value="Lecture">
                      Lecture Only ({isLecOnly ? '100%' : `${lecWeight}%`})
                    </option>
                  )}
                  {!isLecOnly && (
                    <option value="Laboratory">
                      Laboratory Only ({isLabOnly ? '100%' : `${labWeight}%`})
                    </option>
                  )}
                </select>
              </div>
            </div>

            {filteredBreakdownItems.length > 0 ? (
              <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto pr-1">
                {filteredBreakdownItems.map((item) => {
                  const isActive =
                    item.category_name.toLowerCase().trim() === componentCategory.toLowerCase().trim() &&
                    item.term === term &&
                    item.class_type === classType;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setComponentCategory(item.category_name);
                        setTerm(item.term as any);
                        setClassType(item.class_type as any);
                        if (item.task_name) setTaskName(item.task_name);
                        if (item.total_items) setTotalItems(item.total_items);
                      }}
                      className={`p-2.5 rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                        isActive
                          ? 'bg-emerald-50/90 border border-emerald-300 shadow-2xs ring-1 ring-emerald-400'
                          : 'hover:bg-stone-50/80 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-md ${isActive ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                          {item.is_leaf ? <Check className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-900">{item.name}</span>
                            <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                              {item.term} • {item.class_type}
                            </span>
                            {isActive && (
                              <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Selected Target
                              </span>
                            )}
                          </div>
                          {item.subTasks && item.subTasks.length > 0 && (
                            <p className="text-[10px] text-stone-500 mt-0.5 font-medium">
                              Sub-tasks: {item.subTasks.map((st) => `${st.name} (${st.total_items} pts)`).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="text-xs font-bold text-emerald-900">{item.weight_percentage}%</p>
                          <p className="text-[9px] text-stone-500 font-medium">Category</p>
                        </div>
                        <div className="border-l border-stone-200 pl-2.5">
                          <p className="text-xs font-bold text-stone-700">{item.effectiveTermContrib.toFixed(1)}%</p>
                          <p className="text-[9px] text-stone-500 font-medium">Term Share</p>
                        </div>
                        <div className="border-l border-stone-200 pl-2.5">
                          <p className="text-xs font-bold text-teal-800">{item.effectiveFinalContrib.toFixed(1)}%</p>
                          <p className="text-[9px] text-stone-500 font-medium">Final Share</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-stone-500 text-center py-4 italic">
                No grade components match the selected breakdown filter.
              </p>
            )}
          </div>

          {/* Upload Area depending on mode */}
          {gradingMode === 'excel_scores' ? (
            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  Excel Score Sheet Upload
                </h2>
                <button
                  onClick={handleDownloadExcelTemplate}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold py-1.5 px-3 rounded-lg border border-emerald-300 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Roster Template (.xlsx)
                </button>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-950 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <Table className="w-4 h-4 text-emerald-700" />
                  Smart Column Auto-Detection:
                </p>
                <p className="font-mono text-[11px] text-emerald-800">
                  <span className="font-bold">Student ID</span>, <span className="font-bold">Student Name</span>, <span className="font-bold">{taskName || 'Quiz 1'} / Raw Score / Points</span>
                </p>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Supports custom column names (e.g. <span className="font-mono font-semibold">Quiz 1</span>, <span className="font-mono font-semibold">Midterm Exam</span>, <span className="font-mono font-semibold">Score</span>, <span className="font-mono font-semibold">Points</span>, <span className="font-mono font-semibold">45/50</span>). Download the roster template above for quick pre-filled Student IDs!
                </p>
              </div>

              <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl p-6 text-center bg-emerald-50/30 transition-colors">
                <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-stone-800 mb-1">
                  {uploadedExcelName ? `Loaded: ${uploadedExcelName}` : 'Select or drop your Excel / CSV score sheet'}
                </p>
                <p className="text-[11px] text-stone-500 mb-3">Formats supported: .xlsx, .xls, .csv</p>
                <label className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2 px-4 rounded-lg cursor-pointer shadow-sm">
                  Browse Excel File
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleExcelFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            <>
              {/* Google Drive Batch Sync UI Card */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Google Drive Batch Sync
                  </h2>
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Drive API Sync
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-stone-600 uppercase">
                    Google Drive Folder ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 1A2b3C4d5E6f7G8h9I0j"
                      value={driveFolderId}
                      onChange={(e) => setDriveFolderId(e.target.value)}
                      className="flex-1 text-xs border border-stone-300 rounded-lg p-2 font-mono bg-stone-50/50"
                    />
                    <button
                      type="button"
                      disabled={isSyncingDrive || !driveFolderId.trim()}
                      onClick={async () => {
                        if (!driveFolderId.trim()) return;
                        setIsSyncingDrive(true);
                        try {
                          const rubricObj = rubrics.find((r) => r.id === selectedRubricId);
                          const res = await syncGoogleDriveBatchAPI({
                            folderId: driveFolderId.trim(),
                            section_id: selectedSectionId,
                            term,
                            class_type: classType,
                            component_category: componentCategory,
                            task_name: taskName,
                            total_items: totalItems,
                            rubricText: rubricObj ? rubricObj.title : undefined,
                          });
                          if (res.results && Array.isArray(res.results)) {
                            setGradingResults(res.results);
                          }
                        } catch (err: any) {
                          alert(err.message || 'Google Drive sync failed.');
                        } finally {
                          setIsSyncingDrive(false);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      {isSyncingDrive ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Syncing Drive...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          Sync & Grade
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    Syncs and batch grades files directly from Google Drive and saves results to Firestore <code className="bg-stone-100 px-1 rounded">grades_sync</code> collection.
                  </p>
                </div>
              </div>

              {/* Mass File Dropper Card (AI Mode) */}
              <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-stone-700" />
                  Upload Submissions Batch ({uploadedFiles.length})
                </span>
                {uploadedFiles.length > 0 && (
                  <button
                    onClick={() => setUploadedFiles([])}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Clear Files
                  </button>
                )}
              </h2>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  dragActive ? 'border-stone-900 bg-stone-50' : 'border-stone-300 hover:border-stone-400 bg-stone-50/50'
                }`}
              >
                <FileCode className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-stone-800 mb-1">Drop student submission files here</p>
                <p className="text-[11px] text-stone-500 mb-3">Code, text, documents, or logs</p>
                <div className="flex items-center justify-center gap-2">
                  <label className="inline-flex items-center gap-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-bold py-2 px-3 rounded-lg cursor-pointer shadow-xs">
                    Browse Files
                    <input type="file" multiple onChange={handleFileChange} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSampleFiles}
                    className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold py-2 px-3 rounded-lg shadow-xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Load Sample Files
                  </button>
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="max-h-36 overflow-y-auto border border-stone-200 rounded-lg p-2 space-y-1">
                  {uploadedFiles.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-stone-50 px-2.5 py-1.5 rounded">
                      <span className="font-mono text-stone-800 truncate max-w-[200px]">{f.filename}</span>
                      <button
                        onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-stone-400 hover:text-red-600 text-[10px]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleProcessGrading}
                disabled={isEvaluating || uploadedFiles.length === 0}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs shadow-md disabled:opacity-50"
              >
                {isEvaluating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Running AI Evaluation & Roster Match...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Execute Batch AI Grading ({uploadedFiles.length} files)
                  </>
                )}
              </button>
            </div>
          </>
        )}
        </div>

        {/* Right Grade Approval Matrix Column (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                Batch Grading & Metadata Matrix ({gradingResults.length})
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Step 2 Metadata Extraction Table: Review student identification, group classification, criteria scores, and flags before committing.
              </p>
            </div>

            {gradingResults.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setReviewerStudentIndex(0);
                    setIsReviewerOpen(true);
                  }}
                  className="bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold py-2.5 px-3.5 rounded-lg flex items-center gap-1.5 border border-amber-500/30 shadow-xs transition-all cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-emerald-400" />
                  Launch Reviewer Workbench
                </button>
                <button
                  onClick={handleCommitGrades}
                  disabled={isCommitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {commitSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-200" />
                      Committed!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {isCommitting ? 'Saving Records...' : 'Commit Grades'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {gradingResults.length === 0 ? (
            <div className="p-12 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300">
              <Sparkles className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-stone-700">No active evaluation matrix yet.</p>
              <p className="text-xs text-stone-500 mt-1">Upload submission files on the left and click "Execute Batch AI Grading".</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats Badges */}
              {(() => {
                const individualCount = gradingResults.filter(
                  (r) => r.submission_type === 'INDIVIDUAL' || (!r.submission_type && (!r.group_members || r.group_members.length === 0))
                ).length;
                const groupCount = gradingResults.filter(
                  (r) => r.submission_type === 'GROUP' || (r.group_members && r.group_members.length > 0)
                ).length;
                const flaggedCount = gradingResults.filter(
                  (r) => r.submission_type === 'NEEDS_REVIEW' || (r.flags && r.flags.length > 0) || r.identity_unverified
                ).length;

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Submissions</span>
                        <span className="text-base font-black text-stone-800">{gradingResults.length}</span>
                      </div>
                      <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-2.5">
                        <span className="text-[10px] uppercase font-bold text-blue-700 block">Individual</span>
                        <span className="text-base font-black text-blue-900">{individualCount}</span>
                      </div>
                      <div className="bg-purple-50/60 border border-purple-200 rounded-lg p-2.5">
                        <span className="text-[10px] uppercase font-bold text-purple-700 block">Group Submissions</span>
                        <span className="text-base font-black text-purple-900">{groupCount}</span>
                      </div>
                      <div className={`rounded-lg p-2.5 border ${
                        flaggedCount > 0 ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}>
                        <span className="text-[10px] uppercase font-bold block">Needs Review / Flagged</span>
                        <span className="text-base font-black">{flaggedCount}</span>
                      </div>
                    </div>

                    {/* Filter & View Switcher Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-b border-stone-200 pb-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-stone-400 font-bold flex items-center gap-1 text-[11px]">
                          <Filter className="w-3.5 h-3.5" /> Filter:
                        </span>
                        <button
                          type="button"
                          onClick={() => setResultsFilter('all')}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                            resultsFilter === 'all'
                              ? 'bg-stone-900 text-white'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          }`}
                        >
                          All ({gradingResults.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setResultsFilter('individual')}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                            resultsFilter === 'individual'
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                          }`}
                        >
                          Individual ({individualCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setResultsFilter('group')}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                            resultsFilter === 'group'
                              ? 'bg-purple-600 text-white'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                          }`}
                        >
                          Group ({groupCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setResultsFilter('flagged')}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                            resultsFilter === 'flagged'
                              ? 'bg-amber-600 text-white'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                          }`}
                        >
                          Flagged ({flaggedCount})
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleClearAllResults}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Clear all records from this batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Clear All</span>
                        </button>

                        <div className="flex items-center gap-1 text-xs border border-stone-200 rounded-lg p-0.5 bg-stone-50">
                          <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                              viewMode === 'table' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500 hover:text-stone-800'
                            }`}
                          >
                            <Table className="w-3.5 h-3.5" /> Table
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode('cards')}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                              viewMode === 'cards' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500 hover:text-stone-800'
                            }`}
                          >
                            <LayoutGrid className="w-3.5 h-3.5" /> Cards
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Filtered Results Items */}
              {(() => {
                const filteredResults = gradingResults.map((item, originalIndex) => ({ item, originalIndex })).filter(({ item }) => {
                  if (resultsFilter === 'individual') {
                    return item.submission_type === 'INDIVIDUAL' || (!item.submission_type && (!item.group_members || item.group_members.length === 0));
                  }
                  if (resultsFilter === 'group') {
                    return item.submission_type === 'GROUP' || (item.group_members && item.group_members.length > 0);
                  }
                  if (resultsFilter === 'flagged') {
                    return item.submission_type === 'NEEDS_REVIEW' || (item.flags && item.flags.length > 0) || item.identity_unverified || item.raw_score === 0;
                  }
                  return true;
                });

                if (filteredResults.length === 0) {
                  return (
                    <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200">
                      <p className="text-xs text-stone-500">No submissions matching the selected filter ({resultsFilter}).</p>
                    </div>
                  );
                }

                // Table View (Step 2 Metadata & Scoring Table with Marks/Reason + Delete Row)
                if (viewMode === 'table') {
                  return (
                    <div className="overflow-x-auto border border-stone-200 rounded-xl shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-stone-100 text-stone-700 uppercase font-bold text-[10px] tracking-wider border-b border-stone-200">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">Student ID</th>
                            <th className="p-3">Student Name</th>
                            <th className="p-3">Raw Score ({totalItems || 100} max)</th>
                            <th className="p-3">Marks / Reason (Why 0 / Notes)</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 bg-white">
                          {filteredResults.map(({ item, originalIndex }, displayIdx) => {
                            const isGroup = item.submission_type === 'GROUP' || (item.group_members && item.group_members.length > 0);
                            const hasFlags = (item.flags && item.flags.length > 0) || item.identity_unverified || item.submission_type === 'NEEDS_REVIEW' || item.raw_score === 0;

                            return (
                              <tr
                                key={originalIndex}
                                className={`hover:bg-amber-50/40 transition-colors ${
                                  hasFlags ? 'bg-amber-50/20' : ''
                                }`}
                              >
                                <td className="p-3 font-mono text-stone-400 text-[10px]">
                                  {displayIdx + 1}
                                </td>
                                <td className="p-3 font-mono text-stone-700">
                                  <span className="font-semibold">{item.student_id_number || item.student_id || 'N/A'}</span>
                                  {item.identity_unverified && (
                                    <span className="block text-[9px] text-amber-700 font-sans font-bold">Unverified</span>
                                  )}
                                </td>
                                <td className="p-3 font-bold text-stone-900">
                                  <div className="flex items-center gap-1.5">
                                    <span>{item.student_name}</span>
                                    {isGroup && (
                                      <span className="bg-purple-100 text-purple-800 text-[9px] font-bold px-1.5 py-0.2 rounded inline-flex items-center gap-0.5">
                                        <Users className="w-2.5 h-2.5" /> Group
                                      </span>
                                    )}
                                  </div>
                                  <span className="block text-[10px] text-stone-400 font-mono truncate max-w-[150px]">
                                    {item.filename || 'Direct import'}
                                  </span>
                                </td>

                                {/* Inline Score Editor */}
                                <td className="p-3">
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min={0}
                                      max={item.total_items || 100}
                                      value={item.raw_score}
                                      onChange={(e) => handleUpdateResultScore(originalIndex, Number(e.target.value))}
                                      className={`w-16 border rounded px-2 py-1 font-mono font-bold text-xs ${
                                        item.raw_score === 0 ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-stone-300 bg-white text-stone-900'
                                      }`}
                                    />
                                    <span className="text-[11px] text-stone-500 font-mono">
                                      / {item.total_items || 100}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-semibold text-stone-500 font-mono block mt-0.5">
                                    {item.percentage_score}% ({item.numerical_rating})
                                  </span>
                                </td>

                                {/* Marks / Reason / Notes Input with Quick Presets */}
                                <td className="p-3 max-w-[280px]">
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      value={item.feedback || ''}
                                      placeholder="e.g. Absent on quiz, No submission, Cheating..."
                                      onChange={(e) => handleUpdateResultFeedback(originalIndex, e.target.value)}
                                      className={`w-full border rounded px-2 py-1 text-xs transition-colors ${
                                        item.raw_score === 0 && !item.feedback
                                          ? 'border-amber-400 bg-amber-50/50 text-stone-800 placeholder:text-amber-600'
                                          : 'border-stone-300 bg-white text-stone-800'
                                      }`}
                                    />

                                    {/* Quick Mark/Reason Preset Buttons */}
                                    <div className="flex flex-wrap items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSetPresetReason(originalIndex, {
                                            label: 'Absent',
                                            text: 'Absent on quiz date. 0 points recorded.',
                                            score: 0,
                                            status: 'FAILED',
                                          })
                                        }
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 transition-colors cursor-pointer"
                                        title="Set 0 score with Absent reason"
                                      >
                                        Absent (0)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSetPresetReason(originalIndex, {
                                            label: 'No Submission',
                                            text: 'No submission file / blank requirement. 0 points recorded.',
                                            score: 0,
                                            status: 'FAILED',
                                          })
                                        }
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 transition-colors cursor-pointer"
                                        title="Set 0 score with No Submission reason"
                                      >
                                        No Sub (0)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSetPresetReason(originalIndex, {
                                            label: 'Plagiarism',
                                            text: 'Academic Integrity Violation: Plagiarism / Unauthorized collaboration detected. Automatic 0.',
                                            score: 0,
                                            status: 'FAILED',
                                          })
                                        }
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 transition-colors cursor-pointer"
                                        title="Set 0 score for Cheating / Plagiarism"
                                      >
                                        Cheated (0)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSetPresetReason(originalIndex, {
                                            label: 'Excused',
                                            text: 'Approved excused absence with official documentation.',
                                            status: 'INC',
                                          })
                                        }
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors cursor-pointer"
                                        title="Excused absence (INC status)"
                                      >
                                        Excused (EX)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSetPresetReason(originalIndex, {
                                            label: 'Late',
                                            text: 'Late submission penalty: -10 points deducted.',
                                            score: Math.max(0, item.raw_score - 10),
                                          })
                                        }
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                                        title="Deduct 10 points for late submission"
                                      >
                                        Late (-10)
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                {/* Status Select */}
                                <td className="p-3">
                                  <select
                                    value={item.grade_status}
                                    onChange={(e) => handleUpdateResultStatus(originalIndex, e.target.value)}
                                    className={`border rounded px-2 py-1 font-bold text-xs ${
                                      item.grade_status === 'PASSED'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : item.grade_status === 'INC'
                                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                                          : 'bg-rose-50 text-rose-800 border-rose-300'
                                    }`}
                                  >
                                    <option value="PASSED">PASSED</option>
                                    <option value="FAILED">FAILED</option>
                                    <option value="INC">INC</option>
                                    <option value="UW">UW</option>
                                    <option value="AW">AW</option>
                                  </select>
                                </td>

                                {/* Row Actions: Review + Delete */}
                                <td className="p-3 text-center">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReviewerStudentIndex(originalIndex);
                                        setIsReviewerOpen(true);
                                      }}
                                      className="bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-[11px] px-2 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                                      title="Open submission reviewer"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-amber-700" />
                                      <span>Review</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Delete "${item.student_name}" from this batch?`)) {
                                          handleDeleteResultItem(originalIndex);
                                        }
                                      }}
                                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-[11px] p-1.5 rounded-lg transition-colors cursor-pointer"
                                      title="Delete student row from this batch"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                // Cards View with Delete and Marks Controls
                return (
                  <div className="space-y-4">
                    {filteredResults.map(({ item, originalIndex }) => (
                      <div key={originalIndex} className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-3 hover:border-amber-400/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-sm text-stone-900">{item.student_name}</span>
                              {item.submission_type === 'GROUP' || (item.group_members && item.group_members.length > 0) ? (
                                <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                  <Users className="w-3 h-3" /> Group Submission
                                </span>
                              ) : (
                                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                  Individual
                                </span>
                              )}
                              {item.identity_unverified ? (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3" /> Unverified Match
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Verified Roster Match
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-stone-500 font-mono mt-0.5">
                              File: {item.filename} • ID: {item.student_id_number || item.student_id || '2024-00000'}
                            </div>

                            {/* Group Members list in card */}
                            {item.group_members && item.group_members.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-1.5 text-xs">
                                <span className="text-[10px] font-bold text-purple-700 uppercase">Members:</span>
                                {item.group_members.map((m, mIdx) => (
                                  <span key={mIdx} className="bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-mono px-1.5 py-0.5 rounded">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Flags in card */}
                            {item.flags && item.flags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                {item.flags.map((f, fIdx) => (
                                  <span key={fIdx} className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> {f}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-lg font-black text-stone-900">
                                {item.raw_score} / {item.total_items}
                                <span className="text-xs font-normal text-stone-500 ml-1">({item.percentage_score}%)</span>
                              </div>
                              <div className="text-xs font-bold text-stone-600">
                                Rating: <span className="text-stone-900 font-extrabold">{item.numerical_rating}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete "${item.student_name}" from this batch?`)) {
                                  handleDeleteResultItem(originalIndex);
                                }
                              }}
                              className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-colors cursor-pointer"
                              title="Delete student row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Submission Inspector Button */}
                        <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewerStudentIndex(originalIndex);
                              setIsReviewerOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-700" />
                            Inspect & Review Submission (Code Sandbox / Doc Reader)
                          </button>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {item.content ? `${item.content.length} chars` : 'Spreadsheet record'}
                          </span>
                        </div>

                        {/* Editable Control Bar */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-stone-200 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">Override Raw Score</label>
                            <input
                              type="number"
                              max={item.total_items}
                              value={item.raw_score}
                              onChange={(e) => handleUpdateResultScore(originalIndex, Number(e.target.value))}
                              className="w-full border border-stone-300 rounded px-2 py-1 font-bold bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">Grade Status</label>
                            <select
                              value={item.grade_status}
                              onChange={(e) => handleUpdateResultStatus(originalIndex, e.target.value)}
                              className="w-full border border-stone-300 rounded px-2 py-1 font-bold bg-white"
                            >
                              <option value="PASSED">PASSED</option>
                              <option value="FAILED">FAILED</option>
                              <option value="INC">INC (Incomplete)</option>
                              <option value="UW">UW (Unauthorized Withdrawal)</option>
                              <option value="AW">AW (Authorized Withdrawal)</option>
                            </select>
                          </div>
                        </div>

                        {/* Marks / Reason & Presets */}
                        <div className="space-y-1.5 pt-2 border-t border-stone-200">
                          <label className="block text-[10px] font-bold text-stone-500 uppercase">
                            Marks / Reason / Rationale
                          </label>
                          <input
                            type="text"
                            value={item.feedback || ''}
                            onChange={(e) => handleUpdateResultFeedback(originalIndex, e.target.value)}
                            placeholder="e.g. Absent on quiz, No submission, Plagiarism detected..."
                            className="w-full border border-stone-300 rounded px-2 py-1 text-xs bg-white text-stone-800"
                          />
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleSetPresetReason(originalIndex, {
                                  label: 'Absent',
                                  text: 'Absent on quiz date. 0 points recorded.',
                                  score: 0,
                                  status: 'FAILED',
                                })
                              }
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 cursor-pointer"
                            >
                              Absent (0)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleSetPresetReason(originalIndex, {
                                  label: 'No Submission',
                                  text: 'No submission file / blank requirement. 0 points recorded.',
                                  score: 0,
                                  status: 'FAILED',
                                })
                              }
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 cursor-pointer"
                            >
                              No Sub (0)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleSetPresetReason(originalIndex, {
                                  label: 'Plagiarism',
                                  text: 'Academic Integrity Violation: Plagiarism detected. Automatic 0.',
                                  score: 0,
                                  status: 'FAILED',
                                })
                              }
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 cursor-pointer"
                            >
                              Cheated (0)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleSetPresetReason(originalIndex, {
                                  label: 'Excused',
                                  text: 'Approved excused absence with official documentation.',
                                  status: 'INC',
                                })
                              }
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 cursor-pointer"
                            >
                              Excused (EX)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleSetPresetReason(originalIndex, {
                                  label: 'Late',
                                  text: 'Late submission penalty: -10 points deducted.',
                                  score: Math.max(0, item.raw_score - 10),
                                })
                              }
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                            >
                              Late (-10)
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Student Submission Reviewer Modal (Code Sandbox & Document Reader) */}
      <StudentSubmissionReviewerModal
        isOpen={isReviewerOpen}
        onClose={() => setIsReviewerOpen(false)}
        results={gradingResults}
        currentIndex={reviewerStudentIndex}
        onNavigate={(newIdx) => setReviewerStudentIndex(newIdx)}
        onUpdateResult={(idx, updatedItem) => {
          setGradingResults((prev) =>
            prev.map((item, i) => (i === idx ? { ...item, ...updatedItem } : item))
          );
        }}
        onDeleteResult={(idx) => {
          handleDeleteResultItem(idx);
          if (gradingResults.length <= 1) {
            setIsReviewerOpen(false);
          } else if (reviewerStudentIndex >= gradingResults.length - 1) {
            setReviewerStudentIndex(Math.max(0, gradingResults.length - 2));
          }
        }}
        sectionId={selectedSectionId}
        rubricText={rubrics.find((r) => r.id === selectedRubricId)?.title}
        taskName={taskName}
      />
    </div>
  );
};
