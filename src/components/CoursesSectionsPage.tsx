import React, { useState } from 'react';
import { CourseSection, SectionStudent, ActiveTab } from '../types';
import { Plus, Upload, Users, BookOpen, CheckCircle, Trash2, Edit, FileSpreadsheet, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';

interface CoursesSectionsPageProps {
  sections: CourseSection[];
  activeSection: CourseSection | null;
  onSelectSection: (section: CourseSection) => void;
  onCreateSection: (section_name: string, subject_name: string, passing_threshold: number) => Promise<void>;
  onDeleteSection: (sectionId: string) => Promise<void>;
  onSaveRoster: (sectionId: string, students: Partial<SectionStudent>[]) => Promise<void>;
  onNavigateToTab: (tab: ActiveTab) => void;
}

export const CoursesSectionsPage: React.FC<CoursesSectionsPageProps> = ({
  sections,
  activeSection,
  onSelectSection,
  onCreateSection,
  onDeleteSection,
  onSaveRoster,
  onNavigateToTab,
}) => {
  // New section form state
  const [subjectName, setSubjectName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [passingThreshold, setPassingThreshold] = useState(60);
  const [isCreating, setIsCreating] = useState(false);

  // Roster upload state
  const [dragActive, setDragActive] = useState(false);
  const [parsedStudents, setParsedStudents] = useState<Partial<SectionStudent>[]>([]);
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualStudentId, setManualStudentId] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [copySourceSectionId, setCopySourceSectionId] = useState('');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isSavingRoster, setIsSavingRoster] = useState(false);

  const handleCopyRosterFromSection = async () => {
    if (!copySourceSectionId) return;
    try {
      const res = await fetch(`/api/sections/${copySourceSectionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.students && data.students.length > 0) {
          const copied: Partial<SectionStudent>[] = data.students.map((s: any) => ({
            student_id_number: s.student_id_number,
            student_name: s.student_name,
            email: s.email,
          }));
          setParsedStudents((prev) => [...prev, ...copied]);
          setUploadMessage(`Copied ${copied.length} students from source section into current queue! You can edit, add more manually, or save.`);
        } else {
          alert('The selected source section has no enrolled students.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to fetch roster from selected section.');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !sectionName.trim()) return;
    setIsCreating(true);
    try {
      await onCreateSection(sectionName, subjectName, passingThreshold);
      setSubjectName('');
      setSectionName('');
      setPassingThreshold(60);
    } catch (err: any) {
      alert(err.message || 'Failed to create section.');
    } finally {
      setIsCreating(false);
    }
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Try to identify header row or columns
        const newStudents: Partial<SectionStudent>[] = [];
        json.forEach((row, idx) => {
          if (idx === 0) return; // skip header
          if (!row || row.length === 0) return;

          let idNum = String(row[0] || '').trim();
          let name = String(row[1] || '').trim();
          let email = String(row[2] || '').trim();

          if (!name && idNum) {
            name = idNum;
            idNum = `2024-${Math.floor(10000 + Math.random() * 90000)}`;
          }

          if (name) {
            newStudents.push({
              student_id_number: idNum || `2024-${Math.floor(10000 + Math.random() * 90000)}`,
              student_name: name,
              email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@univ.edu`,
            });
          }
        });

        setParsedStudents(newStudents);
        setUploadMessage(`Successfully parsed ${newStudents.length} students from ${file.name}`);
      } catch (err) {
        console.error(err);
        setUploadMessage('Error reading file. Please ensure it is a valid CSV or Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0]);
    }
  };

  const handleAddManualStudent = () => {
    if (!manualStudentName.trim()) return;
    const newStudent: Partial<SectionStudent> = {
      student_id_number: manualStudentId.trim() || `2024-${Math.floor(10000 + Math.random() * 90000)}`,
      student_name: manualStudentName.trim(),
      email: manualEmail.trim() || `${manualStudentName.trim().toLowerCase().replace(/\s+/g, '.')}@univ.edu`,
    };
    setParsedStudents((prev) => [...prev, newStudent]);
    setManualStudentName('');
    setManualStudentId('');
    setManualEmail('');
  };

  const handleRemoveParsedStudent = (index: number) => {
    setParsedStudents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRosterSubmit = async () => {
    if (!activeSection) {
      alert('Please select or create an active section first.');
      return;
    }
    if (parsedStudents.length === 0) {
      alert('No students to save in the roster queue.');
      return;
    }
    setIsSavingRoster(true);
    try {
      await onSaveRoster(activeSection.id, parsedStudents);
      setParsedStudents([]);
      setUploadMessage(`Roster saved for section ${activeSection.section_name}!`);
    } catch (err: any) {
      alert(err.message || 'Failed to save roster.');
    } finally {
      setIsSavingRoster(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-stone-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4 text-stone-700" />
            Module 1: Section & Roster Management
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Courses & Sections Management</h1>
          <p className="text-stone-600 text-sm mt-1">
            Create course sections, upload roster files (.xlsx, .csv), and manage active student section profiles.
          </p>
        </div>

        {activeSection && (
          <div className="bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="text-xs text-stone-500 font-medium">Active Selected Section:</div>
              <div className="text-sm font-bold text-stone-900">
                {activeSection.section_name} <span className="text-stone-500 font-normal">({activeSection.subject_name})</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Create Section & Roster Upload (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section Creation Form Card */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-stone-700" />
              Create New Section
            </h2>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Web Development, Database Systems"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Section Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. ACT - NT A, CS - 3A"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Passing Grade Threshold
                  </label>
                  <span className="text-xs font-bold text-stone-900">{passingThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="75"
                  step="1"
                  value={passingThreshold}
                  onChange={(e) => setPassingThreshold(Number(e.target.value))}
                  className="w-full accent-stone-900"
                />
                <div className="text-[11px] text-stone-500 mt-1">
                  Minimum percentage required to achieve a passing numerical status (e.g., 3.00).
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating || !subjectName.trim() || !sectionName.trim()}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreating ? 'Creating Section...' : 'Add Section'}
              </button>
            </form>
          </div>

          {/* Roster File Dropper Card */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-stone-700" />
                Upload Section Roster
              </h2>
              {activeSection && (
                <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                  Target: {activeSection.section_name}
                </span>
              )}
            </div>

            <p className="text-xs text-stone-600 mb-4">
              Upload an Excel (.xlsx) or CSV roster file containing columns for Student ID, Student Name, and Email.
            </p>

            {/* Drag Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                dragActive ? 'border-stone-900 bg-stone-50' : 'border-stone-300 hover:border-stone-400 bg-stone-50/50'
              }`}
            >
              <FileSpreadsheet className="w-10 h-10 text-stone-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-stone-800 mb-1">
                Drag & drop roster spreadsheet here
              </p>
              <p className="text-[11px] text-stone-500 mb-3">
                Supports Excel (.xlsx, .xls) and CSV files
              </p>
              <label className="inline-flex items-center gap-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-bold py-2 px-3 rounded-lg cursor-pointer shadow-xs transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Browse File
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {uploadMessage && (
              <div className="mt-3 text-xs bg-stone-100 border border-stone-200 text-stone-800 p-2.5 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{uploadMessage}</span>
              </div>
            )}

            {/* Copy Roster from existing section option */}
            {sections.length > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-200">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Or Copy Roster From Another Section
                </label>
                <div className="flex gap-2">
                  <select
                    value={copySourceSectionId}
                    onChange={(e) => setCopySourceSectionId(e.target.value)}
                    className="flex-1 text-xs border border-stone-300 rounded-lg p-2 bg-white font-medium text-stone-900"
                  >
                    <option value="">-- Select Source Section --</option>
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.section_name} ({sec.subject_name})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleCopyRosterFromSection}
                    disabled={!copySourceSectionId}
                    className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Copy Roster
                  </button>
                </div>
              </div>
            )}

            {/* Manual Add Input Row */}
            <div className="mt-4 pt-4 border-t border-stone-200">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Or Overload / Add Student Manually
              </label>
              <div className="grid grid-cols-1 gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Student ID (e.g. 2024-00123)"
                  value={manualStudentId}
                  onChange={(e) => setManualStudentId(e.target.value)}
                  className="text-xs border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
                <input
                  type="text"
                  placeholder="Student Name *"
                  value={manualStudentName}
                  onChange={(e) => setManualStudentName(e.target.value)}
                  className="text-xs border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
                <input
                  type="email"
                  placeholder="Student Email (optional)"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="text-xs border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>
              <button
                type="button"
                onClick={handleAddManualStudent}
                disabled={!manualStudentName.trim()}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Student to Queue
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Section Dashboard & Roster Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Sections Overview Cards */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-stone-700" />
              Active Course Sections ({sections.length})
            </h2>

            {sections.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300">
                <BookOpen className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-stone-700">No course sections available yet.</p>
                <p className="text-xs text-stone-500 mt-1">Use the form on the left to create your first section.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.map((sec) => {
                  const isSelected = activeSection?.id === sec.id;
                  return (
                    <div
                      key={sec.id}
                      className={`border rounded-xl p-4 transition-all relative ${
                        isSelected
                          ? 'border-stone-900 bg-stone-900 text-white shadow-md'
                          : 'border-stone-200 bg-white hover:border-stone-400 text-stone-900'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                            {sec.subject_name}
                          </div>
                          <h3 className="text-lg font-extrabold mt-0.5">{sec.section_name}</h3>
                        </div>
                        <button
                          onClick={() => onDeleteSection(sec.id)}
                          className={`p-1.5 rounded hover:bg-stone-800 ${isSelected ? 'text-stone-400 hover:text-red-400' : 'text-stone-400 hover:text-red-600'}`}
                          title="Delete Section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs">
                        <span className={isSelected ? 'text-stone-300' : 'text-stone-600'}>
                          Passing: <strong>{sec.passing_threshold}%</strong>
                        </span>
                        <span className={`px-2 py-0.5 rounded font-bold ${isSelected ? 'bg-stone-800 text-stone-200' : 'bg-stone-100 text-stone-800'}`}>
                          {sec.studentCount || 0} Students
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-stone-200/20 flex gap-2">
                        <button
                          onClick={() => onSelectSection(sec)}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${
                            isSelected
                              ? 'bg-stone-800 text-stone-100 border border-stone-700'
                              : 'bg-stone-900 text-white hover:bg-stone-800'
                          }`}
                        >
                          {isSelected ? '✓ Active Section' : 'Select Section'}
                        </button>
                        <button
                          onClick={() => {
                            onSelectSection(sec);
                            onNavigateToTab('gradebook-sheet');
                          }}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                            isSelected
                              ? 'bg-stone-800 text-stone-200 hover:bg-stone-700'
                              : 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                          }`}
                          title="View Gradebook"
                        >
                          Gradebook
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Roster Queue Preview Table */}
          {parsedStudents.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-stone-700" />
                    Roster Upload Queue ({parsedStudents.length} Students)
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Review parsed student list before committing to {activeSection?.section_name || 'selected section'}.
                  </p>
                </div>

                <button
                  onClick={handleSaveRosterSubmit}
                  disabled={isSavingRoster || !activeSection}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isSavingRoster ? 'Saving Roster...' : 'Save to Section Database'}
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto border border-stone-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-700 uppercase font-bold sticky top-0 border-b border-stone-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Student ID</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-800">
                    {parsedStudents.map((std, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/80">
                        <td className="py-2 px-3 text-stone-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-medium">{std.student_id_number}</td>
                        <td className="py-2 px-3 font-bold">{std.student_name}</td>
                        <td className="py-2 px-3 text-stone-500">{std.email}</td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleRemoveParsedStudent(idx)}
                            className="text-stone-400 hover:text-red-600"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
