import React from 'react';
import { ChevronDown, ChevronRight, Eye, Trash2, FileText, CheckCircle, AlertTriangle, Layers } from 'lucide-react';
import { 
  GradebookStudent, 
  GradeComponentWeight, 
  StudentLiveSummary, 
  CourseSection, 
  GradebookStudentRecord,
  BatchGradingResultItem,
  WeightConfig
} from '../../types';

interface HierarchicalRosterTableProps {
  filteredStudents: GradebookStudent[];
  hierarchicalComponents: {
    midtermLec: GradeComponentWeight[];
    midtermLab: GradeComponentWeight[];
    finalLec: GradeComponentWeight[];
    finalLab: GradeComponentWeight[];
    totalColumns: number;
  };
  calculateStudentLiveSummary: (student: GradebookStudent) => StudentLiveSummary;
  expandedStudents: Set<string>;
  toggleStudentExpand: (studentId: string) => void;
  onInspectSubmission: (record: GradebookStudentRecord, student: GradebookStudent) => void;
  onDeleteSubmission: (gradeId: string, taskName: string) => void;
  activeSection: CourseSection | null;
  allSubmissionsDataset: BatchGradingResultItem[];
  onOpenReviewerModal: (dataset: BatchGradingResultItem[], startIndex?: number) => void;
  weightConfig?: WeightConfig;
}

