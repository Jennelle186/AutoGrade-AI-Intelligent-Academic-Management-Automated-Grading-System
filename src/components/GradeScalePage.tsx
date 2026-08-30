import React, { useState, useEffect } from 'react';
import { CourseSection, GradeScaleRow, SpecialStatusConfig } from '../types';
import { Award, Plus, Trash2, Save, CheckCircle, ShieldAlert, AlertTriangle } from 'lucide-react';

interface GradeScalePageProps {
  activeSection: CourseSection | null;
  initialScale: GradeScaleRow[];
  onSaveScale: (sectionId: string, scale: GradeScaleRow[]) => Promise<void>;
}

export const GradeScalePage: React.FC<GradeScalePageProps> = ({
  activeSection,
  initialScale,
  onSaveScale,
}) => {
  const [scaleRows, setScaleRows] = useState<GradeScaleRow[]>([]);
  const [specialStatuses, setSpecialStatuses] = useState<SpecialStatusConfig[]>([
    { code: 'INC', title: 'Incomplete', description: 'Student has pending requirements at term end.', enabled: true },
    { code: 'UW', title: 'Unauthorized Withdrawal', description: 'Student dropped without official filing or excessive absences.', enabled: true },
    { code: 'AW', title: 'Authorized Withdrawal', description: 'Official dropping approved by registrar.', enabled: true },
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (initialScale && initialScale.length > 0) {
      setScaleRows(initialScale.filter((s) => !s.is_special_status));
    } else {
      // Default University Grade Scale
      setScaleRows([
        { id: '1', section_id: '', min_percentage: 96, max_percentage: 100, numerical_rating: '1.00', remarks: 'Excellent' },
        { id: '2', section_id: '', min_percentage: 91.5, max_percentage: 95.99, numerical_rating: '1.25', remarks: 'Superior' },
        { id: '3', section_id: '', min_percentage: 87, max_percentage: 91.49, numerical_rating: '1.50', remarks: 'Very Good' },
        { id: '4', section_id: '', min_percentage: 82.5, max_percentage: 86.99, numerical_rating: '1.75', remarks: 'Above Average' },
        { id: '5', section_id: '', min_percentage: 78, max_percentage: 82.49, numerical_rating: '2.00', remarks: 'Good' },
        { id: '6', section_id: '', min_percentage: 73.5, max_percentage: 77.99, numerical_rating: '2.25', remarks: 'Satisfactory' },
        { id: '7', section_id: '', min_percentage: 69, max_percentage: 73.49, numerical_rating: '2.50', remarks: 'Fair' },
        { id: '8', section_id: '', min_percentage: 64.5, max_percentage: 68.99, numerical_rating: '2.75', remarks: 'Passing' },
        { id: '9', section_id: '', min_percentage: 60, max_percentage: 64.49, numerical_rating: '3.00', remarks: 'Conditional Pass' },
        { id: '10', section_id: '', min_percentage: 0, max_percentage: 59.99, numerical_rating: '5.00', remarks: 'Failed' },
      ]);
    }
  }, [initialScale]);

  const handleUpdateRow = (id: string, field: keyof GradeScaleRow, value: any) => {
    setScaleRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleAddRow = () => {
    const newRow: GradeScaleRow = {
      id: `gs-${Date.now()}`,
      section_id: activeSection?.id || '',
      min_percentage: 50,
      max_percentage: 59,
      numerical_rating: '3.00',
      remarks: 'Custom Range',
    };
    setScaleRows((prev) => [...prev, newRow]);
  };

  const handleRemoveRow = (id: string) => {
    setScaleRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleSpecialStatus = (code: 'INC' | 'UW' | 'AW') => {
    setSpecialStatuses((prev) =>
      prev.map((s) => (s.code === code ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleSave = async () => {
    if (!activeSection) {
      alert('Please select an active section first.');
      return;
    }
    setIsSaving(true);
    setSaveSuccess(false);

    // Merge scale rows with special status definitions
    const specialRows: GradeScaleRow[] = specialStatuses
      .filter((s) => s.enabled)
      .map((s, idx) => ({
        id: `sp-${s.code}`,
        section_id: activeSection.id,
        min_percentage: -(idx + 1),
        max_percentage: -(idx + 1),
        numerical_rating: s.code,
        remarks: s.title,
        is_special_status: true,
      }));

    const fullScale = [...scaleRows, ...specialRows];

    try {
      await onSaveScale(activeSection.id, fullScale);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save grade scale.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-stone-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Award className="w-4 h-4 text-stone-700" />
            Module 3: Grade Conversion Scale
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Grade Conversion Scale & Special Statuses</h1>
          <p className="text-stone-600 text-sm mt-1">
            Define exact percentage boundary ranges and numerical rating conversions (1.00 - 5.00) alongside administrative status codes (INC, UW, AW).
          </p>
        </div>

        {activeSection ? (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
          >
            {saveSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Scale Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving Scale...' : 'Save Grade Scale'}
              </>
            )}
          </button>
        ) : (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Select a section on Page 1 first</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Editable Conversion Table (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Percentage to Numerical Rating Table</h2>
              <p className="text-xs text-stone-500">
                Grades calculated in the Gradebook automatically convert percentage scores to these numerical ratings.
              </p>
            </div>

            <button
              onClick={handleAddRow}
              className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Rating Range
            </button>
          </div>

          <div className="border border-stone-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-700 uppercase font-bold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Min %</th>
                  <th className="py-2.5 px-3">Max %</th>
                  <th className="py-2.5 px-3">Numerical Rating</th>
                  <th className="py-2.5 px-3">Remarks / Description</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {scaleRows.map((row) => (
                  <tr key={row.id} className="hover:bg-stone-50/50">
                    <td className="py-2 px-3 w-28">
                      <input
                        type="number"
                        step="0.1"
                        value={row.min_percentage}
                        onChange={(e) => handleUpdateRow(row.id, 'min_percentage', Number(e.target.value))}
                        className="w-full border border-stone-300 rounded px-2 py-1 font-mono text-center font-bold"
                      />
                    </td>
                    <td className="py-2 px-3 w-28">
                      <input
                        type="number"
                        step="0.1"
                        value={row.max_percentage}
                        onChange={(e) => handleUpdateRow(row.id, 'max_percentage', Number(e.target.value))}
                        className="w-full border border-stone-300 rounded px-2 py-1 font-mono text-center font-bold"
                      />
                    </td>
                    <td className="py-2 px-3 w-32">
                      <input
                        type="text"
                        value={row.numerical_rating}
                        onChange={(e) => handleUpdateRow(row.id, 'numerical_rating', e.target.value)}
                        className="w-full border border-stone-300 rounded px-2 py-1 font-bold text-center text-stone-900 bg-stone-50"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => handleUpdateRow(row.id, 'remarks', e.target.value)}
                        className="w-full border border-stone-300 rounded px-2.5 py-1 text-stone-800"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-1 text-stone-400 hover:text-red-600 rounded"
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

        {/* Right Column: Administrative Special Status Toggles (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-1">
              <ShieldAlert className="w-5 h-5 text-stone-700" />
              Special Administrative Marks
            </h2>
            <p className="text-xs text-stone-500">
              Configure special non-numerical status codes used in university grade reporting.
            </p>
          </div>

          <div className="space-y-4">
            {specialStatuses.map((status) => (
              <div
                key={status.code}
                className={`p-4 border rounded-xl transition-all ${
                  status.enabled ? 'border-stone-300 bg-stone-50/50' : 'border-stone-200 bg-stone-100/50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white bg-stone-900 px-2 py-0.5 rounded font-mono">
                      {status.code}
                    </span>
                    <span className="text-sm font-bold text-stone-900">{status.title}</span>
                  </div>

                  <input
                    type="checkbox"
                    checked={status.enabled}
                    onChange={() => handleToggleSpecialStatus(status.code)}
                    className="w-4 h-4 accent-stone-900 rounded cursor-pointer"
                  />
                </div>

                <p className="text-xs text-stone-600 mt-2">{status.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
