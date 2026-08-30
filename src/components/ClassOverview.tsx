import React from 'react';
import { Assignment, Student } from '../types';
import { BarChart3, Users, Award, AlertTriangle, TrendingUp, BookOpen, Download } from 'lucide-react';

interface ClassOverviewProps {
  students: Student[];
  assignments: Assignment[];
  grades: Record<string, Record<string, number | null>>;
  classNameStr: string;
}

export const ClassOverview: React.FC<ClassOverviewProps> = ({
  students,
  assignments,
  grades,
  classNameStr,
}) => {
  const totalPointsPossible = assignments.reduce((acc, a) => acc + a.maxPoints, 0);

  const getStudentTotalEarned = (studentId: string) => {
    const studentGrades = grades[studentId] || {};
    return assignments.reduce((sum, a) => {
      const val = studentGrades[a.id];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
  };

  const studentPercentages = students.map((s) => {
    const earned = getStudentTotalEarned(s.id);
    return totalPointsPossible > 0 ? (earned / totalPointsPossible) * 100 : 0;
  });

  const overallAvgPct = studentPercentages.length > 0
    ? studentPercentages.reduce((a, b) => a + b, 0) / studentPercentages.length
    : 0;

  const highestScorePct = studentPercentages.length > 0 ? Math.max(...studentPercentages) : 0;
  const lowestScorePct = studentPercentages.length > 0 ? Math.min(...studentPercentages) : 0;

  // Grade distributions
  const gradeCounts = {
    A: studentPercentages.filter((p) => p >= 90).length,
    B: studentPercentages.filter((p) => p >= 80 && p < 90).length,
    C: studentPercentages.filter((p) => p >= 70 && p < 80).length,
    D: studentPercentages.filter((p) => p >= 60 && p < 70).length,
    F: studentPercentages.filter((p) => p < 60).length,
  };

  const atRiskStudents = students.filter((s) => {
    const pct = (getStudentTotalEarned(s.id) / totalPointsPossible) * 100;
    return pct < 70;
  });

  return (
    <div className="space-y-6 font-mono">
      {/* Overview Banner */}
      <div className="bg-white p-6 border border-[#141414] shadow-[3px_3px_0px_#141414] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-[#141414]" />
            <h2 className="text-sm font-bold font-serif italic text-[#141414] uppercase tracking-wider">Class Performance Overview & Analytics</h2>
          </div>
          <p className="text-xs text-[#141414]/70 mt-1">
            Holistic academic statistics and grade distribution metrics for <span className="font-bold text-[#141414] uppercase">{classNameStr}</span>.
          </p>
        </div>
      </div>

      {/* Top 4 Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-[#141414] shadow-[3px_3px_0px_#141414] space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#141414]/70 block">Class Size</span>
          <div className="text-2xl font-black text-[#141414]">{students.length} STUDENTS</div>
          <p className="text-[11px] text-[#141414]/70">Active enrolled students</p>
        </div>

        <div className="bg-white p-5 border border-[#141414] shadow-[3px_3px_0px_#141414] space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#141414]/70 block">Cumulative Avg</span>
          <div className="text-2xl font-black text-[#141414]">{overallAvgPct.toFixed(1)}%</div>
          <p className="text-[11px] text-[#141414]/70">Across {assignments.length} assignments</p>
        </div>

        <div className="bg-white p-5 border border-[#141414] shadow-[3px_3px_0px_#141414] space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#141414]/70 block">Highest Score</span>
          <div className="text-2xl font-black text-emerald-800">{highestScorePct.toFixed(1)}%</div>
          <p className="text-[11px] text-[#141414]/70">Top score in class</p>
        </div>

        <div className="bg-white p-5 border border-[#141414] shadow-[3px_3px_0px_#141414] space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#141414]/70 block">Lowest Score</span>
          <div className="text-2xl font-black text-amber-900">{lowestScorePct.toFixed(1)}%</div>
          <p className="text-[11px] text-[#141414]/70">Minimum score recorded</p>
        </div>
      </div>

      {/* Grade Distribution Bar Visualizer */}
      <div className="bg-white p-6 border border-[#141414] shadow-[3px_3px_0px_#141414] space-y-4">
        <h3 className="text-xs font-bold text-[#141414] uppercase tracking-wider flex items-center space-x-2">
          <Award className="w-4 h-4 text-[#141414]" />
          <span>Letter Grade Distribution Breakdown</span>
        </h3>

        <div className="grid grid-cols-5 gap-3">
          {[
            { grade: 'A', count: gradeCounts.A, range: '90 - 100%' },
            { grade: 'B', count: gradeCounts.B, range: '80 - 89%' },
            { grade: 'C', count: gradeCounts.C, range: '70 - 79%' },
            { grade: 'D', count: gradeCounts.D, range: '60 - 69%' },
            { grade: 'F', count: gradeCounts.F, range: '< 60%' },
          ].map((item) => (
            <div key={item.grade} className="p-4 bg-[#E4E3E0]/30 border border-[#141414] text-center space-y-2">
              <div className="text-[11px] font-bold text-[#141414]/70">{item.range}</div>
              <div className="text-2xl font-black text-[#141414]">{item.count}</div>
              <div className="hd-badge text-xs">
                GRADE {item.grade}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* At Risk Students Warning Box */}
      {atRiskStudents.length > 0 && (
        <div className="bg-[#E4E3E0] border-2 border-[#141414] shadow-[4px_4px_0px_#141414] p-5 space-y-3">
          <div className="flex items-center space-x-2 text-[#141414] font-bold text-xs uppercase">
            <AlertTriangle className="w-5 h-5 text-[#141414]" />
            <span>Students Needing Academic Intervention ({atRiskStudents.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {atRiskStudents.map((s) => {
              const earned = getStudentTotalEarned(s.id);
              const pct = (earned / totalPointsPossible) * 100;
              return (
                <div key={s.id} className="p-3 bg-white border border-[#141414] flex items-center justify-between">
                  <span className="font-bold text-[#141414]">{s.name}</span>
                  <span className="hd-badge text-xs">
                    {pct.toFixed(1)}% ({earned.toFixed(1)} PTS)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