export const HierarchicalRosterTable: React.FC<HierarchicalRosterTableProps> = ({
  filteredStudents,
  hierarchicalComponents,
  calculateStudentLiveSummary,
  expandedStudents,
  toggleStudentExpand,
  onInspectSubmission,
  onDeleteSubmission,
  activeSection,
  allSubmissionsDataset,
  onOpenReviewerModal,
  weightConfig,
}) => {
  const { midtermLec, midtermLab, finalLec, finalLab } = hierarchicalComponents;

  const lecWeight = weightConfig?.lecture_weight ?? 60;
  const labWeight = weightConfig?.laboratory_weight ?? 40;
  const midTermWeight = weightConfig?.midterm_weight ?? 40;
  const finTermWeight = weightConfig?.final_weight ?? 60;

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

  // Calculate total columns dynamically
  const midColSpan = isBoth
    ? midtermLec.length + midtermLab.length + 3
    : isLecOnly
    ? midtermLec.length + 1
    : midtermLab.length + 1;

  const finColSpan = isBoth
    ? finalLec.length + finalLab.length + 3
    : isLecOnly
    ? finalLec.length + 1
    : finalLab.length + 1;

  const totalTableColumns = 2 + midColSpan + finColSpan + 3;

  // Helper to compute average for a specific category
  const getCategoryAvg = (student: GradebookStudent, term: string, classType: string, categoryName: string) => {
    const matchingRecords = (student.records || []).filter(
      (r) =>
        r.term === term &&
        (r.class_type || '').toLowerCase() === classType.toLowerCase() &&
        (r.category_name || '').toLowerCase() === categoryName.toLowerCase()
    );

    if (matchingRecords.length === 0) return null;

    let totalRaw = 0;
    let totalMax = 0;
    matchingRecords.forEach((r) => {
      if (r.raw_score !== null && r.raw_score !== undefined) {
        totalRaw += r.raw_score;
        totalMax += r.total_items || 100;
      }
    });

    if (totalMax === 0) return null;
    return Number(((totalRaw / totalMax) * 100).toFixed(1));
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto max-h-[650px] scrollbar-thin scrollbar-thumb-stone-300">
        <table className="w-full text-left border-collapse min-w-[1200px]" aria-label="Hierarchical Weighted Roster">
          <thead>
            {/* Level 1: Term Headers */}
            <tr className="bg-stone-900 text-stone-200 text-[11px] font-mono uppercase tracking-wider sticky top-0 z-30">
              <th scope="col" colSpan={2} className="p-3 border-r border-stone-800 sticky left-0 z-40 bg-stone-900">
                Student Identity
              </th>

              {/* Midterm Super Header */}
              <th
                scope="col"
                colSpan={midColSpan}
                className="p-2.5 text-center font-black border-r border-stone-800 bg-stone-900 text-amber-400"
              >
                Midterm Period ({midTermWeight}% Weight)
              </th>

              {/* Final Super Header */}
              <th
                scope="col"
                colSpan={finColSpan}
                className="p-2.5 text-center font-black border-r border-stone-800 bg-stone-900 text-sky-400"
              >
                Final Period ({finTermWeight}% Weight)
              </th>

              {/* Overall Super Header */}
              <th scope="col" colSpan={3} className="p-2.5 text-center font-black bg-stone-950 text-emerald-400">
                Semester Overall
              </th>
            </tr>

            {/* Level 2: Component Breakdown (Lecture vs Laboratory & Total) */}
            <tr className="bg-stone-800 text-stone-300 text-[10px] font-mono uppercase tracking-wider sticky top-[37px] z-20">
              <th scope="col" className="p-2.5 border-r border-stone-700 sticky left-0 z-30 bg-stone-800 w-36">
                Student ID
              </th>
              <th scope="col" className="p-2.5 border-r border-stone-700 sticky left-36 z-30 bg-stone-800 w-52">
                Student Name
              </th>

              {/* Midterm Lecture */}
              {!isLabOnly && midtermLec.length > 0 && (
                <th scope="col" colSpan={midtermLec.length} className="p-1.5 text-center border-r border-stone-700 bg-stone-800/90 text-stone-300">
                  Midterm Lecture ({isLecOnly ? 100 : lecWeight}%)
                </th>
              )}

              {/* Midterm Laboratory */}
              {!isLecOnly && midtermLab.length > 0 && (
                <th scope="col" colSpan={midtermLab.length} className="p-1.5 text-center border-r border-stone-700 bg-stone-800/70 text-stone-300">
                  Midterm Lab ({isLabOnly ? 100 : labWeight}%)
                </th>
              )}

              {isBoth && (
                <>
                  <th scope="col" className="p-1.5 text-center border-r border-stone-700 bg-amber-950/40 text-amber-200 min-w-[70px]">
                    Lec Avg
                  </th>
                  <th scope="col" className="p-1.5 text-center border-r border-stone-700 bg-amber-950/40 text-amber-200 min-w-[70px]">
                    Lab Avg
                  </th>
                </>
              )}
              <th scope="col" className="p-1.5 text-center border-r border-stone-700 bg-amber-900/60 text-amber-300 font-bold min-w-[85px]">
                Mid Total
              </th>

              {/* Final Lecture */}
              {!isLabOnly && finalLec.length > 0 && (
                <th scope="col" colSpan={finalLec.length} className="p-1.5 text-center border-r border-stone-700 bg-stone-800/90 text-stone-300">
                  Final Lecture ({isLecOnly ? 100 : lecWeight}%)
                </th>
              )}

              {/* Final Laboratory */}
              {!isLecOnly && finalLab.length > 0 && (
                <th scope="col" colSpan={finalLab.length} className="p-1.5 text-center border-r border-stone-700 bg-stone-800/70 text-stone-300">
                  Final Lab ({isLabOnly ? 100 : labWeight}%)
                </th>
              )}

              {isBoth && (
                <>
                  <th scope="col" className="p-1.5 text-center border-r border-stone-700 bg-sky-950/40 text-sky-200 min-w-[70px]">
                    Lec Avg
                  </th>
                  <th scope="col" className="p-1.5 text-center border-r border-stone-700 bg-sky-950/40 text-sky-200 min-w-[70px]">
                    Lab Avg
                  </th>
                </>
              )}
              <th scope="col" className="p-1.5 text-center border-r border-stone-700 bg-sky-900/60 text-sky-300 font-bold min-w-[85px]">
                Fin Total
              </th>

              {/* Overall Columns */}
              <th scope="col" className="p-1.5 text-center border-r border-stone-700 bg-emerald-950/70 text-emerald-300 font-bold min-w-[85px]">
                Final %
              </th>
              <th scope="col" className="p-1.5 text-center border-r border-stone-700 bg-stone-900 text-stone-300 font-bold min-w-[70px]">
                Scale
              </th>
              <th scope="col" className="p-1.5 text-center bg-stone-900 text-stone-300 font-bold min-w-[90px]">
                Status
              </th>
            </tr>

            {/* Level 3: Detailed Category Weight Labels */}
            <tr className="bg-stone-100 text-stone-700 text-[9px] font-mono uppercase tracking-wider sticky top-[68px] z-10 border-b border-stone-300">
              <th scope="col" className="p-2 border-r border-stone-300 sticky left-0 z-20 bg-stone-100"></th>
              <th scope="col" className="p-2 border-r border-stone-300 sticky left-36 z-20 bg-stone-100"></th>

              {/* Midterm Lecture categories */}
              {!isLabOnly && midtermLec.map((c) => (
                <th key={c.id} scope="col" className="p-2 text-center border-r border-stone-300 font-bold min-w-[110px]">
                  <div className="truncate" title={c.category_name}>{c.category_name}</div>
                  <div className="text-emerald-700 font-bold">{c.weight_percentage}%</div>
                </th>
              ))}

              {/* Midterm Lab categories */}
              {!isLecOnly && midtermLab.map((c) => (
                <th key={c.id} scope="col" className="p-2 text-center border-r border-stone-300 font-bold min-w-[110px]">
                  <div className="truncate" title={c.category_name}>{c.category_name}</div>
                  <div className="text-emerald-700 font-bold">{c.weight_percentage}%</div>
                </th>
              ))}

              {isBoth && (
                <>
                  <th scope="col" className="p-2 text-center border-r border-stone-300 bg-amber-50/50">{lecWeight}%</th>
                  <th scope="col" className="p-2 text-center border-r border-stone-300 bg-amber-50/50">{labWeight}%</th>
                </>
              )}
              <th scope="col" className="p-2 text-center border-r border-stone-300 bg-amber-100/50 font-bold text-amber-900">{midTermWeight}% Total</th>

              {/* Final Lecture categories */}
              {!isLabOnly && finalLec.map((c) => (
                <th key={c.id} scope="col" className="p-2 text-center border-r border-stone-300 font-bold min-w-[110px]">
                  <div className="truncate" title={c.category_name}>{c.category_name}</div>
                  <div className="text-emerald-700 font-bold">{c.weight_percentage}%</div>
                </th>
              ))}

              {/* Final Lab categories */}
              {!isLecOnly && finalLab.map((c) => (
                <th key={c.id} scope="col" className="p-2 text-center border-r border-stone-300 font-bold min-w-[110px]">
                  <div className="truncate" title={c.category_name}>{c.category_name}</div>
                  <div className="text-emerald-700 font-bold">{c.weight_percentage}%</div>
                </th>
              ))}

              {isBoth && (
                <>
                  <th scope="col" className="p-2 text-center border-r border-stone-300 bg-sky-50/50">{lecWeight}%</th>
                  <th scope="col" className="p-2 text-center border-r border-stone-300 bg-sky-50/50">{labWeight}%</th>
                </>
              )}
              <th scope="col" className="p-2 text-center border-r border-stone-300 bg-sky-100/50 font-bold text-sky-900">{finTermWeight}% Total</th>

              <th scope="col" className="p-2 text-center border-r border-stone-300 bg-emerald-100/50 font-bold text-emerald-900">100%</th>
              <th scope="col" className="p-2 text-center border-r border-stone-300">Grade</th>
              <th scope="col" className="p-2 text-center">Remarks</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-200 text-xs font-mono">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={totalTableColumns} className="p-8 text-center text-stone-400 font-sans">
                  No student records available to display.
                </td>
              </tr>
            ) : (
              filteredStudents.map((std) => {
                const studentId = std.student_id || std.id;
                const isExpanded = expandedStudents.has(studentId);
                const summary = calculateStudentLiveSummary(std);

                return (
                  <React.Fragment key={studentId}>
                    <tr className="hover:bg-stone-50 transition-colors group">
                      {/* Sticky Student ID with Expand Toggle */}
                      <td className="p-3 border-r border-stone-200 sticky left-0 z-10 bg-white group-hover:bg-stone-50 font-bold text-stone-700 w-36">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleStudentExpand(studentId)}
                            className="p-1 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded transition-colors cursor-pointer"
                            title={isExpanded ? 'Collapse submissions' : 'Expand all submissions'}
                            aria-label={isExpanded ? 'Collapse submissions' : 'Expand submissions'}
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                          <span className="truncate">{std.student_id_number || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Sticky Student Name */}
                      <td className="p-3 border-r border-stone-200 sticky left-36 z-10 bg-white group-hover:bg-stone-50 font-bold text-stone-900 w-52 truncate">
                        <div className="truncate font-sans font-bold" title={std.student_name}>
                          {std.student_name}
                        </div>
                        <div className="text-[10px] text-stone-400 font-normal truncate" title={std.email}>
                          {std.email || ''}
                        </div>
                      </td>

                      {/* Midterm Lecture Category Values */}
                      {!isLabOnly && midtermLec.map((c) => {
                        const val = getCategoryAvg(std, 'Midterm', 'Lecture', c.category_name);
                        return (
                          <td key={c.id} className="p-2.5 text-center border-r border-stone-200">
                            {val !== null ? `${val}%` : <span className="text-stone-300">-</span>}
                          </td>
                        );
                      })}

                      {/* Midterm Lab Category Values */}
                      {!isLecOnly && midtermLab.map((c) => {
                        const val = getCategoryAvg(std, 'Midterm', 'Laboratory', c.category_name);
                        return (
                          <td key={c.id} className="p-2.5 text-center border-r border-stone-200">
                            {val !== null ? `${val}%` : <span className="text-stone-300">-</span>}
                          </td>
                        );
                      })}

                      {/* Midterm Computations */}
                      {isBoth && (
                        <>
                          <td className="p-2.5 text-center border-r border-stone-200 bg-amber-50/30 text-stone-700">
                            {summary.midLecAvg !== null ? `${summary.midLecAvg}%` : '-'}
                          </td>
                          <td className="p-2.5 text-center border-r border-stone-200 bg-amber-50/30 text-stone-700">
                            {summary.midLabAvg !== null ? `${summary.midLabAvg}%` : '-'}
                          </td>
                        </>
                      )}
                      <td className="p-2.5 text-center border-r border-stone-200 bg-amber-50/70 font-bold text-amber-950">
                        {summary.midTotal !== null ? `${summary.midTotal}%` : '-'}
                      </td>

                      {/* Final Lecture Category Values */}
                      {!isLabOnly && finalLec.map((c) => {
                        const val = getCategoryAvg(std, 'Final', 'Lecture', c.category_name);
                        return (
                          <td key={c.id} className="p-2.5 text-center border-r border-stone-200">
                            {val !== null ? `${val}%` : <span className="text-stone-300">-</span>}
                          </td>
                        );
                      })}

                      {/* Final Lab Category Values */}
                      {!isLecOnly && finalLab.map((c) => {
                        const val = getCategoryAvg(std, 'Final', 'Laboratory', c.category_name);
                        return (
                          <td key={c.id} className="p-2.5 text-center border-r border-stone-200">
                            {val !== null ? `${val}%` : <span className="text-stone-300">-</span>}
                          </td>
                        );
                      })}

                      {/* Final Computations */}
                      {isBoth && (
                        <>
                          <td className="p-2.5 text-center border-r border-stone-200 bg-sky-50/30 text-stone-700">
                            {summary.finLecAvg !== null ? `${summary.finLecAvg}%` : '-'}
                          </td>
                          <td className="p-2.5 text-center border-r border-stone-200 bg-sky-50/30 text-stone-700">
                            {summary.finLabAvg !== null ? `${summary.finLabAvg}%` : '-'}
                          </td>
                        </>
                      )}
                      <td className="p-2.5 text-center border-r border-stone-200 bg-sky-50/70 font-bold text-sky-950">
                        {summary.finTotal !== null ? `${summary.finTotal}%` : '-'}
                      </td>

                      {/* Semester Overall */}
                      <td className="p-2.5 text-center border-r border-stone-200 bg-emerald-50 font-black text-emerald-950 text-xs">
                        {summary.overall !== null ? `${summary.overall}%` : '-'}
                      </td>

                      {/* Grade Scale Rating */}
                      <td className="p-2.5 text-center border-r border-stone-200 font-bold">
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

                      {/* Status Remarks */}
                      <td className="p-2.5 text-center font-sans font-bold text-[11px]">
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

                    {/* Expandable Submissions Drawer */}
                    {isExpanded && (
                      <tr className="bg-stone-50/80 border-y border-stone-200">
                        <td colSpan={totalTableColumns} className="p-4 pl-12">
                          <div className="bg-white rounded-lg border border-stone-200 p-4 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-stone-700" />
                                <span className="font-bold text-xs text-stone-900">
                                  Recorded Task Submissions for {std.student_name}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-bold">
                                  {(std.records || []).length} Recorded Tasks
                                </span>
                              </div>

                              {allSubmissionsDataset.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const matchIdx = allSubmissionsDataset.findIndex(
                                      (sub) => sub.student_id_number === std.student_id_number || sub.student_name === std.student_name
                                    );
                                    onOpenReviewerModal(allSubmissionsDataset, matchIdx >= 0 ? matchIdx : 0);
                                  }}
                                  className="text-xs font-bold text-stone-800 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-md border border-stone-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Review Student Submissions</span>
                                </button>
                              )}
                            </div>

                            {(!std.records || std.records.length === 0) ? (
                              <p className="text-xs text-stone-400 font-mono py-2">
                                No individual submissions recorded for this student yet.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                                {std.records.map((rec, rIdx) => {
                                  const isUnsubmitted = rec.id && rec.id.startsWith('grd-synth-');
                                  const isPassed = (rec.percentage_score ?? 0) >= (activeSection?.passing_threshold || 60);

                                  return (
                                    <div
                                      key={`${rec.task_name}-${rIdx}`}
                                      className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
                                        isUnsubmitted
                                          ? 'bg-stone-50 border-dashed border-stone-200'
                                          : isPassed
                                          ? 'bg-emerald-50/30 border-emerald-200/80'
                                          : 'bg-rose-50/30 border-rose-200/80'
                                      }`}
                                    >
                                      <div>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-bold text-stone-900 truncate" title={rec.task_name}>
                                            {rec.task_name}
                                          </span>
                                          <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${
                                            isUnsubmitted
                                              ? 'bg-stone-200 text-stone-600'
                                              : isPassed
                                              ? 'bg-emerald-100 text-emerald-900'
                                              : 'bg-rose-100 text-rose-900'
                                          }`}>
                                            {rec.raw_score} / {rec.total_items} ({rec.percentage_score}%)
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1 text-[10px] text-stone-500 font-mono">
                                          <span>{rec.term}</span> • <span>{rec.class_type}</span> • <span className="font-semibold text-stone-700">{rec.category_name}</span>
                                        </div>

                                        {rec.filename && rec.filename !== 'No file submitted' && (
                                          <div className="text-[10px] text-stone-600 truncate mt-1 flex items-center gap-1 font-mono">
                                            <span className="px-1 py-0.2 bg-stone-100 rounded text-stone-700">File</span>
                                            <span className="truncate">{rec.filename}</span>
                                          </div>
                                        )}

                                        {rec.feedback && (
                                          <p className="text-[11px] text-stone-600 italic mt-1.5 line-clamp-2">
                                            "{rec.feedback}"
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-stone-200/60">
                                        {!isUnsubmitted && (
                                          <button
                                            type="button"
                                            onClick={() => onInspectSubmission(rec, std)}
                                            className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                          >
                                            <Eye className="w-3 h-3 text-stone-600" />
                                            <span>Inspect</span>
                                          </button>
                                        )}
                                        {rec.id && !isUnsubmitted && (
                                          <button
                                            type="button"
                                            onClick={() => onDeleteSubmission(rec.id!, rec.task_name || 'Submission')}
                                            className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                            title="Delete this submission record"
                                            aria-label={`Delete submission ${rec.task_name}`}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
