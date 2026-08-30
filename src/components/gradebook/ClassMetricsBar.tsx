import React from 'react';
import { Keyboard } from 'lucide-react';
import { ClassLiveMetrics } from '../../types';

interface ClassMetricsBarProps {
  totalStudents: number;
  metrics: ClassLiveMetrics;
}

export const ClassMetricsBar: React.FC<ClassMetricsBarProps> = ({
  totalStudents,
  metrics,
}) => {
  return (
    <section aria-label="Class Performance Statistics" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-2xs">
        <span className="text-[10px] uppercase font-bold text-stone-400 block font-mono">Total Enrolled</span>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-xl font-black text-stone-900 font-mono">{totalStudents} Students</span>
        </div>
        <div className="text-[10px] text-stone-500 font-medium">Official section roster</div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-2xs">
        <span className="text-[10px] uppercase font-bold text-stone-400 block font-mono">Class Average</span>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-xl font-black text-stone-900 font-mono">{metrics.avg}%</span>
          <span className="text-[10px] text-stone-500 font-medium">({metrics.totalGraded} graded)</span>
        </div>
      </div>

      <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 shadow-2xs">
        <span className="text-[10px] uppercase font-bold text-emerald-700 block font-mono">Passing Rate</span>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-xl font-black text-emerald-900 font-mono">{metrics.passingRate}%</span>
          <span className="text-[10px] text-emerald-700 font-medium">({metrics.passingCount} passed)</span>
        </div>
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-center">
        <div className="flex items-center gap-1.5 text-stone-800 text-xs font-bold">
          <Keyboard className="w-3.5 h-3.5 text-stone-600" />
          <span>Fast Keyboard Mode</span>
        </div>
        <span className="text-[10px] text-stone-400 mt-0.5 font-mono">
          Enter/Down: Next Student • Tab/Right: Next Task
        </span>
      </div>
    </section>
  );
};
