import React from 'react';
import { ActiveTab } from '../types';
import { 
  GraduationCap, 
  Table, 
  Sparkles, 
  BookOpen, 
  UserCheck, 
  BarChart3, 
  Code,
  FileSpreadsheet
} from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  className: string;
  teacherName: string;
  studentCount: number;
  assignmentCount: number;
  classAveragePercentage: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  className,
  teacherName,
  studentCount,
  assignmentCount,
  classAveragePercentage,
}) => {
  const formattedAvg = classAveragePercentage > 1 
    ? classAveragePercentage.toFixed(1) 
    : (classAveragePercentage * 100).toFixed(1);

  return (
    <header className="bg-[#E4E3E0] border-b-2 border-[#141414] text-[#141414] sticky top-0 z-30 no-print">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#141414] text-[#E4E3E0] border border-[#141414] shadow-[2px_2px_0px_#141414]">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black tracking-tight text-[#141414] uppercase">
                GradeBook.Pro <span className="font-mono text-xs font-normal text-[#141414]/60">[v1.0.4]</span>
              </h1>
              <span className="hd-badge">
                AI ACTIVE
              </span>
            </div>
            <p className="text-xs uppercase font-mono tracking-wider text-[#141414]/70 mt-0.5">
              Course Section: <span className="text-[#141414] font-bold">{className}</span> • Prof: <span className="text-[#141414] font-bold">{teacherName}</span> • {studentCount} Enrolled
            </p>
          </div>
        </div>

        {/* Quick Stats & AI Prompt Launcher */}
        <div className="flex items-center space-x-3 self-end md:self-auto">
          <div className="hidden sm:flex items-center space-x-2 bg-white border border-[#141414] px-3 py-1.5 text-xs shadow-[2px_2px_0px_#141414]">
            <span className="text-xs uppercase font-bold text-[#141414]/60">Class Average:</span>
            <span className="font-mono font-bold text-[#141414] text-sm">
              {formattedAvg}%
            </span>
          </div>

          <button
            id="ai-studio-prompt-btn"
            onClick={() => setActiveTab('ai-studio-prompt')}
            className={`flex items-center space-x-2 text-xs font-bold px-3 py-1.5 transition-all uppercase tracking-wider ${
              activeTab === 'ai-studio-prompt'
                ? 'bg-[#141414] text-[#E4E3E0] border border-[#141414] shadow-[2px_2px_0px_#141414]'
                : 'bg-white text-[#141414] border border-[#141414] hover:bg-[#E4E3E0] shadow-[2px_2px_0px_#141414]'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>AI Studio Schema</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#141414] overflow-x-auto no-scrollbar">
        <nav className="flex space-x-2 py-2">
          <button
            id="tab-courses-sections"
            onClick={() => setActiveTab('courses-sections')}
            className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
              activeTab === 'courses-sections'
                ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] shadow-[2px_2px_0px_#141414]'
                : 'bg-white text-[#141414] border-[#141414] hover:bg-[#E4E3E0]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>1. Courses & Roster</span>
          </button>

          <button
            id="tab-weights-config"
            onClick={() => setActiveTab('weights-config')}
            className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
              activeTab === 'weights-config'
                ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] shadow-[2px_2px_0px_#141414]'
                : 'bg-white text-[#141414] border-[#141414] hover:bg-[#E4E3E0]'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>2. Weights Setup</span>
          </button>

          <button
            id="tab-grade-scales"
            onClick={() => setActiveTab('grade-scales')}
            className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
              activeTab === 'grade-scales'
                ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] shadow-[2px_2px_0px_#141414]'
                : 'bg-white text-[#141414] border-[#141414] hover:bg-[#E4E3E0]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>3. Grade Scale</span>
          </button>

          <button
            id="tab-batch-grading"
            onClick={() => setActiveTab('batch-grading')}
            className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
              activeTab === 'batch-grading'
                ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] shadow-[2px_2px_0px_#141414]'
                : 'bg-white text-[#141414] border-[#141414] hover:bg-[#E4E3E0]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>4. Batch AI Grading</span>
          </button>

          <button
            id="tab-spreadsheet-grid"
            onClick={() => setActiveTab('spreadsheet-grid')}
            className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
              activeTab === 'spreadsheet-grid' || activeTab === 'gradebook-sheet'
                ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] shadow-[2px_2px_0px_#141414]'
                : 'bg-white text-[#141414] border-[#141414] hover:bg-[#E4E3E0]'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-emerald-600" />
            <span>5. Gradebook Matrix</span>
          </button>

          <button
            id="tab-rubrics"
            onClick={() => setActiveTab('rubrics')}
            className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
              activeTab === 'rubrics'
                ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] shadow-[2px_2px_0px_#141414]'
                : 'bg-white text-[#141414] border-[#141414] hover:bg-[#E4E3E0]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Rubrics Studio</span>
          </button>

          <button
            id="tab-individual-reports"
            onClick={() => setActiveTab('individual-reports')}
            className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
              activeTab === 'individual-reports'
                ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] shadow-[2px_2px_0px_#141414]'
                : 'bg-white text-[#141414] border-[#141414] hover:bg-[#E4E3E0]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Student Reports</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
