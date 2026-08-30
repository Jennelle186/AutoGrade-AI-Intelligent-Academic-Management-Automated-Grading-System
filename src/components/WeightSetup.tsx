import React, { useState, useEffect, useCallback } from 'react';
import { GradeComponentNode, GradeComponentWeight, CourseSection } from '../types';
import { validateModularWeightTree } from '../lib/gradingEngine';
import {
  Sliders,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Save,
  GitFork,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderTree,
  BookOpen,
  FlaskConical,
  Layers,
} from 'lucide-react';

interface WeightSetupProps {
  activeSection: CourseSection | null;
  initialTreeData?: GradeComponentNode | null;
  onSaveWeights: (
    sectionId: string,
    midtermWeight: number,
    finalWeight: number,
    lectureWeight: number,
    labWeight: number,
    components: GradeComponentWeight[],
    treeData?: GradeComponentNode
  ) => Promise<void>;
}

// Preset Course Architectures
const PRESET_HYBRID: GradeComponentNode = {
  id: 'root-final-rating',
  name: 'Final Subject Grade Rating',
  weight_percentage: 100,
  is_leaf: false,
  children: [
    {
      id: 'node-midterm',
      name: 'Midterm Grade',
      weight_percentage: 40,
      is_leaf: false,
      term: 'Midterm',
      children: [
        {
          id: 'node-midterm-lec',
          name: 'Lecture Component',
          weight_percentage: 60,
          is_leaf: false,
          class_type: 'Lecture',
          term: 'Midterm',
          children: [
            { id: 'leaf-mid-lec-1', name: 'Major Exam', weight_percentage: 40, is_leaf: true, total_items: 100, class_type: 'Lecture', term: 'Midterm' },
            { id: 'leaf-mid-lec-2', name: 'Quizzes', weight_percentage: 30, is_leaf: true, total_items: 50, class_type: 'Lecture', term: 'Midterm' },
            { id: 'leaf-mid-lec-3', name: 'Attendance/Assignments', weight_percentage: 30, is_leaf: true, total_items: 100, class_type: 'Lecture', term: 'Midterm' },
          ],
        },
        {
          id: 'node-midterm-lab',
          name: 'Laboratory Component',
          weight_percentage: 40,
          is_leaf: false,
          class_type: 'Laboratory',
          term: 'Midterm',
          children: [
            { id: 'leaf-mid-lab-1', name: 'Lab Practical Exam', weight_percentage: 40, is_leaf: true, total_items: 100, class_type: 'Laboratory', term: 'Midterm' },
            { id: 'leaf-mid-lab-2', name: 'Lab Exercises', weight_percentage: 50, is_leaf: true, total_items: 50, class_type: 'Laboratory', term: 'Midterm' },
            { id: 'leaf-mid-lab-3', name: 'Attendance/Assignments', weight_percentage: 10, is_leaf: true, total_items: 100, class_type: 'Laboratory', term: 'Midterm' },
          ],
        },
      ],
    },
    {
      id: 'node-final',
      name: 'Final Term Grade',
      weight_percentage: 60,
      is_leaf: false,
      term: 'Final',
      children: [
        {
          id: 'node-final-lec',
          name: 'Lecture Component',
          weight_percentage: 60,
          is_leaf: false,
          class_type: 'Lecture',
          term: 'Final',
          children: [
            { id: 'leaf-fin-lec-1', name: 'Major Exam', weight_percentage: 40, is_leaf: true, total_items: 100, class_type: 'Lecture', term: 'Final' },
            { id: 'leaf-fin-lec-2', name: 'Quizzes', weight_percentage: 30, is_leaf: true, total_items: 50, class_type: 'Lecture', term: 'Final' },
            { id: 'leaf-fin-lec-3', name: 'Attendance/Assignments', weight_percentage: 30, is_leaf: true, total_items: 100, class_type: 'Lecture', term: 'Final' },
          ],
        },
        {
          id: 'node-final-lab',
          name: 'Laboratory Component',
          weight_percentage: 40,
          is_leaf: false,
          class_type: 'Laboratory',
          term: 'Final',
          children: [
            { id: 'leaf-fin-lab-1', name: 'Lab Practical Exam', weight_percentage: 40, is_leaf: true, total_items: 100, class_type: 'Laboratory', term: 'Final' },
            { id: 'leaf-fin-lab-2', name: 'Lab Exercises', weight_percentage: 50, is_leaf: true, total_items: 50, class_type: 'Laboratory', term: 'Final' },
            { id: 'leaf-fin-lab-3', name: 'Attendance/Assignments', weight_percentage: 10, is_leaf: true, total_items: 100, class_type: 'Laboratory', term: 'Final' },
          ],
        },
      ],
    },
  ],
};

