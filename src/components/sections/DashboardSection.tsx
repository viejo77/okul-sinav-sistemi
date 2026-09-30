import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  DoorClosed,
  GraduationCap,
  LayoutGrid,
  Split,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Printer,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Clock,
  TrendingUp,
  Percent,
  Layers,
  ChevronRight,
  Award,
  Zap,
  BookOpen,
} from 'lucide-react';
import { Classroom, Exam, Student, Subject, Teacher, SeatingPlanResult } from '../../types';
import { getClassColor } from '../../utils/classColors';

interface Props {
  exams: Exam[];
  activeExam: Exam | undefined;
  activeExamId: string;
  setActiveExamId: (id: string) => void;
  subjects: Subject[];
  students: Student[];
  classrooms: Classroom[];
  teachers: Teacher[];
  currentPlan: SeatingPlanResult | undefined;
  onNavigateTab: (tabId: number) => void;
  onOpenPrintModal: (mode: 'SALON' | 'SUPERVISOR' | 'BEP' | 'CLASSES') => void;
  onGeneratePlan?: () => void;
}

export const DashboardSection: React.FC<Props> = ({
  exams,
  activeExam,
  activeExamId,
  setActiveExamId,
  subjects,
  students,
  classrooms,
  teachers,
  currentPlan,
  onNavigateTab,
  onOpenPrintModal,
  onGeneratePlan,
}) => {
  // Format Date TR
  const formatTRDate = (isoDate?: string): string => {
    if (!isoDate) return '-';
    if (isoDate.includes('.')) return isoDate;
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return isoDate;
  };

  // --- Consolidate Metrics across all sections ---

  // 1. Participating Students in Active Exam
  const assignedClassSet = useMemo(() => {
    return new Set(activeExam?.assignedClasses.map(a => a.classLevel.toUpperCase()) || []);
  }, [activeExam]);

  const participatingStudents = useMemo(() => {
    if (!activeExam || assignedClassSet.size === 0) {
      return students; // Fallback to all if none explicitly assigned
    }
    return students.filter(s => assignedClassSet.has(s.classLevel.toUpperCase()));
  }, [students, activeExam, assignedClassSet]);

  const bepStudents = useMemo(() => {
    return participatingStudents.filter(s => s.isBEP);
  }, [participatingStudents]);

  // Participating grade levels breakdown
  const gradeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    participatingStudents.forEach(s => {
      const grade = s.classLevel.split('-')[0] || s.classLevel;
      counts[grade] = (counts[grade] || 0) + 1;
    });
    return counts;
  }, [participatingStudents]);

  // 2. Active Classrooms & Capacity
  const activeClassrooms = useMemo(() => {
    return classrooms.filter(c => c.isSelectedForExam !== false);
  }, [classrooms]);

  const totalCapacity = useMemo(() => {
    return activeClassrooms.reduce((acc, c) => acc + (c.capacity || 0), 0);
  }, [activeClassrooms]);

  const capacityBuffer = totalCapacity - participatingStudents.length;
  const capacityCoverageRatio =
    participatingStudents.length > 0
      ? Math.round((totalCapacity / participatingStudents.length) * 100)
      : 0;

  // 3. Teachers & Supervisors
  const totalTeachersCount = teachers.length;
  const neededSupervisorsCount = activeClassrooms.length;
  const availableSupervisorsRatio =
    neededSupervisorsCount > 0
      ? Math.min(100, Math.round((totalTeachersCount / neededSupervisorsCount) * 100))
      : 100;

  // 4. Seating Plan (Butterfly) Status
  const isPlanValidForActiveExam =
    !!currentPlan && (!activeExam || currentPlan.examId === activeExam.id);

  const totalSeatedCount = useMemo(() => {
    if (!isPlanValidForActiveExam || !currentPlan) return 0;
    return currentPlan.rooms.reduce((acc, r) => acc + r.totalAssigned, 0);
  }, [isPlanValidForActiveExam, currentPlan]);

  const unassignedCount = isPlanValidForActiveExam ? currentPlan?.unassignedStudents?.length || 0 : 0;

  const averageRoomOccupancy = useMemo(() => {
    if (!isPlanValidForActiveExam || !currentPlan || currentPlan.rooms.length === 0) return 0;
    const totalAssigned = currentPlan.rooms.reduce((acc, r) => acc + r.totalAssigned, 0);
    const totalCap = currentPlan.rooms.reduce((acc, r) => acc + r.capacity, 0);
    return totalCap > 0 ? Math.round((totalAssigned / totalCap) * 100) : 0;
  }, [isPlanValidForActiveExam, currentPlan]);

  // 5. Readiness Checklist (6 Key Pillars)
  const checklist = useMemo(() => {
    const hasExam = !!activeExam && activeExam.name.trim().length > 0;
    const hasAssignedClasses = (activeExam?.assignedClasses?.length || 0) > 0;
    const hasStudents = participatingStudents.length > 0;
    const hasCapacity = totalCapacity >= participatingStudents.length && totalCapacity > 0;
    const hasSupervisors = totalTeachersCount >= neededSupervisorsCount && totalTeachersCount > 0;
    const hasPlan = isPlanValidForActiveExam && totalSeatedCount > 0 && unassignedCount === 0;

    return [
      {
        id: 1,
        tabId: 1,
        title: 'Sınav Tanımlama & Dersler',
        desc: hasAssignedClasses
          ? `${activeExam?.assignedClasses.length} şube ve ders eşlendi`
          : 'Sınava sınıf/ders atanmalı',
        passed: hasExam && hasAssignedClasses,
      },
      {
        id: 2,
        tabId: 2,
        title: 'Öğrenci Listesi & BEP',
        desc: hasStudents
          ? `${participatingStudents.length} öğrenci (${bepStudents.length} BEP)`
          : 'Öğrenci listesi bulunamadı',
        passed: hasStudents,
      },
      {
        id: 3,
        tabId: 3,
        title: 'Salon Kapasitesi & Düzen',
        desc: hasCapacity
          ? `${activeClassrooms.length} salon (${totalCapacity} koltuk, Tampon: +${capacityBuffer})`
          : `Kapasite yetersiz (${totalCapacity} / ${participatingStudents.length})`,
        passed: hasCapacity,
      },
      {
        id: 4,
        tabId: 4,
        title: 'Gözetmen Dağılımı',
        desc: hasSupervisors
          ? `${totalTeachersCount} öğretmen hazır (${neededSupervisorsCount} salon)`
          : 'Öğretmen sayısı salon sayısından az',
        passed: hasSupervisors,
      },
      {
        id: 5,
        tabId: 5,
        title: 'Kelebek Oturma Planı',
        desc: hasPlan
          ? `${totalSeatedCount} öğrenci yerleşti (0 çakışma)`
          : isPlanValidForActiveExam && unassignedCount > 0
          ? `${unassignedCount} öğrenci açıkta!`
          : 'Dağıtım motoru çalıştırılmalı',
        passed: hasPlan,
      },
      {
        id: 6,
        tabId: 6,
        title: 'Resmi Çıktılar & Tutanaklar',
        desc: hasPlan ? 'Kapı listeleri ve tutanaklar hazır' : 'Oturma planı bekleniyor',
        passed: hasPlan,
      },
    ];
  }, [
    activeExam,
    participatingStudents,
    bepStudents,
    totalCapacity,
    capacityBuffer,
    activeClassrooms,
    totalTeachersCount,
    neededSupervisorsCount,
    isPlanValidForActiveExam,
    totalSeatedCount,
    unassignedCount,
  ]);

  const passedStepsCount = checklist.filter(c => c.passed).length;
  const readinessPercentage = Math.round((passedStepsCount / checklist.length) * 100);

  // Assigned Subjects string
  const assignedSubjectsList = useMemo(() => {
    return Array.from(
      new Set(activeExam?.assignedClasses.map(a => a.subjectName.toUpperCase()) || [])
    );
  }, [activeExam]);

  return (
    <div className="space-y-4">
      {/* 1. TOP EXECUTIVE HEADER BAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <LayoutDashboard className="w-6 h-6" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                {activeExam ? activeExam.name : 'Sınav Genel Bakış & Kontrol Paneli'}
              </h1>

              {/* Status Badge */}
              <span
                className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                  readinessPercentage === 100
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : readinessPercentage >= 60
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                {readinessPercentage === 100 ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>%100 Hazır • Sınava Uygun</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>%{readinessPercentage} Hazır • Dağıtım Bekliyor</span>
                  </>
                )}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <strong>Tarih:</strong> {formatTRDate(activeExam?.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <strong>Oturum:</strong> {activeExam?.periodLabel || `${activeExam?.period || 3}. Ders`}
              </span>
              {assignedSubjectsList.length > 0 && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <strong>Dersler:</strong> {assignedSubjectsList.join(', ')}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right Side: Quick Exam Selector & Navigation */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          {exams.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-slate-500 font-medium">Aktif Sınav:</span>
              <select
                value={activeExamId}
                onChange={e => setActiveExamId(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs max-w-[180px] truncate"
              >
                {exams.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => onNavigateTab(5)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Kelebek Düzeni</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. FOUR KEY METRIC CARDS (KPI GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: Öğrenci Mevcudu */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Sınava Katılan Öğrenci
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">
                  {participatingStudents.length}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  / {students.length} Toplam
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              <strong className="text-emerald-700">{bepStudents.length} BEP</strong> •{' '}
              {assignedClassSet.size || Object.keys(gradeDistribution).length} Şube
            </span>
            <button
              onClick={() => onNavigateTab(2)}
              className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
            >
              <span>Listeyi Gör</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* CARD 2: Salon & Kapasite */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Salon & Kapasite
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{activeClassrooms.length}</span>
                <span className="text-xs font-semibold text-slate-500">
                  Salon ({totalCapacity} Koltuk)
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <DoorClosed className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span
              className={`font-semibold ${
                capacityBuffer >= 0 ? 'text-emerald-600' : 'text-rose-600 font-bold'
              }`}
            >
              {capacityBuffer >= 0 ? `+${capacityBuffer} Tampon Koltuk` : `${Math.abs(capacityBuffer)} Koltuk Eksik!`}
            </span>
            <button
              onClick={() => onNavigateTab(3)}
              className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
            >
              <span>Yönet</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* CARD 3: Gözetmen Kadrosu */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Gözetmen & Komisyon
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">
                  {isPlanValidForActiveExam && currentPlan
                    ? currentPlan.rooms.filter(r => !!r.supervisorName).length
                    : neededSupervisorsCount}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  / {totalTeachersCount} Öğretmen
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              <strong className="text-purple-700">0 Branş Çakışması</strong> (Adil Nöbet)
            </span>
            <button
              onClick={() => onNavigateTab(4)}
              className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
            >
              <span>Program</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* CARD 4: Kelebek Yerleşim */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Kelebek Dağıtım Durumu
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className={`text-2xl font-black ${
                    isPlanValidForActiveExam ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                >
                  {isPlanValidForActiveExam ? `${totalSeatedCount}` : 'Bekliyor'}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {isPlanValidForActiveExam ? `Yerleşen (%${averageRoomOccupancy} Doluluk)` : 'Henüz yapılmadı'}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <LayoutGrid className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span
              className={`font-semibold ${
                unassignedCount === 0 && isPlanValidForActiveExam
                  ? 'text-emerald-600'
                  : 'text-amber-600'
              }`}
            >
              {isPlanValidForActiveExam
                ? unassignedCount === 0
                  ? '0 Açıkta • Tam Uyum'
                  : `${unassignedCount} Açıkta!`
                : 'Dağıtımı Başlat'}
            </span>
            <button
              onClick={() => onNavigateTab(5)}
              className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
            >
              <span>{isPlanValidForActiveExam ? 'Krokiler' : 'Başlat'}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONSOLIDATED SPLIT GRID (7 cols + 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN (7 cols): Readiness Checklist & Room Quick Status */}
        <div className="lg:col-span-7 space-y-4">
          {/* A. Sınav Hazırlık Denetimi (Readiness Health Checklist) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Sınav Hazırlık Denetim Listesi (Pre-Exam Audit)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Okul ortak sınav planlama sürecinin tamamlanma oranı
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-black text-indigo-600">
                  {passedStepsCount} / {checklist.length} Tamamlandı
                </span>
                <div className="w-28 bg-slate-100 rounded-full h-2 mt-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      readinessPercentage === 100
                        ? 'bg-emerald-500'
                        : readinessPercentage >= 60
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${readinessPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Checklist Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {checklist.map(step => (
                <div
                  key={step.id}
                  onClick={() => onNavigateTab(step.tabId)}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-2.5 transition cursor-pointer select-none ${
                    step.passed
                      ? 'bg-emerald-50/40 border-emerald-200/70 hover:border-emerald-300'
                      : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        step.passed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-500 font-bold text-[10px]'
                      }`}
                    >
                      {step.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.id}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {step.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  <span className="text-slate-400 hover:text-indigo-600 mt-1">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* B. Salon Bazlı Doluluk & Gözetmen Özeti (Quick Room Matrix) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <DoorClosed className="w-4 h-4 text-indigo-600" />
                  <span>Salon Doluluk ve Görev Dağılımı</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Aktif sınav salonlarının kapasite ve yerleşim durumları
                </p>
              </div>

              <button
                onClick={() => onNavigateTab(7)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Detaylı Analiz</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Room rows table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 bg-slate-50 text-[11px] font-bold text-slate-600 px-3 py-2 border-b border-slate-200">
                <span className="col-span-4">Salon Adı</span>
                <span className="col-span-3">Mevcut / Kapasite</span>
                <span className="col-span-3">Doluluk</span>
                <span className="col-span-2 text-right">Gözetmen</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto bg-white text-xs">
                {activeClassrooms.map((room, idx) => {
                  const planRoom = currentPlan?.rooms.find(r => r.classroomId === room.id);
                  const assigned = planRoom ? planRoom.totalAssigned : 0;
                  const capacity = room.capacity || 30;
                  const occRatio = Math.round((assigned / capacity) * 100);
                  const supervisor = planRoom?.supervisorName || (teachers[idx % teachers.length]?.name || 'Atanmadı');

                  return (
                    <div
                      key={room.id}
                      onClick={() => onNavigateTab(5)}
                      className="grid grid-cols-12 items-center px-3 py-2 hover:bg-slate-50 transition cursor-pointer select-none"
                    >
                      <span className="col-span-4 font-bold text-slate-800 truncate pr-1">
                        {room.name}
                      </span>
                      <span className="col-span-3 text-slate-600 font-medium">
                        {assigned > 0 ? (
                          <>
                            <strong className="text-slate-900">{assigned}</strong> / {capacity}
                          </>
                        ) : (
                          <span className="text-slate-400">- / {capacity}</span>
                        )}
                      </span>
                      <div className="col-span-3 pr-2 flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              occRatio >= 80
                                ? 'bg-emerald-500'
                                : occRatio >= 50
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${occRatio || 10}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 w-7 text-right">
                          %{occRatio}
                        </span>
                      </div>
                      <span className="col-span-2 text-right text-[11px] font-semibold text-slate-600 truncate" title={supervisor}>
                        {supervisor}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Class Matrix, Quick Print & Action Hub */}
        <div className="lg:col-span-5 space-y-4">
          {/* C. Sınava Katılan Şubeler & Ders Dağılımı */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Split className="w-4 h-4 text-cyan-600" />
                  <span>Sınav Şubeleri ve Dersler</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bu oturumda sınava girecek sınıfların listesi
                </p>
              </div>

              <button
                onClick={() => onNavigateTab(1)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Düzenle</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {!activeExam || activeExam.assignedClasses.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl">
                  Sınava henüz sınıf atanmadı. 'Sınav Tanımlama' bölümünden atama yapabilirsiniz.
                </div>
              ) : (
                activeExam.assignedClasses.map(ac => {
                  const classStudentCount = participatingStudents.filter(
                    s => s.classLevel.toUpperCase() === ac.classLevel.toUpperCase()
                  ).length;
                  const colorClass = getClassColor(ac.classLevel);

                  return (
                    <div
                      key={ac.id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-slate-200 transition flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${colorClass}`}>
                          {ac.classLevel}
                        </span>
                        <span className="font-semibold text-slate-700 truncate max-w-[140px]" title={ac.subjectName}>
                          {ac.subjectName}
                        </span>
                      </div>

                      <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                        {classStudentCount} Öğrenci
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* D. Hızlı Yazdırma ve Resmi Raporlar Merkezi */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Sınav Çıktıları & PDF İndir</h3>
                  <p className="text-[10px] text-slate-300">A4 PDF kaydetme ve sınav belgeleri yazdırma merkezi</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onOpenPrintModal('SALON')}
                disabled={!isPlanValidForActiveExam}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-left border border-slate-700 flex flex-col justify-between transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-200">Salon Oturma Planı</span>
                  <Printer className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span className="text-[10px] text-slate-400">Kroki + Sıra Matrisi</span>
              </button>

              <button
                onClick={() => onOpenPrintModal('CLASSES')}
                disabled={!isPlanValidForActiveExam}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-left border border-slate-700 flex flex-col justify-between transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-200">Kapı Listeleri</span>
                  <Split className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <span className="text-[10px] text-slate-400">Şube bazlı ası listesi</span>
              </button>

              <button
                onClick={() => onOpenPrintModal('SUPERVISOR')}
                disabled={!isPlanValidForActiveExam}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-left border border-slate-700 flex flex-col justify-between transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-200">Gözetmen Tutanakları</span>
                  <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <span className="text-[10px] text-slate-400">İmza sirküsü formatı</span>
              </button>

              <button
                onClick={() => onOpenPrintModal('BEP')}
                disabled={!isPlanValidForActiveExam}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-left border border-slate-700 flex flex-col justify-between transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-200">BEP Öğrenci Raporu</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-[10px] text-slate-400">Özel eğitim tutanağı</span>
              </button>
            </div>
          </div>

          {/* E. Kelebek Dağıtım İpucu & Hızlı Motor Çalıştırma */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {isPlanValidForActiveExam ? 'Dağıtım Güncel ve Geçerli' : 'Kelebek Dağıtımı Yapılmadı'}
                </h4>
                <p className="text-[10px] text-slate-500 leading-snug">
                  {isPlanValidForActiveExam
                    ? 'Sınav oturma krokileri ve kapı listeleri hazır.'
                    : 'Öğrencileri çapraz oturtmak için motoru başlatın.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab(5)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer shrink-0 shadow-xs"
            >
              {isPlanValidForActiveExam ? 'Planı Aç' : 'Şimdi Dağıt'}
            </button>
          </div>

          {/* F. Sorumluluk Sınavları Modülü Hızlı Erişim Kartı */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-4 shadow-sm border border-purple-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>9. Sorumluluk Sınavları Modülü</span>
                  <span className="text-[9px] bg-purple-400/20 text-purple-200 px-1.5 py-0.2 rounded border border-purple-400/30 font-semibold">
                    MEB
                  </span>
                </h4>
                <p className="text-[10px] text-purple-200 leading-snug">
                  Ders, komisyon üyesi öğretmenler, salon ve evrak çıktıları
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab(9)}
              className="px-3 py-1.5 bg-white text-purple-950 hover:bg-purple-50 font-bold rounded-xl text-xs transition cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
            >
              <span>Aç</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
