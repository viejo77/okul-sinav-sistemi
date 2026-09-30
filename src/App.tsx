import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardSection } from './components/sections/DashboardSection';
import { ExamDefinitionSection } from './components/sections/ExamDefinitionSection';
import { StudentListSection } from './components/sections/StudentListSection';
import { ClassroomManagementSection } from './components/sections/ClassroomManagementSection';
import { SupervisorScheduleSection } from './components/sections/SupervisorScheduleSection';
import { SeatingPlanSection } from './components/sections/SeatingPlanSection';
import { ClassDistributionsSection } from './components/sections/ClassDistributionsSection';
import { ExamAnalysisSection } from './components/sections/ExamAnalysisSection';
import { PrintCenterSection } from './components/sections/PrintCenterSection';
import { ResponsibilityExamSection } from './components/sections/ResponsibilityExamSection';
import { PrintPreviewModal } from './components/modals/PrintPreviewModal';
import { HelpTipsModal } from './components/modals/HelpTipsModal';
import { FloatingHelpWidget } from './components/FloatingHelpWidget';

import { SalonSeatingPrint } from './components/print/SalonSeatingPrint';
import { SupervisorListPrint } from './components/print/SupervisorListPrint';
import { BEPStudentPrint } from './components/print/BEPStudentPrint';
import { ClassDoorListsPrint } from './components/print/ClassDoorListsPrint';