const PRESET_LECTURE_ONLY: GradeComponentNode = {
  id: 'root-final-rating',
  name: 'Final Subject Grade Rating',
  weight_percentage: 100,
  is_leaf: false,
  children: [
    {
      id: 'node-midterm',
      name: 'Midterm Grade',
      weight_percentage: 40,
      is_leaf: false,
      term: 'Midterm',
      children: [
        {
          id: 'node-midterm-lec',
          name: 'Lecture Component',
          weight_percentage: 100,
          is_leaf: false,
          class_type: 'Lecture',
          term: 'Midterm',
          children: [
            { id: 'leaf-mid-lec-1', name: 'Major Exam', weight_percentage: 50, is_leaf: true, total_items: 100, class_type: 'Lecture', term: 'Midterm' },
            { id: 'leaf-mid-lec-2', name: 'Quizzes', weight_percentage: 30, is_leaf: true, total_items: 50, class_type: 'Lecture', term: 'Midterm' },
            { id: 'leaf-mid-lec-3', name: 'Attendance/Assignments', weight_percentage: 20, is_leaf: true, total_items: 100, class_type: 'Lecture', term: 'Midterm' },
          ],
        },
      ],
    },
    {
      id: 'node-final',
      name: 'Final Term Grade',
      weight_percentage: 60,
      is_leaf: false,
      term: 'Final',
      children: [
        {
          id: 'node-final-lec',
          name: 'Lecture Component',
          weight_percentage: 100,
          is_leaf: false,
          class_type: 'Lecture',
          term: 'Final',
          children: [
            { id: 'leaf-fin-lec-1', name: 'Major Exam', weight_percentage: 50, is_leaf: true, total_items: 100, class_type: 'Lecture', term: 'Final' },
            { id: 'leaf-fin-lec-2', name: 'Quizzes', weight_percentage: 30, is_leaf: true, total_items: 50, class_type: 'Lecture', term: 'Final' },
            { id: 'leaf-fin-lec-3', name: 'Attendance/Assignments', weight_percentage: 20, is_leaf: true, total_items: 100, class_type: 'Lecture', term: 'Final' },
          ],
        },
      ],
    },
  ],
};

const PRESET_LAB_ONLY: GradeComponentNode = {
  id: 'root-final-rating',
  name: 'Final Subject Grade Rating',
  weight_percentage: 100,
  is_leaf: false,
  children: [
    {
      id: 'node-midterm',
      name: 'Midterm Grade',
      weight_percentage: 40,
      is_leaf: false,
      term: 'Midterm',
      children: [
        {
          id: 'node-midterm-lab',
          name: 'Laboratory Component',
          weight_percentage: 100,
          is_leaf: false,
          class_type: 'Laboratory',
          term: 'Midterm',
          children: [
            { id: 'leaf-mid-lab-1', name: 'Lab Practical Exam', weight_percentage: 50, is_leaf: true, total_items: 100, class_type: 'Laboratory', term: 'Midterm' },
            { id: 'leaf-mid-lab-2', name: 'Lab Exercises', weight_percentage: 40, is_leaf: true, total_items: 50, class_type: 'Laboratory', term: 'Midterm' },
            { id: 'leaf-mid-lab-3', name: 'Attendance/Assignments', weight_percentage: 10, is_leaf: true, total_items: 100, class_type: 'Laboratory', term: 'Midterm' },
          ],
        },
      ],
    },
    {
      id: 'node-final',
      name: 'Final Term Grade',
      weight_percentage: 60,
      is_leaf: false,
      term: 'Final',
      children: [
        {
          id: 'node-final-lab',
          name: 'Laboratory Component',
          weight_percentage: 100,
          is_leaf: false,
          class_type: 'Laboratory',
          term: 'Final',
          children: [
            { id: 'leaf-fin-lab-1', name: 'Lab Practical Exam', weight_percentage: 50, is_leaf: true, total_items: 100, class_type: 'Laboratory', term: 'Final' },
            { id: 'leaf-fin-lab-2', name: 'Lab Exercises', weight_percentage: 40, is_leaf: true, total_items: 50, class_type: 'Laboratory', term: 'Final' },
            { id: 'leaf-fin-lab-3', name: 'Attendance/Assignments', weight_percentage: 10, is_leaf: true, total_items: 100, class_type: 'Laboratory', term: 'Final' },
          ],
        },
      ],
    },
  ],
};

