import { GradeComponentNode, GradeComponentWeight, StudentGradeRecord } from '../types';

export interface GradableTask {
  id: string;
  task_name: string;
  category_id: string;
  category_name: string;
  term: 'Midterm' | 'Final';
  class_type: 'Lecture' | 'Laboratory';
  total_items: number;
  weight_percentage?: number;
}

export interface ComponentCategory {
  id: string;
  section_id: string;
  term: 'Midterm' | 'Final';
  class_type: 'Lecture' | 'Laboratory';
  category_name: string;
  weight_percentage: number;
  sub_tasks?: GradableTask[];
}

export interface DriveSyncRecord {
  id?: string;
  student_name: string;
  student_id_number?: string;
  score: number;
  raw_score: number;
  total_items: number;
  percentage_score: number;
  feedback: string;
  filename: string;
  folder_id: string;
  task_name: string;
  section_id: string;
  timestamp: string;
  synced_at?: string;
}

/**
 * Calculates the mean score of sub-tasks for a given Component Category (Group Score Averaging).
 * Enforces strict sub-task grouping where sub-task scores are averaged to produce the category grade.
 */
export function computeGroupAverage(subTasks: { raw_score: number; total_items: number; percentage_score?: number }[]): number {
  if (!subTasks || subTasks.length === 0) return 0;
  
  const percentages = subTasks.map((t) => {
    if (typeof t.percentage_score === 'number' && !isNaN(t.percentage_score)) {
      return t.percentage_score;
    }
    const max = t.total_items > 0 ? t.total_items : 100;
    return (t.raw_score / max) * 100;
  });

  const sum = percentages.reduce((acc, curr) => acc + curr, 0);
  return Number((sum / percentages.length).toFixed(1));
}

/**
 * Validates a hierarchical weight setup tree.
 * Supports Modular Course Structures (Lecture-only, Lab-only, or Hybrid).
 * Omitted branches (weight = 0 or disabled) are ignored, and only active sibling nodes must sum to 100%.
 */
export function validateModularWeightTree(node: GradeComponentNode): string[] {
  const errors: string[] = [];
  if (!node.is_leaf && node.children && node.children.length > 0) {
    // Filter active children (weight > 0)
    const activeChildren = node.children.filter((c) => (Number(c.weight_percentage) || 0) > 0);
    
    if (activeChildren.length > 0) {
      const sum = activeChildren.reduce((acc, child) => acc + (Number(child.weight_percentage) || 0), 0);
      if (Math.abs(sum - 100) > 0.01) {
        errors.push(`Group "${node.name}" active children weights sum to ${sum}% (Must be 100%)`);
      }
    }

    // Recursively validate child nodes
    node.children.forEach((child) => {
      errors.push(...validateModularWeightTree(child));
    });
  }
  return errors;
}

/**
 * Traverses the Weight Setup Tree to dynamically resolve target leaf task nodes
 * and total items without relying on legacy manual task leaf selector dropdowns.
 */
export function resolveTargetNode(
  treeRoot: GradeComponentNode | null,
  term: 'Midterm' | 'Final',
  classType: 'Lecture' | 'Laboratory',
  categoryName: string,
  taskName: string
): { resolvedTotalItems: number; resolvedCategory: string; node: GradeComponentNode | null } {
  if (!treeRoot) {
    return { resolvedTotalItems: 100, resolvedCategory: categoryName, node: null };
  }

  let foundNode: GradeComponentNode | null = null;

  function traverse(node: GradeComponentNode, currentTerm = 'Midterm', currentClassType = 'Lecture', currentCat = '') {
    const t = node.term || currentTerm;
    const cType = node.class_type || currentClassType;
    const cat = !node.is_leaf ? node.name : currentCat;

    if (
      node.is_leaf &&
      (node.name.toLowerCase().trim() === taskName.toLowerCase().trim() ||
        cat.toLowerCase().trim() === categoryName.toLowerCase().trim()) &&
      (!node.term || node.term === term) &&
      (!node.class_type || node.class_type === classType)
    ) {
      foundNode = node;
      return;
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child, t, cType, cat);
        if (foundNode) break;
      }
    }
  }

  traverse(treeRoot, term, classType, categoryName);

  if (foundNode) {
    const fn = foundNode as GradeComponentNode;
    return {
      resolvedTotalItems: fn.total_items || 100,
      resolvedCategory: categoryName,
      node: fn,
    };
  }

  return { resolvedTotalItems: 100, resolvedCategory: categoryName, node: null };
}

export interface WeightConfig {
  midterm_weight: number;
  final_weight: number;
  lecture_weight: number;
  laboratory_weight: number;
}

export interface CalculatedStudentGradebookSummary {
  component_scores: Record<string, number | null>;
  midterm_lecture_avg: number | null;
  midterm_lab_avg: number | null;
  midterm_total: number | null;
  final_lecture_avg: number | null;
  final_lab_avg: number | null;
  final_total: number | null;
  overall_percentage: number | null;
}

