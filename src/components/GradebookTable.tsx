import React, { useState } from 'react';
import { Assignment, Student } from '../types';
import * as XLSX from 'xlsx';
import { 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Check, 
  Calculator,
  Search,
  FileSpreadsheet
} from 'lucide-react';

interface GradebookTableProps {
  assignments: Assignment[];
  students: Student[];
  grades: Record<string, Record<string, number | null>>;
  classNameStr: string;
  teacherName: string;
  onGradeChange: (studentId: string, assignmentId: string, value: number | null) => void;
  onAddAssignment: (assignment: Assignment) => void;
  onAddStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onImportExcelData: (newAssignments: Assignment[], newStudents: Student[], newGrades: Record<string, Record<string, number | null>>) => void;
}

export const GradebookTable: React.FC<GradebookTableProps> = ({
  assignments,
  students,
  grades,
  classNameStr,
  teacherName,
  onGradeChange,
  onAddAssignment,
  onAddStudent,
  onDeleteStudent,
  onDeleteAssignment,
  onImportExcelData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<{ studentId: string; assignmentId: string } | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  
  // Modals
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');

  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [newAssName, setNewAssName] = useState('');
  const [newAssType, setNewAssType] = useState<'HW' | 'QUIZ' | 'TEST' | 'ESSAY' | 'LAB' | 'PROJECT'>('HW');
  const [newAssPoints, setNewAssPoints] = useState(10);

  // Calculate Cumulative total max points possible
  const totalPointsPossible = assignments.reduce((acc, a) => acc + a.maxPoints, 0);

  // Helper to compute total earned points for a student
  const getStudentTotalEarned = (studentId: string) => {
    const studentGrades = grades[studentId] || {};
    return assignments.reduce((sum, a) => {
      const val = studentGrades[a.id];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
  };

  // Helper to compute student ratio / percentage
  const getStudentPercentage = (studentId: string) => {
    if (totalPointsPossible === 0) return 0;
    return getStudentTotalEarned(studentId) / totalPointsPossible;
  };

  // Helper for Letter Grade
  const getLetterGrade = (percentage: number) => {
    const pct = percentage * 100;
    if (pct >= 90) return { grade: 'A', color: 'bg-emerald-100 text-emerald-800 font-bold border-emerald-300' };
    if (pct >= 80) return { grade: 'B', color: 'bg-blue-100 text-blue-800 font-bold border-blue-300' };
    if (pct >= 70) return { grade: 'C', color: 'bg-amber-100 text-amber-800 font-bold border-amber-300' };
    if (pct >= 60) return { grade: 'D', color: 'bg-orange-100 text-orange-800 font-bold border-orange-300' };
    return { grade: 'F', color: 'bg-rose-100 text-rose-800 font-bold border-rose-300' };
  };

  // Class Average for a specific assignment
  const getAssignmentClassAverage = (assignmentId: string) => {
    const values = students
      .map(s => grades[s.id]?.[assignmentId])
      .filter((v): v is number => typeof v === 'number');
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  // Total Class Average Ratio
  const overallClassAvgRatio = students.length > 0
    ? students.reduce((acc, s) => acc + getStudentPercentage(s.id), 0) / students.length
    : 0;

  // Filtered Students
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Cell Editing Handlers
  const handleCellClick = (studentId: string, assignmentId: string, currentVal: number | null) => {
    setEditingCell({ studentId, assignmentId });
    setTempValue(currentVal !== null && currentVal !== undefined ? String(currentVal) : '');
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    const num = tempValue.trim() === '' ? null : parseFloat(tempValue);
    if (num !== null && isNaN(num)) {
      setEditingCell(null);
      return;
    }
    onGradeChange(editingCell.studentId, editingCell.assignmentId, num);
    setEditingCell(null);
  };

  // Add Student Handler
  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    const newStudent: Student = {
      id: 'student-' + Date.now(),
      name: newStudentName.trim(),
      email: newStudentEmail.trim() || undefined,
    };
    onAddStudent(newStudent);
    setNewStudentName('');
    setNewStudentEmail('');
    setShowAddStudent(false);
  };

  // Add Assignment Handler
  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssName.trim() || newAssPoints <= 0) return;
    const newAss: Assignment = {
      id: 'ass-' + Date.now(),
      name: newAssName.trim(),
      type: newAssType,
      maxPoints: Number(newAssPoints),
    };
    onAddAssignment(newAss);
    setNewAssName('');
    setNewAssPoints(10);
    setShowAddAssignment(false);
  };

  // Export to Excel file
  const handleExportExcel = () => {
    const wsData: any[][] = [];

    // Header Meta Rows matching Excel structure
    wsData.push(['', 'CLASS NAME', classNameStr, '', ...assignments.map(a => a.name)]);
    wsData.push(['', 'Teacher', teacherName, '', ...assignments.map(a => a.maxPoints)]);
    wsData.push(['', '', 'Total (cumulative):', totalPointsPossible, ...assignments.map(() => '')]);
    wsData.push([
      '', 
      'Class average', 
      (students.reduce((acc, s) => acc + getStudentTotalEarned(s.id), 0) / (students.length || 1)).toFixed(2), 
      overallClassAvgRatio.toFixed(4), 
      ...assignments.map(a => getAssignmentClassAverage(a.id).toFixed(2))
    ]);

    // Student Grade rows
    students.forEach((student) => {
      const totalEarned = getStudentTotalEarned(student.id);
      const ratio = getStudentPercentage(student.id);
      const rowScores = assignments.map(a => {
        const val = grades[student.id]?.[a.id];
        return val !== null && val !== undefined ? val : '';
      });
      wsData.push(['', student.name, totalEarned, ratio.toFixed(4), ...rowScores]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grades');
    XLSX.writeFile(workbook, `Gradebook_${classNameStr.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  // Import Excel / CSV Handler
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames.includes('Grades') ? 'Grades' : workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawRows || rawRows.length < 2) {
          alert('Spreadsheet format not recognized. Ensure columns contain student names and assignment titles.');
          return;
        }

        // Parse row 0 or 1 for assignments
        let assignmentHeaderRowIndex = 0;
        for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
          if (rawRows[i] && rawRows[i].some((cell: any) => typeof cell === 'string' && (cell.includes('HW') || cell.includes('QUIZ') || cell.includes('TEST')))) {
            assignmentHeaderRowIndex = i;
            break;
          }
        }

        const headerRow = rawRows[assignmentHeaderRowIndex] || [];
        const newAssignments: Assignment[] = [];
        const startAssColIndex = 4; // Columns C/D are summary in Excel

        for (let col = startAssColIndex; col < headerRow.length; col++) {
          const assName = String(headerRow[col] || `Assignment ${col - startAssColIndex + 1}`).trim();
          if (assName) {
            newAssignments.push({
              id: `imported-ass-${col}`,
              name: assName,
              type: assName.toUpperCase().includes('QUIZ') ? 'QUIZ' : assName.toUpperCase().includes('TEST') ? 'TEST' : 'HW',
              maxPoints: 25,
            });
          }
        }

        if (newAssignments.length === 0) {
          // Fallback if less than 4 columns
          newAssignments.push(
            { id: 'imp-hw1', name: 'HW 1', type: 'HW', maxPoints: 10 },
            { id: 'imp-quiz1', name: 'QUIZ 1', type: 'QUIZ', maxPoints: 25 },
            { id: 'imp-test1', name: 'TEST 1', type: 'TEST', maxPoints: 50 }
          );
        }

        const newStudents: Student[] = [];
        const newGrades: Record<string, Record<string, number | null>> = {};

        // Parse student rows
        for (let r = assignmentHeaderRowIndex + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length < 2) continue;
          const studentName = String(row[1] || row[0] || '').trim();
          if (!studentName || studentName.includes('Class average') || studentName.includes('Teacher') || studentName.includes('Total')) continue;

          const sId = `imp-student-${r}`;
          newStudents.push({ id: sId, name: studentName });
          newGrades[sId] = {};

          newAssignments.forEach((ass, idx) => {
            const rawVal = row[startAssColIndex + idx];
            const num = parseFloat(rawVal);
            newGrades[sId][ass.id] = !isNaN(num) ? num : null;
          });
        }

        if (newStudents.length > 0) {
          onImportExcelData(newAssignments, newStudents, newGrades);
          alert(`Successfully imported ${newStudents.length} students and ${newAssignments.length} assignments from Excel!`);
        }
      } catch (err: any) {
        alert(`Error parsing file: ${err?.message || 'Invalid spreadsheet structure'}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="bg-white p-4 border border-[#141414] shadow-[3px_3px_0px_#141414] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#141414]/60" />
            <input
              type="text"
              placeholder="SEARCH STUDENT NAME..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs font-mono border border-[#141414] bg-[#E4E3E0]/30 text-[#141414] focus:outline-2 focus:outline-[#141414]"
            />
          </div>
          <span className="text-xs uppercase font-mono tracking-wider text-[#141414]/70 whitespace-nowrap">
            SHOWING {filteredStudents.length} / {students.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            id="add-student-btn"
            onClick={() => setShowAddStudent(true)}
            className="hd-btn-secondary px-3 py-1.5 flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </button>

          <button
            id="add-assignment-btn"
            onClick={() => setShowAddAssignment(true)}
            className="hd-btn-secondary px-3 py-1.5 flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Column</span>
          </button>

          <label className="hd-btn-secondary px-3 py-1.5 flex items-center space-x-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel</span>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleImportFile} className="hidden" />
          </label>

          <button
            id="export-excel-btn"
            onClick={handleExportExcel}
            className="hd-btn-primary px-3.5 py-1.5 flex items-center space-x-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Main Gradebook Spreadsheet Table */}
      <div className="bg-white border border-[#141414] shadow-[4px_4px_0px_#141414] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            {/* Table Header */}
            <thead>
              {/* Row 1: Top Column Headers */}
              <tr className="bg-[#141414] text-[#E4E3E0] text-xs border-b border-[#141414]">
                <th className="p-3 font-serif italic text-center w-12 border-r border-[#E4E3E0]/20">#</th>
                <th className="p-3 font-serif italic min-w-[200px] border-r border-[#E4E3E0]/20">STUDENT NAME</th>
                <th className="p-3 font-serif italic text-center w-28 border-r border-[#E4E3E0]/20 bg-[#141414]">TOTAL PTS</th>
                <th className="p-3 font-serif italic text-center w-28 border-r border-[#E4E3E0]/20 bg-[#141414]">CUMULATIVE %</th>
                <th className="p-3 font-serif italic text-center w-20 border-r border-[#E4E3E0]/20 bg-[#141414]">GRADE</th>
                
                {assignments.map((ass) => (
                  <th key={ass.id} className="p-3 text-center border-r border-[#E4E3E0]/20 min-w-[110px] group relative font-serif italic">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold uppercase text-[11px] mx-auto tracking-wide">{ass.name}</span>
                      <button
                        title={`Delete ${ass.name}`}
                        onClick={() => onDeleteAssignment(ass.id)}
                        className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-200 transition-opacity p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>

              {/* Row 2: Total Max Points Row */}
              <tr className="bg-[#E4E3E0] text-xs text-[#141414] border-b border-[#141414] font-mono">
                <td className="p-2 text-center text-[#141414]/50 border-r border-[#141414]">•</td>
                <td className="p-2 font-bold border-r border-[#141414] flex items-center justify-between">
                  <span>MAX POINTS POSSIBLE</span>
                  <span className="hd-badge">MAX</span>
                </td>
                <td className="p-2 text-center font-bold border-r border-[#141414] bg-white/50">{totalPointsPossible.toFixed(2)}</td>
                <td className="p-2 text-center font-bold border-r border-[#141414] bg-white/50">100.0%</td>
                <td className="p-2 text-center font-bold border-r border-[#141414] bg-white/50">100%</td>
                {assignments.map((ass) => (
                  <td key={ass.id} className="p-2 text-center font-bold border-r border-[#141414] bg-white/30 text-[#141414]">
                    {ass.maxPoints} PTS
                  </td>
                ))}
              </tr>

              {/* Row 3: Class Average Row */}
              <tr className="bg-white text-xs text-[#141414] border-b-2 border-[#141414] font-mono">
                <td className="p-2 text-center text-[#141414]/50 border-r border-[#141414]">•</td>
                <td className="p-2 font-black border-r border-[#141414] flex items-center justify-between uppercase">
                  <span>CLASS AVERAGE</span>
                  <span className="hd-badge-outline">AVG</span>
                </td>
                <td className="p-2 text-center font-bold border-r border-[#141414] bg-[#E4E3E0]/40">
                  {(students.reduce((acc, s) => acc + getStudentTotalEarned(s.id), 0) / (students.length || 1)).toFixed(2)}
                </td>
                <td className="p-2 text-center font-bold border-r border-[#141414] bg-[#E4E3E0]/40 text-emerald-800">
                  {(overallClassAvgRatio * 100).toFixed(1)}%
                </td>
                <td className="p-2 text-center font-bold border-r border-[#141414] bg-[#E4E3E0]/40">
                  {getLetterGrade(overallClassAvgRatio).grade}
                </td>
                {assignments.map((ass) => {
                  const avg = getAssignmentClassAverage(ass.id);
                  const pct = ass.maxPoints > 0 ? avg / ass.maxPoints : 0;
                  return (
                    <td key={ass.id} className="p-2 text-center font-bold border-r border-[#141414] bg-[#E4E3E0]/30">
                      <div>{avg.toFixed(2)}</div>
                      <div className="text-[10px] text-[#141414]/60 font-normal">{(pct * 100).toFixed(0)}%</div>
                    </td>
                  );
                })}
              </tr>
            </thead>

            {/* Student Score Rows */}
            <tbody className="divide-y divide-[#141414]/20 text-xs text-[#141414]">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5 + assignments.length} className="p-8 text-center text-[#141414]/60 font-mono">
                    NO STUDENTS MATCH FILTER QUERY
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const totalEarned = getStudentTotalEarned(student.id);
                  const percentage = getStudentPercentage(student.id);
                  const letterInfo = getLetterGrade(percentage);

                  return (
                    <tr key={student.id} className="hover:bg-[#E4E3E0]/40 transition-colors group">
                      <td className="p-2.5 text-center text-[#141414]/60 font-mono text-[11px] border-r border-[#141414]">
                        {String(idx + 1).padStart(2, '0')}
                      </td>

                      {/* Student Name */}
                      <td className="p-2.5 font-bold text-[#141414] border-r border-[#141414] flex items-center justify-between">
                        <div>
                          <div className="font-bold text-[#141414]">{student.name}</div>
                          {student.email && <div className="text-[10px] text-[#141414]/60 font-mono">{student.email}</div>}
                        </div>
                        <button
                          title={`Remove ${student.name}`}
                          onClick={() => onDeleteStudent(student.id)}
                          className="opacity-0 group-hover:opacity-100 text-[#141414]/40 hover:text-rose-600 transition-opacity p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* Student Cumulative Total */}
                      <td className="p-2.5 text-center font-mono font-bold border-r border-[#141414] bg-[#E4E3E0]/20">
                        {totalEarned.toFixed(2)}
                      </td>

                      {/* Student Cumulative % */}
                      <td className="p-2.5 text-center font-mono font-bold border-r border-[#141414] bg-[#E4E3E0]/20">
                        {(percentage * 100).toFixed(1)}%
                      </td>

                      {/* Letter Grade Tag */}
                      <td className="p-2 text-center border-r border-[#141414] bg-[#E4E3E0]/20">
                        <span className="hd-badge">
                          GRADE {letterInfo.grade}
                        </span>
                      </td>

                      {/* Individual Assignment Scores */}
                      {assignments.map((ass) => {
                        const currentVal = grades[student.id]?.[ass.id];
                        const isEditing = editingCell?.studentId === student.id && editingCell?.assignmentId === ass.id;

                        return (
                          <td
                            key={ass.id}
                            onClick={() => handleCellClick(student.id, ass.id, currentVal ?? null)}
                            className={`p-2 text-center font-mono border-r border-[#141414] cursor-pointer transition-all relative ${
                              isEditing
                                ? 'bg-amber-100 border-2 border-[#141414] font-bold'
                                : currentVal === null || currentVal === undefined
                                ? 'hover:bg-[#E4E3E0] text-[#141414]/30 font-normal'
                                : currentVal < ass.maxPoints * 0.6
                                ? 'hover:bg-rose-100 text-rose-900 font-bold bg-rose-50'
                                : currentVal >= ass.maxPoints * 0.9
                                ? 'hover:bg-emerald-100 text-emerald-950 font-bold bg-emerald-50/50'
                                : 'hover:bg-[#E4E3E0] text-[#141414] font-bold'
                            }`}
                          >
                            {isEditing ? (
                              <div className="flex items-center justify-center space-x-1">
                                <input
                                  type="number"
                                  step="0.5"
                                  autoFocus
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCellSave();
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  className="w-16 text-center text-xs p-1 font-mono font-bold bg-white border border-[#141414] outline-none"
                                />
                              </div>
                            ) : (
                              <span>
                                {currentVal !== null && currentVal !== undefined ? currentVal.toFixed(2) : '--'}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info Box */}
      <div className="p-3 bg-white border border-[#141414] text-xs font-mono text-[#141414] flex items-center justify-between shadow-[2px_2px_0px_#141414]">
        <div className="flex items-center space-x-2 uppercase font-bold">
          <Calculator className="w-4 h-4 text-[#141414]" />
          <span>Click any cell to modify grade directly. Enter to confirm.</span>
        </div>
        <span className="hd-badge-outline">Realtime Computed Matrix</span>
      </div>

      {/* Modal: Add Student */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-[#141414]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#E4E3E0] border-2 border-[#141414] shadow-[6px_6px_0px_#141414] max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#141414] uppercase tracking-wider flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add New Student Entry</span>
            </h3>

            <form onSubmit={handleCreateStudent} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#141414] font-bold mb-1 uppercase">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Student 9 (Jane Doe)"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#141414] text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              <div>
                <label className="block text-[#141414] font-bold mb-1 uppercase">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="jane.doe@university.edu"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#141414] text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#141414]">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(false)}
                  className="hd-btn-secondary px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="hd-btn-primary px-4 py-2"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Assignment */}
      {showAddAssignment && (
        <div className="fixed inset-0 bg-[#141414]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#E4E3E0] border-2 border-[#141414] shadow-[6px_6px_0px_#141414] max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#141414] uppercase tracking-wider flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add New Gradebook Column</span>
            </h3>

            <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#141414] font-bold mb-1 uppercase">Column / Assignment Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HW 3, QUIZ 2, TEST 2"
                  value={newAssName}
                  onChange={(e) => setNewAssName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#141414] text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              <div>
                <label className="block text-[#141414] font-bold mb-1 uppercase">Assignment Type</label>
                <select
                  value={newAssType}
                  onChange={(e: any) => setNewAssType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#141414] text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                >
                  <option value="HW">Homework (HW)</option>
                  <option value="QUIZ">Quiz</option>
                  <option value="TEST">Exam / Test</option>
                  <option value="ESSAY">Essay / Paper</option>
                  <option value="LAB">Lab Report</option>
                  <option value="PROJECT">Project</option>
                </select>
              </div>

              <div>
                <label className="block text-[#141414] font-bold mb-1 uppercase">Maximum Points Possible *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newAssPoints}
                  onChange={(e) => setNewAssPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-[#141414] text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#141414]">
                <button
                  type="button"
                  onClick={() => setShowAddAssignment(false)}
                  className="hd-btn-secondary px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="hd-btn-primary px-4 py-2"
                >
                  Create Column
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