// Helper: Flatten tree leaves into GradeComponentWeight list
function flattenTreeToComponents(
  node: GradeComponentNode,
  currentTerm: 'Midterm' | 'Final' = 'Midterm',
  currentClassType: 'Lecture' | 'Laboratory' = 'Lecture'
): GradeComponentWeight[] {
  let result: GradeComponentWeight[] = [];
  const term = node.term || currentTerm;
  const classType = node.class_type || currentClassType;

  if (node.is_leaf) {
    result.push({
      id: node.id,
      section_id: '',
      term,
      class_type: classType,
      category_name: node.name,
      weight_percentage: Number(node.weight_percentage) || 0,
    });
  }

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      result = result.concat(flattenTreeToComponents(child, term, classType));
    }
  }

  return result;
}

// Tree Mutators
function updateNodeInTree(
  node: GradeComponentNode,
  targetId: string,
  updater: (n: GradeComponentNode) => GradeComponentNode
): GradeComponentNode {
  if (node.id === targetId) {
    return updater(node);
  }
  if (node.children && node.children.length > 0) {
    return {
      ...node,
      children: node.children.map((child) => updateNodeInTree(child, targetId, updater)),
    };
  }
  return node;
}

function deleteNodeFromTree(node: GradeComponentNode, targetId: string): GradeComponentNode {
  if (!node.children) return node;
  return {
    ...node,
    children: node.children
      .filter((c) => c.id !== targetId)
      .map((c) => deleteNodeFromTree(c, targetId)),
  };
}

/**
 * STANDALONE TOP-LEVEL TREE NODE VIEW COMPONENT
 * Keeping this outside the parent component prevents re-mounting on typing / focus loss!
 */
