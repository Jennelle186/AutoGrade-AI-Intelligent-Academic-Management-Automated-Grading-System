import React, { useState } from 'react';
import { Rubric, RubricCriterion, CourseSection } from '../types';
import { 
  BookOpen, 
  Plus, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Check, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  Filter
} from 'lucide-react';

interface RubricManagerProps {
  rubrics: Rubric[];
  sections?: CourseSection[];
  onAddRubric: (rubric: Rubric) => void;
  onUpdateRubric: (rubric: Rubric) => void;
  onDeleteRubric: (rubricId: string) => void;
}

export const RubricManager: React.FC<RubricManagerProps> = ({
  rubrics,
  sections = [],
  onAddRubric,
  onUpdateRubric,
  onDeleteRubric,
}) => {
  const [selectedRubricId, setSelectedRubricId] = useState<string>(rubrics[0]?.id || '');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  // Get list of unique subjects across all sections & existing rubrics
  const availableSubjects = Array.from(
    new Set([
      ...sections.map((s) => s.subject_name).filter(Boolean),
      ...rubrics.flatMap((r) => r.subjects || []).filter((sub) => sub !== 'All Subjects'),
    ])
  );

  // Manual Creation state
  const [newTitle, setNewTitle] = useState('');
  const [newSelectedSubjects, setNewSelectedSubjects] = useState<string[]>(['All Subjects']);
  const [newCriteria, setNewCriteria] = useState<RubricCriterion[]>([
    { id: 'c1', title: 'Technical Accuracy', max_points: 10, description: 'Correct application of course concepts.' },
    { id: 'c2', title: 'Logic & Reasoning', max_points: 10, description: 'Clear step-by-step reasoning.' },
    { id: 'c3', title: 'Completeness', max_points: 5, description: 'All required questions answered.' },
  ]);

  // Edit Rubric state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSelectedSubjects, setEditSelectedSubjects] = useState<string[]>(['All Subjects']);
  const [editCriteria, setEditCriteria] = useState<RubricCriterion[]>([]);

  // Inline Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiCourse, setAiCourse] = useState('ACT - NT A');
  const [aiTotalPoints, setAiTotalPoints] = useState(25);
  const [aiSelectedSubjects, setAiSelectedSubjects] = useState<string[]>(['All Subjects']);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDeleteRubricClick = (e: React.MouseEvent, rubricId: string) => {
    e.stopPropagation();
    if (confirmDeleteId === rubricId) {
      onDeleteRubric(rubricId);
      setConfirmDeleteId(null);
      const remaining = filteredRubrics.filter((r) => r.id !== rubricId);
      if (remaining.length > 0) {
        setSelectedRubricId(remaining[0].id);
      } else {
        setSelectedRubricId('');
      }
    } else {
      setConfirmDeleteId(rubricId);
    }
  };

  // Filter rubrics based on selected subject filter
  const filteredRubrics = rubrics.filter((r) => {
    if (selectedSubjectFilter === 'ALL') return true;
    if (!r.subjects || r.subjects.length === 0 || r.subjects.includes('All Subjects')) return true;
    return r.subjects.includes(selectedSubjectFilter);
  });

  const activeRubric = filteredRubrics.find(r => r.id === selectedRubricId) || filteredRubrics[0] || rubrics[0];

  const handleToggleSubjectInModal = (
    subject: string,
    currentSubjects: string[],
    setFn: (val: string[]) => void
  ) => {
    if (subject === 'All Subjects') {
      setFn(['All Subjects']);
      return;
    }
    const filtered = currentSubjects.filter((s) => s !== 'All Subjects');
    if (filtered.includes(subject)) {
      const next = filtered.filter((s) => s !== subject);
      setFn(next.length === 0 ? ['All Subjects'] : next);
    } else {
      setFn([...filtered, subject]);
    }
  };

  // AI Generate Handler
  const handleGenerateAiRubric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          courseName: aiCourse,
          totalPoints: aiTotalPoints,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate rubric');
      }

      const data = await response.json();
      const generatedRubric: Rubric = {
        id: 'rubric-' + Date.now(),
        title: data.title || aiPrompt,
        totalPoints: aiTotalPoints,
        subjects: aiSelectedSubjects.length > 0 ? aiSelectedSubjects : ['All Subjects'],
        criteria: (data.criteria || []).map((c: any, idx: number) => ({
          id: `crit-${idx}-${Date.now()}`,
          title: c.title,
          max_points: c.max_points,
          description: c.description,
          expectations: c.expectations,
        })),
      };

      onAddRubric(generatedRubric);
      setSelectedRubricId(generatedRubric.id);
      setShowAiModal(false);
      setAiPrompt('');
    } catch (err: any) {
      alert(`Rubric Generation Error: ${err?.message || 'Failed'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Manual Rubric Submit
  const handleSaveManualRubric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const totalPts = newCriteria.reduce((sum, c) => sum + Number(c.max_points), 0);
    const created: Rubric = {
      id: 'rubric-' + Date.now(),
      title: newTitle.trim(),
      totalPoints: totalPts,
      subjects: newSelectedSubjects.length > 0 ? newSelectedSubjects : ['All Subjects'],
      criteria: newCriteria,
    };

    onAddRubric(created);
    setSelectedRubricId(created.id);
    setShowCreateModal(false);
    setNewTitle('');
    setNewSelectedSubjects(['All Subjects']);
  };

  // Open Edit Modal
  const handleOpenEditModal = (rubricToEdit: Rubric) => {
    setEditingRubric(rubricToEdit);
    setEditTitle(rubricToEdit.title);
    setEditSelectedSubjects(
      rubricToEdit.subjects && rubricToEdit.subjects.length > 0 ? rubricToEdit.subjects : ['All Subjects']
    );
    setEditCriteria(
      rubricToEdit.criteria
        ? JSON.parse(JSON.stringify(rubricToEdit.criteria))
        : [
            { id: 'c1', title: 'Technical Accuracy', max_points: 10, description: '' },
          ]
    );
    setShowEditModal(true);
  };

  // Save Edit Submit
  const handleSaveEditRubric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRubric || !editTitle.trim()) return;

    const totalPts = editCriteria.reduce((sum, c) => sum + Number(c.max_points || 0), 0);
    const updated: Rubric = {
      ...editingRubric,
      title: editTitle.trim(),
      totalPoints: totalPts,
      subjects: editSelectedSubjects.length > 0 ? editSelectedSubjects : ['All Subjects'],
      criteria: editCriteria,
    };

    onUpdateRubric(updated);
    setShowEditModal(false);
    setEditingRubric(null);
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Top Header Card */}
      <div className="bg-white p-6 border border-[#141414] shadow-[3px_3px_0px_#141414] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-[#141414]" />
            <h2 className="text-sm font-bold font-serif italic text-[#141414] uppercase tracking-wider">Subject Rubrics Studio</h2>
          </div>
          <p className="text-xs text-[#141414]/70 mt-1">
            Manage subject-specific rubrics or create global rubrics usable across multiple course subjects.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="ai-generate-rubric-btn"
            onClick={() => setShowAiModal(true)}
            className="hd-btn-secondary px-3.5 py-2 flex items-center space-x-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Rubric Generator</span>
          </button>

          <button
            id="create-rubric-btn"
            onClick={() => setShowCreateModal(true)}
            className="hd-btn-primary px-3.5 py-2 flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Custom Rubric</span>
          </button>
        </div>
      </div>

      {/* Subject Filter Bar */}
      <div className="bg-white p-4 border border-[#141414] shadow-[3px_3px_0px_#141414] flex flex-wrap items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold uppercase text-[#141414] mr-2">
          <Filter className="w-4 h-4" />
          <span>Filter by Subject:</span>
        </div>

        <button
          onClick={() => setSelectedSubjectFilter('ALL')}
          className={`px-3 py-1.5 border font-bold transition-all ${
            selectedSubjectFilter === 'ALL'
              ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]'
              : 'bg-[#E4E3E0]/30 hover:bg-[#E4E3E0]/60 border-[#141414] text-[#141414]'
          }`}
        >
          All Subjects ({rubrics.length})
        </button>

        {availableSubjects.map((subject) => {
          const matchCount = rubrics.filter((r) =>
            !r.subjects || r.subjects.length === 0 || r.subjects.includes('All Subjects') || r.subjects.includes(subject)
          ).length;

          return (
            <button
              key={subject}
              onClick={() => setSelectedSubjectFilter(subject)}
              className={`px-3 py-1.5 border font-bold transition-all ${
                selectedSubjectFilter === subject
                  ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]'
                  : 'bg-[#E4E3E0]/30 hover:bg-[#E4E3E0]/60 border-[#141414] text-[#141414]'
              }`}
            >
              {subject} ({matchCount})
            </button>
          );
        })}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Rubric List Selector (4 Cols) */}
        <div className="md:col-span-4 bg-white border border-[#141414] shadow-[3px_3px_0px_#141414] p-4 space-y-3">
          <h3 className="text-xs font-bold text-[#141414] uppercase tracking-wider border-b border-[#141414] pb-2 flex items-center justify-between">
            <span>Available Rubrics ({filteredRubrics.length})</span>
            {selectedSubjectFilter !== 'ALL' && (
              <span className="text-[10px] text-stone-500 font-normal">[{selectedSubjectFilter}]</span>
            )}
          </h3>

          <div className="space-y-2">
            {filteredRubrics.map((r) => {
              const rubricSubjects = r.subjects && r.subjects.length > 0 ? r.subjects : ['All Subjects'];
              
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRubricId(r.id)}
                  className={`p-3.5 border text-xs cursor-pointer transition-all flex items-start justify-between ${
                    selectedRubricId === r.id
                      ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] font-bold shadow-[2px_2px_0px_#141414]'
                      : 'bg-[#E4E3E0]/30 hover:bg-[#E4E3E0]/60 border-[#141414] text-[#141414]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold uppercase">{r.title}</div>
                    
                    {/* Subject Badges */}
                    <div className="flex flex-wrap gap-1">
                      {rubricSubjects.map((sub, sIdx) => (
                        <span
                          key={sIdx}
                          className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${
                            selectedRubricId === r.id
                              ? 'bg-stone-800 text-stone-200 border-stone-700'
                              : 'bg-stone-200 text-stone-800 border-stone-300'
                          }`}
                        >
                          {sub}
                        </span>
                      ))}
                    </div>

                    <div className={`text-[11px] ${selectedRubricId === r.id ? 'text-[#E4E3E0]/70' : 'text-[#141414]/70'}`}>
                      {r.criteria.length} CRITERIA • {r.totalPoints} PTS
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(r);
                      }}
                      title="Edit Rubric"
                      className={`p-1 rounded transition-colors ${
                        selectedRubricId === r.id
                          ? 'text-[#E4E3E0]/70 hover:text-white hover:bg-stone-800'
                          : 'text-[#141414]/60 hover:text-[#141414] hover:bg-stone-200'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteRubricClick(e, r.id)}
                      onMouseLeave={() => {
                        if (confirmDeleteId === r.id) {
                          setTimeout(() => setConfirmDeleteId(null), 3000);
                        }
                      }}
                      title={confirmDeleteId === r.id ? "Click again to confirm deletion" : "Delete Rubric"}
                      className={`p-1 rounded transition-colors text-xs font-semibold flex items-center space-x-1 ${
                        confirmDeleteId === r.id
                          ? 'bg-rose-600 text-white px-1.5 py-0.5 animate-pulse'
                          : selectedRubricId === r.id
                          ? 'text-[#E4E3E0]/70 hover:text-rose-300 hover:bg-stone-800'
                          : 'text-[#141414]/60 hover:text-rose-600 hover:bg-stone-200'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {confirmDeleteId === r.id && <span>Confirm?</span>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Rubric Detail Viewer (8 Cols) */}
        <div className="md:col-span-8 bg-white border border-[#141414] shadow-[3px_3px_0px_#141414] p-6 space-y-6">
          {activeRubric ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between pb-4 border-b border-[#141414]">
                <div>
                  <h3 className="text-sm font-bold text-[#141414] uppercase tracking-wide font-serif italic">{activeRubric.title}</h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="text-xs font-bold text-stone-700 uppercase">Applicable Subjects:</span>
                    {(activeRubric.subjects && activeRubric.subjects.length > 0 ? activeRubric.subjects : ['All Subjects']).map((sub, i) => (
                      <span key={i} className="text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                        {sub}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[#141414]/70 mt-2">
                    TOTAL POSSIBLE POINTS: <span className="font-bold text-[#141414]">{activeRubric.totalPoints} PTS</span>
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEditModal(activeRubric)}
                    className="hd-btn-secondary px-3 py-1.5 text-xs flex items-center space-x-1"
                    title="Edit Active Rubric"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Rubric</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Delete rubric "${activeRubric.title}"?`)) {
                        onDeleteRubric(activeRubric.id);
                      }
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 px-3 py-1.5 text-xs font-bold flex items-center space-x-1"
                    title="Delete Active Rubric"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Criteria Cards */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#141414] uppercase tracking-wider">
                  Evaluation Criteria Breakdown
                </h4>

                {activeRubric.criteria.map((c, idx) => (
                  <div key={c.id || idx} className="p-4 bg-[#E4E3E0]/30 border border-[#141414] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#141414] text-xs uppercase">
                        {idx + 1}. {c.title}
                      </span>
                      <span className="hd-badge">
                        {c.max_points} PTS
                      </span>
                    </div>

                    <p className="text-[#141414] leading-relaxed">{c.description}</p>

                    {c.expectations && c.expectations.length > 0 && (
                      <div className="pt-2 border-t border-[#141414]/20 text-[11px]">
                        <span className="font-bold text-[#141414] uppercase">Expectations:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-[#141414]/80 mt-1">
                          {c.expectations.map((exp, eIdx) => (
                            <li key={eIdx}>{exp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-[#141414]/60 text-xs">NO RUBRIC SELECTED</div>
          )}
        </div>

      </div>

      {/* AI Rubric Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-[#141414]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#E4E3E0] border-2 border-[#141414] shadow-[6px_6px_0px_#141414] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center space-x-2 text-[#141414] font-bold text-sm uppercase">
              <Sparkles className="w-5 h-5 text-[#141414]" />
              <span>AI Rubric Generator</span>
            </div>

            <p className="text-xs text-[#141414]/80 font-mono">
              Describe your assignment topic or prompt, and Gemini 3.6 Flash will generate a balanced multi-criteria rubric with point allocations and performance expectations.
            </p>

            <form onSubmit={handleGenerateAiRubric} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#141414] font-bold mb-1 uppercase">Assignment Description / Topic *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Midterm Lab Report on Digital Signals and Lyapunov Stability Analysis"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#141414] outline-none focus:outline-2 focus:outline-[#141414]"
                />
              </div>

              {/* Subject Tagging Checkboxes */}
              <div>
                <label className="block text-[#141414] font-bold mb-1 uppercase">Assign To Subjects</label>
                <div className="p-2.5 bg-white border border-[#141414] space-y-1.5 max-h-28 overflow-y-auto">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiSelectedSubjects.includes('All Subjects')}
                      onChange={() => handleToggleSubjectInModal('All Subjects', aiSelectedSubjects, setAiSelectedSubjects)}
                    />
                    <span className="font-bold">All Subjects (Global Rubric)</span>
                  </label>
                  {availableSubjects.map((subj) => (
                    <label key={subj} className="flex items-center gap-2 cursor-pointer pl-2">
                      <input
                        type="checkbox"
                        checked={aiSelectedSubjects.includes(subj)}
                        onChange={() => handleToggleSubjectInModal(subj, aiSelectedSubjects, setAiSelectedSubjects)}
                      />
                      <span>{subj}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#141414] font-bold mb-1 uppercase">Course Name</label>
                  <input
                    type="text"
                    value={aiCourse}
                    onChange={(e) => setAiCourse(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#141414] outline-none focus:outline-2 focus:outline-[#141414]"
                  />
                </div>

                <div>
                  <label className="block text-[#141414] font-bold mb-1 uppercase">Total Points Possible</label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={aiTotalPoints}
                    onChange={(e) => setAiTotalPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#141414] outline-none focus:outline-2 focus:outline-[#141414]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#141414]">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="hd-btn-secondary px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="hd-btn-primary px-4 py-2 flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGenerating ? 'Generating Rubric...' : 'Generate Rubric'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Rubric Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#141414]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#E4E3E0] border-2 border-[#141414] shadow-[6px_6px_0px_#141414] max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-[#141414] uppercase tracking-wider">Create New Custom Rubric</h3>

            <form onSubmit={handleSaveManualRubric} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#141414] font-bold mb-1 uppercase">Rubric Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Final Project & Presentation Rubric"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#141414] outline-none focus:outline-2 focus:outline-[#141414]"
                />
              </div>

              {/* Subject Tagging Checkboxes */}
              <div>
                <label className="block text-[#141414] font-bold mb-1 uppercase">Applicable Subjects</label>
                <div className="p-2.5 bg-white border border-[#141414] space-y-1.5 max-h-28 overflow-y-auto">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSelectedSubjects.includes('All Subjects')}
                      onChange={() => handleToggleSubjectInModal('All Subjects', newSelectedSubjects, setNewSelectedSubjects)}
                    />
                    <span className="font-bold">All Subjects (Global Rubric)</span>
                  </label>
                  {availableSubjects.map((subj) => (
                    <label key={subj} className="flex items-center gap-2 cursor-pointer pl-2">
                      <input
                        type="checkbox"
                        checked={newSelectedSubjects.includes(subj)}
                        onChange={() => handleToggleSubjectInModal(subj, newSelectedSubjects, setNewSelectedSubjects)}
                      />
                      <span>{subj}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#141414] uppercase">Criteria Items</label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewCriteria([
                        ...newCriteria,
                        { id: 'crit-' + Date.now(), title: 'New Criterion', max_points: 5, description: '' },
                      ])
                    }
                    className="text-xs font-bold text-[#141414] underline hover:bg-[#141414] hover:text-[#E4E3E0] px-2 py-0.5 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Criterion</span>
                  </button>
                </div>

                {newCriteria.map((c, idx) => (
                  <div key={c.id || idx} className="p-3 bg-white border border-[#141414] space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Criterion Title"
                        value={c.title}
                        onChange={(e) => {
                          const copy = [...newCriteria];
                          copy[idx].title = e.target.value;
                          setNewCriteria(copy);
                        }}
                        className="flex-1 px-2.5 py-1.5 border border-[#141414] outline-none"
                      />

                      <input
                        type="number"
                        placeholder="Pts"
                        value={c.max_points}
                        onChange={(e) => {
                          const copy = [...newCriteria];
                          copy[idx].max_points = Number(e.target.value);
                          setNewCriteria(copy);
                        }}
                        className="w-20 px-2.5 py-1.5 border border-[#141414] outline-none font-mono text-center"
                      />

                      {newCriteria.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewCriteria(newCriteria.filter((_, i) => i !== idx))}
                          className="text-rose-600 hover:text-rose-800 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Short description / expectations"
                      value={c.description}
                      onChange={(e) => {
                        const copy = [...newCriteria];
                        copy[idx].description = e.target.value;
                        setNewCriteria(copy);
                      }}
                      className="w-full px-2.5 py-1.5 border border-[#141414] outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#141414]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="hd-btn-secondary px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="hd-btn-primary px-4 py-2"
                >
                  Save Rubric
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Rubric Modal */}
      {showEditModal && editingRubric && (
        <div className="fixed inset-0 bg-[#141414]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#E4E3E0] border-2 border-[#141414] shadow-[6px_6px_0px_#141414] max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-[#141414] uppercase tracking-wider flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#141414]" />
              <span>Edit Rubric: {editingRubric.title}</span>
            </h3>

            <form onSubmit={handleSaveEditRubric} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#141414] font-bold mb-1 uppercase">Rubric Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#141414] outline-none focus:outline-2 focus:outline-[#141414]"
                />
              </div>

              {/* Subject Tagging Checkboxes */}
              <div>
                <label className="block text-[#141414] font-bold mb-1 uppercase">Applicable Subjects</label>
                <div className="p-2.5 bg-white border border-[#141414] space-y-1.5 max-h-28 overflow-y-auto">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editSelectedSubjects.includes('All Subjects')}
                      onChange={() => handleToggleSubjectInModal('All Subjects', editSelectedSubjects, setEditSelectedSubjects)}
                    />
                    <span className="font-bold">All Subjects (Global Rubric)</span>
                  </label>
                  {availableSubjects.map((subj) => (
                    <label key={subj} className="flex items-center gap-2 cursor-pointer pl-2">
                      <input
                        type="checkbox"
                        checked={editSelectedSubjects.includes(subj)}
                        onChange={() => handleToggleSubjectInModal(subj, editSelectedSubjects, setEditSelectedSubjects)}
                      />
                      <span>{subj}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#141414] uppercase">Criteria Items</label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditCriteria([
                        ...editCriteria,
                        { id: 'crit-' + Date.now(), title: 'New Criterion', max_points: 5, description: '' },
                      ])
                    }
                    className="text-xs font-bold text-[#141414] underline hover:bg-[#141414] hover:text-[#E4E3E0] px-2 py-0.5 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Criterion</span>
                  </button>
                </div>

                {editCriteria.map((c, idx) => (
                  <div key={c.id || idx} className="p-3 bg-white border border-[#141414] space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Criterion Title"
                        value={c.title}
                        onChange={(e) => {
                          const copy = [...editCriteria];
                          copy[idx].title = e.target.value;
                          setEditCriteria(copy);
                        }}
                        className="flex-1 px-2.5 py-1.5 border border-[#141414] outline-none font-bold"
                      />

                      <input
                        type="number"
                        placeholder="Pts"
                        value={c.max_points}
                        onChange={(e) => {
                          const copy = [...editCriteria];
                          copy[idx].max_points = Number(e.target.value);
                          setEditCriteria(copy);
                        }}
                        className="w-20 px-2.5 py-1.5 border border-[#141414] outline-none font-mono text-center font-bold"
                      />

                      {editCriteria.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditCriteria(editCriteria.filter((_, i) => i !== idx))}
                          className="text-rose-600 hover:text-rose-800 p-1"
                          title="Remove Criterion"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Short description / expectations"
                      value={c.description}
                      onChange={(e) => {
                        const copy = [...editCriteria];
                        copy[idx].description = e.target.value;
                        setEditCriteria(copy);
                      }}
                      className="w-full px-2.5 py-1.5 border border-[#141414] outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#141414]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="hd-btn-secondary px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="hd-btn-primary px-4 py-2"
                >
                  Update Rubric
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