/**
 * Unified calculation helper for calculating student component scores, group averages,
 * term totals, and overall percentage across Gradebook Sheet, Student Reports, and Summary Cards.
 */
export function calculateStudentGradebookSummary(
  studentRecords: StudentGradeRecord[] | any[],
  components: GradeComponentWeight[] | any[],
  weights: WeightConfig
): CalculatedStudentGradebookSummary {
  const component_scores: Record<string, number | null> = {};

  components.forEach((comp) => {
    const matchingRecords = (studentRecords || []).filter(
      (r) =>
        r.term === comp.term &&
        r.class_type === comp.class_type &&
        (r.category_name || '').toLowerCase().trim() === (comp.category_name || '').toLowerCase().trim()
    );

    if (matchingRecords.length > 0) {
      const sum = matchingRecords.reduce((acc, r) => acc + (Number(r.percentage_score) || 0), 0);
      component_scores[comp.id] = Number((sum / matchingRecords.length).toFixed(1));
    } else {
      component_scores[comp.id] = null;
    }
  });

  const getGroupAvg = (term: 'Midterm' | 'Final', classType: 'Lecture' | 'Laboratory') => {
    const groupComponents = (components || []).filter(
      (c) => c.term === term && c.class_type === classType
    );

    let weightedSum = 0;
    let totalWeight = 0;

    groupComponents.forEach((comp) => {
      const score = component_scores[comp.id];
      if (score !== null && score !== undefined && !isNaN(score)) {
        const w = Number(comp.weight_percentage) || 0;
        weightedSum += score * w;
        totalWeight += w;
      }
    });

    if (totalWeight > 0) {
      return Number((weightedSum / totalWeight).toFixed(1));
    }

    const fallbackRecords = (studentRecords || []).filter(
      (r) => r.term === term && r.class_type === classType
    );
    if (fallbackRecords.length === 0) return null;
    const sum = fallbackRecords.reduce((acc, r) => acc + (Number(r.percentage_score) || 0), 0);
    return Number((sum / fallbackRecords.length).toFixed(1));
  };

  const midterm_lecture_avg = getGroupAvg('Midterm', 'Lecture');
  const midterm_lab_avg = getGroupAvg('Midterm', 'Laboratory');
  const final_lecture_avg = getGroupAvg('Final', 'Lecture');
  const final_lab_avg = getGroupAvg('Final', 'Laboratory');

  const lecW = weights.lecture_weight !== undefined && weights.lecture_weight !== null ? Number(weights.lecture_weight) : 60;
  const labW = weights.laboratory_weight !== undefined && weights.laboratory_weight !== null ? Number(weights.laboratory_weight) : 40;

  const computeTermTotal = (lecAvg: number | null, labAvg: number | null) => {
    if (lecAvg === null && labAvg === null) return null;
    if (lecAvg !== null && labAvg !== null) {
      return Number(((lecAvg * lecW + labAvg * labW) / (lecW + labW)).toFixed(1));
    }
    return lecAvg !== null ? Number(lecAvg.toFixed(1)) : Number(labAvg!.toFixed(1));
  };

  const midterm_total = computeTermTotal(midterm_lecture_avg, midterm_lab_avg);
  const final_total = computeTermTotal(final_lecture_avg, final_lab_avg);

  const midW = weights.midterm_weight !== undefined && weights.midterm_weight !== null ? Number(weights.midterm_weight) : 40;
  const finW = weights.final_weight !== undefined && weights.final_weight !== null ? Number(weights.final_weight) : 60;

  let overall_percentage: number | null = null;
  if (midterm_total !== null && final_total !== null) {
    overall_percentage = Number(((midterm_total * midW + final_total * finW) / (midW + finW)).toFixed(1));
  } else if (midterm_total !== null) {
    overall_percentage = midterm_total;
  } else if (final_total !== null) {
    overall_percentage = final_total;
  }

  return {
    component_scores,
    midterm_lecture_avg,
    midterm_lab_avg,
    midterm_total,
    final_lecture_avg,
    final_lab_avg,
    final_total,
    overall_percentage,
  };
}

/**
 * Execute Batch AI Grading request to backend API
 */
export async function executeBatchGradingAPI(payload: {
  section_id: string;
  term: 'Midterm' | 'Final';
  class_type: 'Lecture' | 'Laboratory';
  component_category: string;
  task_name: string;
  total_items: number;
  rubricText?: string;
  customInstructions?: string;
  files: { filename: string; content: string }[];
}) {
  const response = await fetch('/api/grading/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Batch grading failed');
  }

  return await response.json();
}

/**
 * Execute Google Drive Batch Sync to backend API
 */
export async function syncGoogleDriveBatchAPI(payload: {
  folderId: string;
  section_id: string;
  term: 'Midterm' | 'Final';
  class_type: 'Lecture' | 'Laboratory';
  component_category: string;
  task_name: string;
  total_items: number;
  rubricText?: string;
  accessToken?: string;
}) {
  const response = await fetch('/api/drive/batch-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Google Drive Sync failed');
  }

  return await response.json();
}