interface TreeNodeViewProps {
  node: GradeComponentNode;
  depth?: number;
  onUpdateNode: (nodeId: string, updater: (n: GradeComponentNode) => GradeComponentNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddChild: (targetId: string, isLeafNode: boolean) => void;
}

const TreeNodeView: React.FC<TreeNodeViewProps> = React.memo(({
  node,
  depth = 0,
  onUpdateNode,
  onDeleteNode,
  onAddChild,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  
  // Calculate active sum of children
  const activeChildren = hasChildren ? node.children!.filter((c) => (Number(c.weight_percentage) || 0) > 0) : [];
  const childrenSum = hasChildren ? node.children!.reduce((acc, c) => acc + (Number(c.weight_percentage) || 0), 0) : 0;
  const isSumValid = !hasChildren || Math.abs(childrenSum - 100) <= 0.01;

  return (
    <div
      className={`my-2 rounded-xl border transition-all ${
        depth === 0
          ? 'border-stone-900 bg-stone-900 text-white p-4 shadow-md'
          : depth === 1
          ? 'border-amber-200 bg-amber-50/70 text-stone-900 p-3 ml-3 md:ml-5'
          : depth === 2
          ? 'border-cyan-200 bg-cyan-50/60 text-stone-900 p-3 ml-3 md:ml-5'
          : 'border-stone-300 bg-white text-stone-900 p-3 ml-3 md:ml-5 shadow-xs'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Node Title & Icon */}
        <div className="flex items-center gap-2 flex-1">
          {hasChildren && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 hover:bg-stone-200/50 rounded text-stone-600"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          {!hasChildren && (
            node.is_leaf ? <FileText className="w-4 h-4 text-emerald-600 shrink-0" /> : <FolderTree className="w-4 h-4 text-stone-500 shrink-0" />
          )}

          {/* Persistent Editable Name */}
          <input
            type="text"
            value={node.name}
            disabled={depth === 0}
            onChange={(e) => onUpdateNode(node.id, (n) => ({ ...n, name: e.target.value }))}
            className={`text-xs font-bold px-2 py-1 rounded border transition-colors flex-1 min-w-[160px] ${
              depth === 0
                ? 'bg-stone-800 text-white border-stone-700'
                : 'bg-white border-stone-300 text-stone-900 focus:outline-stone-900'
            }`}
          />

          {/* Leaf Switch Toggle */}
          {depth > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={node.is_leaf}
                onChange={(e) => {
                  const isLeaf = e.target.checked;
                  onUpdateNode(node.id, (n) => ({
                    ...n,
                    is_leaf: isLeaf,
                    total_items: isLeaf ? (n.total_items || 50) : undefined,
                    children: isLeaf ? undefined : n.children || [],
                  }));
                }}
                className="accent-stone-900"
              />
              <span>Sub-Task Leaf</span>
            </label>
          )}
        </div>

        {/* Node Weight & Total Items Settings */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Weight Input */}
          <div className="flex items-center gap-1 bg-white border border-stone-300 rounded px-2 py-1 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-stone-500">Weight:</span>
            <input
              type="number"
              min="0"
              max="100"
              disabled={depth === 0}
              value={node.weight_percentage}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateNode(node.id, (n) => ({ ...n, weight_percentage: val }));
              }}
              className="w-12 text-xs font-bold text-stone-900 text-center focus:outline-none"
            />
            <span className="text-xs font-bold text-stone-700">%</span>
          </div>

          {/* Total Possible Score (Sub-Task Leaf Node) */}
          {node.is_leaf && (
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 rounded px-2 py-1">
              <span className="text-[10px] font-bold uppercase text-emerald-800">Total Items:</span>
              <input
                type="number"
                min="1"
                value={node.total_items || 50}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateNode(node.id, (n) => ({ ...n, total_items: val }));
                }}
                className="w-12 text-xs font-black text-emerald-900 text-center bg-transparent focus:outline-none"
              />
            </div>
          )}

          {/* Parent Children Validation Progress Badge */}
          {hasChildren && (
            <div
              className={`text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${
                isSumValid
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-red-100 text-red-900 border border-red-300 animate-pulse'
              }`}
            >
              <span>Active Children Sum: {childrenSum}%</span>
              {isSumValid ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <AlertTriangle className="w-3 h-3 text-red-600" />}
            </div>
          )}

          {/* Add Child Buttons */}
          {!node.is_leaf && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onAddChild(node.id, false)}
                className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-bold py-1 px-2 rounded flex items-center gap-1 border border-stone-300"
                title="Add Component Category Group"
              >
                <Plus className="w-3 h-3" />
                + Category
              </button>

              <button
                type="button"
                onClick={() => onAddChild(node.id, true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1 px-2 rounded flex items-center gap-1 shadow-2xs"
                title="Add Sub-Task Leaf Node"
              >
                <Plus className="w-3 h-3" />
                + Sub-Task
              </button>
            </div>
          )}

          {/* Delete Node Button */}
          {depth > 0 && (
            <button
              type="button"
              onClick={() => onDeleteNode(node.id)}
              className="p-1 text-stone-400 hover:text-red-600 rounded"
              title="Remove Node"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Visual Progress Bar for Parent Node */}
      {hasChildren && (
        <div className="mt-2.5">
          <div className="w-full bg-stone-200/60 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all ${isSumValid ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(childrenSum, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Render Children Recursively */}
      {!collapsed && hasChildren && (
        <div className="mt-2 border-l-2 border-stone-300/60 pl-1 space-y-1">
          {node.children!.map((child) => (
            <TreeNodeView
              key={child.id}
              node={child}
              depth={depth + 1}
              onUpdateNode={onUpdateNode}
              onDeleteNode={onDeleteNode}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export const WeightSetup: React.FC<WeightSetupProps> = ({
  activeSection,
  initialTreeData,
  onSaveWeights,
}) => {
  const [treeRoot, setTreeRoot] = useState<GradeComponentNode>(initialTreeData || PRESET_HYBRID);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (initialTreeData) {
      setTreeRoot(initialTreeData);
    }
  }, [initialTreeData]);

  const treeErrors = validateModularWeightTree(treeRoot);
  const isTreeValid = treeErrors.length === 0;

  // Handlers wrapped in useCallback for performance
  const handleUpdateNode = useCallback((nodeId: string, updater: (n: GradeComponentNode) => GradeComponentNode) => {
    setTreeRoot((prev) => updateNodeInTree(prev, nodeId, updater));
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setTreeRoot((prev) => deleteNodeFromTree(prev, nodeId));
  }, []);

  const handleAddChild = useCallback((targetId: string, isLeafNode: boolean) => {
    const newChild: GradeComponentNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: isLeafNode ? 'New Sub-Task' : 'New Component Category',
      weight_percentage: 10,
      is_leaf: isLeafNode,
      total_items: isLeafNode ? 50 : undefined,
      children: isLeafNode ? undefined : [],
    };

    setTreeRoot((prev) =>
      updateNodeInTree(prev, targetId, (n) => ({
        ...n,
        is_leaf: false,
        children: [...(n.children || []), newChild],
      }))
    );
  }, []);

  const handleApplyPreset = (preset: GradeComponentNode) => {
    setTreeRoot(preset);
  };

  const handleSave = async () => {
    if (!activeSection) {
      alert('Please select an active course section first.');
      return;
    }
    if (!isTreeValid) {
      alert('Please resolve weight validation errors before saving. Parent categories must sum to 100%.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    const midtermNode = treeRoot.children?.find((c) => c.term === 'Midterm' || c.name.toLowerCase().includes('midterm'));
    const finalNode = treeRoot.children?.find((c) => c.term === 'Final' || c.name.toLowerCase().includes('final'));

    const midtermWeight = midtermNode ? Number(midtermNode.weight_percentage) : 40;
    const finalWeight = finalNode ? Number(finalNode.weight_percentage) : 60;

    let lectureWeight = 60;
    let labWeight = 40;
    let foundLec = false;
    let foundLab = false;

    const findClassTypeWeights = (node: GradeComponentNode) => {
      const nameLower = (node.name || '').toLowerCase();
      if (node.class_type === 'Lecture' || nameLower.includes('lecture')) {
        if (node.weight_percentage !== undefined && !foundLec) {
          lectureWeight = Number(node.weight_percentage);
          foundLec = true;
        }
      }
      if (node.class_type === 'Laboratory' || nameLower.includes('laboratory') || nameLower.includes('lab')) {
        if (node.weight_percentage !== undefined && !foundLab) {
          labWeight = Number(node.weight_percentage);
          foundLab = true;
        }
      }
      if (node.children) {
        node.children.forEach(findClassTypeWeights);
      }
    };
    findClassTypeWeights(treeRoot);

    const flattenedComps = flattenTreeToComponents(treeRoot);

    try {
      await onSaveWeights(
        activeSection.id,
        midtermWeight,
        finalWeight,
        lectureWeight,
        labWeight,
        flattenedComps,
        treeRoot
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save weight configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-stone-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <GitFork className="w-4 h-4 text-emerald-600" />
            Module 2: Hierarchical Weight Setup & Sub-Task Tree
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Course Weight Setup & Sub-Task Architecture</h1>
          <p className="text-stone-600 text-sm mt-1">
            Define strict hierarchy: Term → Component Category → Sub-Tasks. Supports Lecture-only, Lab-only, or Hybrid courses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeSection ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isTreeValid}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
                isTreeValid
                  ? 'bg-stone-900 hover:bg-stone-800 text-white'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Weights Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Weight Tree'}
                </>
              )}
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Select a section on Courses page first</span>
            </div>
          )}
        </div>
      </div>

      {/* Preset Selector Banner */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs font-bold text-stone-700 flex items-center gap-2">
          <Layers className="w-4 h-4 text-stone-800" />
          <span>Quick Modular Structure Presets:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleApplyPreset(PRESET_HYBRID)}
            className="bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-bold py-1.5 px-3 rounded-lg shadow-2xs flex items-center gap-1.5"
          >
            <GitFork className="w-3.5 h-3.5 text-emerald-600" />
            Standard Hybrid (Lec + Lab)
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(PRESET_LECTURE_ONLY)}
            className="bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-bold py-1.5 px-3 rounded-lg shadow-2xs flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            Lecture-Only (100% Lec)
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(PRESET_LAB_ONLY)}
            className="bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-bold py-1.5 px-3 rounded-lg shadow-2xs flex items-center gap-1.5"
          >
            <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
            Laboratory-Only (100% Lab)
          </button>
        </div>
      </div>

      {/* Validation Errors Banner */}
      {!isTreeValid && (
        <div className="bg-red-50 border border-red-300 text-red-900 p-4 rounded-xl flex items-start gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Hierarchy Weight Validation Notice</div>
            <p className="mt-0.5 text-stone-700">All active child groups must sum to exactly 100% before saving.</p>
            {treeErrors.length > 0 && (
              <ul className="list-disc pl-4 mt-2 space-y-1 font-mono text-[11px] text-red-800">
                {treeErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Interactive Tree Configurator */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-stone-800" />
              Weight Tree Builder
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Type directly into node names or weights. Continuous typing is enabled with stable keys.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 bg-stone-100 p-2 rounded-lg border border-stone-200">
            <span>Status:</span>
            {isTreeValid ? (
              <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-black flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Valid Weights (100%)
              </span>
            ) : (
              <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded font-black flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Invalid Group Sums
              </span>
            )}
          </div>
        </div>

        {/* Tree Root Render */}
        <div className="pt-2">
          <TreeNodeView
            node={treeRoot}
            depth={0}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onAddChild={handleAddChild}
          />
        </div>
      </div>
    </div>
  );
};
