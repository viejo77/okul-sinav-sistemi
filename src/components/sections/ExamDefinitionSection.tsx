import React, { useState, useEffect } from 'react';
import {
  Calendar,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle,
  Save,
  Clock,
  Edit2,
  Check,
  School,
  Split,
  Users,
  Sparkles,
} from 'lucide-react';
import { Exam, Subject, ExamClassAssignment } from '../../types';

interface Props {
  exams: Exam[];
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>;
  activeExamId: string;
  setActiveExamId: (id: string) => void;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  availableClasses: string[];
}

export const ExamDefinitionSection: React.FC<Props> = ({
  exams,
  setExams,
  activeExamId,
  setActiveExamId,
  subjects,
  setSubjects,
  availableClasses,
}) => {
  const activeExam = exams.find(e => e.id === activeExamId) || exams[0];

  // Format date ISO (YYYY-MM-DD) <-> TR (DD.MM.YYYY)
  const formatToTRDate = (isoDate: string): string => {
    if (!isoDate) return '';
    if (isoDate.includes('.')) return isoDate;
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return isoDate;
  };

  const parseTRDate = (trDate: string): string => {
    if (!trDate) return new Date().toISOString().split('T')[0];
    const clean = trDate.trim();
    if (clean.includes('.')) {
      const parts = clean.split('.');
      if (parts.length === 3) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${y}-${m}-${d}`;
      }
    }
    return clean;
  };

  // Card 1: Sınav Bilgileri State
  const [examName, setExamName] = useState(activeExam?.name || '');
  const [examDateInput, setExamDateInput] = useState(
    formatToTRDate(activeExam?.date || new Date().toISOString().split('T')[0])
  );
  const [examPeriodInput, setExamPeriodInput] = useState(
    activeExam?.periodLabel || (activeExam?.period ? `${activeExam.period}. Ders` : '3. Ders')
  );

  // Card 2: Ders Listesi State
  const [subjectNameInput, setSubjectNameInput] = useState('');
  const [subjectTeachersInput, setSubjectTeachersInput] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Card 3: Sınava Girecek Sınıf Ata State
  const defaultClassOptions =
    availableClasses && availableClasses.length > 0
      ? availableClasses
      : [
          'AMP 9-A',
          'AMP 9-B',
          'AMP 9-C',
          'ATP 9-A',
          'AMP 10-A',
          'AMP 10-B',
          'ATP 10-A',
          'ATP 10-B',
          'AMP 11-A',
          'AMP 11-B',
          'AMP 12-A',
        ];

  const [selectedClassToAssign, setSelectedClassToAssign] = useState<string>(
    defaultClassOptions[0] || ''
  );
  const [selectedSubjectToAssign, setSelectedSubjectToAssign] = useState<string>(
    subjects[0]?.id || ''
  );
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  // Custom Delete Modals State (Replaces window.confirm which is blocked in iframes)
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Sync state whenever activeExam changes
  useEffect(() => {
    if (activeExam) {
      setExamName(activeExam.name);
      setExamDateInput(formatToTRDate(activeExam.date));
      setExamPeriodInput(
        activeExam.periodLabel || (activeExam.period ? `${activeExam.period}. Ders` : '3. Ders')
      );
      if (activeExam.assignedClasses && activeExam.assignedClasses.length > 0) {
        setSelectedAssignmentId(activeExam.assignedClasses[0].id);
      } else {
        setSelectedAssignmentId(null);
      }
    }
  }, [activeExamId, activeExam]);

  // Sync default subject for assignment
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectToAssign) {
      setSelectedSubjectToAssign(subjects[0].id);
    }
  }, [subjects, selectedSubjectToAssign]);

  // 1. Save Sınav Bilgileri
  const handleSaveExamInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examName.trim()) {
      showToast('Lütfen sınav adını giriniz.');
      return;
    }

    const isoDate = parseTRDate(examDateInput);
    const match = examPeriodInput.match(/\d+/);
    const parsedPeriod = match ? parseInt(match[0], 10) : 3;

    if (activeExam) {
      setExams(prev =>
        prev.map(ex =>
          ex.id === activeExam.id
            ? {
                ...ex,
                name: examName.trim(),
                date: isoDate,
                period: parsedPeriod,
                periodLabel: examPeriodInput.trim() || `${parsedPeriod}. Ders`,
              }
            : ex
        )
      );
      showToast('Sınav bilgileri başarıyla güncellendi.');
    } else {
      const newId = `exam-${Date.now()}`;
      const newExam: Exam = {
        id: newId,
        name: examName.trim(),
        date: isoDate,
        dayOfWeek: 'Çarşamba',
        period: parsedPeriod,
        periodLabel: examPeriodInput.trim() || `${parsedPeriod}. Ders`,
        subjectId: subjects[0]?.id || '',
        subjectName: subjects[0]?.name || '',
        assignedClasses: [],
      };
      setExams(prev => [...prev, newExam]);
      setActiveExamId(newId);
      showToast('Yeni sınav kaydedildi.');
    }
  };

  // Add / Switch Exam
  const handleCreateNewExam = () => {
    const newId = `exam-${Date.now()}`;
    const newExam: Exam = {
      id: newId,
      name: `ORTAK SINAV (${exams.length + 1})`,
      date: new Date().toISOString().split('T')[0],
      dayOfWeek: 'Çarşamba',
      period: 3,
      periodLabel: '3. Ders',
      subjectId: subjects[0]?.id || '',
      subjectName: subjects[0]?.name || '',
      assignedClasses: [],
    };
    setExams(prev => [...prev, newExam]);
    setActiveExamId(newId);
    showToast('Yeni sınav oluşturuldu.');
  };

  // 2. Add or Update Subject
  const handleAddOrUpdateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectNameInput.trim()) {
      showToast('Lütfen ders adını giriniz.');
      return;
    }

    const teachers = subjectTeachersInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (selectedSubjectId) {
      setSubjects(prev =>
        prev.map(s =>
          s.id === selectedSubjectId
            ? {
                ...s,
                name: subjectNameInput.trim(),
                teachers: teachers,
              }
            : s
        )
      );
      setExams(prevExams =>
        prevExams.map(ex => ({
          ...ex,
          assignedClasses: ex.assignedClasses.map(ac =>
            ac.subjectId === selectedSubjectId
              ? { ...ac, subjectName: subjectNameInput.trim() }
              : ac
          ),
        }))
      );
      showToast(`"${subjectNameInput.trim()}" dersi güncellendi.`);
      setSelectedSubjectId(null);
    } else {
      const newSubject: Subject = {
        id: `sub-${Date.now()}`,
        name: subjectNameInput.trim(),
        code: subjectNameInput.trim().substring(0, 3).toUpperCase(),
        teachers: teachers,
      };
      setSubjects(prev => [...prev, newSubject]);
      showToast(`"${subjectNameInput.trim()}" listeye eklendi.`);
    }

    setSubjectNameInput('');
    setSubjectTeachersInput('');
  };

  const handleSelectSubjectRow = (subj: Subject) => {
    if (selectedSubjectId === subj.id) {
      setSelectedSubjectId(null);
      setSubjectNameInput('');
      setSubjectTeachersInput('');
    } else {
      setSelectedSubjectId(subj.id);
      setSubjectNameInput(subj.name);
      setSubjectTeachersInput(subj.teachers.join(', '));
    }
  };

  // Delete Current Exam (when more than 1 exam exists)
  const handleDeleteCurrentExam = () => {
    if (!activeExam) return;
    if (exams.length <= 1) {
      showToast('En az 1 sınav kalmalıdır. Yeni sınav ekledikten sonra bunu silebilirsiniz.');
      return;
    }
    setExamToDelete(activeExam);
  };

  const confirmDeleteExam = () => {
    if (!examToDelete) return;
    const examName = examToDelete.name;
    const remaining = exams.filter(e => e.id !== examToDelete.id);
    setExams(remaining);
    if (activeExamId === examToDelete.id) {
      setActiveExamId(remaining[0]?.id || '');
    }
    setExamToDelete(null);
    showToast(`"${examName}" sınavı başarıyla silindi.`);
  };

  // subjects dizisindeki öğeleri id parametresiyle filtreleyerek güncelleyen removeSubject fonksiyonu
  const removeSubject = (id: string) => {
    if (!id) return;
    const target = subjects.find(s => s.id === id);
    if (target) {
      setSubjectToDelete(target);
    }
  };

  const confirmDeleteSubject = () => {
    if (!subjectToDelete) return;
    const id = subjectToDelete.id;
    const subjectName = subjectToDelete.name;

    // subjects dizisini filtreleyerek güncelle
    setSubjects(prev => prev.filter(s => s.id !== id));

    // Seçili ders siliniyorsa seçim durumunu ve form alanlarını temizle
    if (selectedSubjectId === id) {
      setSelectedSubjectId(null);
      setSubjectNameInput('');
      setSubjectTeachersInput('');
    }

    // Sınavlara atanmış sınıflar arasında bu ders varsa senkronize et
    setExams(prevExams =>
      prevExams.map(ex => ({
        ...ex,
        assignedClasses: ex.assignedClasses.filter(ac => ac.subjectId !== id),
      }))
    );

    // Açılır menüdeki varsayılan dersi güncelle
    setSelectedSubjectToAssign(prevSelected => {
      if (prevSelected === id) {
        const remaining = subjects.filter(s => s.id !== id);
        return remaining.length > 0 ? remaining[0].id : '';
      }
      return prevSelected;
    });

    setSubjectToDelete(null);
    showToast(`"${subjectName}" dersi başarıyla silindi.`);
  };

  // 3. Assign Class
  const handleAssignClassToExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExam) return;
    if (!selectedClassToAssign) return;

    const subj = subjects.find(s => s.id === selectedSubjectToAssign);
    if (!subj) {
      showToast('Lütfen bir ders seçiniz.');
      return;
    }

    const alreadyExists = activeExam.assignedClasses.some(
      ac => ac.classLevel.toUpperCase() === selectedClassToAssign.toUpperCase()
    );

    if (alreadyExists) {
      setExams(prev =>
        prev.map(ex =>
          ex.id === activeExam.id
            ? {
                ...ex,
                assignedClasses: ex.assignedClasses.map(ac =>
                  ac.classLevel.toUpperCase() === selectedClassToAssign.toUpperCase()
                    ? { ...ac, subjectId: subj.id, subjectName: subj.name }
                    : ac
                ),
              }
            : ex
        )
      );
      showToast(`${selectedClassToAssign} sınıfının dersi "${subj.name}" yapıldı.`);
      return;
    }

    const newAssignment: ExamClassAssignment = {
      id: `ac-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      classLevel: selectedClassToAssign,
      subjectId: subj.id,
      subjectName: subj.name,
    };

    setExams(prev =>
      prev.map(ex =>
        ex.id === activeExam.id
          ? { ...ex, assignedClasses: [...ex.assignedClasses, newAssignment] }
          : ex
      )
    );
    setSelectedAssignmentId(newAssignment.id);
    showToast(`${selectedClassToAssign} atandı.`);
  };

  const handleDeleteSelectedAssignment = (assignmentIdToDelete?: string) => {
    if (!activeExam) return;
    const id = assignmentIdToDelete || selectedAssignmentId;
    if (!id) return;

    const target = activeExam.assignedClasses.find(ac => ac.id === id);
    const targetName = target ? target.classLevel : 'Sınıf';

    setExams(prev =>
      prev.map(ex =>
        ex.id === activeExam.id
          ? {
              ...ex,
              assignedClasses: ex.assignedClasses.filter(ac => ac.id !== id),
            }
          : ex
      )
    );
    if (selectedAssignmentId === id) {
      setSelectedAssignmentId(null);
    }
    showToast(`${targetName} ataması silindi.`);
  };

  const handleDeleteAllAssignments = () => {
    if (!activeExam || activeExam.assignedClasses.length === 0) return;
    const count = activeExam.assignedClasses.length;
    setExams(prev =>
      prev.map(ex => (ex.id === activeExam.id ? { ...ex, assignedClasses: [] } : ex))
    );
    setSelectedAssignmentId(null);
    showToast(`Tüm sınıf atamaları (${count} şube) silindi.`);
  };

  // Quick batch assign for class levels (e.g. all 9th or 10th grades)
  const handleBatchAssignLevel = (level: string) => {
    if (!activeExam) return;
    const subj = subjects.find(s => s.id === selectedSubjectToAssign) || subjects[0];
    if (!subj) {
      showToast('Lütfen önce bir ders seçiniz.');
      return;
    }

    const matchingClasses = defaultClassOptions.filter(cls =>
      cls.includes(` ${level}-`) || cls.startsWith(level)
    );

    if (matchingClasses.length === 0) return;

    setExams(prev =>
      prev.map(ex => {
        if (ex.id !== activeExam.id) return ex;
        // Keep existing that are not in matchingClasses, and add new ones
        const existingFiltered = ex.assignedClasses.filter(
          ac => !matchingClasses.includes(ac.classLevel)
        );
        const newAdditions: ExamClassAssignment[] = matchingClasses.map(cls => ({
          id: `ac-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          classLevel: cls,
          subjectId: subj.id,
          subjectName: subj.name,
        }));
        return {
          ...ex,
          assignedClasses: [...existingFiltered, ...newAdditions],
        };
      })
    );
    showToast(`Tüm ${level}. sınıflara "${subj.name}" atandı.`);
  };

  const assignedSubjectsSummary = Array.from(
    new Set(activeExam?.assignedClasses.map(a => a.subjectName.toUpperCase()) || [])
  ).join(' - ');

  const examHeaderSummary = `${
    assignedSubjectsSummary || activeExam?.name || 'ORTAK SINAV'
  } - ${examDateInput || formatToTRDate(activeExam?.date || '')}`;

  return (
    <div className="w-full space-y-2.5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* COMPACT TOP SUMMARY BAR */}
      <div className="bg-white rounded-xl px-3.5 py-2 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="font-extrabold text-cyan-800 flex items-center gap-1.5 shrink-0">
            <BookOpen className="w-4 h-4 text-cyan-600" />
            <span>Aktif Sınav:</span>
          </span>
          <span className="font-bold text-slate-800 italic truncate" title={examHeaderSummary}>
            {examHeaderSummary}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
            <span className="text-slate-500 font-semibold text-[11px]">Sınav Değiştir:</span>
            <select
              value={activeExamId}
              onChange={e => setActiveExamId(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
            >
              {exams.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} ({formatToTRDate(e.date)})
                </option>
              ))}
            </select>
          </div>

          {exams.length > 1 && (
            <button
              type="button"
              onClick={handleDeleteCurrentExam}
              className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-2 py-1 rounded-lg text-xs transition cursor-pointer shadow-2xs"
              title="Aktif sınavı sil"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Sınavı Sil</span>
            </button>
          )}

          <button
            onClick={handleCreateNewExam}
            className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shadow-2xs"
            title="Yeni Sınav Tanımla"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Sınav</span>
          </button>
        </div>
      </div>

      {/* 3 COMPACT CARDS IN SINGLE RESPONSIVE NON-SCROLLING GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* CARD 1: Sınav Bilgileri (col-span-3) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-sky-300 shadow-2xs flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div className="bg-sky-50 px-3 py-1.5 border-b border-sky-200 flex items-center justify-between">
            <span className="text-xs font-black text-sky-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>Sınav Bilgileri</span>
            </span>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-200/60 px-1.5 py-0.5 rounded">
              Temel Ayarlar
            </span>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSaveExamInfo} className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Sınav Adı:</label>
                <input
                  type="text"
                  value={examName}
                  onChange={e => setExamName(e.target.value)}
                  placeholder="1. DÖNEM 1. ORTAK SINAV"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-400 focus:outline-none uppercase bg-slate-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Tarih (GG.AA.YYYY):
                </label>
                <input
                  type="text"
                  value={examDateInput}
                  onChange={e => setExamDateInput(e.target.value)}
                  placeholder="24.12.2025"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-400 focus:outline-none bg-slate-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Ders Saati (Örn: 5. Ders):
                </label>
                <input
                  type="text"
                  value={examPeriodInput}
                  onChange={e => setExamPeriodInput(e.target.value)}
                  placeholder="5. Ders"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-400 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div className="p-2 bg-sky-50/70 border border-sky-200/80 rounded-lg text-[10.5px] text-sky-800 leading-snug">
                <strong>Not:</strong> Girilen tarih ve saat; yoklama listelerine, salon planlarına ve gözetmen tutanaklarına otomatik aktarılır.
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Sınav Bilgilerini Kaydet</span>
            </button>
          </form>
        </div>

        {/* CARD 2: Okul Ders Listesi (Komisyon) (col-span-4) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-cyan-300 shadow-2xs flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div className="bg-cyan-50 px-3 py-1.5 border-b border-cyan-200 flex items-center justify-between">
            <span className="text-xs font-black text-cyan-800 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
              <span>Okul Ders Listesi (Komisyon)</span>
            </span>
            <span className="text-[10px] font-bold text-cyan-700 bg-cyan-200/60 px-1.5 py-0.5 rounded">
              {subjects.length} Ders Tanımlı
            </span>
          </div>

          <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
            {/* Input Form */}
            <form onSubmit={handleAddOrUpdateSubject} className="space-y-1.5 text-xs">
              <div className="grid grid-cols-12 gap-1.5">
                <div className="col-span-5">
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Ders Adı:</label>
                  <input
                    type="text"
                    value={subjectNameInput}
                    onChange={e => setSubjectNameInput(e.target.value)}
                    placeholder="Örn: Tarih"
                    className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-400 focus:outline-none bg-slate-50/50"
                  />
                </div>

                <div className="col-span-7">
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Öğretmenler (Virgülle):
                  </label>
                  <input
                    type="text"
                    value={subjectTeachersInput}
                    onChange={e => setSubjectTeachersInput(e.target.value)}
                    placeholder="A.SALDIR, M.KURT"
                    className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-cyan-400 focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="flex justify-center pt-0.5">
                <button
                  type="submit"
                  className="w-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold py-1 px-4 rounded-lg text-xs flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{selectedSubjectId ? 'Dersi Güncelle' : '+ Ekle/Güncelle'}</span>
                </button>
              </div>
            </form>

            {/* Compact Subjects Table */}
            <div className="flex-1 flex flex-col min-h-0 border border-slate-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 bg-blue-600 text-white font-bold text-[11px] py-1 px-2 border-b border-blue-700 select-none items-center">
                <span className="col-span-5">Ders Adı</span>
                <span className="col-span-5">Komisyon</span>
                <span className="col-span-2 text-right">İşlem</span>
              </div>

              <div className="overflow-y-auto max-h-44 divide-y divide-slate-100 bg-white text-xs">
                {subjects.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 italic text-[11px]">
                    Ders tanımlanmamış.
                  </div>
                ) : (
                  subjects.map(s => {
                    const isSelected = selectedSubjectId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSelectSubjectRow(s)}
                        className={`grid grid-cols-12 items-center py-1 px-2 cursor-pointer transition select-none ${
                          isSelected
                            ? 'bg-blue-100 text-blue-900 font-bold border-l-4 border-blue-600'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                        title="Düzenlemek için tıklayın"
                      >
                        <span className="col-span-5 truncate font-semibold pr-1">{s.name}</span>
                        <span className="col-span-5 truncate text-slate-500 font-normal text-[11px]">
                          {s.teachers && s.teachers.length > 0 ? s.teachers.join(', ') : '-'}
                        </span>
                        <span className="col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSubject(s.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title={`"${s.name}" dersini sil`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-[10px] text-slate-400 italic">
                {selectedSubjectId ? 'Ders seçildi (Düzenlenebilir)' : 'Düzenlemek için derse tıklayın'}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedSubjectId) {
                    removeSubject(selectedSubjectId);
                  }
                }}
                disabled={!selectedSubjectId}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition shadow-2xs ${
                  selectedSubjectId
                    ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
                title={selectedSubjectId ? 'Seçili dersi sil' : 'Önce listeden bir ders seçin'}
              >
                <Trash2 className="w-3 h-3" />
                <span>Sil</span>
              </button>
            </div>
          </div>
        </div>

        {/* CARD 3: Sınava Girecek Sınıf Ata (col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-cyan-300 shadow-2xs flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div className="bg-cyan-50 px-3 py-1.5 border-b border-cyan-200 flex items-center justify-between">
            <span className="text-xs font-black text-cyan-800 flex items-center gap-1.5">
              <Split className="w-3.5 h-3.5 text-cyan-600" />
              <span>Sınava Girecek Sınıf Ata</span>
            </span>
            <span className="text-[10px] font-bold text-cyan-700 bg-cyan-200/60 px-1.5 py-0.5 rounded">
              {activeExam?.assignedClasses.length || 0} Şube Atandı
            </span>
          </div>

          <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
            {/* Dropdown Assignment Form */}
            <form onSubmit={handleAssignClassToExam} className="space-y-1.5 text-xs">
              <div className="grid grid-cols-12 gap-1.5 items-end">
                <div className="col-span-5">
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Sınıf:</label>
                  <select
                    value={selectedClassToAssign}
                    onChange={e => setSelectedClassToAssign(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-cyan-400 focus:outline-none bg-slate-50/50 cursor-pointer"
                  >
                    {defaultClassOptions.map(cls => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-5">
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Ders:</label>
                  <select
                    value={selectedSubjectToAssign}
                    onChange={e => setSelectedSubjectToAssign(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-cyan-400 focus:outline-none bg-slate-50/50 cursor-pointer"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <button
                    type="submit"
                    className="w-full border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold py-1 px-1 rounded-lg text-xs flex items-center justify-center gap-0.5 transition cursor-pointer shadow-2xs"
                    title="Seçili sınıfı bu derse ata"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ata</span>
                  </button>
                </div>
              </div>

              {/* Quick Batch Assign Badges */}
              <div className="flex items-center gap-1 pt-0.5 text-[10px] text-slate-500">
                <span className="font-semibold">Hızlı Kademe Ata:</span>
                {['9', '10', '11', '12'].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleBatchAssignLevel(lvl)}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 transition cursor-pointer"
                    title={`Tüm ${lvl}. sınıflara seçili dersi ata`}
                  >
                    Tüm {lvl}'lar
                  </button>
                ))}
              </div>
            </form>

            {/* Assigned Classes Table */}
            <div className="flex-1 flex flex-col min-h-0 border border-slate-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 bg-blue-600 text-white font-bold text-[11px] py-1 px-2 border-b border-blue-700 select-none items-center">
                <span className="col-span-5">Sınıf</span>
                <span className="col-span-5">Sınav Dersi</span>
                <span className="col-span-2 text-right">İşlem</span>
              </div>

              <div className="overflow-y-auto max-h-44 divide-y divide-slate-100 bg-white text-xs">
                {!activeExam || activeExam.assignedClasses.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 italic text-[11px]">
                    Henüz sınava sınıf atanmadı.
                  </div>
                ) : (
                  activeExam.assignedClasses.map(ac => {
                    const isSelected = selectedAssignmentId === ac.id;
                    return (
                      <div
                        key={ac.id}
                        onClick={() => setSelectedAssignmentId(ac.id)}
                        className={`grid grid-cols-12 items-center py-1 px-2 cursor-pointer transition select-none ${
                          isSelected
                            ? 'bg-blue-100 text-blue-900 font-bold border-l-4 border-blue-600'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                        title="Seçmek için tıklayın"
                      >
                        <span className="col-span-5 font-bold text-slate-800 pr-1">{ac.classLevel}</span>
                        <span className="col-span-5 truncate font-medium text-slate-600 text-[11px]">
                          {ac.subjectName}
                        </span>
                        <span className="col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSelectedAssignment(ac.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title={`${ac.classLevel} atamasını sil`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Actions for Assigned Classes */}
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[10px] text-slate-500 font-semibold">
                Toplam: {activeExam?.assignedClasses.length || 0} Şube
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDeleteSelectedAssignment()}
                  disabled={!selectedAssignmentId}
                  className={`flex items-center gap-1 border font-bold px-2 py-1 rounded-lg text-[11px] transition shadow-2xs ${
                    selectedAssignmentId
                      ? 'border-rose-400 text-rose-600 hover:bg-rose-50 cursor-pointer active:scale-95'
                      : 'border-slate-200 text-slate-300 cursor-not-allowed'
                  }`}
                  title={selectedAssignmentId ? 'Seçili sınıf atamasını sil' : 'Önce listeden bir şube seçin'}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Seçiliyi Sil</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteAllAssignments}
                  disabled={!activeExam?.assignedClasses?.length}
                  className={`flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg text-[11px] transition shadow-2xs ${
                    activeExam?.assignedClasses?.length
                      ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95'
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                  title="Tüm sınıf atamalarını temizle"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>TÜMÜNÜ SİL</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DERS SİLME ONAY MODALI (Iframe uyumlu) */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Dersi Sil</h3>
                <p className="text-xs text-slate-500 font-medium">Bu işlem dersi listeden kaldırır</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              <strong className="text-slate-900 font-bold">{subjectToDelete.name}</strong> dersini silmek istediğinize emin misiniz?
              {exams.some(ex => ex.assignedClasses.some(ac => ac.subjectId === subjectToDelete.id)) && (
                <span className="block mt-1 text-rose-600 font-semibold text-[11px]">
                  * Bu derse atanmış olan tüm sınıf eşleşmeleri de temizlenecektir.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmDeleteSubject}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Evet, Dersi Sil</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINAV SİLME ONAY MODALI (Iframe uyumlu) */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sınavı Sil</h3>
                <p className="text-xs text-slate-500 font-medium">Bu işlem sınavı sistemden kaldırır</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              <strong className="text-slate-900 font-bold">{examToDelete.name}</strong> sınavını ve bu sınava ait tüm oturum ve sınıf atamalarını silmek istediğinize emin misiniz?
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
                <span>Evet, Sınavı Sil</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
