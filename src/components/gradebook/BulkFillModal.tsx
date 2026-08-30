import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { GridTaskColumn } from '../../types';

interface BulkFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskColumns: GridTaskColumn[];
  bulkFillTaskId: string;
  setBulkFillTaskId: (id: string) => void;
  bulkFillValue: string;
  setBulkFillValue: (val: string) => void;
  bulkFillOnlyEmpty: boolean;
  setBulkFillOnlyEmpty: (checked: boolean) => void;
  studentCount: number;
  onApply: () => void;
}

export const BulkFillModal: React.FC<BulkFillModalProps> = ({
  isOpen,
  onClose,
  taskColumns,
  bulkFillTaskId,
  setBulkFillTaskId,
  bulkFillValue,
  setBulkFillValue,
  bulkFillOnlyEmpty,
  setBulkFillOnlyEmpty,
  studentCount,
  onApply,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-fill-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <h3 id="bulk-fill-modal-title" className="text-base font-bold text-stone-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-stone-700" />
            Bulk Fill / Preset Grades
          </h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 cursor-pointer p-1 rounded-md transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label htmlFor="bulk-task-select" className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
              Target Task Column
            </label>
            <select
              id="bulk-task-select"
              value={bulkFillTaskId}
              onChange={(e) => setBulkFillTaskId(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 font-bold bg-white outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
            >
              {taskColumns.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.term} {t.classType} - Max: {t.maxPoints} pts)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bulk-value-input" className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
              Score or Special Code
            </label>
            <input
              id="bulk-value-input"
              type="text"
              placeholder="e.g. 100 or EX or M"
              value={bulkFillValue}
              onChange={(e) => setBulkFillValue(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 font-mono font-bold bg-white outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
              autoFocus
            />
            <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-stone-500">
              <span>Quick Presets:</span>
              <button 
                type="button"
                onClick={() => setBulkFillValue('100')} 
                className="hover:underline font-bold text-stone-800 cursor-pointer"
              >
                100
              </button>
              <button 
                type="button"
                onClick={() => setBulkFillValue('90')} 
                className="hover:underline font-bold text-stone-800 cursor-pointer"
              >
                90
              </button>
              <button 
                type="button"
                onClick={() => setBulkFillValue('EX')} 
                className="hover:underline font-bold text-purple-700 cursor-pointer"
              >
                EX (Excused)
              </button>
              <button 
                type="button"
                onClick={() => setBulkFillValue('M')} 
                className="hover:underline font-bold text-stone-700 cursor-pointer"
              >
                M (Missing)
              </button>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bulkFillOnlyEmpty}
                onChange={(e) => setBulkFillOnlyEmpty(e.target.checked)}
                className="rounded border-stone-300 text-stone-900 focus:ring-stone-900 h-4 w-4"
              />
              <span className="text-xs font-semibold text-stone-700">
                Only fill empty cells (do not overwrite existing student scores)
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white shadow-xs cursor-pointer transition-colors"
          >
            Apply to {studentCount} Students
          </button>
        </div>
      </div>
    </div>
  );
};
