import React from 'react';
import { Plus, X } from 'lucide-react';

export interface CategoryOption {
  name: string;
  weight: number;
  label: string;
}

interface AddTaskColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  newTaskName: string;
  setNewTaskName: (name: string) => void;
  newTaskTerm: 'Midterm' | 'Final';
  setNewTaskTerm: (term: 'Midterm' | 'Final') => void;
  newTaskClassType: 'Lecture' | 'Laboratory';
  setNewTaskClassType: (type: 'Lecture' | 'Laboratory') => void;
  newTaskCategory: string;
  setNewTaskCategory: (cat: string) => void;
  newTaskMaxPoints: number;
  setNewTaskMaxPoints: (pts: number) => void;
  availableCategories: CategoryOption[];
  onCreateTask: () => void;
  allowedClassTypes?: ('Lecture' | 'Laboratory')[];
}

export const AddTaskColumnModal: React.FC<AddTaskColumnModalProps> = ({
  isOpen,
  onClose,
  newTaskName,
  setNewTaskName,
  newTaskTerm,
  setNewTaskTerm,
  newTaskClassType,
  setNewTaskClassType,
  newTaskCategory,
  setNewTaskCategory,
  newTaskMaxPoints,
  setNewTaskMaxPoints,
  availableCategories,
  onCreateTask,
  allowedClassTypes = ['Lecture', 'Laboratory'],
}) => {
  if (!isOpen) return null;

  const isTypeLocked = allowedClassTypes.length === 1;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-task-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <h3 id="add-task-modal-title" className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            Add Task Column to Matrix
          </h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 cursor-pointer p-1 rounded-md transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label htmlFor="task-name-input" className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
              Task / Column Name
            </label>
            <input
              id="task-name-input"
              type="text"
              placeholder="e.g. Lab Exercise 1, Quiz 3, Major Exam"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 font-bold bg-white outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 text-stone-900"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-term-select" className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                Term Period
              </label>
              <select
                id="task-term-select"
                value={newTaskTerm}
                onChange={(e) => setNewTaskTerm(e.target.value as 'Midterm' | 'Final')}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 font-bold bg-white outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
              >
                <option value="Midterm">Midterm</option>
                <option value="Final">Final</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="task-class-type-select" className="block text-[10px] font-bold text-stone-500 uppercase">
                  Class Component Type
                </label>
                {isTypeLocked && (
                  <span className="text-[9px] text-amber-700 font-mono font-bold">
                    [Locked]
                  </span>
                )}
              </div>
              <select
                id="task-class-type-select"
                value={newTaskClassType}
                disabled={isTypeLocked}
                onChange={(e) => setNewTaskClassType(e.target.value as 'Lecture' | 'Laboratory')}
                className={`w-full border border-stone-300 rounded-lg px-3 py-2 font-bold outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 ${
                  isTypeLocked ? 'bg-stone-100 text-stone-600 cursor-not-allowed' : 'bg-white cursor-pointer'
                }`}
              >
                {allowedClassTypes.includes('Laboratory') && <option value="Laboratory">Laboratory</option>}
                {allowedClassTypes.includes('Lecture') && <option value="Lecture">Lecture</option>}
              </select>
            </div>
          </div>

          {/* Category Dropdown: Filtered directly by DB Weight Setup */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="task-category-select" className="block text-[10px] font-bold text-stone-500 uppercase">
                Weight Category (From DB Weight Setup)
              </label>
              <span className="text-[9px] text-emerald-700 font-mono font-semibold">
                ✓ Synced to section weights
              </span>
            </div>
            <select
              id="task-category-select"
              value={newTaskCategory}
              onChange={(e) => setNewTaskCategory(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 font-bold bg-white outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
            >
              {availableCategories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-stone-500 mt-1 font-mono">
              This task will automatically feed into the computed component average for <strong className="text-stone-800">{newTaskCategory || 'the selected category'}</strong>.
            </p>
          </div>

          <div>
            <label htmlFor="task-points-input" className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
              Max Total Points (Items)
            </label>
            <input
              id="task-points-input"
              type="number"
              min="1"
              max="1000"
              value={newTaskMaxPoints}
              onChange={(e) => setNewTaskMaxPoints(Number(e.target.value))}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 font-mono font-bold bg-white outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
            />
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
            onClick={onCreateTask}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white shadow-xs cursor-pointer transition-colors"
          >
            Create Task Column
          </button>
        </div>
      </div>
    </div>
  );
};
