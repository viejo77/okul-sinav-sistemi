import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  Printer,
  School,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Info,
  CheckCircle2,
  Users,
  ChevronRight,
  ArrowRight,
  BookOpen,
  Send,
  Save,
  RotateCcw,
  X,
  Download,
  Loader2,
} from 'lucide-react';
import { Exam, Subject, BoardExamItem, ExamClassAssignment } from '../../types';
import { exportToPdf, printElementDirectly } from '../../utils/pdfExport';
import { formatPeriodWithTimes } from '../../services/periodTimes';

interface ExamScheduleSectionProps {
  exams: Exam[];
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  availableClasses: string[];
  activeExamId: string;
  setActiveExamId: (id: string) => void;
  onNavigateToExamTab: () => void;
  onNavigateToSeatingPlan?: () => void;
  onRegisterPrintHandler?: (handler: () => void) => void;
}

// Initial realistic default board exam sessions
const initialBoardSessions: BoardExamItem[] = [
  {
    id: 'bs-1',
    date: '2024-11-04',
    dayOfWeek: 'Pazartesi',
    period: 2,
    periodLabel: '2. Ders (09:30 - 10:10)',
    grade9Subject: 'Türk Dili ve Edebiyatı',
    grade10Subject: 'Türk Dili ve Edebiyatı',
    grade11Subject: 'Türk Dili ve Edebiyatı',
    grade12Subject: 'Türk Dili ve Edebiyatı',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-2',
    date: '2024-11-04',
    dayOfWeek: 'Pazartesi',
    period: 5,
    periodLabel: '5. Ders (11:50 - 12:30)',
    grade9Subject: 'Din Kültürü ve Ahlak Bilgisi',
    grade10Subject: 'Din Kültürü ve Ahlak Bilgisi',
    grade11Subject: 'Din Kültürü ve Ahlak Bilgisi',
    grade12Subject: 'Din Kültürü ve Ahlak Bilgisi',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-3',
    date: '2024-11-05',
    dayOfWeek: 'Salı',
    period: 3,
    periodLabel: '3. Ders (10:20 - 11:00)',
    grade9Subject: 'Tarih',
    grade10Subject: 'Tarih',
    grade11Subject: 'Tarih',
    grade12Subject: 'T.C. İnkılap Tarihi',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-4',
    date: '2024-11-05',
    dayOfWeek: 'Salı',
    period: 6,
    periodLabel: '6. Ders (13:10 - 13:50)',
    grade9Subject: 'Coğrafya',
    grade10Subject: 'Coğrafya',
    grade11Subject: '— (Ders İşlenecek)',
    grade12Subject: '— (Ders İşlenecek)',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-5',
    date: '2024-11-06',
    dayOfWeek: 'Çarşamba',
    period: 3,
    periodLabel: '3. Ders (10:20 - 11:00)',
    grade9Subject: 'Matematik',
    grade10Subject: 'Matematik',
    grade11Subject: 'Matematik',
    grade12Subject: 'Matematik',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-6',
    date: '2024-11-07',
    dayOfWeek: 'Perşembe',
    period: 2,
    periodLabel: '2. Ders (09:30 - 10:10)',
    grade9Subject: 'Fizik',
    grade10Subject: 'Fizik',
    grade11Subject: 'Fizik',
    grade12Subject: 'Felsefe',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-7',
    date: '2024-11-07',
    dayOfWeek: 'Perşembe',
    period: 5,
    periodLabel: '5. Ders (11:50 - 12:30)',
    grade9Subject: 'Kimya',
    grade10Subject: 'Kimya',
    grade11Subject: 'Kimya',
    grade12Subject: '— (Ders İşlenecek)',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-8',
    date: '2024-11-08',
    dayOfWeek: 'Cuma',
    period: 3,
    periodLabel: '3. Ders (10:20 - 11:00)',
    grade9Subject: 'İngilizce',
    grade10Subject: 'İngilizce',
    grade11Subject: 'İngilizce',
    grade12Subject: 'İngilizce',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-9',
    date: '2024-11-08',
    dayOfWeek: 'Cuma',
    period: 5,
    periodLabel: '5. Ders (11:50 - 12:30)',
    grade9Subject: 'Biyoloji',
    grade10Subject: 'Biyoloji',
    grade11Subject: 'Biyoloji',
    grade12Subject: '— (Ders İşlenecek)',
    examType: 'Kelebek Sistemi',
  },
];

