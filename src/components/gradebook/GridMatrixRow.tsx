import React from 'react';
import { 
  GridTaskColumn, 
  GridCellData, 
  GradebookStudent, 
  StudentLiveSummary 
} from '../../types';
import { AlertTriangle, Clock, Check, AlertCircle } from 'lucide-react';

interface GridMatrixRowProps {
  student: GradebookStudent;
  studentIdx: number;
  tasksToRender: GridTaskColumn[];
  cellMap: Record<string, GridCellData>;
  onCellChange: (studentId: string, task: GridTaskColumn, inputStr: string) => void;
  handleKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIdx: number,
    taskIdx: number
  ) => void;
  summary: StudentLiveSummary;
  midTermWeight: number;
  finTermWeight: number;
}

export const GridMatrixRow: React.FC<GridMatrixRowProps> = React.memo(({
  student,
  studentIdx,
  tasksToRender,
  cellMap,
  onCellChange,
  handleKeyDown,
  summary,
}) => {
  const studentId = student.student_id || student.id;

  const renderSyncBadge = (cellData?: GridCellData) => {
    if (cellData?.isInvalid) {
      return (
        <span title={cellData.errorMessage || 'Invalid input'}>
          <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />
        </span>
      );
    }
    if (cellData?.syncStatus === 'saving') {
      return <Clock className="w-2.5 h-2.5 text-amber-500 animate-spin" title="Saving to database..." />;
    }
    if (cellData?.syncStatus === 'saved') {
      return <Check className="w-2.5 h-2.5 text-emerald-600" title="Saved to cloud database" />;
    }
    if (cellData?.syncStatus === 'error') {
      return <AlertCircle className="w-2.5 h-2.5 text-rose-500" title="Sync error, click to retry" />;
    }
    return null;
  };

  return (
    <tr className="hover:bg-stone-50 transition-colors group">
      {/* Sticky ID Column */}
      <td className="p-3 border-r border-stone-200 sticky left-0 z-10 bg-white group-hover:bg-stone-50 font-bold text-stone-700 w-36 truncate">
        {student.student_id_number || 'N/A'}
      </td>

      {/* Sticky Name Column */}
      <td className="p-3 border-r border-stone-200 sticky left-36 z-10 bg-white group-hover:bg-stone-50 font-bold text-stone-900 w-52 truncate">
        <div className="truncate font-sans font-bold" title={student.student_name}>
          {student.student_name}
        </div>
        <div className="text-[10px] text-stone-400 font-normal truncate" title={student.email}>
          {student.email || ''}
        </div>
      </td>

      {/* Editable Task Grade Cells */}
      {tasksToRender.map((task, taskIdx) => {
        const cellKey = `${studentId}_${task.id}`;
        const cellData = cellMap[cellKey];

        // Resolve current display value
        let displayVal = '';
        if (cellData?.inputValue !== undefined) {
          displayVal = cellData.inputValue;
        } else if (cellData?.specialCode && cellData.specialCode !== 'NONE') {
          displayVal = cellData.specialCode;
        } else if (cellData?.rawScore !== null && cellData?.rawScore !== undefined) {
          displayVal = String(cellData.rawScore);
        }

        const isSpecial = cellData?.specialCode && cellData.specialCode !== 'NONE';
        const isInvalid = Boolean(cellData?.isInvalid);

        return (
          <td
            key={task.id}
            className={`p-1.5 border-r border-stone-200 text-center relative ${
              isInvalid
                ? 'bg-rose-50/70'
                : isSpecial
                ? 'bg-purple-50/40'
                : ''
            }`}
          >
            <div className="relative flex items-center justify-center">
              <input
                id={`cell-${studentIdx}-${taskIdx}`}
                type="text"
                value={displayVal}
                onChange={(e) => onCellChange(studentId, task, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, studentIdx, taskIdx)}
                placeholder="-"
                aria-invalid={isInvalid}
                className={`w-full text-center py-1.5 px-1 font-mono text-xs font-bold rounded border outline-none transition-all ${
                  isInvalid
                    ? 'bg-rose-50 border-rose-400 text-rose-900 ring-1 ring-rose-400 focus:border-rose-600 focus:ring-rose-600'
                    : isSpecial
                    ? 'bg-purple-100/80 border-purple-300 text-purple-950 font-black'
                    : displayVal !== ''
                    ? 'bg-white border-stone-300 text-stone-900 focus:border-stone-900 focus:ring-1 focus:ring-stone-900'
                    : 'bg-stone-50/50 border-stone-200 text-stone-400 hover:border-stone-300 focus:bg-white focus:border-stone-900'
                }`}
                title={
                  isInvalid
                    ? cellData?.errorMessage || `Score cannot exceed ${task.maxPoints} pts`
                    : `Enter score (0 - ${task.maxPoints}) or override code (EX, M, INC, UW, AW)`
                }
              />

              {/* Floating Sync or Error Status Badge */}
              <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                {renderSyncBadge(cellData)}
              </div>
            </div>

            {/* Inline Error Tooltip if Invalid */}
            {isInvalid && (
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-6 z-30 bg-rose-900 text-white text-[9px] font-sans px-1.5 py-0.5 rounded shadow-md whitespace-nowrap pointer-events-none">
                {cellData?.errorMessage || `Max ${task.maxPoints} pts`}
              </div>
            )}
          </td>
        );
      })}

      {/* Column alignment placeholder */}
      <td className="p-2 border-r border-stone-200 bg-stone-50/30 text-center text-stone-300 text-[10px]">
        •
      </td>

      {/* Read-Only Summary: Midterm Total */}
      <td className="p-3 text-center border-r border-stone-200 bg-amber-50/30 font-bold text-amber-950">
        {summary.midTotal !== null ? `${summary.midTotal}%` : '-'}
      </td>

      {/* Read-Only Summary: Final Total */}
      <td className="p-3 text-center border-r border-stone-200 bg-sky-50/30 font-bold text-sky-950">
        {summary.finTotal !== null ? `${summary.finTotal}%` : '-'}
      </td>

      {/* Read-Only Summary: Overall Weighted Score */}
      <td className="p-3 text-center border-r border-stone-200 bg-emerald-50/50 font-black text-emerald-950 text-xs">
        {summary.overall !== null ? `${summary.overall}%` : '-'}
      </td>

      {/* Read-Only Summary: Numerical Rating */}
      <td className="p-3 text-center border-r border-stone-200 font-bold font-mono text-stone-900">
        <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
          summary.numericalRating === '5.00' || summary.numericalRating === 'INC' || summary.numericalRating === 'UW'
            ? 'bg-rose-100 text-rose-800'
            : summary.numericalRating === '-'
            ? 'text-stone-400'
            : 'bg-emerald-100 text-emerald-900'
        }`}>
          {summary.numericalRating}
        </span>
      </td>

      {/* Read-Only Summary: Status Remarks */}
      <td className="p-3 text-center font-sans font-bold text-[11px]">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
          summary.remarks === 'Passed' || summary.remarks === 'Excellent' || summary.remarks === 'Superior' || summary.remarks === 'Very Good' || summary.remarks === 'Good'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : summary.remarks === 'Failed'
            ? 'bg-rose-50 text-rose-800 border border-rose-200'
            : 'text-stone-400'
        }`}>
          {summary.remarks}
        </span>
      </td>
    </tr>
  );
});

GridMatrixRow.displayName = 'GridMatrixRow';
