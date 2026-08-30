import React, { useState, useEffect } from 'react';
import { CourseSection, Student, Assignment, Submission } from '../types';
import { 
  UserCheck, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Printer, 
  BookOpen,
  FileSpreadsheet,
  AlertCircle,
  Search,
  ChevronDown,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface IndividualReportProps {
  activeSection?: CourseSection | null;
  sections?: CourseSection[];
  onSelectSection?: (section: CourseSection) => void;
  onFetchGradebook?: (sectionId: string) => Promise<any>;
  // Fallbacks for legacy props
  students?: Student[];
  assignments?: Assignment[];
  grades?: Record<string, Record<string, number | null>>;
  submissions?: Submission[];
}

export const IndividualReport: React.FC<IndividualReportProps> = ({
  activeSection,
  sections = [],
  onSelectSection,
  onFetchGradebook,
}) => {
  const [gradebookData, setGradebookData] = useState<any | null>(null);
  const [isLoadingGradebook, setIsLoadingGradebook] = useState<boolean>(false);
  const [selectedStudentIdNumber, setSelectedStudentIdNumber] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [studentSummary, setStudentSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);

  const weightConfig = gradebookData?.weight_config || {};
  const allComponents: any[] = weightConfig.components || [];
  const midtermLecComps = allComponents.filter((c: any) => c.term === 'Midterm' && (c.class_type || '').toLowerCase() === 'lecture');
  const midtermLabComps = allComponents.filter((c: any) => c.term === 'Midterm' && ((c.class_type || '').toLowerCase() === 'laboratory' || (c.class_type || '').toLowerCase() === 'lab'));
  const finalLecComps = allComponents.filter((c: any) => c.term === 'Final' && (c.class_type || '').toLowerCase() === 'lecture');
  const finalLabComps = allComponents.filter((c: any) => c.term === 'Final' && ((c.class_type || '').toLowerCase() === 'laboratory' || (c.class_type || '').toLowerCase() === 'lab'));

  const handlePrint = () => {
    setIsSearchOpen(false);
    const activeStudent = studentList.find(
      (s: any) => s.student_id_number === selectedStudentIdNumber
    ) || studentList[0];

    if (!activeStudent) {
      window.print();
      return;
    }

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Student_Progress_Report_${activeStudent.student_id_number || 'Report'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
            body {
              font-family: 'JetBrains Mono', monospace, sans-serif;
              padding: 24px;
              color: #141414;
              background: #ffffff;
              max-width: 900px;
              margin: 0 auto;
            }
            .header-box {
              border-bottom: 2px solid #141414;
              padding-bottom: 12px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .title { font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 0; }
            .subtitle { font-size: 12px; color: #444; margin-top: 4px; }
            .student-info {
              background: #f5f5f4;
              border: 1px solid #141414;
              padding: 12px 16px;
              margin-bottom: 16px;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px;
              font-size: 12px;
            }
            .weights-banner {
              background: #fafaf9;
              border: 1px solid #141414;
              padding: 10px 14px;
              margin-bottom: 20px;
              font-size: 11px;
              display: flex;
              justify-content: space-between;
              flex-wrap: wrap;
              gap: 8px;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }
            .stat-card {
              border: 1px solid #141414;
              padding: 12px;
              background: #fafafa;
            }
            .stat-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #555; }
            .stat-value { font-size: 20px; font-weight: 800; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th, td { border: 1px solid #141414; padding: 7px 10px; text-align: left; }
            th { background-color: #e7e5e4; font-weight: bold; text-transform: uppercase; }
            .summary-card {
              border: 1px solid #141414;
              background: #fafaf9;
              padding: 14px;
              margin-top: 20px;
              font-size: 11px;
              line-height: 1.6;
            }
            .no-print {
              background: #141414;
              color: #ffffff;
              padding: 12px 16px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 12px;
              border-radius: 6px;
            }
            .print-btn {
              background: #22c55e;
              color: #ffffff;
              font-weight: bold;
              padding: 8px 16px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            }
            @media print {
              .no-print { display: none !important; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <span><strong>Print Document Ready:</strong> Click below or press Ctrl+P / Cmd+P to print or save to PDF.</span>
            <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
          </div>

          <div class="header-box">
            <div>
              <h1 class="title">OFFICIAL STUDENT ACADEMIC PROGRESS REPORT</h1>
              <p class="subtitle">Subject: <strong>${activeSection?.subject_name || 'N/A'}</strong> | Section: <strong>${activeSection?.section_name || 'N/A'}</strong></p>
              <p class="subtitle">Generated On: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div class="student-info">
            <div><strong>Student Name:</strong> ${activeStudent.student_name}</div>
            <div><strong>Student ID Number:</strong> ${activeStudent.student_id_number}</div>
            <div><strong>Overall Grade:</strong> ${activeStudent.overall_percentage != null ? `${Number(activeStudent.overall_percentage).toFixed(1)}%` : 'N/A'}</div>
            <div><strong>Numerical Rating:</strong> ${activeStudent.numerical_rating || 'N/A'} (${activeStudent.remarks || 'N/A'})</div>
          </div>

          <div class="weights-banner">
            <div><strong>Term Weight Split:</strong> Midterm: ${weightConfig.midterm_weight ?? 40}% | Final Term: ${weightConfig.final_weight ?? 60}%</div>
            <div><strong>Class Type Split:</strong> Lecture: ${weightConfig.lecture_weight ?? 60}% | Laboratory: ${weightConfig.laboratory_weight ?? 40}%</div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Overall Percentage</div>
              <div class="stat-value">${activeStudent.overall_percentage != null ? `${Number(activeStudent.overall_percentage).toFixed(1)}%` : 'N/A'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Midterm Total Grade</div>
              <div class="stat-value">${activeStudent.midterm_total != null ? `${Number(activeStudent.midterm_total).toFixed(1)}%` : 'N/A'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Final Total Grade</div>
              <div class="stat-value">${activeStudent.final_total != null ? `${Number(activeStudent.final_total).toFixed(1)}%` : 'N/A'}</div>
            </div>
          </div>

          <h3 style="font-size: 13px; text-transform: uppercase; margin-top: 20px; border-bottom: 1px solid #141414; padding-bottom: 4px;">
            Grade Components & Component Weights Breakdown
          </h3>
          <table>
            <thead>
              <tr>
                <th>Academic Term & Grade Component Category</th>
                <th>Class Type & Weight</th>
                <th>Recorded Average / Score (%)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <!-- MIDTERM HEADER -->
              <tr style="background-color: #e7e5e4; font-weight: bold;">
                <td colspan="4">1. MIDTERM TERM COMPONENTS & WEIGHTS</td>
              </tr>
              
              <!-- Midterm Lecture Group -->
              <tr style="background-color: #fef3c7; font-weight: bold;">
                <td colspan="4" style="padding-left: 12px; font-size: 11px; text-transform: uppercase;">
                  • LECTURE GRADE COMPONENTS (Weight: ${weightConfig.lecture_weight ?? 60}%)
                </td>
              </tr>
              ${midtermLecComps.length > 0 ? midtermLecComps.map((comp: any) => {
                const scoreVal = activeStudent.component_scores && activeStudent.component_scores[comp.id] !== null && activeStudent.component_scores[comp.id] !== undefined
                  ? `${activeStudent.component_scores[comp.id]}%`
                  : 'No recorded tasks';
                const subTasks = getSubTasksForComponent(comp, activeStudent.records || []);
                return `
                  <tr style="background-color: #fafaf9;">
                    <td style="padding-left: 28px;"><strong>- ${comp.category_name}</strong></td>
                    <td>[Lecture] — <strong>${comp.weight_percentage}%</strong></td>
                    <td><strong>${scoreVal}</strong></td>
                    <td>Component Avg</td>
                  </tr>
                  ${subTasks.map((sub: any) => `
                    <tr style="font-size: 11px; color: #444;">
                      <td style="padding-left: 48px;">└─ ${sub.task_name} <br/><span style="font-size: 10px; color: #666;">File: ${sub.filename}</span></td>
                      <td>Sub-task</td>
                      <td>${sub.raw_score} / ${sub.total_items} (${sub.percentage_score}%)</td>
                      <td style="color: ${sub.is_submitted ? '#15803d' : '#b91c1c'}; font-weight: bold;">${sub.grade_status}</td>
                    </tr>
                  `).join('')}
                `;
              }).join('') : `
                <tr>
                  <td style="padding-left: 28px; color: #777; italic;" colspan="4">No lecture grade components configured for Midterm</td>
                </tr>
              `}
              <tr style="background-color: #fde68a; font-weight: bold;">
                <td style="padding-left: 20px;">Midterm Lecture Component Average</td>
                <td>Lecture (${weightConfig.lecture_weight ?? 60}%)</td>
                <td>${activeStudent.midterm_lecture_avg != null ? `${activeStudent.midterm_lecture_avg}%` : 'N/A'}</td>
                <td>Lecture Avg</td>
              </tr>

              <!-- Midterm Laboratory Group -->
              <tr style="background-color: #fef3c7; font-weight: bold;">
                <td colspan="4" style="padding-left: 12px; font-size: 11px; text-transform: uppercase;">
                  • LABORATORY GRADE COMPONENTS (Weight: ${weightConfig.laboratory_weight ?? 40}%)
                </td>
              </tr>
              ${midtermLabComps.length > 0 ? midtermLabComps.map((comp: any) => {
                const scoreVal = activeStudent.component_scores && activeStudent.component_scores[comp.id] !== null && activeStudent.component_scores[comp.id] !== undefined
                  ? `${activeStudent.component_scores[comp.id]}%`
                  : 'No recorded tasks';
                const subTasks = getSubTasksForComponent(comp, activeStudent.records || []);
                return `
                  <tr style="background-color: #fafaf9;">
                    <td style="padding-left: 28px;"><strong>- ${comp.category_name}</strong></td>
                    <td>[Laboratory] — <strong>${comp.weight_percentage}%</strong></td>
                    <td><strong>${scoreVal}</strong></td>
                    <td>Component Avg</td>
                  </tr>
                  ${subTasks.map((sub: any) => `
                    <tr style="font-size: 11px; color: #444;">
                      <td style="padding-left: 48px;">└─ ${sub.task_name} <br/><span style="font-size: 10px; color: #666;">File: ${sub.filename}</span></td>
                      <td>Sub-task</td>
                      <td>${sub.raw_score} / ${sub.total_items} (${sub.percentage_score}%)</td>
                      <td style="color: ${sub.is_submitted ? '#15803d' : '#b91c1c'}; font-weight: bold;">${sub.grade_status}</td>
                    </tr>
                  `).join('')}
                `;
              }).join('') : `
                <tr>
                  <td style="padding-left: 28px; color: #777; italic;" colspan="4">No laboratory grade components configured for Midterm</td>
                </tr>
              `}
              <tr style="background-color: #fde68a; font-weight: bold;">
                <td style="padding-left: 20px;">Midterm Laboratory Component Average</td>
                <td>Laboratory (${weightConfig.laboratory_weight ?? 40}%)</td>
                <td>${activeStudent.midterm_lab_avg != null ? `${activeStudent.midterm_lab_avg}%` : 'N/A'}</td>
                <td>Lab Avg</td>
              </tr>

              <tr style="background-color: #f59e0b; color: #ffffff; font-weight: bold;">
                <td>MIDTERM TERM TOTAL GRADE</td>
                <td>Weight: ${weightConfig.midterm_weight ?? 40}%</td>
                <td style="font-size: 12px;">${activeStudent.midterm_total != null ? `${activeStudent.midterm_total}%` : 'N/A'}</td>
                <td>MIDTERM TOTAL</td>
              </tr>

              <!-- FINAL HEADER -->
              <tr style="background-color: #e7e5e4; font-weight: bold;">
                <td colspan="4">2. FINAL TERM COMPONENTS & WEIGHTS</td>
              </tr>

              <!-- Final Lecture Group -->
              <tr style="background-color: #ecfeff; font-weight: bold;">
                <td colspan="4" style="padding-left: 12px; font-size: 11px; text-transform: uppercase;">
                  • LECTURE GRADE COMPONENTS (Weight: ${weightConfig.lecture_weight ?? 60}%)
                </td>
              </tr>
              ${finalLecComps.length > 0 ? finalLecComps.map((comp: any) => {
                const scoreVal = activeStudent.component_scores && activeStudent.component_scores[comp.id] !== null && activeStudent.component_scores[comp.id] !== undefined
                  ? `${activeStudent.component_scores[comp.id]}%`
                  : 'No recorded tasks';
                const subTasks = getSubTasksForComponent(comp, activeStudent.records || []);
                return `
                  <tr style="background-color: #fafaf9;">
                    <td style="padding-left: 28px;"><strong>- ${comp.category_name}</strong></td>
                    <td>[Lecture] — <strong>${comp.weight_percentage}%</strong></td>
                    <td><strong>${scoreVal}</strong></td>
                    <td>Component Avg</td>
                  </tr>
                  ${subTasks.map((sub: any) => `
                    <tr style="font-size: 11px; color: #444;">
                      <td style="padding-left: 48px;">└─ ${sub.task_name} <br/><span style="font-size: 10px; color: #666;">File: ${sub.filename}</span></td>
                      <td>Sub-task</td>
                      <td>${sub.raw_score} / ${sub.total_items} (${sub.percentage_score}%)</td>
                      <td style="color: ${sub.is_submitted ? '#15803d' : '#b91c1c'}; font-weight: bold;">${sub.grade_status}</td>
                    </tr>
                  `).join('')}
                `;
              }).join('') : `
                <tr>
                  <td style="padding-left: 28px; color: #777; italic;" colspan="4">No lecture grade components configured for Final Term</td>
                </tr>
              `}
              <tr style="background-color: #cff4fc; font-weight: bold;">
                <td style="padding-left: 20px;">Final Lecture Component Average</td>
                <td>Lecture (${weightConfig.lecture_weight ?? 60}%)</td>
                <td>${activeStudent.final_lecture_avg != null ? `${activeStudent.final_lecture_avg}%` : 'N/A'}</td>
                <td>Lecture Avg</td>
              </tr>

              <!-- Final Laboratory Group -->
              <tr style="background-color: #ecfeff; font-weight: bold;">
                <td colspan="4" style="padding-left: 12px; font-size: 11px; text-transform: uppercase;">
                  • LABORATORY GRADE COMPONENTS (Weight: ${weightConfig.laboratory_weight ?? 40}%)
                </td>
              </tr>
              ${finalLabComps.length > 0 ? finalLabComps.map((comp: any) => {
                const scoreVal = activeStudent.component_scores && activeStudent.component_scores[comp.id] !== null && activeStudent.component_scores[comp.id] !== undefined
                  ? `${activeStudent.component_scores[comp.id]}%`
                  : 'No recorded tasks';
                const subTasks = getSubTasksForComponent(comp, activeStudent.records || []);
                return `
                  <tr style="background-color: #fafaf9;">
                    <td style="padding-left: 28px;"><strong>- ${comp.category_name}</strong></td>
                    <td>[Laboratory] — <strong>${comp.weight_percentage}%</strong></td>
                    <td><strong>${scoreVal}</strong></td>
                    <td>Component Avg</td>
                  </tr>
                  ${subTasks.map((sub: any) => `
                    <tr style="font-size: 11px; color: #444;">
                      <td style="padding-left: 48px;">└─ ${sub.task_name} <br/><span style="font-size: 10px; color: #666;">File: ${sub.filename}</span></td>
                      <td>Sub-task</td>
                      <td>${sub.raw_score} / ${sub.total_items} (${sub.percentage_score}%)</td>
                      <td style="color: ${sub.is_submitted ? '#15803d' : '#b91c1c'}; font-weight: bold;">${sub.grade_status}</td>
                    </tr>
                  `).join('')}
                `;
              }).join('') : `
                <tr>
                  <td style="padding-left: 28px; color: #777; italic;" colspan="4">No laboratory grade components configured for Final Term</td>
                </tr>
              `}
              <tr style="background-color: #cff4fc; font-weight: bold;">
                <td style="padding-left: 20px;">Final Laboratory Component Average</td>
                <td>Laboratory (${weightConfig.laboratory_weight ?? 40}%)</td>
                <td>${activeStudent.final_lab_avg != null ? `${activeStudent.final_lab_avg}%` : 'N/A'}</td>
                <td>Lab Avg</td>
              </tr>

              <tr style="background-color: #0891b2; color: #ffffff; font-weight: bold;">
                <td>FINAL TERM TOTAL GRADE</td>
                <td>Weight: ${weightConfig.final_weight ?? 60}%</td>
                <td style="font-size: 12px;">${activeStudent.final_total != null ? `${activeStudent.final_total}%` : 'N/A'}</td>
                <td>FINAL TOTAL</td>
              </tr>

              <!-- OVERALL GRADE -->
              <tr style="background-color: #f5f5f4; font-weight: bold; border-top: 2px solid #141414;">
                <td>OVERALL FINAL SUBJECT GRADE & RATING</td>
                <td>Formula Grade Scale</td>
                <td style="font-size: 13px;">${activeStudent.overall_percentage != null ? `${activeStudent.overall_percentage}%` : 'N/A'}</td>
                <td>${activeStudent.numerical_rating || 'N/A'} (${activeStudent.remarks || 'N/A'})</td>
              </tr>
            </tbody>
          </table>

          ${activeStudent.records && activeStudent.records.length > 0 ? `
            <h3 style="font-size: 13px; text-transform: uppercase; margin-top: 25px; border-bottom: 1px solid #141414; padding-bottom: 4px;">Recorded Assessment Breakdown Log</h3>
            <table>
              <thead>
                <tr>
                  <th>Task Name</th>
                  <th>Term / Type</th>
                  <th>Category</th>
                  <th>Submitted File</th>
                  <th>Raw Score</th>
                  <th>Percentage</th>
                  <th>Remarks / Status</th>
                </tr>
              </thead>
              <tbody>
                ${activeStudent.records.map((r: any) => `
                  <tr>
                    <td><strong>${r.task_name}</strong></td>
                    <td>${r.term} (${r.class_type})</td>
                    <td>${r.category_name}</td>
                    <td>${r.filename ? r.filename : '<em style="color:#999;">No file submitted</em>'}</td>
                    <td>${r.raw_score} / ${r.total_items}</td>
                    <td><strong>${r.percentage_score}%</strong></td>
                    <td>${r.feedback || (r.percentage_score === 0 ? 'No submission' : 'Graded')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          ${studentSummary ? `
            <div class="summary-card">
              <strong style="text-transform: uppercase; display: block; margin-bottom: 6px;">AI Academic Performance Summary:</strong>
              <div>${studentSummary.replace(/\n/g, '<br/>')}</div>
            </div>
          ` : ''}

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    try {
      const blob = new Blob([printHtml], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const printWin = window.open(blobUrl, '_blank');
      if (!printWin) {
        window.print();
      }
    } catch (e) {
      window.print();
    }
  };

  // Load gradebook database data for active section
  const loadSectionGradebook = async () => {
    if (!activeSection || !onFetchGradebook) return;
    setIsLoadingGradebook(true);
    try {
      const data = await onFetchGradebook(activeSection.id);
      setGradebookData(data);
      if (data?.gradebook && data.gradebook.length > 0) {
        setSelectedStudentIdNumber(data.gradebook[0].student_id_number);
      } else {
        setSelectedStudentIdNumber('');
      }
    } catch (err) {
      console.error('Error fetching section gradebook for individual report:', err);
    } finally {
      setIsLoadingGradebook(false);
    }
  };

  useEffect(() => {
    loadSectionGradebook();
  }, [activeSection?.id]);

  const studentList = gradebookData?.gradebook || [];

  // Helper to extract sub-tasks for a grade component category across the section
  const getSubTasksForComponent = (comp: any, stdRecords: any[]) => {
    const term = comp.term;
    const classType = comp.class_type;
    const categoryName = comp.category_name;

    // Find all unique task names registered for this component across ALL section students
    const taskMap = new Map<string, any>();

    studentList.forEach((s: any) => {
      (s.records || []).forEach((r: any) => {
        if (
          r.term === term &&
          r.class_type === classType &&
          (r.category_name || '').toLowerCase().trim() === (categoryName || '').toLowerCase().trim()
        ) {
          const tName = r.task_name || categoryName;
          if (!taskMap.has(tName.toLowerCase().trim())) {
            taskMap.set(tName.toLowerCase().trim(), {
              task_name: tName,
              total_items: r.total_items || 100,
            });
          }
        }
      });
    });

    const tasks = Array.from(taskMap.values());
    if (tasks.length === 0) return [];

    return tasks.map((t) => {
      const matches = (stdRecords || []).filter(
        (r: any) =>
          r.term === term &&
          r.class_type === classType &&
          (r.category_name || '').toLowerCase().trim() === (categoryName || '').toLowerCase().trim() &&
          (r.task_name || '').toLowerCase().trim() === t.task_name.toLowerCase().trim()
      );

      const match = matches.find((r: any) => r.filename && r.filename !== 'No file submitted' && r.raw_score > 0) || matches[0];

      if (match) {
        const hasSub = match.raw_score > 0 || (match.filename && match.filename !== 'No file submitted') || (match.feedback && match.feedback.toLowerCase() !== 'no submission' && match.feedback.toLowerCase() !== 'no submission recorded for this assignment.');
        return {
          task_name: t.task_name,
          raw_score: match.raw_score,
          total_items: match.total_items,
          percentage_score: match.percentage_score,
          grade_status: match.grade_status || (match.percentage_score >= 60 ? 'PASSED' : 'FAILED'),
          filename: match.filename || 'Submitted File',
          feedback: match.feedback || 'Evaluated submission.',
          is_submitted: hasSub,
        };
      }

      return {
        task_name: t.task_name,
        raw_score: 0,
        total_items: t.total_items || 100,
        percentage_score: 0,
        grade_status: 'No submission',
        filename: 'No file submitted',
        feedback: 'No submission',
        is_submitted: false,
      };
    });
  };

  const filteredStudents = studentList.filter((s: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchId = String(s.student_id_number || '').toLowerCase().includes(q);
    const matchName = String(s.student_name || '').toLowerCase().includes(q);
    return matchId || matchName;
  });

  const activeStudent = studentList.find(
    (s: any) => s.student_id_number === selectedStudentIdNumber
  ) || studentList[0];

  // Calculate class average overall percentage
  const classAvgPct = studentList.length > 0
    ? studentList.reduce((acc: number, s: any) => acc + (s.overall_percentage || 0), 0) / studentList.length
    : 0;

  // Generate AI Progress Report
  const fetchStudentSummary = async () => {
    if (!activeStudent) return;
    setIsLoadingSummary(true);
    try {
      const response = await fetch('/api/generate-student-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: activeStudent.student_name,
          classAverage: classAvgPct / 100,
          overallPercentage: (activeStudent.overall_percentage || 0) / 100,
          assignments: [
            { assignment: 'Midterm Lecture Avg', score: activeStudent.midterm_lecture_avg, maxPoints: 100 },
            { assignment: 'Midterm Lab Avg', score: activeStudent.midterm_lab_avg, maxPoints: 100 },
            { assignment: 'Midterm Term Total', score: activeStudent.midterm_total, maxPoints: 100 },
            { assignment: 'Final Lecture Avg', score: activeStudent.final_lecture_avg, maxPoints: 100 },
            { assignment: 'Final Lab Avg', score: activeStudent.final_lab_avg, maxPoints: 100 },
            { assignment: 'Final Term Total', score: activeStudent.final_total, maxPoints: 100 },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setStudentSummary(data.summary || 'Summary unavailable');
      }
    } catch (err) {
      setStudentSummary('Unable to generate AI narrative report at this time.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    setStudentSummary('');
  }, [selectedStudentIdNumber, activeSection?.id]);

  return (
    <div className="space-y-6 font-mono">
      {/* Official Printable Academic Header (Visible ONLY when printing) */}
      <div className="hidden print:block print-only border-b-2 border-stone-900 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider text-stone-900 font-serif italic">
              OFFICIAL STUDENT ACADEMIC PROGRESS REPORT
            </h1>
            <p className="text-xs font-mono text-stone-700 mt-1">
              Subject: <span className="font-bold">{activeSection?.subject_name}</span> | Section: <span className="font-bold">{activeSection?.section_name}</span>
            </p>
            <p className="text-xs font-mono text-stone-600">
              Report Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {activeStudent && (
            <div className="text-right font-mono text-xs bg-stone-100 p-3 border border-stone-300 rounded">
              <p className="font-bold text-sm text-stone-900">{activeStudent.student_name}</p>
              <p className="text-stone-700">Student ID: {activeStudent.student_id_number}</p>
              <p className="text-stone-700">
                Overall Grade: <span className="font-bold text-stone-900">{activeStudent.overall_percentage ? `${Number(activeStudent.overall_percentage).toFixed(1)}%` : 'N/A'}</span> ({activeStudent.numerical_rating || 'N/A'})
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Top Banner & Subject Switcher (Hidden when printing) */}
      <div className="bg-white p-6 border border-[#141414] shadow-[3px_3px_0px_#141414] space-y-4 no-print">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-[#141414]" />
              <h2 className="text-sm font-bold font-serif italic text-[#141414] uppercase tracking-wider">
                Individual Student Progress Report
              </h2>
            </div>
            <p className="text-xs text-[#141414]/70 mt-1">
              Database student breakdown matching active course weights and grade scale settings.
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto shrink-0">
            {studentList.length > 0 && (
              <div className="relative min-w-[280px]">
                <div className="relative">
                  <input
                    type="text"
                    value={isSearchOpen ? searchQuery : (activeStudent ? `${activeStudent.student_id_number} - ${activeStudent.student_name}` : searchQuery)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => {
                      setSearchQuery('');
                      setIsSearchOpen(true);
                    }}
                    placeholder="Search Student ID or Name..."
                    className="w-full pl-8 pr-8 py-2 bg-white border border-[#141414] font-bold text-xs text-[#141414] outline-none focus:ring-2 focus:ring-[#141414] shadow-xs"
                  />
                  <Search className="w-4 h-4 text-stone-500 absolute left-2.5 top-2.5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    className="absolute right-2 top-2.5 text-stone-600 hover:text-stone-900"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Dropdown Popover */}
                {isSearchOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-[#141414] shadow-lg rounded-none divide-y divide-stone-100">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((s: any) => (
                        <button
                          key={s.student_id_number}
                          type="button"
                          onClick={() => {
                            setSelectedStudentIdNumber(s.student_id_number);
                            setSearchQuery('');
                            setIsSearchOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors flex items-center justify-between hover:bg-amber-100/60 ${
                            s.student_id_number === selectedStudentIdNumber ? 'bg-amber-100 font-bold text-stone-900' : 'text-stone-800'
                          }`}
                        >
                          <span className="font-bold">{s.student_name}</span>
                          <span className="text-[11px] text-stone-500 font-mono ml-2 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                            {s.student_id_number}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-stone-500 italic text-center">
                        No students matching "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handlePrint}
              className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-3.5 py-2 flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Section Selector Bar */}
        {sections.length > 0 && (
          <div className="pt-3 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-2.5 rounded-lg">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-stone-700" />
              <label className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                Active Subject / Section:
              </label>
            </div>
            <select
              value={activeSection?.id || ''}
              onChange={(e) => {
                const targetSec = sections.find((s) => s.id === e.target.value);
                if (targetSec && onSelectSection) {
                  onSelectSection(targetSec);
                }
              }}
              className="w-full sm:w-80 text-xs font-bold text-stone-900 bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-stone-800 shadow-xs"
            >
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.subject_name} — Section {sec.section_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoadingGradebook ? (
        <div className="p-12 text-center bg-white border border-[#141414] text-xs font-bold animate-pulse">
          Loading student database records from server...
        </div>
      ) : !activeStudent ? (
        <div className="bg-white border border-[#141414] shadow-[3px_3px_0px_#141414] p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
          <h3 className="font-bold text-sm uppercase">No Enrolled Students In Database</h3>
          <p className="text-xs text-stone-600 max-w-md mx-auto">
            There are currently no student records in the database for section <strong>{activeSection?.section_name || 'selected course'}</strong>.
            Please navigate to <strong>Courses & Roster</strong> to upload or add student rosters.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Overall Percentage */}
            <div className="bg-white p-5 border border-[#141414] shadow-[3px_3px_0px_#141414] space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#141414]/70 block">
                Overall Grade (%)
              </span>
              <div className="text-2xl font-black text-[#141414]">
                {activeStudent.overall_percentage != null
                  ? `${Number(activeStudent.overall_percentage).toFixed(1)}%`
                  : 'N/A'}
              </div>
              <p className="text-[11px] text-[#141414]/70">Weighted term calculation</p>
            </div>

            {/* Card 2: Rating & Status */}
            <div className="bg-white p-5 border border-[#141414] shadow-[3px_3px_0px_#141414] space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#141414]/70 block">
                Numerical Rating
              </span>
              <div className="text-2xl font-black text-[#141414]">
                {activeStudent.numerical_rating || 'N/A'}
              </div>
              <p className="text-[11px] text-[#141414]/70">Status: {activeStudent.remarks || 'Pending'}</p>
            </div>

            {/* Card 3: Class Average Benchmark */}
            <div className="bg-white p-5 border border-[#141414] shadow-[3px_3px_0px_#141414] space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#141414]/70 block">
                Class Benchmark
              </span>
              <div className="text-2xl font-black text-[#141414]">
                {classAvgPct.toFixed(1)}%
              </div>
              <div className="flex items-center space-x-1 text-[11px]">
                {(activeStudent.overall_percentage || 0) >= classAvgPct ? (
                  <span className="text-emerald-800 font-bold flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                    +{((activeStudent.overall_percentage || 0) - classAvgPct).toFixed(1)}% above avg
                  </span>
                ) : (
                  <span className="text-rose-800 font-bold flex items-center">
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                    -{(classAvgPct - (activeStudent.overall_percentage || 0)).toFixed(1)}% below avg
                  </span>
                )}
              </div>
            </div>

            {/* Card 4: Student Details */}
            <div className="bg-white p-5 border border-[#141414] shadow-[3px_3px_0px_#141414] space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#141414]/70 block">
                Student Metadata
              </span>
              <div className="text-xs font-bold text-[#141414]">
                {activeStudent.student_name}
              </div>
              <p className="text-[11px] text-[#141414]/70">ID: {activeStudent.student_id_number}</p>
            </div>
          </div>

          {/* AI Student Narrative Card */}
          <div className="bg-[#141414] text-[#E4E3E0] p-6 border-2 border-[#141414] shadow-[4px_4px_0px_#141414] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-[#E4E3E0]" />
                <h3 className="font-bold text-xs uppercase font-serif italic tracking-wider">
                  AI Progress Evaluation & Advisor Feedback
                </h3>
              </div>
              {studentSummary && !isLoadingSummary && (
                <button
                  onClick={fetchStudentSummary}
                  className="text-xs text-[#E4E3E0] hover:text-white font-bold uppercase flex items-center gap-1.5 transition-colors font-mono"
                  title="Regenerate AI Summary"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  REGENERATE
                </button>
              )}
            </div>

            {!studentSummary && !isLoadingSummary ? (
              <div className="bg-white/5 border border-[#E4E3E0]/20 p-5 rounded flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-[#E4E3E0]/80 italic">
                  Click to generate an AI-powered summary for {activeStudent.student_name}.
                </p>
                <button
                  onClick={fetchStudentSummary}
                  className="bg-[#E4E3E0] hover:bg-white text-[#141414] text-xs font-bold py-2.5 px-4 rounded flex items-center gap-2 shrink-0 transition-all font-mono uppercase tracking-wider shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-[#141414]" />
                  Generate AI Summary
                </button>
              </div>
            ) : isLoadingSummary ? (
              <div className="bg-white/5 border border-[#E4E3E0]/20 p-5 rounded flex items-center justify-center space-x-3 text-xs text-[#E4E3E0]/90 font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-[#E4E3E0]" />
                <span>Generating Summary...</span>
              </div>
            ) : (
              <p className="text-xs text-[#E4E3E0] leading-relaxed italic bg-white/10 p-4 border border-[#E4E3E0]/20 font-sans whitespace-pre-wrap">
                "{studentSummary}"
              </p>
            )}
          </div>

          {/* Term Performance Breakdown Table */}
          <div className="bg-white border border-[#141414] shadow-[4px_4px_0px_#141414] overflow-hidden space-y-0">
            <div className="p-4 bg-[#141414] text-[#E4E3E0] font-bold text-xs flex items-center justify-between border-b border-[#141414] font-serif italic">
              <span>DETAILED GRADE COMPONENT BREAKDOWN FOR {activeStudent.student_name.toUpperCase()}</span>
              <span>SECTION: {activeSection?.section_name}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#E4E3E0] text-[#141414] font-bold border-b border-[#141414] text-[11px]">
                    <th className="p-3 border-r border-[#141414]">ACADEMIC TERM & GRADE COMPONENT CATEGORY</th>
                    <th className="p-3 text-center border-r border-[#141414]">CLASS TYPE & WEIGHT</th>
                    <th className="p-3 text-center border-r border-[#141414]">RECORDED AVERAGE / SCORE (%)</th>
                    <th className="p-3 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141414]/20 font-bold">
                  {/* MIDTERM HEADER */}
                  <tr className="bg-stone-200/80 text-[#141414]">
                    <td colSpan={4} className="p-2.5 px-3 font-black text-xs uppercase tracking-wider font-mono">
                      1. MIDTERM TERM COMPONENTS & AVERAGES
                    </td>
                  </tr>

                  {/* Midterm Lecture Components Group */}
                  <tr className="bg-amber-100/60 font-bold text-[#141414]">
                    <td colSpan={4} className="p-2 px-3 pl-4 text-[11px] font-mono text-amber-950 uppercase tracking-wide">
                      • LECTURE GRADE COMPONENTS (Weight: {gradebookData?.weight_config?.lecture_weight ?? 60}%)
                    </td>
                  </tr>
                  {midtermLecComps.length > 0 ? (
                    midtermLecComps.flatMap((comp: any) => {
                      const subTasks = getSubTasksForComponent(comp, activeStudent.records || []);
                      return [
                        <tr key={`comp-mid-lec-${comp.id || comp.category_name}`} className="bg-amber-50/40 hover:bg-stone-50 border-t border-[#141414]/10">
                          <td className="p-2.5 border-r border-[#141414] font-mono pl-8 font-bold">
                            - {comp.category_name}
                          </td>
                          <td className="p-2.5 text-center border-r border-[#141414] text-stone-700 font-mono">
                            [Lecture] — {comp.weight_percentage}%
                          </td>
                          <td className="p-2.5 text-center border-r border-[#141414] font-mono font-bold">
                            {activeStudent.component_scores && activeStudent.component_scores[comp.id] !== null && activeStudent.component_scores[comp.id] !== undefined
                              ? `${activeStudent.component_scores[comp.id]}%`
                              : <span className="text-stone-400 font-normal italic">No recorded tasks</span>}
                          </td>
                          <td className="p-2.5 text-center text-stone-700 font-mono text-[11px] font-bold">
                            Category Avg
                          </td>
                        </tr>,
                        ...subTasks.map((sub: any, idx: number) => (
                          <tr key={`comp-mid-lec-${comp.id || comp.category_name}-sub-${sub.id || idx}`} className="bg-stone-50/80 hover:bg-stone-100 text-[11px]">
                            <td className="p-2 border-r border-[#141414] pl-12 font-mono">
                              <div className="font-semibold text-stone-900">└─ {sub.task_name}</div>
                              <div className="text-[10px] text-stone-500 font-normal italic">File: {sub.filename}</div>
                            </td>
                            <td className="p-2 text-center border-r border-[#141414] font-mono text-stone-500">
                              Sub-task
                            </td>
                            <td className="p-2 text-center border-r border-[#141414] font-mono">
                              {sub.raw_score} / {sub.total_items} ({sub.percentage_score}%)
                            </td>
                            <td className="p-2 text-center font-mono">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sub.is_submitted ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {sub.grade_status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ];
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-2 pl-8 text-stone-400 italic font-mono text-xs">
                        No lecture grade components configured for Midterm
                      </td>
                    </tr>
                  )}
                  <tr className="bg-amber-50/90 font-black">
                    <td className="p-2.5 border-r border-[#141414] pl-6 text-amber-950">Midterm Lecture Component Average</td>
                    <td className="p-2.5 text-center border-r border-[#141414] text-amber-950">Lecture ({gradebookData?.weight_config?.lecture_weight ?? 60}%)</td>
                    <td className="p-2.5 text-center border-r border-[#141414] text-amber-950 font-mono text-sm">{activeStudent.midterm_lecture_avg !== null ? `${activeStudent.midterm_lecture_avg}%` : 'N/A'}</td>
                    <td className="p-2.5 text-center text-amber-900 text-xs">Calculated Avg</td>
                  </tr>

                  {/* Midterm Laboratory Components Group */}
                  <tr className="bg-amber-100/60 font-bold text-[#141414]">
                    <td colSpan={4} className="p-2 px-3 pl-4 text-[11px] font-mono text-amber-950 uppercase tracking-wide">
                      • LABORATORY GRADE COMPONENTS (Weight: {gradebookData?.weight_config?.laboratory_weight ?? 40}%)
                    </td>
                  </tr>
                  {midtermLabComps.length > 0 ? (
                    midtermLabComps.flatMap((comp: any) => {
                      const subTasks = getSubTasksForComponent(comp, activeStudent.records || []);
                      return [
                        <tr key={`comp-mid-lab-${comp.id || comp.category_name}`} className="bg-amber-50/40 hover:bg-stone-50 border-t border-[#141414]/10">
                          <td className="p-2.5 border-r border-[#141414] font-mono pl-8 font-bold">
                            - {comp.category_name}
                          </td>
                          <td className="p-2.5 text-center border-r border-[#141414] text-stone-700 font-mono">
                            [Laboratory] — {comp.weight_percentage}%
                          </td>
                          <td className="p-2.5 text-center border-r border-[#141414] font-mono font-bold">
                            {activeStudent.component_scores && activeStudent.component_scores[comp.id] !== null && activeStudent.component_scores[comp.id] !== undefined
                              ? `${activeStudent.component_scores[comp.id]}%`
                              : <span className="text-stone-400 font-normal italic">No recorded tasks</span>}
                          </td>
                          <td className="p-2.5 text-center text-stone-700 font-mono text-[11px] font-bold">
                            Category Avg
                          </td>
                        </tr>,
                        ...subTasks.map((sub: any, idx: number) => (
                          <tr key={`comp-mid-lab-${comp.id || comp.category_name}-sub-${sub.id || idx}`} className="bg-stone-50/80 hover:bg-stone-100 text-[11px]">
                            <td className="p-2 border-r border-[#141414] pl-12 font-mono">
                              <div className="font-semibold text-stone-900">└─ {sub.task_name}</div>
                              <div className="text-[10px] text-stone-500 font-normal italic">File: {sub.filename}</div>
                            </td>
                            <td className="p-2 text-center border-r border-[#141414] font-mono text-stone-500">
                              Sub-task
                            </td>
                            <td className="p-2 text-center border-r border-[#141414] font-mono">
                              {sub.raw_score} / {sub.total_items} ({sub.percentage_score}%)
                            </td>
                            <td className="p-2 text-center font-mono">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sub.is_submitted ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {sub.grade_status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ];
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-2 pl-8 text-stone-400 italic font-mono text-xs">
                        No laboratory grade components configured for Midterm
                      </td>
                    </tr>
                  )}
                  <tr className="bg-amber-50/90 font-black">
                    <td className="p-2.5 border-r border-[#141414] pl-6 text-amber-950">Midterm Laboratory Component Average</td>
                    <td className="p-2.5 text-center border-r border-[#141414] text-amber-950">Laboratory ({gradebookData?.weight_config?.laboratory_weight ?? 40}%)</td>
                    <td className="p-2.5 text-center border-r border-[#141414] text-amber-950 font-mono text-sm">{activeStudent.midterm_lab_avg !== null ? `${activeStudent.midterm_lab_avg}%` : 'N/A'}</td>
                    <td className="p-2.5 text-center text-amber-900 text-xs">Calculated Avg</td>
                  </tr>

                  <tr className="bg-amber-500 text-white border-b-2 border-[#141414] font-black">
                    <td className="p-3 border-r border-[#141414] uppercase">MIDTERM TERM TOTAL GRADE</td>
                    <td className="p-3 text-center border-r border-[#141414]">Weight: {gradebookData?.weight_config?.midterm_weight ?? 40}%</td>
                    <td className="p-3 text-center border-r border-[#141414] font-mono text-sm">{activeStudent.midterm_total !== null ? `${activeStudent.midterm_total}%` : 'N/A'}</td>
                    <td className="p-3 text-center font-black">MIDTERM TOTAL</td>
                  </tr>

                  {/* FINAL HEADER */}
                  <tr className="bg-stone-200/80 text-[#141414]">
                    <td colSpan={4} className="p-2.5 px-3 font-black text-xs uppercase tracking-wider font-mono">
                      2. FINAL TERM COMPONENTS & AVERAGES
                    </td>
                  </tr>

                  {/* Final Lecture Components Group */}
                  <tr className="bg-cyan-100/60 font-bold text-[#141414]">
                    <td colSpan={4} className="p-2 px-3 pl-4 text-[11px] font-mono text-cyan-950 uppercase tracking-wide">
                      • LECTURE GRADE COMPONENTS (Weight: {gradebookData?.weight_config?.lecture_weight ?? 60}%)
                    </td>
                  </tr>
                  {finalLecComps.length > 0 ? (
                    finalLecComps.flatMap((comp: any) => {
                      const subTasks = getSubTasksForComponent(comp, activeStudent.records || []);
                      return [
                        <tr key={`comp-fin-lec-${comp.id || comp.category_name}`} className="bg-cyan-50/40 hover:bg-stone-50 border-t border-[#141414]/10">
                          <td className="p-2.5 border-r border-[#141414] font-mono pl-8 font-bold">
                            - {comp.category_name}
                          </td>
                          <td className="p-2.5 text-center border-r border-[#141414] text-stone-700 font-mono">
                            [Lecture] — {comp.weight_percentage}%
                          </td>
                          <td className="p-2.5 text-center border-r border-[#141414] font-mono font-bold">
                            {activeStudent.component_scores && activeStudent.component_scores[comp.id] !== null && activeStudent.component_scores[comp.id] !== undefined
                              ? `${activeStudent.component_scores[comp.id]}%`
                              : <span className="text-stone-400 font-normal italic">No recorded tasks</span>}
                          </td>
                          <td className="p-2.5 text-center text-stone-700 font-mono text-[11px] font-bold">
                            Category Avg
                          </td>
                        </tr>,
                        ...subTasks.map((sub: any, idx: number) => (
                          <tr key={`comp-fin-lec-${comp.id || comp.category_name}-sub-${sub.id || idx}`} className="bg-stone-50/80 hover:bg-stone-100 text-[11px]">
                            <td className="p-2 border-r border-[#141414] pl-12 font-mono">
                              <div className="font-semibold text-stone-900">└─ {sub.task_name}</div>
                              <div className="text-[10px] text-stone-500 font-normal italic">File: {sub.filename}</div>
                            </td>
                            <td className="p-2 text-center border-r border-[#141414] font-mono text-stone-500">
                              Sub-task
                            </td>
                            <td className="p-2 text-center border-r border-[#141414] font-mono">
                              {sub.raw_score} / {sub.total_items} ({sub.percentage_score}%)
                            </td>
                            <td className="p-2 text-center font-mono">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sub.is_submitted ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {sub.grade_status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ];
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-2 pl-8 text-stone-400 italic font-mono text-xs">
                        No lecture grade components configured for Final Term
                      </td>
                    </tr>
                  )}
                  <tr className="bg-cyan-50/90 font-black">
                    <td className="p-2.5 border-r border-[#141414] pl-6 text-cyan-950">Final Lecture Component Average</td>
                    <td className="p-2.5 text-center border-r border-[#141414] text-cyan-950">Lecture ({gradebookData?.weight_config?.lecture_weight ?? 60}%)</td>
                    <td className="p-2.5 text-center border-r border-[#141414] text-cyan-950 font-mono text-sm">{activeStudent.final_lecture_avg !== null ? `${activeStudent.final_lecture_avg}%` : 'N/A'}</td>
                    <td className="p-2.5 text-center text-cyan-900 text-xs">Calculated Avg</td>
                  </tr>

                  {/* Final Laboratory Components Group */}
                  <tr className="bg-cyan-100/60 font-bold text-[#141414]">
                    <td colSpan={4} className="p-2 px-3 pl-4 text-[11px] font-mono text-cyan-950 uppercase tracking-wide">
                      • LABORATORY GRADE COMPONENTS (Weight: {gradebookData?.weight_config?.laboratory_weight ?? 40}%)
                    </td>
                  </tr>
                  {finalLabComps.length > 0 ? (
                    finalLabComps.flatMap((comp: any) => {
                      const subTasks = getSubTasksForComponent(comp, activeStudent.records || []);
                      return [
                        <tr key={`comp-fin-lab-${comp.id || comp.category_name}`} className="bg-cyan-50/40 hover:bg-stone-50 border-t border-[#141414]/10">
                          <td className="p-2.5 border-r border-[#141414] font-mono pl-8 font-bold">
                            - {comp.category_name}
                          </td>
                          <td className="p-2.5 text-center border-r border-[#141414] text-stone-700 font-mono">
                            [Laboratory] — {comp.weight_percentage}%
                          </td>
                          <td className="p-2.5 text-center border-r border-[#141414] font-mono font-bold">
                            {activeStudent.component_scores && activeStudent.component_scores[comp.id] !== null && activeStudent.component_scores[comp.id] !== undefined
                              ? `${activeStudent.component_scores[comp.id]}%`
                              : <span className="text-stone-400 font-normal italic">No recorded tasks</span>}
                          </td>
                          <td className="p-2.5 text-center text-stone-700 font-mono text-[11px] font-bold">
                            Category Avg
                          </td>
                        </tr>,
                        ...subTasks.map((sub: any, idx: number) => (
                          <tr key={`comp-fin-lab-${comp.id || comp.category_name}-sub-${sub.id || idx}`} className="bg-stone-50/80 hover:bg-stone-100 text-[11px]">
                            <td className="p-2 border-r border-[#141414] pl-12 font-mono">
                              <div className="font-semibold text-stone-900">└─ {sub.task_name}</div>
                              <div className="text-[10px] text-stone-500 font-normal italic">File: {sub.filename}</div>
                            </td>
                            <td className="p-2 text-center border-r border-[#141414] font-mono text-stone-500">
                              Sub-task
                            </td>
                            <td className="p-2 text-center border-r border-[#141414] font-mono">
                              {sub.raw_score} / {sub.total_items} ({sub.percentage_score}%)
                            </td>
                            <td className="p-2 text-center font-mono">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sub.is_submitted ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {sub.grade_status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ];
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-2 pl-8 text-stone-400 italic font-mono text-xs">
                        No laboratory grade components configured for Final Term
                      </td>
                    </tr>
                  )}
                  <tr className="bg-cyan-50/90 font-black">
                    <td className="p-2.5 border-r border-[#141414] pl-6 text-cyan-950">Final Laboratory Component Average</td>
                    <td className="p-2.5 text-center border-r border-[#141414] text-cyan-950">Laboratory ({gradebookData?.weight_config?.laboratory_weight ?? 40}%)</td>
                    <td className="p-2.5 text-center border-r border-[#141414] text-cyan-950 font-mono text-sm">{activeStudent.final_lab_avg !== null ? `${activeStudent.final_lab_avg}%` : 'N/A'}</td>
                    <td className="p-2.5 text-center text-cyan-900 text-xs">Calculated Avg</td>
                  </tr>

                  <tr className="bg-cyan-600 text-white border-b-2 border-[#141414] font-black">
                    <td className="p-3 border-r border-[#141414] uppercase">FINAL TERM TOTAL GRADE</td>
                    <td className="p-3 text-center border-r border-[#141414]">Weight: {gradebookData?.weight_config?.final_weight ?? 60}%</td>
                    <td className="p-3 text-center border-r border-[#141414] font-mono text-sm">{activeStudent.final_total !== null ? `${activeStudent.final_total}%` : 'N/A'}</td>
                    <td className="p-3 text-center font-black">FINAL TOTAL</td>
                  </tr>

                  {/* OVERALL SUBJECT GRADE */}
                  <tr className="bg-stone-100 border-t-2 border-[#141414]">
                    <td className="p-3.5 border-r border-[#141414] font-black text-sm">OVERALL FINAL SUBJECT GRADE & RATING</td>
                    <td className="p-3.5 text-center border-r border-[#141414] font-black text-xs text-stone-700">Formula Grade Scale</td>
                    <td className="p-3.5 text-center border-r border-[#141414] text-base font-black text-emerald-900 font-mono">{activeStudent.overall_percentage !== null ? `${activeStudent.overall_percentage}%` : 'N/A'}</td>
                    <td className="p-3.5 text-center font-black uppercase text-emerald-800 text-sm">{activeStudent.numerical_rating} ({activeStudent.remarks})</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Individual Recorded Submissions / Task Log */}
          {activeStudent.records && activeStudent.records.length > 0 && (
            <div className="bg-white border border-[#141414] shadow-[4px_4px_0px_#141414] overflow-hidden">
              <div className="p-4 bg-[#141414] text-[#E4E3E0] font-bold text-xs flex items-center justify-between border-b border-[#141414] font-serif italic">
                <span>RECORDED ASSESSMENTS LOG ({activeStudent.records.length} TASK ENTRIES)</span>
                <span>STUDENT ID: {activeStudent.student_id_number}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#E4E3E0] text-[#141414] font-bold border-b border-[#141414] text-[11px]">
                      <th className="p-3 border-r border-[#141414]">TASK NAME</th>
                      <th className="p-3 text-center border-r border-[#141414]">TERM & TYPE</th>
                      <th className="p-3 text-center border-r border-[#141414]">COMPONENT CATEGORY</th>
                      <th className="p-3 border-r border-[#141414]">SUBMITTED FILE</th>
                      <th className="p-3 text-center border-r border-[#141414]">RAW SCORE</th>
                      <th className="p-3 text-center border-r border-[#141414]">PERCENTAGE</th>
                      <th className="p-3 border-[#141414]">FEEDBACK / REMARKS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141414]/20 font-bold">
                    {activeStudent.records.map((rec: any, idx: number) => (
                      <tr key={rec.id ? `${rec.id}-${idx}` : `rec-${idx}`} className="hover:bg-stone-50">
                        <td className="p-3 border-r border-[#141414] font-mono text-stone-900">{rec.task_name}</td>
                        <td className="p-3 text-center border-r border-[#141414] font-mono text-stone-700">{rec.term} ({rec.class_type})</td>
                        <td className="p-3 text-center border-r border-[#141414] font-mono text-stone-700">{rec.category_name}</td>
                        <td className="p-3 border-r border-[#141414] font-mono text-[11px] text-stone-700">
                          {rec.filename ? (
                            <span className="bg-stone-100 px-2 py-1 rounded text-stone-800 border border-stone-300 font-semibold inline-block">
                              📄 {rec.filename}
                            </span>
                          ) : (
                            <span className="text-rose-600 italic">No file submitted</span>
                          )}
                        </td>
                        <td className="p-3 text-center border-r border-[#141414] font-mono">{rec.raw_score} / {rec.total_items}</td>
                        <td className="p-3 text-center border-r border-[#141414] font-mono font-black text-emerald-900">{rec.percentage_score}%</td>
                        <td className="p-3 text-stone-600 font-normal italic text-[11px]">
                          {rec.feedback || (rec.percentage_score === 0 ? 'No submission' : 'Graded submission')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