import {
  Printer,
  FileText,
  Download,
  Users,
  ShieldCheck,
  DoorClosed,
  Layers,
  Sparkles,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import {
  Exam,
  Student,
  Classroom,
  Teacher,
  Subject,
  SeatingPlanResult,
  ResponsibilityExam,
  ResponsibilitySettings,
} from './types';
import {
  loadAppState,
  saveAppState,
  exportBackupFile,
  importBackupFile,
  clearAllData,
} from './services/storage';
import {
  getInitialMockData,
  initialResponsibilitySettings,
  generateInitialResponsibilityExams,
} from './services/mockData';
import {
  signInWithGoogle,
  signOutGoogle,
  onAuthStateChange,
} from './services/googleAuth';
import { User } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [user, setUser] = useState<User | null>(null);

  // Core Data States
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeExamId, setActiveExamId] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [currentPlan, setCurrentPlan] = useState<SeatingPlanResult | undefined>(undefined);
  const [responsibilityExams, setResponsibilityExams] = useState<ResponsibilityExam[]>([]);
  const [responsibilitySettings, setResponsibilitySettings] =
    useState<ResponsibilitySettings>(initialResponsibilitySettings);

  // Print modal state
  const [printModalMode, setPrintModalMode] = useState<
    'SALON' | 'SUPERVISOR' | 'BEP' | 'CLASSES' | 'ALL' | null
  >(null);

  // Help & Tips modal state
  const [helpModalOpen, setHelpModalOpen] = useState<boolean>(false);

  // In-app confirmation dialog (replaces window.confirm/alert which are blocked in iframes)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Global Keyboard Shortcuts (? for help, 1-7 for sections)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Do not trigger if typing in an input, textarea or contenteditable element
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // '?' key opens/closes help guide
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setHelpModalOpen(prev => !prev);
      }

      // Numeric keys 0-9 switch tabs quickly when no modifier keys are pressed
      if (
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)
      ) {
        setActiveTab(parseInt(e.key, 10));
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // 1. Initial Load from LocalStorage or seed with Mock Data
  useEffect(() => {
    const saved = loadAppState();
    if (saved && saved.exams && saved.exams.length > 0) {
      setExams(saved.exams);
      setActiveExamId(saved.activeExamId || saved.exams[0].id);
      setSubjects(saved.subjects || []);
      setStudents(saved.students || []);
      setClassrooms(saved.classrooms || []);
      setTeachers(saved.teachers || []);
      setCurrentPlan(saved.lastPlan);
      setResponsibilitySettings(saved.responsibilitySettings || initialResponsibilitySettings);
      setResponsibilityExams(
        saved.responsibilityExams || generateInitialResponsibilityExams(saved.students || [])
      );
    } else {
      // Seed with initial realistic high school dataset
      const mock = getInitialMockData();
      setExams(mock.exams);
      setActiveExamId(mock.exams[0].id);
      setSubjects(mock.subjects);
      setStudents(mock.students);
      setClassrooms(mock.classrooms);
      setTeachers(mock.teachers);
      setCurrentPlan(mock.samplePlan);
      setResponsibilitySettings(mock.responsibilitySettings || initialResponsibilitySettings);
      setResponsibilityExams(
        mock.responsibilityExams || generateInitialResponsibilityExams(mock.students)
      );
      saveAppState({
        exams: mock.exams,
        activeExamId: mock.exams[0].id,
        subjects: mock.subjects,
        students: mock.students,
        classrooms: mock.classrooms,
        teachers: mock.teachers,
        lastPlan: mock.samplePlan,
        responsibilitySettings: mock.responsibilitySettings || initialResponsibilitySettings,
        responsibilityExams:
          mock.responsibilityExams || generateInitialResponsibilityExams(mock.students),
      });
    }

    // Google Auth listener
    const unsubscribe = onAuthStateChange(firebaseUser => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. Persist to LocalStorage whenever state changes
  useEffect(() => {
    if (
      exams.length > 0 ||
      students.length > 0 ||
      classrooms.length > 0 ||
      responsibilityExams.length > 0
    ) {
      saveAppState({
        exams,
        activeExamId,
        subjects,
        students,
        classrooms,
        teachers,
        lastPlan: currentPlan,
        responsibilityExams,
        responsibilitySettings,
      });
    }
  }, [
    exams,
    activeExamId,
    subjects,
    students,
    classrooms,
    teachers,
    currentPlan,
    responsibilityExams,
    responsibilitySettings,
  ]);

  // Active exam & subject helpers
  const activeExam = exams.find(e => e.id === activeExamId) || exams[0];
  const activeSubject = subjects.find(s => s.id === activeExam?.subjectId);

  // Available unique class list (e.g. ["9-A", "9-B", "10-A", "10-B", "11-A", "11-B", "12-A"])
  const availableClasses = Array.from(
    new Set(students.map(s => s.classLevel.toUpperCase()))
  ).sort((a, b) => a.localeCompare(b, 'tr'));

  // Auth Handlers
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Sign In error:', err);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutGoogle();
      setUser(null);
    } catch (err) {
      console.error('Google Sign Out error:', err);
    }
  };

  // Demo Data Reset / Load
  const handleLoadDemoData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Örnek Okul Verisi Yükle',
      message:
        'Tüm mevcut veriler sıfırlanıp zengin örnek okul sınav ve sorumluluk verisi yüklenecektir. Onaylıyor musunuz?',
      confirmText: 'Evet, Demo Veri Yükle',
      isDanger: false,
      onConfirm: () => {
        const mock = getInitialMockData();
        setExams(mock.exams);
        setActiveExamId(mock.exams[0].id);
        setSubjects(mock.subjects);
        setStudents(mock.students);
        setClassrooms(mock.classrooms);
        setTeachers(mock.teachers);
        setCurrentPlan(mock.samplePlan);
        setResponsibilitySettings(mock.responsibilitySettings || initialResponsibilitySettings);
        setResponsibilityExams(
          mock.responsibilityExams || generateInitialResponsibilityExams(mock.students)
        );
        saveAppState({
          exams: mock.exams,
          activeExamId: mock.exams[0].id,
          subjects: mock.subjects,
          students: mock.students,
          classrooms: mock.classrooms,
          teachers: mock.teachers,
          lastPlan: mock.samplePlan,
          responsibilitySettings: mock.responsibilitySettings || initialResponsibilitySettings,
          responsibilityExams:
            mock.responsibilityExams || generateInitialResponsibilityExams(mock.students),
        });
        setConfirmDialog(null);
      },
    });
  };

  const handleResetData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Tüm Verileri Sıfırla',
      message:
        'Tüm sınav, öğrenci, salon, gözetmen ve sorumluluk verileri tamamen silinecektir. Devam etmek istiyor musunuz?',
      confirmText: 'Evet, Tümünü Temizle',
      isDanger: true,
      onConfirm: () => {
        clearAllData();
        setExams([]);
        setActiveExamId('');
        setSubjects([]);
        setStudents([]);
        setClassrooms([]);
        setTeachers([]);
        setCurrentPlan(undefined);
        setResponsibilityExams([]);
        setResponsibilitySettings(initialResponsibilitySettings);
        setConfirmDialog(null);
      },
    });
  };

  const handleExportBackup = () => {
    exportBackupFile();
  };

  const handleImportBackup = async (file: File) => {
    try {
      const data = await importBackupFile(file);
      setExams(data.exams || []);
      setActiveExamId(data.activeExamId || (data.exams && data.exams[0]?.id) || '');
      setSubjects(data.subjects || []);
      setStudents(data.students || []);
      setClassrooms(data.classrooms || []);
      setTeachers(data.teachers || []);
      setCurrentPlan(data.lastPlan);
      if (data.responsibilitySettings) {
        setResponsibilitySettings(data.responsibilitySettings);
      }
      if (data.responsibilityExams) {
        setResponsibilityExams(data.responsibilityExams);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 antialiased flex flex-col justify-between overflow-x-hidden w-full">
      {/* Navbar & Navigation */}
      <div className="no-print">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          exams={exams}
          activeExamId={activeExamId}
          setActiveExamId={setActiveExamId}
          user={user}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignOut={handleGoogleSignOut}
          onLoadDemoData={handleLoadDemoData}
          onResetData={handleResetData}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onOpenHelpTips={() => setHelpModalOpen(true)}
          onOpenPrintModal={() => setPrintModalMode('SALON')}
        />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 w-full flex-1">
          {activeTab === 0 && (
            <DashboardSection
              exams={exams}
              activeExam={activeExam}
              activeExamId={activeExamId}
              setActiveExamId={setActiveExamId}
              subjects={subjects}
              students={students}
              classrooms={classrooms}
              teachers={teachers}
              currentPlan={currentPlan}
              onNavigateTab={setActiveTab}
              onOpenPrintModal={mode => setPrintModalMode(mode)}
            />
          )}

          {activeTab === 1 && (
            <ExamDefinitionSection
              exams={exams}
              setExams={setExams}
              activeExamId={activeExamId}
              setActiveExamId={setActiveExamId}
              subjects={subjects}
              setSubjects={setSubjects}
              availableClasses={availableClasses}
            />
          )}

          {activeTab === 2 && (
            <StudentListSection
              students={students}
              setStudents={setStudents}
              availableClasses={availableClasses}
              activeExam={activeExam}
            />
          )}

          {activeTab === 3 && (
            <ClassroomManagementSection
              classrooms={classrooms}
              setClassrooms={setClassrooms}
              activeExam={activeExam}
              students={students}
            />
          )}

          {activeTab === 4 && (
            <SupervisorScheduleSection
              teachers={teachers}
              setTeachers={setTeachers}
              activeExam={activeExam}
              subjects={subjects}
              classrooms={classrooms}
            />
          )}

          {activeTab === 5 && (
            <SeatingPlanSection
              activeExam={activeExam}
              subject={activeSubject}
              students={students}
              classrooms={classrooms}
              teachers={teachers}
              currentPlan={currentPlan}
              setCurrentPlan={setCurrentPlan}
              onOpenPrintModal={mode => setPrintModalMode(mode)}
              onGoToAnalysis={() => setActiveTab(7)}
            />
          )}

          {activeTab === 6 && (
            <ClassDistributionsSection
              plan={currentPlan}
              onOpenPrintModal={mode => setPrintModalMode(mode)}
            />
          )}

          {activeTab === 7 && (
            <ExamAnalysisSection
              plan={currentPlan}
              teachers={teachers}
              activeExam={activeExam}
              onGoToPlan={() => setActiveTab(5)}
              onOpenPrintModal={mode => setPrintModalMode(mode)}
            />
          )}

          {activeTab === 8 && (
            <PrintCenterSection
              plan={currentPlan}
              onOpenPrintModal={mode => setPrintModalMode(mode)}
              onGoToPlan={() => setActiveTab(5)}
            />
          )}

          {activeTab === 9 && (
            <ResponsibilityExamSection
              responsibilityExams={responsibilityExams}
              setResponsibilityExams={setResponsibilityExams}
              responsibilitySettings={responsibilitySettings}
              setResponsibilitySettings={setResponsibilitySettings}
              students={students}
              teachers={teachers}
              classrooms={classrooms}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-1.5 px-4 mt-1.5 text-center text-[11px] text-slate-500 shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1">
            <div className="font-semibold text-slate-700">
              Kelebek Sınav Sistemi • Okul Ortak Sınav Dağıtım ve Oturma Düzeni
            </div>
            <div className="text-slate-400">
              Veriler yerel tarayıcıda depolanır. Google E-Tablolar & Excel tam uyumludur.
            </div>
          </div>
        </footer>
      </div>

      {/* Floating Quick Helper Widget (Context-aware for active tab) */}
      <FloatingHelpWidget
        activeTab={activeTab}
        onOpenFullGuide={() => setHelpModalOpen(true)}
      />

      {/* Comprehensive Help Tips & Workflow Guide Modal */}
      <HelpTipsModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        activeTab={activeTab}
        onSelectTab={tabId => setActiveTab(tabId)}
      />

      {/* Print Preview Modal */}
      {printModalMode && currentPlan && (
        <PrintPreviewModal
          initialMode={printModalMode}
          plan={currentPlan}
          onClose={() => setPrintModalMode(null)}
        />
      )}

      {/* Default Print Output (Active when window.print() is called outside modal) */}
      {currentPlan && (
        <div className="print-only">
          <SalonSeatingPrint plan={currentPlan} forPrint={true} />
          <SupervisorListPrint plan={currentPlan} forPrint={true} />
          <BEPStudentPrint plan={currentPlan} forPrint={true} />
          <ClassDoorListsPrint plan={currentPlan} forPrint={true} />
        </div>
      )}

      {/* Global In-App Confirmation Modal (Iframe safe) */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{confirmDialog.title}</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition shadow-xs cursor-pointer flex items-center gap-1.5 ${
                  confirmDialog.isDanger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <span>{confirmDialog.confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
