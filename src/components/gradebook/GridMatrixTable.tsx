import React, { useMemo } from 'react';
import { Plus, SlidersHorizontal, AlertTriangle, Lock } from 'lucide-react';
import { GridTaskColumn, GridCellData, GradebookStudent, StudentLiveSummary, WeightConfig } from '../../types';
import { GridMatrixRow } from './GridMatrixRow';

interface GridMatrixTableProps {
  filteredStudents: GradebookStudent[];
  filteredTasks: GridTaskColumn[];
  cellMap: Record<string, GridCellData>;
  onCellChange: (studentId: string, task: GridTaskColumn, inputStr: string) => void;
  calculateStudentLiveSummary: (student: GradebookStudent) => StudentLiveSummary;
  onOpenAddTaskModal: () => void;
  onOpenBulkFillModal: (taskId?: string) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  weightConfig?: WeightConfig;
}

export const GridMatrixTable: React.FC<GridMatrixTableProps> = ({
  filteredStudents,
  filteredTasks,
  cellMap,
  onCellChange,
  calculateStudentLiveSummary,
  onOpenAddTaskModal,
  onOpenBulkFillModal,
  hasFilters,
  onClearFilters,
  weightConfig,
}) => {
  // Dynamic weights from DB configuration with safe defaults
  const midTermWeight = weightConfig?.midterm_weight ?? 40;
  const finTermWeight = weightConfig?.final_weight ?? 60;
  const lecWeight = weightConfig?.lecture_weight ?? 60;
  const labWeight = weightConfig?.laboratory_weight ?? 40;

  // Determine active teaching structure from DB weight config
  const hasLecComps = (weightConfig?.components || []).some(
    (c) => (c.class_type || '').toLowerCase() === 'lecture'
  );
  const hasLabComps = (weightConfig?.components || []).some(
    (c) => (c.class_type || '').toLowerCase() !== 'lecture'
  );

  const isLecOnly =
    (lecWeight > 0 && labWeight === 0) ||
    (hasLecComps && !hasLabComps && (lecWeight === 100 || labWeight === 0));
  const isLabOnly =
    (labWeight > 0 && lecWeight === 0) ||
    (hasLabComps && !hasLecComps && (labWeight === 100 || lecWeight === 0));
  const isBoth = !isLecOnly && !isLabOnly;

  // ---------------------------------------------------------------------------
  // HIERARCHICAL TASK GROUPING (Midterm vs Final | Lecture vs Laboratory)
  // ---------------------------------------------------------------------------
  const taskGroups = useMemo(() => {
    const midtermTasks = filteredTasks.filter((t) => t.term === 'Midterm');
    const finalTasks = filteredTasks.filter((t) => t.term === 'Final');

    const midtermLec = midtermTasks.filter((t) => t.classType === 'Lecture');
    const midtermLab = midtermTasks.filter((t) => t.classType === 'Laboratory');
    const finalLec = finalTasks.filter((t) => t.classType === 'Lecture');
    const finalLab = finalTasks.filter((t) => t.classType === 'Laboratory');

    // Filter and order tasks based on teaching structure
    let orderedTasks: GridTaskColumn[] = [];
    if (isLecOnly) {
      orderedTasks = [...midtermLec, ...finalLec];
    } else if (isLabOnly) {
      orderedTasks = [...midtermLab, ...finalLab];
    } else {
      orderedTasks = [...midtermLec, ...midtermLab, ...finalLec, ...finalLab];
    }

    const midTasksToRender = isLecOnly
      ? midtermLec
      : isLabOnly
      ? midtermLab
      : midtermTasks;
    const finTasksToRender = isLecOnly
      ? finalLec
      : isLabOnly
      ? finalLab
      : finalTasks;

    return {
      midtermTasks: midTasksToRender,
      finalTasks: finTasksToRender,
      midtermLec,
      midtermLab,
      finalLec,
      finalLab,
      orderedTasks: orderedTasks.length > 0 ? orderedTasks : filteredTasks,
    };
  }, [filteredTasks, isLecOnly, isLabOnly]);

  // ---------------------------------------------------------------------------
  // SMART KEYBOARD NAVIGATION (Skips Read-Only Computed Columns)
  // ---------------------------------------------------------------------------
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIdx: number,
    taskIdx: number
  ) => {
    const totalTasks = taskGroups.orderedTasks.length;
    const totalStudents = filteredStudents.length;
    let nextStudentIdx = studentIdx;
    let nextTaskIdx = taskIdx;
    let shouldNavigate = false;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (studentIdx < totalStudents - 1) {
        nextStudentIdx = studentIdx + 1;
        nextTaskIdx = taskIdx;
        shouldNavigate = true;
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (studentIdx > 0) {
        nextStudentIdx = studentIdx - 1;
        nextTaskIdx = taskIdx;
        shouldNavigate = true;
      }
    } else if (e.key === 'Tab' || e.key === 'ArrowRight') {
      // If ArrowRight, allow moving caret inside text unless at end
      if (e.key === 'ArrowRight' && e.currentTarget.selectionStart !== e.currentTarget.value.length) {
        return;
      }

      if (e.shiftKey && e.key === 'Tab') {
        // Shift + Tab Navigation (Backwards)
        e.preventDefault();
        if (taskIdx > 0) {
          nextTaskIdx = taskIdx - 1;
          shouldNavigate = true;
        } else if (studentIdx > 0) {
          nextStudentIdx = studentIdx - 1;
          nextTaskIdx = totalTasks - 1;
          shouldNavigate = true;
        }
      } else {
        // Tab / ArrowRight Forward Navigation
        e.preventDefault();
        if (taskIdx < totalTasks - 1) {
          nextTaskIdx = taskIdx + 1;
          shouldNavigate = true;
        } else if (studentIdx < totalStudents - 1) {
          // Wrap to next student's first task (skipping read-only summary columns!)
          nextStudentIdx = studentIdx + 1;
          nextTaskIdx = 0;
          shouldNavigate = true;
        }
      }
    } else if (e.key === 'ArrowLeft') {
      if (e.currentTarget.selectionStart !== 0) return;
      if (taskIdx > 0) {
        e.preventDefault();
        nextTaskIdx = taskIdx - 1;
        shouldNavigate = true;
      } else if (studentIdx > 0) {
        e.preventDefault();
        nextStudentIdx = studentIdx - 1;
        nextTaskIdx = totalTasks - 1;
        shouldNavigate = true;
      }
    }

    if (shouldNavigate) {
      const nextId = `cell-${nextStudentIdx}-${nextTaskIdx}`;
      const nextInput = document.getElementById(nextId) as HTMLInputElement | null;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  const tasksToRender = taskGroups.orderedTasks;

  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
      {/* Horizontal Scrollable Table Wrapper with Sticky Columns & Multi-Level Headers */}
      <div className="overflow-x-auto max-h-[640px] scrollbar-thin scrollbar-thumb-stone-300">
        <table className="w-full text-left border-collapse min-w-[1000px]" aria-label="Gradebook Spreadsheet Matrix">
          <thead>
            {/* ========================================================= */}
            {/* TIER 1 SUPER HEADER: TERM & COMPUTED GROUPINGS           */}
            {/* ========================================================= */}
            <tr className="bg-stone-900 text-stone-200 text-[11px] font-mono uppercase tracking-wider sticky top-0 z-30">
              <th scope="col" colSpan={2} className="p-2.5 font-bold border-r border-stone-800 sticky left-0 z-40 bg-stone-900 text-stone-300">
                Student Roster
              </th>

              {/* Midterm Super Header */}
              {taskGroups.midtermTasks.length > 0 && (
                <th
                  scope="col"
                  colSpan={taskGroups.midtermTasks.length}
                  className="p-2 text-center font-black border-r border-stone-800 bg-amber-950/80 text-amber-300 border-b border-amber-900/60"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>Midterm Term Period</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-amber-900/90 text-amber-200 rounded font-bold">
                      {midTermWeight}% Weight
                    </span>
                  </div>
                </th>
              )}

              {/* Final Super Header */}
              {taskGroups.finalTasks.length > 0 && (
                <th
                  scope="col"
                  colSpan={taskGroups.finalTasks.length}
                  className="p-2 text-center font-black border-r border-stone-800 bg-sky-950/80 text-sky-300 border-b border-sky-900/60"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>Final Term Period</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-sky-900/90 text-sky-200 rounded font-bold">
                      {finTermWeight}% Weight
                    </span>
                  </div>
                </th>
              )}

              {/* Add Column Action Header Spacer */}
              <th scope="col" className="p-2 border-r border-stone-800 text-center bg-stone-900 w-28">
                Actions
              </th>

              {/* Computed Read-Only Summary Super Header */}
              <th
                scope="col"
                colSpan={5}
                className="p-2 text-center font-black bg-stone-950 text-emerald-400 border-l border-stone-800"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Computed Summaries (Read-Only)</span>
                </div>
              </th>
            </tr>

            {/* ========================================================= */}
            {/* TIER 2 SUB-HEADER: COMPONENT (LEC vs LAB) BREAKDOWN     */}
            {/* ========================================================= */}
            <tr className="bg-stone-800 text-stone-300 text-[10px] font-mono uppercase tracking-wider sticky top-[33px] z-20 border-b border-stone-700">
              <th scope="col" className="p-2 border-r border-stone-700 sticky left-0 z-30 bg-stone-800 w-36 text-stone-300 font-bold">
                Student ID
              </th>
              <th scope="col" className="p-2 border-r border-stone-700 sticky left-36 z-30 bg-stone-800 w-52 text-stone-300 font-bold">
                Student Name
              </th>

              {/* Midterm Lecture */}
              {!isLabOnly && taskGroups.midtermLec.length > 0 && (
                <th
                  scope="col"
                  colSpan={taskGroups.midtermLec.length}
                  className="p-1.5 text-center border-r border-stone-700 bg-amber-900/40 text-amber-200 font-bold"
                >
                  Lecture ({isLecOnly ? '100' : lecWeight}%)
                </th>
              )}

              {/* Midterm Laboratory */}
              {!isLecOnly && taskGroups.midtermLab.length > 0 && (
                <th
                  scope="col"
                  colSpan={taskGroups.midtermLab.length}
                  className="p-1.5 text-center border-r border-stone-700 bg-amber-900/20 text-amber-100 font-bold"
                >
                  Laboratory ({isLabOnly ? '100' : labWeight}%)
                </th>
              )}

              {/* Final Lecture */}
              {!isLabOnly && taskGroups.finalLec.length > 0 && (
                <th
                  scope="col"
                  colSpan={taskGroups.finalLec.length}
                  className="p-1.5 text-center border-r border-stone-700 bg-sky-900/40 text-sky-200 font-bold"
                >
                  Lecture ({isLecOnly ? '100' : lecWeight}%)
                </th>
              )}

              {/* Final Laboratory */}
              {!isLecOnly && taskGroups.finalLab.length > 0 && (
                <th
                  scope="col"
                  colSpan={taskGroups.finalLab.length}
                  className="p-1.5 text-center border-r border-stone-700 bg-sky-900/20 text-sky-100 font-bold"
                >
                  Laboratory ({isLabOnly ? '100' : labWeight}%)
                </th>
              )}

              {/* Add Column Slot */}
              <th scope="col" className="p-1.5 border-r border-stone-700 text-center bg-stone-800/80">
                <button
                  type="button"
                  onClick={onOpenAddTaskModal}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[9px] font-bold flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
                  title="Add new task column"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>+ Column</span>
                </button>
              </th>

              {/* Summary Columns */}
              <th scope="col" className="p-1.5 text-center border-r border-stone-800 min-w-[75px] bg-stone-900 text-amber-300 font-bold">
                Mid Avg
              </th>
              <th scope="col" className="p-1.5 text-center border-r border-stone-800 min-w-[75px] bg-stone-900 text-sky-300 font-bold">
                Fin Avg
              </th>
              <th scope="col" className="p-1.5 text-center border-r border-stone-800 min-w-[85px] bg-stone-900 text-emerald-300 font-bold">
                Overall
              </th>
              <th scope="col" className="p-1.5 text-center border-r border-stone-800 min-w-[65px] bg-stone-900 text-stone-200 font-bold">
                Rating
              </th>
              <th scope="col" className="p-1.5 text-center min-w-[80px] bg-stone-900 text-stone-200 font-bold">
                Status
              </th>
            </tr>

            {/* ========================================================= */}
            {/* TIER 3: SPECIFIC DYNAMIC TASK HEADERS & MAX POINTS        */}
            {/* ========================================================= */}
            <tr className="bg-stone-100 text-stone-700 text-[10px] font-mono sticky top-[62px] z-10 border-b border-stone-300">
              <th scope="col" className="p-1.5 border-r border-stone-300 sticky left-0 z-20 bg-stone-100"></th>
              <th scope="col" className="p-1.5 border-r border-stone-300 sticky left-36 z-20 bg-stone-100"></th>

              {tasksToRender.map((task) => (
                <th
                  key={task.id}
                  scope="col"
                  className="p-2 border-r border-stone-300 min-w-[130px] max-w-[170px] text-center"
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[9px] px-1 py-0.2 bg-stone-200 text-stone-800 rounded font-semibold truncate">
                      {task.category}
                    </span>
                    <span className="text-[9px] text-emerald-700 font-black whitespace-nowrap">
                      /{task.maxPoints} pts
                    </span>
                  </div>
                  <div className="font-bold text-stone-900 text-xs truncate" title={task.name}>
                    {task.name}
                  </div>
                </th>
              ))}

              {/* Action column spacer */}
              <th scope="col" className="p-1.5 border-r border-stone-300 bg-stone-50"></th>

              {/* Summary metric sub-labels */}
              <th scope="col" className="p-1.5 text-center border-r border-stone-300 bg-amber-50/60 text-[9px] text-amber-900 font-bold">
                {midTermWeight}%
              </th>
              <th scope="col" className="p-1.5 text-center border-r border-stone-300 bg-sky-50/60 text-[9px] text-sky-900 font-bold">
                {finTermWeight}%
              </th>
              <th scope="col" className="p-1.5 text-center border-r border-stone-300 bg-emerald-50/60 text-[9px] text-emerald-900 font-bold">
                100%
              </th>
              <th scope="col" className="p-1.5 text-center border-r border-stone-300 text-[9px] text-stone-500">
                Scale
              </th>
              <th scope="col" className="p-1.5 text-center text-[9px] text-stone-500">
                Remarks
              </th>
            </tr>
          </thead>

          {/* ========================================================= */}
          {/* TABLE BODY: STUDENT ROWS & EDITABLE CELLS               */}
          {/* ========================================================= */}
          <tbody className="divide-y divide-stone-200 text-xs font-mono">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={tasksToRender.length + 8} className="p-8 text-center text-stone-400 font-sans">
                  {hasFilters ? (
                    <div>
                      <p className="font-semibold text-stone-700 mb-1">No students match your filter/search criteria.</p>
                      <button
                        type="button"
                        onClick={onClearFilters}
                        className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <div>No students enrolled in this section yet. Add students in Step 1 (Courses & Sections).</div>
                  )}
                </td>
              </tr>
            ) : (
              filteredStudents.map((std, studentIdx) => {
                const studentId = std.student_id || std.id;
                const summary = calculateStudentLiveSummary(std);

                return (
                  <GridMatrixRow
                    key={studentId}
                    student={std}
                    studentIdx={studentIdx}
                    tasksToRender={tasksToRender}
                    cellMap={cellMap}
                    onCellChange={onCellChange}
                    handleKeyDown={handleKeyDown}
                    summary={summary}
                    midTermWeight={midTermWeight}
                    finTermWeight={finTermWeight}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Matrix Table Footer & Quick Legend */}
      <div className="p-3 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500 font-sans">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-stone-700">Special Override Codes:</span>
          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-900 rounded font-mono font-bold text-[10px]">EX</span> (Excused / No Penalty)
          <span className="px-1.5 py-0.5 bg-stone-200 text-stone-800 rounded font-mono font-bold text-[10px]">M</span> (Missing / 0 pts)
          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-mono font-bold text-[10px]">INC</span> (Incomplete)
          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-900 rounded font-mono font-bold text-[10px]">UW / AW</span> (Withdrawn)
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenBulkFillModal()}
            className="text-stone-700 hover:text-stone-900 font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Open Bulk Preset Filler</span>
          </button>
        </div>
      </div>
    </div>
  );
};
