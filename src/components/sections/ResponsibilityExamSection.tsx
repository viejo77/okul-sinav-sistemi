import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  Clock,
  DoorClosed,
  Plus,
  Printer,
  Search,
  Trash2,
  Users,
  Edit2,
  CheckCircle2,
  AlertCircle,
  School,
  FileCheck,
  Sparkles,
  ShieldCheck,
  UserPlus,
  X,
  FileSpreadsheet,
  Download,
  Info,
  Package,
  Layers,
  CheckSquare,
  Square,
  Check,
  Filter,
} from 'lucide-react';
import {
  ResponsibilityExam,
  ResponsibilitySettings,
  ResponsibilityStudent,
  Student,
  Teacher,
  Classroom,
} from '../../types';
import { ResponsibilityPrintModal } from '../modals/ResponsibilityPrintModal';
import { ResponsibilityDocType } from '../print/ResponsibilityExamPrint';

/**
 * Extracts numeric grade level: "9. Sınıf" -> 9, "10-A" -> 10, "AMP 11-B" -> 11, "ATP 12-C" -> 12
 */
export const parseGradeNumber = (str: string): number | null => {
  if (!str) return null;
  const match = str.match(/(?:^|[^\d])(9|10|11|12)(?:[^\d]|$)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
};

/**
 * MEB Ortaöğretim Sorumluluk Sınavı Kuralları:
 * - Öğrenci yalnızca önceki yıllardan sorumlu olduğu (alt kademedeki) derslerin sınavına girebilir.
 * - 9. sınıf dersine: 10, 11, 12. sınıflar girebilir (9'lar henüz almakta olduğu için giremez).
 * - 10. sınıf dersine: 11, 12. sınıflar girebilir (10 ve 9'lar giremez).
 * - 11. sınıf dersine: 12. sınıflar girebilir (11, 10, 9'lar giremez).
 * - 12. sınıf dersine: 12. sınıf (beklemeli/kalan) öğrenciler girebilir.
 */
export const isStudentEligibleForResponsibilityExam = (
  studentClassLevel: string,
  examGradeLevel: string
): boolean => {
  const examGrade = parseGradeNumber(examGradeLevel);
  const studentGrade = parseGradeNumber(studentClassLevel);

  if (examGrade === null || studentGrade === null) {
    return true; // Bilinmeyen formatlarda engelleme yapma
  }

  // 12. sınıf dersi sorumluluğuna yalnızca 12. sınıf (beklemeli/tekrar) girebilir
  if (examGrade >= 12) {
    return studentGrade >= 12;
  }

  // 9. sınıf dersine 10, 11, 12 girebilir (studentGrade > 9)
  // 10. sınıf dersine 11, 12 girebilir (studentGrade > 10)
  // 11. sınıf dersine 12 girebilir (studentGrade > 11)
  return studentGrade > examGrade;
};

export const getEligibleGradesSummary = (examGradeLevel: string): string => {
  const examGrade = parseGradeNumber(examGradeLevel);
  if (examGrade === 9) return '10, 11 ve 12. Sınıflar';
  if (examGrade === 10) return '11 ve 12. Sınıflar';
  if (examGrade === 11) return '12. Sınıflar';
  if (examGrade === 12) return '12. Sınıf (Beklemeli)';
  return 'Üst Sınıflar';
};

export const getEligibleGradesDescription = (
  examGradeLevel: string
): { title: string; subtitle: string } => {
  const examGrade = parseGradeNumber(examGradeLevel);
  if (examGrade === 9) {
    return {
      title: 'Yalnızca 10, 11 ve 12. Sınıf Öğrencileri Girebilir',
      subtitle: '9. sınıf öğrencileri bu dersi henüz almakta olduğundan 9. sınıf sorumluluk sınavına katılamazlar.',
    };
  }
  if (examGrade === 10) {
    return {
      title: 'Yalnızca 11 ve 12. Sınıf Öğrencileri Girebilir',
      subtitle: '10. sınıf ve 9. sınıf öğrencileri 10. sınıf sorumluluk sınavına katılamazlar.',
    };
  }
  if (examGrade === 11) {
    return {
      title: 'Yalnızca 12. Sınıf Öğrencileri Girebilir',
      subtitle: '11, 10 ve 9. sınıf öğrencileri 11. sınıf sorumluluk sınavına katılamazlar.',
    };
  }
  if (examGrade === 12) {
    return {
      title: 'Yalnızca 12. Sınıf (Beklemeli/Kalan) Öğrencileri Girebilir',
      subtitle: 'Alt sınıflardaki (9, 10, 11) öğrenciler 12. sınıf sorumluluk sınavına katılamazlar.',
    };
  }
  return {
    title: 'Yalnızca Üst Sınıf Öğrencileri Girebilir',
    subtitle: 'Öğrenciler yalnızca önceki yıllarda sorumlu kaldıkları alt kademe derslerinin sınavına katılabilir.',
  };
};

interface Props {
  responsibilityExams: ResponsibilityExam[];
  setResponsibilityExams: React.Dispatch<React.SetStateAction<ResponsibilityExam[]>>;
  responsibilitySettings: ResponsibilitySettings;
  setResponsibilitySettings: React.Dispatch<React.SetStateAction<ResponsibilitySettings>>;
  students: Student[];
  teachers: Teacher[];
  classrooms: Classroom[];
}

export const ResponsibilityExamSection: React.FC<Props> = ({
  responsibilityExams,
  setResponsibilityExams,
  responsibilitySettings,
  setResponsibilitySettings,
  students,
  teachers,
  classrooms,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(
    responsibilityExams[0]?.id || ''
  );
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');

  // Student area search, filter and selection states
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');
  const [studentClassFilter, setStudentClassFilter] = useState<string>('ALL');
  const [studentResultFilter, setStudentResultFilter] = useState<string>('ALL');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Reset student selection and filters when active exam changes
  useEffect(() => {
    setSelectedStudentIds(new Set());
    setStudentSearchTerm('');
    setStudentClassFilter('ALL');
    setStudentResultFilter('ALL');
  }, [selectedExamId]);

  // Modals state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printModalDocType, setPrintModalDocType] = useState<ResponsibilityDocType>('ALL_DOCUMENTS');
  const [isExamModalOpen, setIsExamModalOpen] = useState<boolean>(false);
  const [editingExam, setEditingExam] = useState<ResponsibilityExam | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState<boolean>(false);
  const [examToDelete, setExamToDelete] = useState<ResponsibilityExam | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenPrintModal = (type: ResponsibilityDocType = 'ALL_DOCUMENTS') => {
    setPrintModalDocType(type);
    setIsPrintModalOpen(true);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Quick stats for Evrak Merkezi
  const totalTeachersWithDuty = useMemo(() => {
    const set = new Set<string>();
    responsibilityExams.forEach(ex => {
      ex.commissionMembers.forEach(m => m && set.add(m.trim()));
      if (ex.supervisorName) set.add(ex.supervisorName.trim());
    });
    return set.size;
  }, [responsibilityExams]);

  const totalExamDatesCount = useMemo(() => {
    const set = new Set<string>();
    responsibilityExams.forEach(ex => {
      if (ex.examDate) set.add(ex.examDate.trim());
    });
    return set.size;
  }, [responsibilityExams]);

  const totalStudentsRegistered = useMemo(() => {
    return responsibilityExams.reduce((acc, ex) => acc + ex.students.length, 0);
  }, [responsibilityExams]);

  // Form states for Exam Modal
  const [formSubject, setFormSubject] = useState<string>('');
  const [formGradeLevel, setFormGradeLevel] = useState<string>('9. Sınıf');
  const [formDate, setFormDate] = useState<string>('18.09.2024');
  const [formTime, setFormTime] = useState<string>('10:00');
  const [formClassroom, setFormClassroom] = useState<string>('');
  const [formMember1, setFormMember1] = useState<string>('');
  const [formMember2, setFormMember2] = useState<string>('');
  const [formSupervisor, setFormSupervisor] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Form state for Settings Modal
  const [settingsSchool, setSettingsSchool] = useState<string>(responsibilitySettings.schoolName);
  const [settingsDistrict, setSettingsDistrict] = useState<string>(
    responsibilitySettings.districtName || 'MELİKGAZİ KAYMAKAMLIĞI'
  );
  const [settingsPrincipal, setSettingsPrincipal] = useState<string>(responsibilitySettings.principalName);
  const [settingsYear, setSettingsYear] = useState<string>(responsibilitySettings.academicYear);
  const [settingsTerm, setSettingsTerm] = useState<string>(responsibilitySettings.term);
  const [settingsDocNumber, setSettingsDocNumber] = useState<string>(
    responsibilitySettings.docNumber || '71646280.125.01-'
  );
  const [settingsDocDate, setSettingsDocDate] = useState<string>(
    responsibilitySettings.docDate || '25.09.2026'
  );

  // Filtered exams
  const filteredExams = useMemo(() => {
    return responsibilityExams.filter(exam => {
      const matchGrade = gradeFilter === 'ALL' || exam.gradeLevel.includes(gradeFilter);
      const matchSearch =
        !searchTerm ||
        exam.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.classroomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.commissionMembers.some(m => m.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchGrade && matchSearch;
    });
  }, [responsibilityExams, gradeFilter, searchTerm]);

  // Active selected exam
  const activeExam = useMemo(() => {
    return (
      responsibilityExams.find(e => e.id === selectedExamId) ||
      filteredExams[0] ||
      responsibilityExams[0] ||
      null
    );
  }, [responsibilityExams, selectedExamId, filteredExams]);

  // Open Create Exam Modal
  const handleOpenCreateExam = () => {
    setEditingExam(null);
    setFormSubject('');
    setFormGradeLevel('9. Sınıf');
    setFormDate(new Date().toLocaleDateString('tr-TR'));
    setFormTime('10:00');
    setFormClassroom(classrooms[0]?.name || 'Salon 1 (9-A)');
    setFormMember1(teachers[0]?.name || '');
    setFormMember2(teachers[1]?.name || '');
    setFormSupervisor(teachers[2]?.name || '');
    setFormNotes('');
    setIsExamModalOpen(true);
  };

  // Open Edit Exam Modal
  const handleOpenEditExam = (exam: ResponsibilityExam) => {
    setEditingExam(exam);
    setFormSubject(exam.subjectName);
    setFormGradeLevel(exam.gradeLevel);
    setFormDate(exam.examDate);
    setFormTime(exam.examTime);
    setFormClassroom(exam.classroomName);
    setFormMember1(exam.commissionMembers[0] || '');
    setFormMember2(exam.commissionMembers[1] || '');
    setFormSupervisor(exam.supervisorName || '');
    setFormNotes(exam.notes || '');
    setIsExamModalOpen(true);
  };

  // Save Exam Form
  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim()) {
      showToast('Lütfen sınav dersinin adını giriniz.');
      return;
    }

    const commission = [formMember1.trim(), formMember2.trim()].filter(Boolean);
    if (commission.length === 0) {
      showToast('Lütfen en az bir sınav komisyon üyesi öğretmeni belirleyiniz.');
      return;
    }

    if (editingExam) {
      setResponsibilityExams(prev =>
        prev.map(ex =>
          ex.id === editingExam.id
            ? {
                ...ex,
                subjectName: formSubject.trim(),
                gradeLevel: formGradeLevel,
                examDate: formDate.trim(),
                examTime: formTime.trim(),
                classroomName: formClassroom.trim() || 'Salon 1',
                commissionMembers: commission,
                supervisorName: formSupervisor.trim() || undefined,
                notes: formNotes.trim() || undefined,
              }
            : ex
        )
      );
    } else {
      const newExam: ResponsibilityExam = {
        id: `resp-exam-${Date.now()}`,
        subjectName: formSubject.trim(),
        gradeLevel: formGradeLevel,
        examDate: formDate.trim(),
        examTime: formTime.trim(),
        classroomName: formClassroom.trim() || 'Salon 1',
        commissionMembers: commission,
        supervisorName: formSupervisor.trim() || undefined,
        students: [],
        notes: formNotes.trim() || undefined,
      };
      setResponsibilityExams(prev => [...prev, newExam]);
      setSelectedExamId(newExam.id);
    }

    setIsExamModalOpen(false);
  };

  // Delete Exam
  const handleDeleteExam = (id: string) => {
    const target = responsibilityExams.find(e => e.id === id);
    if (target) {
      setExamToDelete(target);
    }
  };

  const confirmDeleteExam = () => {
    if (!examToDelete) return;
    const id = examToDelete.id;
    const remaining = responsibilityExams.filter(e => e.id !== id);
    if (selectedExamId === id) {
      setSelectedExamId(remaining[0]?.id || '');
    }
    setResponsibilityExams(remaining);
    setExamToDelete(null);
  };

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setResponsibilitySettings({
      schoolName:
        settingsSchool.trim() ||
        'Türkiye Tekstil Sanayi İşverenleri Sendikası Mesleki ve Teknik Anadolu Lisesi',
      districtName: settingsDistrict.trim() || 'MELİKGAZİ KAYMAKAMLIĞI',
      principalName: settingsPrincipal.trim() || 'Osman YÜCEL',
      academicYear: settingsYear.trim() || '2026-2027',
      term: settingsTerm.trim() || '1.DÖNEM',
      docNumber: settingsDocNumber.trim() || '71646280.125.01-',
      docDate: settingsDocDate.trim() || '25.09.2026',
    });
    setIsSettingsModalOpen(false);
    showToast('Okul ve resmi evrak bilgileri başarıyla güncellendi.');
  };

  // Add students to active exam
  const handleAddStudentsToExam = (selectedStudents: Student[]) => {
    if (!activeExam) return;

    const existingStudentIds = new Set(activeExam.students.map(s => s.studentId));
    // Sadece MEB sorumluluk kurallarına uyan üst sınıf öğrencilerini dahil et
    const eligibleSelected = selectedStudents.filter(st =>
      isStudentEligibleForResponsibilityExam(st.classLevel, activeExam.gradeLevel)
    );

    const newAdditions: ResponsibilityStudent[] = eligibleSelected
      .filter(st => !existingStudentIds.has(st.id))
      .map(st => ({
        id: `resp-st-${st.id}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        studentId: st.id,
        number: st.number,
        name: st.name,
        surname: st.surname,
        classLevel: st.classLevel,
        responsibleGradeLevel: activeExam.gradeLevel,
        isBEP: st.isBEP,
        result: 'BEKLİYOR',
      }));

    if (newAdditions.length === 0) {
      showToast('Seçilen öğrenciler zaten bu sınavın listesinde ekli veya bu ders kademesine uygun değil.');
      return;
    }

    setResponsibilityExams(prev =>
      prev.map(ex =>
        ex.id === activeExam.id
          ? {
              ...ex,
              students: [...ex.students, ...newAdditions],
            }
          : ex
      )
    );

    setIsAddStudentModalOpen(false);
    showToast(`${newAdditions.length} sorumlu öğrenci sınava eklendi.`);
  };

  // Remove student from exam
  const handleRemoveStudent = (studentEntryId: string) => {
    if (!activeExam) return;
    setResponsibilityExams(prev =>
      prev.map(ex =>
        ex.id === activeExam.id
          ? {
              ...ex,
              students: ex.students.filter(s => s.id !== studentEntryId),
            }
          : ex
      )
    );
  };

  // Update student score or result inline
  const handleUpdateStudentResult = (
    studentEntryId: string,
    result: 'GEÇTİ' | 'KALDI' | 'GİRMEDİ' | 'BEKLİYOR',
    score?: number | null
  ) => {
    if (!activeExam) return;
    setResponsibilityExams(prev =>
      prev.map(ex =>
        ex.id === activeExam.id
          ? {
              ...ex,
              students: ex.students.map(s =>
                s.id === studentEntryId
                  ? {
                      ...s,
                      result,
                      score: score !== undefined ? score : s.score,
                    }
                  : s
              ),
            }
          : ex
      )
    );
  };

  // Score change handler with automatic MEB pass/fail determination (50+)
  const handleScoreChange = (studentEntryId: string, scoreVal: string) => {
    if (!activeExam) return;
    const trimmed = scoreVal.trim();
    const scoreNum = trimmed === '' ? null : parseInt(trimmed, 10);
    const validScore = scoreNum !== null && !isNaN(scoreNum) ? Math.min(100, Math.max(0, scoreNum)) : null;

    let autoResult: 'GEÇTİ' | 'KALDI' | 'GİRMEDİ' | 'BEKLİYOR' = 'BEKLİYOR';
    if (validScore !== null) {
      autoResult = validScore >= 50 ? 'GEÇTİ' : 'KALDI';
    }

    setResponsibilityExams(prev =>
      prev.map(ex =>
        ex.id === activeExam.id
          ? {
              ...ex,
              students: ex.students.map(s =>
                s.id === studentEntryId
                  ? {
                      ...s,
                      score: validScore,
                      result: validScore !== null ? autoResult : s.result,
                    }
                  : s
              ),
            }
          : ex
      )
    );
  };

  // Student selection handlers for active exam
  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filtered active exam students based on search and filters
  const filteredActiveStudents = useMemo(() => {
    if (!activeExam) return [];
    return activeExam.students.filter(st => {
      if (studentClassFilter !== 'ALL' && st.classLevel !== studentClassFilter) return false;
      if (studentResultFilter !== 'ALL' && (st.result || 'BEKLİYOR') !== studentResultFilter) return false;
      if (studentSearchTerm.trim()) {
        const q = studentSearchTerm.toLowerCase().trim();
        const fullName = `${st.name} ${st.surname}`.toLowerCase();
        return fullName.includes(q) || st.number.includes(q);
      }
      return true;
    });
  }, [activeExam, studentClassFilter, studentResultFilter, studentSearchTerm]);

  // Unique class levels in active exam
  const activeExamClasses = useMemo(() => {
    if (!activeExam) return [];
    return Array.from(new Set(activeExam.students.map(s => s.classLevel))).sort((a, b) =>
      a.localeCompare(b, 'tr', { numeric: true })
    );
  }, [activeExam]);

  const handleSelectAllStudents = () => {
    if (!activeExam) return;
    if (selectedStudentIds.size === filteredActiveStudents.length && filteredActiveStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredActiveStudents.map(s => s.id)));
    }
  };

  // Bulk remove selected students
  const handleBulkRemoveStudents = () => {
    if (!activeExam || selectedStudentIds.size === 0) return;
    const count = selectedStudentIds.size;
    setResponsibilityExams(prev =>
      prev.map(ex =>
        ex.id === activeExam.id
          ? {
              ...ex,
              students: ex.students.filter(s => !selectedStudentIds.has(s.id)),
            }
          : ex
      )
    );
    setSelectedStudentIds(new Set());
    showToast(`${count} öğrenci sınav listesinden çıkarıldı.`);
  };

  // Bulk set result for selected students
  const handleBulkSetResult = (newResult: 'GEÇTİ' | 'KALDI' | 'GİRMEDİ' | 'BEKLİYOR') => {
    if (!activeExam || selectedStudentIds.size === 0) return;
    setResponsibilityExams(prev =>
      prev.map(ex =>
        ex.id === activeExam.id
          ? {
              ...ex,
              students: ex.students.map(s =>
                selectedStudentIds.has(s.id)
                  ? {
                      ...s,
                      result: newResult,
                      score: newResult === 'GEÇTİ' && (s.score === null || s.score === undefined || s.score < 50) ? 50 : s.score,
                    }
                  : s
              ),
            }
          : ex
      )
    );
    showToast(`Seçili ${selectedStudentIds.size} öğrencinin durumu "${newResult}" olarak güncellendi.`);
  };

  // Total statistics across all responsibility exams
  const totalStats = useMemo(() => {
    const totalExams = responsibilityExams.length;
    const totalStudentEntries = responsibilityExams.reduce((acc, e) => acc + e.students.length, 0);
    const uniqueCommissionTeachers = new Set(responsibilityExams.flatMap(e => e.commissionMembers)).size;
    const uniqueClassrooms = new Set(responsibilityExams.map(e => e.classroomName)).size;
    return { totalExams, totalStudentEntries, uniqueCommissionTeachers, uniqueClassrooms };
  }, [responsibilityExams]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-160px)] space-y-2.5 relative pb-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-2 right-4 z-50 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <Info className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER & PRINCIPAL / COMMISSION HEAD STATUS BAR */}
      <div className="shrink-0 bg-white rounded-xl px-3.5 py-2 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="bg-purple-100 text-purple-800 font-black px-2 py-0.5 rounded text-[11px] shrink-0">
            9. BÖLÜM
          </span>
          <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight shrink-0">
            Sorumluluk Sınavları Yönetim Modülü
          </h2>
          <span className="text-slate-300 hidden md:inline">|</span>
          {/* Commission Head Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            <School className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px]">Komisyon Başkanı:</span>
            <strong className="text-slate-900 font-black text-[11px] uppercase">
              {responsibilitySettings.principalName} (Okul Müdürü)
            </strong>
            <button
              onClick={() => {
                setSettingsSchool(responsibilitySettings.schoolName);
                setSettingsDistrict(responsibilitySettings.districtName || 'MELİKGAZİ KAYMAKAMLIĞI');
                setSettingsPrincipal(responsibilitySettings.principalName);
                setSettingsYear(responsibilitySettings.academicYear);
                setSettingsTerm(responsibilitySettings.term);
                setSettingsDocNumber(responsibilitySettings.docNumber || '71646280.125.01-');
                setSettingsDocDate(responsibilitySettings.docDate || '25.09.2026');
                setIsSettingsModalOpen(true);
              }}
              className="ml-1 text-indigo-600 hover:text-indigo-800 font-bold text-[10px] underline cursor-pointer"
              title="Okul Müdürü / Komisyon Başkanı ve Okul Bilgilerini Güncelle"
            >
              Değiştir
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Bulk Print All Documents Button */}
          <button
            onClick={() => handleOpenPrintModal('ALL_DOCUMENTS')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-md transition cursor-pointer"
            title="Tüm sınav evraklarını (Öğretmen Görevlendirmeleri, Günlük İmza Tutanağı, Sınav Tarihleri Panosu, Zarf Kapakları ve Sınav Tutanakları) tek bir toplu pakette çıkarın"
          >
            <Package className="w-3.5 h-3.5" />
            <span>📦 Tüm Sınav Evrakları Paketi</span>
          </button>

          {/* Print Modal Button */}
          <button
            onClick={() => handleOpenPrintModal('SCHEDULE_NOTICE')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-2xs"
            title="Sorumluluk Sınavı Tutanağı, İlan Listesi ve Takvim Çıktılarını Aç"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Evrak Yazdır & PDF Al</span>
          </button>

          {/* Add Exam Button */}
          <button
            onClick={handleOpenCreateExam}
            className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Sınav Tanımla</span>
          </button>
        </div>
      </div>

      {/* 2. COMPACT DEDICATED SECTION: RESMİ SORUMLULUK SINAV EVRAKLARI ÇIKARMA MERKEZİ */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 rounded-xl px-3.5 py-2 border border-purple-500/30 text-white shadow-sm flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-extrabold text-xs text-white">
              Resmi Sorumluluk Sınav Evrakları
            </span>
            <span className="text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/30 px-1.5 py-0.2 rounded-full font-mono font-bold shrink-0">
              MEB Standart A4
            </span>
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-purple-300/90 font-medium">
              <span>• <strong>{responsibilityExams.length}</strong> Sınav</span>
              <span>• <strong>{totalStudentsRegistered}</strong> Sorumlu Öğrenci</span>
              <span>• <strong>{totalTeachersWithDuty}</strong> Görevli Öğretmen</span>
            </div>
          </div>
        </div>

        {/* Buttons & Shortcuts */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <button
            onClick={() => handleOpenPrintModal('ALL_DOCUMENTS')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-md transition cursor-pointer"
            title="Tüm sınav evraklarını eksiksiz paket olarak tek tıkla yazdırın veya PDF olarak indirin"
          >
            <Package className="w-3.5 h-3.5" />
            <span>📦 Tüm Evrakları Tek Pakette Çıkar</span>
          </button>

          <div className="hidden xl:flex items-center gap-1 border-l border-purple-500/40 pl-1.5">
            <button
              onClick={() => handleOpenPrintModal('TEACHER_ASSIGNMENT')}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition cursor-pointer"
              title="1. Öğretmen Görevlendirmeleri"
            >
              👤 Tebligat
            </button>
            <button
              onClick={() => handleOpenPrintModal('DAILY_SIGNATURE')}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition cursor-pointer"
              title="2. Günlük İmza Tutanağı"
            >
              📋 Günlük İmza
            </button>
            <button
              onClick={() => handleOpenPrintModal('SCHEDULE_NOTICE')}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition cursor-pointer"
              title="3. Asılacak Sınav Tarihleri"
            >
              📅 Pano İlanı
            </button>
            <button
              onClick={() => handleOpenPrintModal('ENVELOPE_COVER')}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition cursor-pointer"
              title="4. Sınav Zarfı Kapağı"
            >
              ✉️ Zarf
            </button>
            <button
              onClick={() => handleOpenPrintModal('OFFICIAL_MINUTES')}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition cursor-pointer"
              title="5. Sınav Tutanağı"
            >
              📑 Tutanak
            </button>
          </div>
        </div>
      </div>

      {/* 3. DUAL COLUMN WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* LEFT COLUMN: Fieldset with Exam List & Commission Summary (col-span-4 / xl:col-span-3) */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col space-y-2">
          <fieldset className="border-2 border-purple-400 rounded-xl p-2.5 bg-white shadow-2xs flex-1 flex flex-col justify-between">
            <legend className="px-2 text-xs font-black text-purple-700 bg-white flex items-center gap-1.5">
              <span>Sorumluluk Sınavları ({responsibilityExams.length})</span>
            </legend>

            {/* Filter and Search Bar */}
            <div className="shrink-0 space-y-1.5 mb-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Ders, salon, komisyon ara..."
                  className="w-full text-xs pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Grade Level Chips */}
              <div className="flex items-center gap-1 overflow-x-auto text-[10.5px]">
                {['ALL', '9', '10', '11', '12'].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setGradeFilter(lvl)}
                    className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                      gradeFilter === lvl
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {lvl === 'ALL' ? 'Tümü' : `${lvl}. Sınıf`}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Exam List Cards */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 min-h-[350px] max-h-[580px]">
              {filteredExams.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  Kriterlere uygun sorumluluk sınavı bulunamadı.
                </div>
              ) : (
                filteredExams.map(exam => {
                  const isSelected = activeExam?.id === exam.id;
                  return (
                    <div
                      key={exam.id}
                      onClick={() => setSelectedExamId(exam.id)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-1.5 ${
                        isSelected
                          ? 'bg-purple-50/80 border-purple-500 shadow-sm ring-2 ring-purple-300'
                          : 'bg-white border-slate-200 hover:border-purple-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="font-black text-xs text-slate-900 uppercase tracking-tight">
                            {exam.subjectName}
                          </div>
                          <div className="text-[11px] font-bold text-purple-700">
                            {exam.gradeLevel}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="font-mono text-[10.5px] font-black bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                            {exam.students.length} Öğrenci
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteExam(exam.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title={`"${exam.subjectName} (${exam.gradeLevel})" dersini sil`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="font-mono font-semibold">
                          📅 {exam.examDate} - {exam.examTime}
                        </span>
                        <span className="font-bold text-slate-700 truncate max-w-[120px]">
                          🚪 {exam.classroomName}
                        </span>
                      </div>

                      <div className="text-[10.5px] text-slate-600 truncate">
                        👥 Komisyon: <strong>{exam.commissionMembers.join(', ')}</strong>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Overall Quick Stats Summary */}
            <div className="shrink-0 pt-2.5 mt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
              <div className="flex justify-between items-center">
                <span>Toplam Sınav:</span>
                <strong className="text-slate-900 font-mono">{totalStats.totalExams} Branş</strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Sorumlu Öğrenci Kaydı:</span>
                <strong className="text-purple-700 font-mono font-black">{totalStats.totalStudentEntries} Kişi</strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Görevli Komisyon Üyesi:</span>
                <strong className="text-slate-900 font-mono">{totalStats.uniqueCommissionTeachers} Öğretmen</strong>
              </div>
            </div>
          </fieldset>
        </div>

        {/* RIGHT COLUMN: Active Exam Details & Supercharged Student Workspace (lg:col-span-8 / xl:col-span-9) */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between overflow-hidden">
          {activeExam ? (
            <>
              {/* Active Exam Header Bar with Controls */}
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-sm sm:text-base text-slate-900 uppercase">
                      {activeExam.subjectName} ({activeExam.gradeLevel})
                    </h3>
                    <span className="text-[11px] font-mono bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-md">
                      🚪 {activeExam.classroomName}
                    </span>
                    <span
                      className="text-[10.5px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md"
                      title="MEB Kuralı: Bu sınav dersine yalnızca üst sınıf öğrencileri katılabilir"
                    >
                      👥 Katılabilenler: {getEligibleGradesSummary(activeExam.gradeLevel)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold mt-1 flex flex-wrap items-center gap-2">
                    <span>📅 <strong>{activeExam.examDate} - {activeExam.examTime}</strong></span>
                    <span>·</span>
                    <span>👥 Komisyon: <strong className="text-slate-800">{activeExam.commissionMembers.join(', ')}</strong></span>
                    {activeExam.supervisorName && (
                      <>
                        <span>·</span>
                        <span>Gözetmen: <strong>{activeExam.supervisorName}</strong></span>
                      </>
                    )}
                  </div>
                </div>

                {/* Top Action Buttons for Active Exam */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setIsAddStudentModalOpen(true)}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                    title="Bu sınava okuldan sorumlu öğrencileri ekleyin"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Öğrenci Ekle</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsPrintModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-2xs"
                    title="Bu sınavın resmi tutanağını ve kapı listesini yazdır / PDF al"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Evrak Yazdır</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditExam(activeExam)}
                    className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-slate-200 rounded-lg text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
                    title="Sınav Bilgilerini Düzenle"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Düzenle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteExam(activeExam.id)}
                    className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-2xs"
                    title={`"${activeExam.subjectName}" dersini ve sınav kaydını sil`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span className="hidden sm:inline">Dersi Sil</span>
                  </button>
                </div>
              </div>

              {/* Student Search, Class & Result Filter Toolbar */}
              <div className="bg-slate-100/70 border-b border-slate-200 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                  {/* Search box */}
                  <div className="relative min-w-[140px] sm:min-w-[200px] flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={studentSearchTerm}
                      onChange={e => setStudentSearchTerm(e.target.value)}
                      placeholder="Öğrenci ara (ad, soyad, no)..."
                      className="w-full pl-7 pr-2 py-1 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  {/* Class Filter */}
                  <select
                    value={studentClassFilter}
                    onChange={e => setStudentClassFilter(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tüm Şubeler ({activeExamClasses.length})</option>
                    {activeExamClasses.map(c => (
                      <option key={c} value={c}>{c} Şubesi</option>
                    ))}
                  </select>

                  {/* Result Status Filter */}
                  <select
                    value={studentResultFilter}
                    onChange={e => setStudentResultFilter(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tüm Durumlar</option>
                    <option value="BEKLİYOR">🟡 Bekleyenler</option>
                    <option value="GEÇTİ">🟢 Geçenler</option>
                    <option value="KALDI">🔴 Kalanlar</option>
                    <option value="GİRMEDİ">⚪ Girmeyenler</option>
                  </select>
                </div>

                {/* Status Badges Summary */}
                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                    Toplam: {activeExam.students.length}
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
                    Geçen: {activeExam.students.filter(s => s.result === 'GEÇTİ').length}
                  </span>
                  <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-mono">
                    Kalan: {activeExam.students.filter(s => s.result === 'KALDI').length}
                  </span>
                  <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-mono">
                    Bekleyen: {activeExam.students.filter(s => s.result === 'BEKLİYOR' || !s.result).length}
                  </span>
                </div>
              </div>

              {/* Bulk Action Bar (Visible when 1+ student is selected) */}
              {selectedStudentIds.size > 0 && (
                <div className="bg-indigo-50 border-b border-indigo-200 px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 animate-in fade-in duration-100">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-indigo-900">
                      <strong>{selectedStudentIds.size}</strong> öğrenci seçildi
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-600 font-semibold mr-1">Toplu İşlem:</span>
                    <button
                      onClick={() => handleBulkSetResult('GEÇTİ')}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer shadow-2xs"
                      title="Seçili öğrencilerin durumunu GEÇTİ yap ve notlarını 50 olarak güncelle"
                    >
                      ✓ Tümünü Geçti Yap (50)
                    </button>
                    <button
                      onClick={() => handleBulkSetResult('KALDI')}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer shadow-2xs"
                      title="Seçili öğrencilerin durumunu KALDI yap"
                    >
                      ✕ Tümünü Kaldı Yap
                    </button>
                    <button
                      onClick={() => handleBulkSetResult('GİRMEDİ')}
                      className="px-2.5 py-1 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer shadow-2xs"
                      title="Seçili öğrencilerin durumunu GİRMEDİ yap"
                    >
                      - Tümünü Girmeyen Yap
                    </button>
                    <button
                      onClick={handleBulkRemoveStudents}
                      className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 font-bold rounded-lg text-[11px] transition cursor-pointer ml-1"
                      title="Seçili öğrencileri bu sınavdan çıkar"
                    >
                      <Trash2 className="w-3 h-3 inline mr-1" />
                      Seçilenleri Çıkar
                    </button>
                  </div>
                </div>
              )}

              {/* Spacious, Supercharged Student List Table */}
              <div className="overflow-y-auto flex-1 min-h-[420px] max-h-[620px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-300 text-[11px] uppercase tracking-wider text-slate-700 font-extrabold shadow-2xs">
                    <tr>
                      <th className="p-2 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.size > 0 && selectedStudentIds.size === filteredActiveStudents.length}
                          onChange={handleSelectAllStudents}
                          className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                          title="Tümünü Seç / Seçimi Kaldır"
                        />
                      </th>
                      <th className="p-2 w-12 text-center">S.No</th>
                      <th className="p-2 w-24 text-center font-mono">Okul No</th>
                      <th className="p-2">Öğrenci Adı Soyadı</th>
                      <th className="p-2 w-24 text-center">Kayıtlı Şube</th>
                      <th className="p-2 w-28 text-center">Sorumlu Sınıf</th>
                      <th className="p-2 w-32 text-center">Sınav Notu (0-100)</th>
                      <th className="p-2 w-36 text-center">Sonuç / Durum</th>
                      <th className="p-2 w-14 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredActiveStudents.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-12 text-center text-slate-400 italic">
                          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-bold text-slate-700 text-sm">
                            {activeExam.students.length === 0
                              ? 'Bu sınava henüz öğrenci atanmadı.'
                              : 'Aramanıza veya seçili filtrelere uygun öğrenci bulunamadı.'}
                          </p>
                          <p className="text-xs mt-1 text-slate-400 max-w-md mx-auto">
                            {activeExam.students.length === 0
                              ? 'Yukarıdaki "+ Öğrenci Ekle" butonuna basarak okuldaki sorumlu öğrencileri tek tıkla ekleyebilirsiniz.'
                              : 'Filtreleri temizleyerek tüm sınav öğrencilerini görüntüleyebilirsiniz.'}
                          </p>
                          {activeExam.students.length === 0 && (
                            <button
                              onClick={() => setIsAddStudentModalOpen(true)}
                              className="mt-3.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <UserPlus className="w-4 h-4" />
                              <span>Şimdi Öğrenci Ekle</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredActiveStudents.map((st, idx) => {
                        const isSelected = selectedStudentIds.has(st.id);
                        return (
                          <tr
                            key={st.id}
                            className={`hover:bg-purple-50/50 transition ${
                              isSelected ? 'bg-indigo-50/40' : ''
                            }`}
                          >
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectStudent(st.id)}
                                className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                              />
                            </td>
                            <td className="p-2 text-center text-slate-400 font-mono text-[11px] font-bold">
                              {idx + 1}
                            </td>
                            <td className="p-2 font-mono font-black text-center text-slate-900 text-xs">
                              #{st.number}
                            </td>
                            <td className="p-2 font-bold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs sm:text-[13px]">{st.name} {st.surname}</span>
                                {st.isBEP && (
                                  <span className="text-[9px] bg-purple-100 text-purple-800 border border-purple-200 px-1 py-0.2 rounded font-black shrink-0">
                                    BEP
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                                {st.classLevel}
                              </span>
                              {!isStudentEligibleForResponsibilityExam(st.classLevel, activeExam.gradeLevel) && (
                                <span
                                  className="block mt-0.5 text-[9px] text-amber-700 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200"
                                  title="MEB Kuralı: Alt veya aynı kademedeki öğrenci bu sorumluluk sınavına giremez"
                                >
                                  ⚠️ Kural Dışı
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-center font-bold text-xs text-purple-700">
                              {st.responsibleGradeLevel || activeExam.gradeLevel}
                            </td>
                            {/* Score Input (0-100) */}
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={st.score !== undefined && st.score !== null ? st.score : ''}
                                  onChange={e => handleScoreChange(st.id, e.target.value)}
                                  placeholder="Not"
                                  className="w-16 text-center font-mono font-bold text-xs py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                                  title="Sınav notunu girin (50 ve üzeri otomatik Geçti, altı Kaldı yapar)"
                                />
                                {st.score !== undefined && st.score !== null && (
                                  <span className="text-[10px] text-slate-400 font-mono">/100</span>
                                )}
                              </div>
                            </td>
                            {/* Result Dropdown */}
                            <td className="p-2 text-center">
                              <select
                                value={st.result || 'BEKLİYOR'}
                                onChange={e =>
                                  handleUpdateStudentResult(
                                    st.id,
                                    e.target.value as 'GEÇTİ' | 'KALDI' | 'GİRMEDİ' | 'BEKLİYOR'
                                  )
                                }
                                className={`text-[11px] font-black px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                                  st.result === 'GEÇTİ'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : st.result === 'KALDI'
                                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                                    : st.result === 'GİRMEDİ'
                                    ? 'bg-slate-100 text-slate-600 border-slate-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                <option value="BEKLİYOR">🟡 Bekliyor</option>
                                <option value="GEÇTİ">🟢 Geçti</option>
                                <option value="KALDI">🔴 Kaldı</option>
                                <option value="GİRMEDİ">⚪ Girmedi</option>
                              </select>
                            </td>
                            {/* Actions */}
                            <td className="p-2 text-center">
                              <button
                                onClick={() => handleRemoveStudent(st.id)}
                                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5 transition cursor-pointer"
                                title="Öğrenciyi Sınavdan Çıkar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer Summary Bar */}
              <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-3 font-semibold">
                  <span>
                    Sınava Kayıtlı: <strong className="text-slate-900 font-mono">{activeExam.students.length}</strong> Öğrenci
                  </span>
                  <span>•</span>
                  <span>
                    Geçen: <strong className="text-emerald-700 font-mono">{activeExam.students.filter(s => s.result === 'GEÇTİ').length}</strong>
                    {activeExam.students.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        (%{Math.round((activeExam.students.filter(s => s.result === 'GEÇTİ').length / activeExam.students.length) * 100)})
                      </span>
                    )}
                  </span>
                  <span>•</span>
                  <span>
                    Kalan: <strong className="text-rose-700 font-mono">{activeExam.students.filter(s => s.result === 'KALDI').length}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Bekleyen: <strong className="text-amber-700 font-mono">{activeExam.students.filter(s => s.result === 'BEKLİYOR' || !s.result).length}</strong>
                  </span>
                </div>

                <div className="text-[11px] text-slate-400">
                  Onay Makamı: <strong>{responsibilitySettings.principalName}</strong> (Okul Müdürü)
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500 min-h-[400px]">
              <BookOpen className="w-14 h-14 text-slate-300 mb-2" />
              <h3 className="font-bold text-slate-800 text-base">Henüz Bir Sınav Seçilmedi</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Sol taraftan bir sorumluluk sınavı seçin veya &quot;Yeni Sınav Tanımla&quot; butonuna basarak yeni bir ders ekleyin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Create / Edit Exam */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </span>
                <h3 className="font-black text-sm text-slate-900">
                  {editingExam ? 'Sorumluluk Sınavını Düzenle' : 'Yeni Sorumluluk Sınavı Tanımla'}
                </h3>
              </div>
              <button
                onClick={() => setIsExamModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-3 text-xs">
              {/* Subject & Grade Level */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Sınav Dersi Adı:
                  </label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                    placeholder="Örn: Türk Dili ve Edebiyatı"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ders Seviyesi:
                  </label>
                  <select
                    value={formGradeLevel}
                    onChange={e => setFormGradeLevel(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="9. Sınıf">9. Sınıf</option>
                    <option value="10. Sınıf">10. Sınıf</option>
                    <option value="11. Sınıf">11. Sınıf</option>
                    <option value="12. Sınıf">12. Sınıf</option>
                  </select>
                </div>
              </div>

              {/* Date, Time & Classroom */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tarih:
                  </label>
                  <input
                    type="text"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    placeholder="18.09.2024"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Saat:
                  </label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    placeholder="10:00"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Sınav Salonu:
                  </label>
                  <input
                    type="text"
                    value={formClassroom}
                    onChange={e => setFormClassroom(e.target.value)}
                    placeholder="Salon 1 (9-A)"
                    list="classroom-suggestions"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    required
                  />
                  <datalist id="classroom-suggestions">
                    {classrooms.map(c => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Commission Members (Teachers) */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <span className="block text-[11.5px] font-black text-slate-800">
                  Sınav Komisyon Üyeleri (Öğretmenler):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                      1. Komisyon Üyesi:
                    </label>
                    <input
                      type="text"
                      value={formMember1}
                      onChange={e => setFormMember1(e.target.value)}
                      placeholder="Öğretmen Adı Soyadı"
                      list="teacher-suggestions-1"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      required
                    />
                    <datalist id="teacher-suggestions-1">
                      {teachers.map(t => (
                        <option key={t.id} value={t.name} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                      2. Komisyon Üyesi:
                    </label>
                    <input
                      type="text"
                      value={formMember2}
                      onChange={e => setFormMember2(e.target.value)}
                      placeholder="Öğretmen Adı Soyadı"
                      list="teacher-suggestions-2"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      required
                    />
                    <datalist id="teacher-suggestions-2">
                      {teachers.map(t => (
                        <option key={t.id} value={t.name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                    Gözetmen Üye (İsteğe bağlı):
                  </label>
                  <input
                    type="text"
                    value={formSupervisor}
                    onChange={e => setFormSupervisor(e.target.value)}
                    placeholder="Varsa Gözetmen Öğretmen Adı"
                    list="teacher-suggestions-3"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <datalist id="teacher-suggestions-3">
                    {teachers.map(t => (
                      <option key={t.id} value={t.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                  Sınav Açıklaması / Not:
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Örn: Yazılı sınav, 40 dakika, 10 açık uçlu soru"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                {editingExam ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsExamModalOpen(false);
                      handleDeleteExam(editingExam.id);
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Bu dersi ve sınavı sil"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Dersi Sil</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExamModalOpen(false)}
                    className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                  >
                    {editingExam ? 'Güncelle' : 'Sınavı Kaydet'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Settings (Principal / Commission Head Configuration) */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <School className="w-4 h-4" />
                </span>
                <h3 className="font-black text-sm text-slate-900">
                  Komisyon Başkanı ve Okul Bilgileri
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Sınav Komisyon Başkanı (Okul Müdürü):
                </label>
                <input
                  type="text"
                  value={settingsPrincipal}
                  onChange={e => setSettingsPrincipal(e.target.value)}
                  placeholder="Ahmet YILMAZ"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  *Tüm resmi sınav tutanaklarının ve takvimlerin altında onaylayıcı makam olarak çıkacaktır.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  İlçe Kaymakamlığı (Üst Makam Başlığı):
                </label>
                <input
                  type="text"
                  value={settingsDistrict}
                  onChange={e => setSettingsDistrict(e.target.value)}
                  placeholder="MELİKGAZİ KAYMAKAMLIĞI"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Okul Adı:
                </label>
                <input
                  type="text"
                  value={settingsSchool}
                  onChange={e => setSettingsSchool(e.target.value)}
                  placeholder="Türkiye Tekstil Sanayi İşverenleri Sendikası MTAL"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Eğitim-Öğretim Yılı:
                  </label>
                  <input
                    type="text"
                    value={settingsYear}
                    onChange={e => setSettingsYear(e.target.value)}
                    placeholder="2026-2027"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Sınav Dönemi:
                  </label>
                  <input
                    type="text"
                    value={settingsTerm}
                    onChange={e => setSettingsTerm(e.target.value)}
                    placeholder="1.DÖNEM (EYLÜL)"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Resmi Yazı / Sayı No:
                  </label>
                  <input
                    type="text"
                    value={settingsDocNumber}
                    onChange={e => setSettingsDocNumber(e.target.value)}
                    placeholder="71646280.125.01-"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tebligat / Onay Tarihi:
                  </label>
                  <input
                    type="text"
                    value={settingsDocDate}
                    onChange={e => setSettingsDocDate(e.target.value)}
                    placeholder="25.09.2026"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Students to Exam */}
      {isAddStudentModalOpen && activeExam && (
        <AddStudentSelectorModal
          exam={activeExam}
          allStudents={students}
          onClose={() => setIsAddStudentModalOpen(false)}
          onAdd={handleAddStudentsToExam}
        />
      )}

      {/* PRINT PREVIEW MODAL */}
      <ResponsibilityPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        exams={responsibilityExams}
        initialExamId={activeExam?.id}
        initialDocType={printModalDocType}
        settings={responsibilitySettings}
      />

      {/* DERS SİLME ONAY MODALI (Iframe uyumlu) */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sorumluluk Dersini Sil</h3>
                <p className="text-xs text-slate-500 font-medium">Bu işlem sınavı ve öğrenci listesini kaldırır</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              <strong className="text-slate-900 font-bold">{examToDelete.subjectName} ({examToDelete.gradeLevel})</strong> sorumluluk sınavı dersini ve kayıtlı {examToDelete.students.length} öğrenci listesini silmek istediğinize emin misiniz?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setExamToDelete(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmDeleteExam}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Evet, Dersi Sil</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component: Add Student Selector Modal
interface AddStudentModalProps {
  exam: ResponsibilityExam;
  allStudents: Student[];
  onClose: () => void;
  onAdd: (selected: Student[]) => void;
}

const AddStudentSelectorModal: React.FC<AddStudentModalProps> = ({
  exam,
  allStudents,
  onClose,
  onAdd,
}) => {
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Existing student IDs already in exam
  const existingIds = useMemo(() => {
    return new Set(exam.students.map(s => s.studentId));
  }, [exam]);

  // MEB Kuralı: Öğrenciler sadece önceki yıllardan kaldıkları alt kademe derslerin sorumluluğuna girebilir.
  // 9. sınıf dersine -> 10, 11, 12. sınıflar girebilir (9'lar giremez)
  // 10. sınıf dersine -> 11, 12. sınıflar girebilir (10 ve 9'lar giremez)
  // 11. sınıf dersine -> 12. sınıflar girebilir (11, 10, 9'lar giremez)
  // 12. sınıf dersine -> 12. sınıf (beklemeli) girebilir
  const eligibleStudents = useMemo(() => {
    return allStudents.filter(st =>
      isStudentEligibleForResponsibilityExam(st.classLevel, exam.gradeLevel)
    );
  }, [allStudents, exam.gradeLevel]);

  // Sadece uygun üst sınıf şubelerini listele
  const classList = useMemo(() => {
    const set = new Set(eligibleStudents.map(s => s.classLevel));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
  }, [eligibleStudents]);

  const gradeInfo = useMemo(() => {
    return getEligibleGradesDescription(exam.gradeLevel);
  }, [exam.gradeLevel]);

  // Seçili şube uygun şubeler arasında yoksa varsayılana ('ALL') dön
  useEffect(() => {
    if (filterClass !== 'ALL' && !classList.includes(filterClass)) {
      setFilterClass('ALL');
    }
  }, [classList, filterClass]);

  // Filter students (sadece uygun üst sınıf öğrencilerinden ara)
  const filteredCandidates = useMemo(() => {
    return eligibleStudents.filter(st => {
      if (existingIds.has(st.id)) return false;
      if (filterClass !== 'ALL' && st.classLevel !== filterClass) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${st.name} ${st.surname}`.toLowerCase();
        return fullName.includes(q) || st.number.includes(q);
      }
      return true;
    });
  }, [eligibleStudents, existingIds, filterClass, searchQuery]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedIds);
    filteredCandidates.forEach(s => next.add(s.id));
    setSelectedIds(next);
  };

  const handleConfirm = () => {
    const toAdd = allStudents.filter(s => selectedIds.has(s.id));
    onAdd(toAdd);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] p-4 sm:p-5 shadow-2xl border border-slate-200 flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
          <div>
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>Sınava Sorumlu Öğrenci Ekle</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Sınav: <strong>{exam.subjectName} ({exam.gradeLevel})</strong> · Okuldaki sorumlu üst sınıf öğrencilerini seçiniz
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MEB Kuralı Bilgilendirme Kutusu */}
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-2.5 px-3 flex items-start gap-2.5 text-xs shrink-0 my-1">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-black text-amber-900 flex flex-wrap items-center gap-1.5">
              <span>MEB Kuralı:</span>
              <span className="text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded font-mono text-[11px] font-bold">
                {gradeInfo.title}
              </span>
            </div>
            <div className="text-[11px] text-amber-800 leading-snug mt-0.5 font-medium">
              {gradeInfo.subtitle}
            </div>
          </div>
        </div>

        {/* Filter controls */}
        <div className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Öğrenci no veya isim ara..."
                className="w-full text-xs pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            <select
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">Tüm Uygun Şubeler ({classList.length} Şube)</option>
              {classList.map(c => (
                <option key={c} value={c}>
                  {c} Şubesi
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSelectAllFiltered}
            disabled={filteredCandidates.length === 0}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 underline cursor-pointer"
          >
            Filtrelenenleri Tümünü Seç ({filteredCandidates.length})
          </button>
        </div>

        {/* Candidate Students List */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
          {filteredCandidates.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-1.5">
              <AlertCircle className="w-8 h-8 text-slate-300" />
              <p className="font-bold text-slate-700">
                {eligibleStudents.length === 0
                  ? 'Bu sınava girebilecek kademede (üst sınıf) öğrenci kaydı bulunamadı.'
                  : 'Aramanıza veya seçili şubeye uygun seçilebilir öğrenci bulunamadı.'}
              </p>
              <p className="text-[11px] text-slate-400 max-w-md">
                {gradeInfo.subtitle} {exam.students.length > 0 && `(Mevcut ekli: ${exam.students.length} öğrenci)`}
              </p>
            </div>
          ) : (
            filteredCandidates.map(st => {
              const isChecked = selectedIds.has(st.id);
              return (
                <div
                  key={st.id}
                  onClick={() => toggleSelect(st.id)}
                  className={`p-2 px-3 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer text-xs ${
                    isChecked ? 'bg-emerald-50/70' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="font-mono font-bold text-slate-800 mr-2">#{st.number}</span>
                      <strong className="text-slate-900">{st.name} {st.surname}</strong>
                      {st.isBEP && (
                        <span className="ml-1.5 text-[9px] font-black bg-purple-100 text-purple-800 px-1 rounded">
                          BEP
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="font-bold text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {st.classLevel}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
          <span className="font-bold text-slate-600">
            Seçilen Öğrenci Sayısı: <strong className="text-emerald-700 font-mono text-sm">{selectedIds.size}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs"
            >
              Vazgeç
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs shadow-xs"
            >
              Seçilenleri Sınava Ekle ({selectedIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
