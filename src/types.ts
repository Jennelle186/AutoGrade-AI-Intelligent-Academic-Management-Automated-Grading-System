export type AssignmentType = 'HW' | 'QUIZ' | 'TEST' | 'ESSAY' | 'LAB' | 'PROJECT';

export interface Assignment {
  id: string;
  name: string; // e.g. "HW 1", "QUIZ 1", "TEST 1"
  type: AssignmentType;
  maxPoints: number; // e.g. 10, 25, 50
  dueDate?: string;
  rubricId?: string;
  term?: 'Midterm' | 'Final';
  classType?: 'Lecture' | 'Laboratory';
  categoryName?: string;
}

export interface Student {
  id: string;
  student_id_number?: string;
  name: string;
  email?: string;
  notes?: string;
  section_id?: string;
}

export interface CourseSection {
  id: string;
  section_name: string; // e.g. "ACT - NT A"
  subject_name: string; // e.g. "Web Development"
  passing_threshold: number; // default 60%
  createdAt: string;
  studentCount?: number;
}

export interface SectionStudent {
  id: string;
  student_id_number: string;
  student_name: string;
  email: string;
  section_id: string;
}

export interface GradeComponentWeight {
  id: string;
  section_id: string;
  term: 'Midterm' | 'Final';
  class_type: 'Lecture' | 'Laboratory';
  category_name: string; // e.g. "Major Exam", "Quizzes", "Lab Exercises"
  weight_percentage: number; // e.g. 40
}

export interface GradeComponentNode {
  id: string;
  course_id?: string;
  parent_id?: string | null;
  name: string;
  weight_percentage: number;
  is_leaf: boolean;
  total_items?: number | null;
  term?: 'Midterm' | 'Final';
  class_type?: 'Lecture' | 'Laboratory';
  children?: GradeComponentNode[];
}

export interface WeightConfig {
  section_id: string;
  midterm_weight: number; // default 40%
  final_weight: number; // default 60%
  lecture_weight: number; // default 60%
  laboratory_weight: number; // default 40%
  components: GradeComponentWeight[];
}

export interface GradeScaleRow {
  id: string;
  section_id: string;
  min_percentage: number;
  max_percentage: number;
  numerical_rating: string; // e.g. "1.00", "1.25", "2.00", "5.00"
  remarks: string; // e.g. "Excellent", "Passed", "Failed"
  is_special_status?: boolean;
}

export interface SpecialStatusConfig {
  code: 'INC' | 'UW' | 'AW';
  title: string;
  description: string;
  enabled: boolean;
}

export interface StudentGradeRecord {
  id: string;
  student_id: string;
  student_id_number?: string;
  student_name?: string;
  section_id: string;
  term: 'Midterm' | 'Final';
  class_type: 'Lecture' | 'Laboratory';
  category_name: string;
  task_name: string;
  raw_score: number;
  total_items: number;
  percentage_score: number;
  numerical_rating: string;
  grade_status: string; // e.g., 'PASSED', 'FAILED', 'INC', 'UW', 'AW'
  feedback: string;
  timestamp: string;
  filename?: string;
  identity_unverified?: boolean;
  submission_type?: 'INDIVIDUAL' | 'GROUP' | 'NEEDS_REVIEW';
  group_members?: string[];
  flags?: string[];
}

export interface BatchGradingFileItem {
  filename: string;
  content: string; // text or snippet
  size?: number;
}

export interface BatchGradingResultItem {
  filename: string;
  content?: string;
  student_id: string;
  student_id_number?: string;
  student_name: string;
  identity_unverified: boolean;
  section_name: string;
  subject_name: string;
  term: 'Midterm' | 'Final';
  class_type: 'Lecture' | 'Laboratory';
  component_category: string;
  task_name: string;
  raw_score: number;
  total_items: number;
  percentage_score: number;
  numerical_rating: string;
  grade_status: string; // PASSED | FAILED | INC | UW | AW
  feedback: string;
  approved?: boolean;
  submission_type?: 'INDIVIDUAL' | 'GROUP' | 'NEEDS_REVIEW';
  group_members?: string[];
  flags?: string[];
  criterion_scores?: CriterionScore[];
  extracted_id?: string;
  extracted_name?: string;
}

