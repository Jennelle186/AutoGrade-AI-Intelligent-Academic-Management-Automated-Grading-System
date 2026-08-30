import React from 'react';
import { Trash2, X, AlertTriangle, Eye } from 'lucide-react';

export interface RecordedTaskItem {
  task_name: string;
  category_name: string;
  term: string;
  class_type: string;
  count: number;
  submittedCount: number;
}

interface SectionTaskManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: RecordedTaskItem[];
  onDeleteTask: (task: RecordedTaskItem) => void;
  onInspectAll: () => void;
  totalSubmissions: number;
}

export const SectionTaskManagerModal: React.FC<SectionTaskManagerModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onDeleteTask,
  onInspectAll,
  totalSubmissions,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-manager-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-600" />
            <h3 id="task-manager-modal-title" className="text-base font-bold text-stone-900">
              Manage Section Tasks & Submissions
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 cursor-pointer p-1 rounded-md transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-600">
          Below are all tasks recorded for this section. You can inspect submissions across the class or permanently delete a task along with its associated student grades.
        </p>

        <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-lg">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400 font-mono">
              No tasks recorded in this section yet.
            </div>
          ) : (
            tasks.map((task, idx) => (
              <div
                key={`${task.term}-${task.class_type}-${task.task_name}-${idx}`}
                className="p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-stone-900">{task.task_name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-stone-100 text-stone-700">
                      {task.term} • {task.class_type}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-50 text-emerald-800">
                      {task.category_name}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1 font-mono">
                    {task.submittedCount} active submissions ({task.count} student slots)
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onDeleteTask(task)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    title={`Delete entire task column "${task.task_name}"`}
                    aria-label={`Delete task column ${task.task_name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-stone-200">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-mono">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Deleting a task removes all its student grade entries.</span>
          </div>

          <div className="flex items-center gap-2">
            {totalSubmissions > 0 && (
              <button
                onClick={() => {
                  onClose();
                  onInspectAll();
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-200 cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Open Review Workbench ({totalSubmissions})</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