export const ExamScheduleSection: React.FC<ExamScheduleSectionProps> = ({
  exams,
  setExams,
  subjects,
  setSubjects,
  availableClasses,
  activeExamId,
  setActiveExamId,
  onNavigateToExamTab,
  onNavigateToSeatingPlan,
  onRegisterPrintHandler,
}) => {
  const scheduleDocRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);

  // Check if embedded in an iframe (e.g. AI Studio preview)
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Pano Sınav Oturumları (Kullanıcının 10 gün önceden bağımsız hazırladığı takvim)
  const [boardSessions, setBoardSessions] = useState<BoardExamItem[]>(() => {
    try {
      const saved = localStorage.getItem('school_board_exam_schedule');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return initialBoardSessions;
  });

  // Save board sessions to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem('school_board_exam_schedule', JSON.stringify(boardSessions));
    } catch (e) {
      console.error(e);
    }
  }, [boardSessions]);

  // Pano Resmi Başlık & İdare Bilgileri
  const [schoolName, setSchoolName] = useState<string>(() => {
    return localStorage.getItem('school_name_schedule') || 'ŞEHİT MEHMET ŞENGÜL ANADOLU LİSESİ';
  });
  const [academicYearTerm, setAcademicYearTerm] = useState<string>(() => {
    return (
      localStorage.getItem('term_name_schedule') ||
      '2024-2025 EĞİTİM ÖĞRETİM YILI 1. DÖNEM 1. ORTAK SINAV TAKVİMİ'
    );
  });
  const [principalName, setPrincipalName] = useState<string>(() => {
    return localStorage.getItem('principal_name_schedule') || 'Ahmet YILMAZ';
  });
  const [vicePrincipalName, setVicePrincipalName] = useState<string>(() => {
    return localStorage.getItem('vp_name_schedule') || 'Mehmet KAYA';
  });
  // İmzaların altındaki tarih (Yıl değiştirilebilir)
  const [approvalDate, setApprovalDate] = useState<string>(() => {
    return localStorage.getItem('approval_date_schedule') || '24.10.2024';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL'); // ALL, 9, 10, 11, 12
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. High-resolution A4 PDF Export (Works 100% in all iframes and mobile browsers)
  const handleDownloadPdf = async () => {
    if (!scheduleDocRef.current) return;
    try {
      setIsExportingPdf(true);
      showToast('Pano sınav takvimi resmi A4 PDF olarak hazırlanıyor...');
      await exportToPdf(scheduleDocRef.current, {
        filename: 'Okul_Pano_Ortak_Sinav_Takvimi.pdf',
        orientation: 'portrait',
        onProgress: (current, total) => setPdfProgress({ current, total }),
      });
      showToast('✓ Pano Sınav Takvimi PDF olarak başarıyla indirildi!');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('PDF oluşturulurken bir hata oluştu.');
    } finally {
      setIsExportingPdf(false);
      setPdfProgress(null);
    }
  };

  // 2. Isolated print mode for Noticeboard Exam Schedule ONLY (Hides everything else in #root)
  const handlePrintBoardSchedule = async () => {
    if (!scheduleDocRef.current) return;
    if (isInIframe) {
      // In an iframe (AI Studio preview environment), browser security blocks window.print() modal dialogs.
      // Automatically generate and download the high-resolution print PDF directly!
      showToast('Önizleme ortamında doğrudan yazdırma yerine yazdırmaya hazır resmi A4 PDF hazırlanıyor...');
      await handleDownloadPdf();
      return;
    }

    try {
      document.body.classList.add('is-printing-board-schedule');
      const cleanUp = () => {
        document.body.classList.remove('is-printing-board-schedule');
        window.removeEventListener('afterprint', cleanUp);
      };
      window.addEventListener('afterprint', cleanUp, { once: true });
      setTimeout(cleanUp, 4000);

      printElementDirectly(scheduleDocRef.current, {
        title: 'Okul_Pano_Ortak_Sinav_Takvimi',
        landscape: false,
      });
    } catch (err) {
      console.warn('Native print failed, falling back to PDF download:', err);
      document.body.classList.remove('is-printing-board-schedule');
      await handleDownloadPdf();
    }
  };

  // Register print handler so the Navbar "Yazdır" button can invoke it when activeTab === 10
  useEffect(() => {
    if (onRegisterPrintHandler) {
      onRegisterPrintHandler(handlePrintBoardSchedule);
    }
  }, [onRegisterPrintHandler]);

  // Modal State for Adding/Editing a Session
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Form State
  const [formDate, setFormDate] = useState('2024-11-04');
  const [formDayOfWeek, setFormDayOfWeek] = useState('Pazartesi');
  const [formPeriod, setFormPeriod] = useState(2);
  const [formPeriodLabel, setFormPeriodLabel] = useState('2. Ders (09:30 - 10:10)');
  const [formG9, setFormG9] = useState('Türk Dili ve Edebiyatı');
  const [formG10, setFormG10] = useState('Türk Dili ve Edebiyatı');
  const [formG11, setFormG11] = useState('Türk Dili ve Edebiyatı');
  const [formG12, setFormG12] = useState('Türk Dili ve Edebiyatı');
  const [formExamType, setFormExamType] = useState('Kelebek Sistemi');

  // Helper: Automatically set day of week from date
  const handleDateChange = (val: string) => {
    setFormDate(val);
    try {
      const d = new Date(val);
      const dayIndex = d.getDay();
      const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      if (days[dayIndex]) {
        setFormDayOfWeek(days[dayIndex]);
      }
    } catch {
      // ignore
    }
  };

  // Open modal for new session
  const handleOpenNewSession = () => {
    setEditingSessionId(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    handleDateChange(new Date().toISOString().split('T')[0]);
    setFormPeriod(3);
    setFormPeriodLabel(formatPeriodWithTimes(3));
    setFormG9('Matematik');
    setFormG10('Matematik');
    setFormG11('Matematik');
    setFormG12('Matematik');
    setFormExamType('Kelebek Sistemi');
    setSessionModalOpen(true);
  };

  // Open modal for editing existing session
  const handleOpenEditSession = (session: BoardExamItem) => {
    setEditingSessionId(session.id);
    setFormDate(session.date);
    setFormDayOfWeek(session.dayOfWeek);
    setFormPeriod(session.period);
    setFormPeriodLabel(session.periodLabel);
    setFormG9(session.grade9Subject || '— (Ders İşlenecek)');
    setFormG10(session.grade10Subject || '— (Ders İşlenecek)');
    setFormG11(session.grade11Subject || '— (Ders İşlenecek)');
    setFormG12(session.grade12Subject || '— (Ders İşlenecek)');
    setFormExamType(session.examType || 'Kelebek Sistemi');
    setSessionModalOpen(true);
  };

  // Save session from modal
  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate) {
      showToast('Lütfen bir sınav tarihi giriniz.');
      return;
    }

    if (editingSessionId) {
      setBoardSessions(prev =>
        prev.map(s =>
          s.id === editingSessionId
            ? {
                ...s,
                date: formDate,
                dayOfWeek: formDayOfWeek,
                period: formPeriod,
                periodLabel: formPeriodLabel.trim() || `${formPeriod}. Ders`,
                grade9Subject: formG9.trim(),
                grade10Subject: formG10.trim(),
                grade11Subject: formG11.trim(),
                grade12Subject: formG12.trim(),
                examType: formExamType,
              }
            : s
        )
      );
      showToast('Sınav oturumu güncellendi.');
    } else {
      const newSession: BoardExamItem = {
        id: `bs-${Date.now()}`,
        date: formDate,
        dayOfWeek: formDayOfWeek,
        period: formPeriod,
        periodLabel: formPeriodLabel.trim() || `${formPeriod}. Ders`,
        grade9Subject: formG9.trim(),
        grade10Subject: formG10.trim(),
        grade11Subject: formG11.trim(),
        grade12Subject: formG12.trim(),
        examType: formExamType,
      };
      setBoardSessions(prev => [...prev, newSession]);
      showToast('Yeni sınav oturumu takvime eklendi.');
    }
    setSessionModalOpen(false);
  };

  // Delete session
  const handleDeleteSession = (id: string) => {
    setBoardSessions(prev => prev.filter(s => s.id !== id));
    showToast('Sınav oturumu takvimden silindi.');
  };

  // Save board settings
  const handleSaveSettings = () => {
    localStorage.setItem('school_name_schedule', schoolName);
    localStorage.setItem('term_name_schedule', academicYearTerm);
    localStorage.setItem('principal_name_schedule', principalName);
    localStorage.setItem('vp_name_schedule', vicePrincipalName);
    localStorage.setItem('approval_date_schedule', approvalDate);
    setIsSettingsOpen(false);
    showToast('Pano başlık ve onay bilgileri kaydedildi.');
  };

  // Reset to default sample board schedule
  const handleResetToSampleBoard = () => {
    setBoardSessions(initialBoardSessions);
    showToast('Pano takvimi zengin örnek okul sınav haftasıyla yenilendi.');
  };

  // Sort sessions chronologically
  const sortedSessions = useMemo(() => {
    return [...boardSessions].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (a.period || 0) - (b.period || 0);
    });
  }, [boardSessions]);

  // Format Date TR
  const formatTRDate = (isoDate: string): string => {
    if (!isoDate) return '';
    if (isoDate.includes('.')) return isoDate;
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return isoDate;
  };

  // --- 🚀 TRANSFER BOARD SCHEDULE TO EXAM PROGRAM (CRITICAL USER REQUEST) ---
  const handleTransferToExamProgram = () => {
    if (boardSessions.length === 0) {
      showToast('Aktarılacak sınav oturumu bulunamadı. Lütfen önce takvime sınav ekleyiniz.');
      return;
    }

    // 1. Collect all distinct subjects from board sessions and ensure they exist in subjects state
    const distinctSubjectNames = new Set<string>();
    boardSessions.forEach(s => {
      [s.grade9Subject, s.grade10Subject, s.grade11Subject, s.grade12Subject].forEach(name => {
        if (name && name !== '— (Ders İşlenecek)' && name !== '-' && name.trim().length > 0) {
          distinctSubjectNames.add(name.trim());
        }
      });
    });

    // Create missing subjects
    const updatedSubjects = [...subjects];
    distinctSubjectNames.forEach(subName => {
      const exists = updatedSubjects.some(
        s => s.name.trim().toLowerCase() === subName.toLowerCase()
      );
      if (!exists) {
        updatedSubjects.push({
          id: `sub-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: subName,
          code: subName.substring(0, 3).toUpperCase(),
          teachers: [],
        });
      }
    });
    setSubjects(updatedSubjects);

    // 2. Generate Exam objects for each board session
    const classesToUse =
      availableClasses.length > 0
        ? availableClasses
        : ['9-A', '9-B', '10-A', '10-B', '11-A', '11-B', '12-A'];

    const newExams: Exam[] = sortedSessions.map((session, idx) => {
      // Find primary subject name
      const primarySubjectName =
        [
          session.grade9Subject,
          session.grade10Subject,
          session.grade11Subject,
          session.grade12Subject,
        ].find(n => n && n !== '— (Ders İşlenecek)' && n !== '-') || 'Ortak Sınav';

      const foundSubject = updatedSubjects.find(
        s => s.name.trim().toLowerCase() === primarySubjectName.toLowerCase()
      );
      const subjectId = foundSubject ? foundSubject.id : updatedSubjects[0]?.id || `sub-gen-${idx}`;

      // Assign classes based on their grade level
      const assignedClasses: ExamClassAssignment[] = [];

      classesToUse.forEach(cls => {
        // e.g. "9-A" or "AMP 9-A" -> level is "9"
        let gradeSubject = '';
        if (cls.includes('9-') || cls.startsWith('9')) {
          gradeSubject = session.grade9Subject;
        } else if (cls.includes('10-') || cls.startsWith('10')) {
          gradeSubject = session.grade10Subject;
        } else if (cls.includes('11-') || cls.startsWith('11')) {
          gradeSubject = session.grade11Subject;
        } else if (cls.includes('12-') || cls.startsWith('12')) {
          gradeSubject = session.grade12Subject;
        }

        // Only assign if this grade actually has an exam
        if (
          gradeSubject &&
          gradeSubject !== '— (Ders İşlenecek)' &&
          gradeSubject !== '-' &&
          gradeSubject.trim().length > 0
        ) {
          const subObj = updatedSubjects.find(
            s => s.name.trim().toLowerCase() === gradeSubject.toLowerCase()
          );
          assignedClasses.push({
            id: `ac-${session.id}-${cls}`,
            classLevel: cls,
            subjectId: subObj ? subObj.id : subjectId,
            subjectName: gradeSubject,
          });
        }
      });

      return {
        id: `exam-board-${session.id}`,
        name: `${formatTRDate(session.date)} ${session.dayOfWeek} ${session.periodLabel} - ${primarySubjectName}`,
        date: session.date,
        dayOfWeek: session.dayOfWeek as any,
        period: session.period,
        periodLabel: session.periodLabel,
        subjectId,
        subjectName: primarySubjectName,
        assignedClasses,
      };
    });

    setExams(newExams);
    if (newExams.length > 0) {
      setActiveExamId(newExams[0].id);
    }

    showToast(
      `🎉 Pano takvimindeki ${newExams.length} sınav başarıyla Sınav Programına aktarıldı!`
    );
  };

  return (
    <div className="flex flex-col space-y-3 pb-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER & ACTION TOOLBAR (Hidden in Print) */}
      <div className="no-print bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-100 text-purple-800 font-black px-2 py-0.5 rounded text-[11px] shrink-0">
                PANO İLAN MERKEZİ
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Okul Ortak Sınav Takvimi & Pano İlanı
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sınavlardan 10 gün önce hazırlanarak öğrenci ve öğretmen panolarına asılacak resmi sınav ilanı çizelgesi.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Session */}
          <button
            onClick={handleOpenNewSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
            title="Takvime yeni gün ve sınav saati ekle"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Sınav Saati Ekle</span>
          </button>

          {/* Transfer to Exam Program Button */}
          <button
            onClick={handleTransferToExamProgram}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs shadow-md transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Takvime girdiğiniz tüm sınavları tek tıkla kelebek oturma düzeni programına aktarır"
          >
            <Send className="w-3.5 h-3.5 text-amber-300" />
            <span>Sınav Programına Aktar</span>
          </button>

          {/* School & Signature Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition cursor-pointer"
            title="Okul adı, onay tarihi, yıl ve müdür imza bilgilerini özelleştir"
          >
            <School className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pano Başlığı & İdare Onayı</span>
          </button>

          {/* Download Official A4 PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-300 text-white font-extrabold px-3.5 py-1.5 rounded-lg text-xs shadow-md transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Sadece bu sınav takvimini yüksek çözünürlüklü MEB standartlarında A4 PDF dosyası olarak indirir"
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
            ) : (
              <Download className="w-4 h-4 text-purple-200" />
            )}
            <span>
              {isExportingPdf
                ? pdfProgress
                  ? `Hazırlanıyor (${pdfProgress.current}/${pdfProgress.total})...`
                  : 'PDF Hazırlanıyor...'
                : '📥 A4 PDF İndir'}
            </span>
          </button>

          {/* Primary Print Button (Prints ONLY Noticeboard Schedule) */}
          <button
            onClick={handlePrintBoardSchedule}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold px-3.5 py-1.5 rounded-lg text-xs shadow-md transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Sadece bu takvimi yazdırır, sınav programı veya oturma planı verilerini dahil etmez"
          >
            <Printer className="w-4 h-4" />
            <span>🖨️ Panoya Asmak İçin Yazdır</span>
          </button>
        </div>
      </div>

      {/* 2. CUSTOMIZABLE SCHOOL HEADER SETTINGS ACCORDION (No Print) */}
      {isSettingsOpen && (
        <div className="no-print bg-indigo-50/70 border-2 border-indigo-200 rounded-xl p-4 text-xs space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-indigo-950 flex items-center gap-2">
              <School className="w-4 h-4 text-indigo-600" />
              <span>Resmi Pano İlanı & İdare Onay Bilgileri</span>
            </h4>
            <span className="text-[11px] text-indigo-700 font-medium">
              İmza altındaki tarih ve yıl dahil tüm bilgiler değiştirilebilir.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">Okul Adı:</label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                placeholder="Örn: ŞEHİT MEHMET ŞENGÜL ANADOLU LİSESİ"
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-slate-700 font-bold mb-1">Dönem & Sınav Başlığı:</label>
              <input
                type="text"
                value={academicYearTerm}
                onChange={e => setAcademicYearTerm(e.target.value)}
                placeholder="Örn: 2024-2025 EĞİTİM ÖĞRETİM YILI 1. DÖNEM 1. ORTAK SINAV TAKVİMİ"
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">İnceleyen (Müdür Yrd.):</label>
              <input
                type="text"
                value={vicePrincipalName}
                onChange={e => setVicePrincipalName(e.target.value)}
                placeholder="Örn: Mehmet KAYA"
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Onaylayan (Okul Müdürü):</label>
              <input
                type="text"
                value={principalName}
                onChange={e => setPrincipalName(e.target.value)}
                placeholder="Örn: Ahmet YILMAZ"
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Editable Approval Date / Year */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                İmza & Onay Tarihi (Yıl/Tarih):
              </label>
              <input
                type="text"
                value={approvalDate}
                onChange={e => setApprovalDate(e.target.value)}
                placeholder="24.10.2024"
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="flex items-end gap-2 lg:col-span-2">
              <button
                onClick={handleResetToSampleBoard}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold transition"
                title="Varsayılan örnek sınav haftası oturumlarını yükler"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Örnek Sınav Haftasını Yükle</span>
              </button>

              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-2xs transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SYNC BANNER WITH EXAM PROGRAM */}
      <div className="no-print bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="font-extrabold text-slate-900">
              Pano Takvimindeki Sınavları Oturma Düzeni Programına Aktarın
            </div>
            <div className="text-slate-500 text-[11px]">
              Panoya asmak için belirlediğiniz bu dersleri <strong>&quot;Sınav Programına Aktar&quot;</strong> butonuna basarak tek tıkla kelebek oturma düzeni motoruna gönderebilirsiniz.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTransferToExamProgram}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Takvimi Sınav Programına Aktar</span>
          </button>

          {onNavigateToSeatingPlan && (
            <button
              onClick={onNavigateToSeatingPlan}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition cursor-pointer"
            >
              <span>5. Oturma Düzenine Git</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. OFFICIAL NOTICEBOARD PRINTABLE DOCUMENT (A4 Optimized) */}
      <div
        id="board-schedule-print-document"
        ref={scheduleDocRef}
        data-pdf-page="true"
        data-orientation="portrait"
        className="bg-white rounded-2xl border-2 border-slate-300 p-6 sm:p-8 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 print:w-full"
      >
        {/* Printable Official School Header */}
        <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
          <div className="text-xs font-bold tracking-widest text-slate-700 uppercase">
            T.C. MİLLÎ EĞİTİM BAKANLIĞI
          </div>
          <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase mt-0.5">
            {schoolName} MÜDÜRLÜĞÜ
          </div>
          <div className="inline-block bg-slate-900 text-white font-black text-xs sm:text-sm px-4 py-1 rounded-full uppercase tracking-wide mt-2">
            {academicYearTerm}
          </div>
          <div className="text-[11px] font-bold text-purple-900 tracking-wider uppercase mt-1.5">
            📢 ÖĞRENCİ VE ÖĞRETMEN DUYURU PANOSU SINAV İLAN ÇİZELGESİ
          </div>
        </div>

        {/* Master Noticeboard Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-slate-800 text-xs">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-800 text-slate-900 font-black text-center uppercase tracking-wider text-[11px]">
                <th className="border border-slate-800 p-2 w-10">S.No</th>
                <th className="border border-slate-800 p-2 w-32">Sınav Tarihi & Gün</th>
                <th className="border border-slate-800 p-2 w-36">Ders Saati</th>
                <th className="border border-slate-800 p-2 font-black">9. Sınıflar</th>
                <th className="border border-slate-800 p-2 font-black">10. Sınıflar</th>
                <th className="border border-slate-800 p-2 font-black">11. Sınıflar</th>
                <th className="border border-slate-800 p-2 font-black">12. Sınıflar</th>
                <th className="border border-slate-800 p-2 w-28">Sınav Şekli</th>
                <th className="border border-slate-800 p-2 w-20 no-print">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sortedSessions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                    Henüz takvime sınav oturumu eklenmedi. Yukarıdaki <strong>&quot;+ Sınav Saati Ekle&quot;</strong> butonuna basarak ilk sınavınızı ekleyebilirsiniz.
                  </td>
                </tr>
              ) : (
                sortedSessions.map((session, idx) => {
                  return (
                    <tr
                      key={session.id}
                      className="hover:bg-purple-50/30 transition text-center font-medium"
                    >
                      <td className="border border-slate-800 p-2 font-mono font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-800 p-2 font-bold text-slate-900 bg-slate-50/60">
                        <div>{formatTRDate(session.date)}</div>
                        <div className="text-[11px] text-purple-700 font-extrabold">
                          {session.dayOfWeek}
                        </div>
                      </td>
                      <td className="border border-slate-800 p-2 font-black text-indigo-950">
                        <div className="bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md text-[11.5px]">
                          {session.periodLabel}
                        </div>
                      </td>

                      {/* 9. Sınıf */}
                      <td
                        className={`border border-slate-800 p-2 text-center ${
                          session.grade9Subject && session.grade9Subject !== '— (Ders İşlenecek)'
                            ? 'bg-amber-50/60 font-black text-slate-900'
                            : 'bg-slate-50/30 text-slate-400 italic'
                        }`}
                      >
                        {session.grade9Subject || '— (Ders İşlenecek)'}
                      </td>

                      {/* 10. Sınıf */}
                      <td
                        className={`border border-slate-800 p-2 text-center ${
                          session.grade10Subject && session.grade10Subject !== '— (Ders İşlenecek)'
                            ? 'bg-amber-50/60 font-black text-slate-900'
                            : 'bg-slate-50/30 text-slate-400 italic'
                        }`}
                      >
                        {session.grade10Subject || '— (Ders İşlenecek)'}
                      </td>

                      {/* 11. Sınıf */}
                      <td
                        className={`border border-slate-800 p-2 text-center ${
                          session.grade11Subject && session.grade11Subject !== '— (Ders İşlenecek)'
                            ? 'bg-amber-50/60 font-black text-slate-900'
                            : 'bg-slate-50/30 text-slate-400 italic'
                        }`}
                      >
                        {session.grade11Subject || '— (Ders İşlenecek)'}
                      </td>

                      {/* 12. Sınıf */}
                      <td
                        className={`border border-slate-800 p-2 text-center ${
                          session.grade12Subject && session.grade12Subject !== '— (Ders İşlenecek)'
                            ? 'bg-amber-50/60 font-black text-slate-900'
                            : 'bg-slate-50/30 text-slate-400 italic'
                        }`}
                      >
                        {session.grade12Subject || '— (Ders İşlenecek)'}
                      </td>

                      <td className="border border-slate-800 p-2 text-[11px] font-bold text-slate-700 bg-slate-50/50">
                        {session.examType || 'Kelebek Sistemi'}
                      </td>

                      {/* Row Actions (No Print) */}
                      <td className="border border-slate-800 p-2 no-print">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditSession(session)}
                            className="p-1 hover:bg-indigo-100 text-indigo-700 rounded transition"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-1 hover:bg-rose-100 text-rose-700 rounded transition"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Official MEB Noticeboard Rules Box */}
        <div className="mt-6 border-2 border-slate-800 rounded-xl p-4 bg-slate-50 text-[11px] leading-relaxed text-slate-800">
          <div className="font-black uppercase text-xs text-slate-900 mb-2 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-700" />
            <span>ÖĞRENCİ VE VELİLERİMİZ İÇİN ÖNEMLİ ORTAK SINAV UYGULAMA KURALLARI:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 font-medium text-slate-700 pl-1">
            <li>
              Ortak sınavlar okul genelinde <strong>Kelebek (Karma) Oturma Düzeni</strong> ile yapılmaktadır. Öğrenciler kendi sınıflarında değil, her sınav öncesinde okul panosuna ve kapılara asılan <strong>Salon Yerleşim Çizelgesinde</strong> ilan edilen salonda ve belirlenen sıra numarasında sınava gireceklerdir.
            </li>
            <li>
              Öğrencilerimizin sınav başlama saatinden en az <strong>10 dakika önce</strong> ilgili sınav salonunda hazır bulunmaları gerekmektedir.
            </li>
            <li>
              Sınav salonlarına cep telefonu, akıllı saat, kulaklık ve her türlü elektronik iletişim aracı sokulması kesinlikle yasaktır.
            </li>
            <li>
              Öğrencilerimiz yanlarında geçerli kimlik belgesi, kurşun kalem, silgi ve kalemtıraş bulundurmakla yükümlüdür. Sınav esnasında araç-gereç alışverişi yapılamaz.
            </li>
            <li>
              Sağlık raporu olan öğrencilerin mazeret sınavları, MEB Ortaöğretim Kurumları Yönetmeliği uyarınca okul idaresi ve zümre öğretmenlerince ilan edilecek tarihlerde yapılacaktır.
            </li>
          </ol>
        </div>

        {/* Official Signatures & Seal Area (With Editable Year and Date) */}
        <div className="mt-8 pt-4 border-t-2 border-slate-800 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="text-slate-600 font-semibold">İnceleyen / Düzenleyen</div>
            <div className="font-black text-slate-900 text-sm mt-1">{vicePrincipalName}</div>
            <div className="text-[11px] text-slate-500 font-medium">Müdür Yardımcısı</div>
            {/* Editable Date under signature */}
            <div className="mt-6 font-mono text-[11px] text-slate-800 font-bold">
              {approvalDate}
            </div>
            <div className="text-slate-400 text-[10px]">İmza</div>
          </div>

          <div>
            <div className="text-slate-600 font-semibold">UYGUNDUR / ONAY</div>
            <div className="font-black text-slate-900 text-sm mt-1">{principalName}</div>
            <div className="text-[11px] text-slate-500 font-medium">Okul Müdürü</div>
            {/* Editable Date under signature */}
            <div className="mt-6 font-mono text-[11px] text-slate-800 font-bold">
              {approvalDate}
            </div>
            <div className="text-slate-400 text-[10px]">İmza - Mühür</div>
          </div>
        </div>
      </div>

      {/* 5. ADD / EDIT SESSION MODAL */}
      {sessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-300" />
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  {editingSessionId ? 'Sınav Saati Oturumunu Düzenle' : 'Takvime Yeni Sınav Saati Ekle'}
                </h3>
              </div>
              <button
                onClick={() => setSessionModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="p-5 space-y-3.5 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date Input with picker */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Sınav Tarihi:
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => handleDateChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    required
                  />
                </div>

                {/* Day of Week */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Gün Adı:</label>
                  <select
                    value={formDayOfWeek}
                    onChange={e => setFormDayOfWeek(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
                  >
                    <option value="Pazartesi">Pazartesi</option>
                    <option value="Salı">Salı</option>
                    <option value="Çarşamba">Çarşamba</option>
                    <option value="Perşembe">Perşembe</option>
                    <option value="Cuma">Cuma</option>
                    <option value="Cumartesi">Cumartesi</option>
                    <option value="Pazar">Pazar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Period Number */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ders Saati No:</label>
                  <select
                    value={formPeriod}
                    onChange={e => {
                      const p = parseInt(e.target.value, 10);
                      setFormPeriod(p);
                      setFormPeriodLabel(formatPeriodWithTimes(p));
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>
                        {num}. Ders Saati
                      </option>
                    ))}
                  </select>
                </div>

                {/* Period Label */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Ders Saati Etiketi & Saat Aralığı:
                  </label>
                  <input
                    type="text"
                    value={formPeriodLabel}
                    onChange={e => setFormPeriodLabel(e.target.value)}
                    placeholder="2. Ders (09:30 - 10:10)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Grade-specific subjects */}
              <div className="border border-purple-200 rounded-xl p-3 bg-purple-50/50 space-y-2.5">
                <span className="font-extrabold text-purple-950 block text-[11.5px]">
                  Bu Ders Saatinde Sınavı Yapılacak Dersler (Her Kademe İçin):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 font-bold mb-0.5">
                      9. Sınıfların Sınav Dersi:
                    </label>
                    <input
                      type="text"
                      value={formG9}
                      onChange={e => setFormG9(e.target.value)}
                      placeholder="Örn: Türk Dili ve Edebiyatı (veya —)"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-0.5">
                      10. Sınıfların Sınav Dersi:
                    </label>
                    <input
                      type="text"
                      value={formG10}
                      onChange={e => setFormG10(e.target.value)}
                      placeholder="Örn: Türk Dili ve Edebiyatı (veya —)"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-0.5">
                      11. Sınıfların Sınav Dersi:
                    </label>
                    <input
                      type="text"
                      value={formG11}
                      onChange={e => setFormG11(e.target.value)}
                      placeholder="Örn: Türk Dili ve Edebiyatı (veya —)"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-0.5">
                      12. Sınıfların Sınav Dersi:
                    </label>
                    <input
                      type="text"
                      value={formG12}
                      onChange={e => setFormG12(e.target.value)}
                      placeholder="Örn: Türk Dili ve Edebiyatı (veya —)"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 italic">
                  * Eğer bir kademenin o saatte sınavı yoksa <strong>— (Ders İşlenecek)</strong> yazabilirsiniz.
                </div>
              </div>

              {/* Exam Type */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Sınav Şekli:</label>
                <select
                  value={formExamType}
                  onChange={e => setFormExamType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="Kelebek Sistemi">Kelebek Sistemi (Karma Salon Dağıtımı)</option>
                  <option value="Ortak Sınav">Ortak Sınav (Kendi Sınıfında)</option>
                  <option value="Ülke Geneli Ortak Sınav">MEB Ülke Geneli Ortak Sınav</option>
                  <option value="İl Geneli Ortak Sınav">İl Geneli Ortak Sınav</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSessionModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-2xs transition"
                >
                  {editingSessionId ? 'Güncelle' : 'Takvime Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