export interface CriterionScore {
  criterion: string;
  points_awarded: number;
  points_possible: number;
  feedback?: string;
}

export interface Deduction {
  reason: string;
  points: number;
}

export interface EvaluationResult {
  student_name: string;
  score: number;
  feedback: string;
  criterion_scores?: CriterionScore[];
  deductions?: Deduction[];
  strengths?: string[];
  evaluatedAt?: string;
}

export interface RubricCriterion {
  id: string;
  title: string;
  max_points: number;
  description: string;
  expectations?: string[];
}

export interface Rubric {
  id: string;
  title: string;
  totalPoints: number;
  criteria: RubricCriterion[];
  subjects?: string[]; // Array of subject names or ["All Subjects"]
}

export interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  assignmentId: string;
  content: string;
  submittedAt: string;
  status: 'PENDING' | 'GRADED' | 'DRAFT';
  evaluation?: EvaluationResult;
}

export type ActiveTab = 
  | 'courses-sections' 
  | 'weights-config' 
  | 'grade-scales' 
  | 'batch-grading' 
  | 'gradebook-sheet' 
  | 'spreadsheet-grid'
  | 'rubrics' 
  | 'individual-reports' 
  | 'overview' 
  | 'ai-studio-prompt';

export type CellSyncStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';
export type SpecialGradeCode = 'NONE' | 'EX' | 'M' | 'INC' | 'UW' | 'AW';

export interface GridTaskColumn {
  id: string; // unique key e.g. "Midterm-Laboratory-Lab 1"
  name: string;
  term: 'Midterm' | 'Final';
  classType: 'Lecture' | 'Laboratory';
  category: string;
  maxPoints: number;
  weightPercentage?: number;
}

export interface GridCellData {
  studentId: string;
  taskId: string;
  rawScore: number | null;
  totalItems: number;
  specialCode?: SpecialGradeCode;
  feedback?: string;
  syncStatus: CellSyncStatus;
  lastSavedAt?: string;
  inputValue?: string;
  isInvalid?: boolean;
  errorMessage?: string;
}

export interface GradebookStudentRecord {
  id?: string;
  student_id?: string;
  section_id?: string;
  term?: 'Midterm' | 'Final';
  class_type?: 'Lecture' | 'Laboratory';
  category_name?: string;
  task_name?: string;
  raw_score: number;
  total_items: number;
  percentage_score?: number;
  numerical_rating?: string;
  grade_status?: string;
  feedback?: string;
  timestamp?: string;
  filename?: string;
  content?: string;
  submission_type?: 'INDIVIDUAL' | 'GROUP' | 'NEEDS_REVIEW';
  group_members?: string[];
  flags?: string[];
  criterion_scores?: CriterionScore[];
}

export interface GradebookStudent {
  id: string;
  student_id?: string;
  student_id_number?: string;
  student_name: string;
  email?: string;
  section_id?: string;
  records: GradebookStudentRecord[];
  notes?: string;
}

export interface GradebookDataResponse {
  section?: CourseSection;
  weight_config?: WeightConfig;
  grade_scale?: GradeScaleRow[];
  gradebook?: GradebookStudent[];
  students?: GradebookStudent[];
}

export interface StudentLiveSummary {
  midLecAvg: number | null;
  midLabAvg: number | null;
  midTotal: number | null;
  finLecAvg: number | null;
  finLabAvg: number | null;
  finTotal: number | null;
  overall: number | null;
  numericalRating: string;
  remarks: string;
}

export interface ClassLiveMetrics {
  avg: number;
  passingCount: number;
  failingCount: number;
  totalGraded: number;
  passingRate: string;
}


