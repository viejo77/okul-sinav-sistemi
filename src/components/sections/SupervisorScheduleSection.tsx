import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Trash2,
  Plus,
  Edit2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Users,
  DoorClosed,
  Clock,
  Sparkles,
  RefreshCw,
  Calendar,
  UserX,
  UserCheck,
  ShieldAlert,
  Settings,
} from 'lucide-react';
import { Teacher, Exam, Subject, Classroom } from '../../types';
import {
  WeeklyScheduleItem,
  sampleScreenshotWeeklySchedule,
  downloadWeeklyScheduleCSV,
  parseWeeklyScheduleFile,
} from '../../services/excelService';
import { GoogleSheetsImportModal } from '../modals/GoogleSheetsImportModal';
import { BellScheduleModal } from '../modals/BellScheduleModal';
import { formatPeriodWithTimes } from '../../services/periodTimes';

interface Props {
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  activeExam: Exam | undefined;
  subjects: Subject[];
  classrooms?: Classroom[];
}

export const SupervisorScheduleSection: React.FC<Props> = ({
  teachers,
  setTeachers,
  activeExam,
  subjects,
  classrooms = [],
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active View Tab: 'SCHEDULE' | 'TEACHERS_DUTY' | 'LEAVE_MANAGEMENT'
  const [activeSubTab, setActiveSubTab] = useState<'SCHEDULE' | 'TEACHERS_DUTY' | 'LEAVE_MANAGEMENT'>('SCHEDULE');

  // Bell Schedule Modal State
  const [isBellModalOpen, setIsBellModalOpen] = useState(false);

  // Weekly schedule items state
  const [scheduleItems, setScheduleItems] = useState<WeeklyScheduleItem[]>(() => {
    const existingItems: WeeklyScheduleItem[] = [];
    teachers.forEach(t => {
      t.schedule.forEach((s, sIdx) => {
        existingItems.push({
          id: `item-${t.id}-${sIdx}`,
          day: s.day,
          period: s.period,
          periodLabel: formatPeriodWithTimes(s.period),
          classroomName: s.classroomName,
          teacherName: t.name,
          branch: t.branch,
        });
      });
    });

    if (existingItems.length > 0) {
      return existingItems;
    }
    return sampleScreenshotWeeklySchedule;
  });

  // Filter & Search states
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState<string>('');
  const [leaveSearchQuery, setLeaveSearchQuery] = useState<string>('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<WeeklyScheduleItem | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state for adding/editing lesson
  const [formDay, setFormDay] = useState<WeeklyScheduleItem['day']>('Cuma');
  const [formPeriod, setFormPeriod] = useState<number>(1);
  const [formPeriodLabel, setFormPeriodLabel] = useState<string>(formatPeriodWithTimes(1));
  const [formClassroom, setFormClassroom] = useState<string>('');
  const [formTeacher, setFormTeacher] = useState<string>('');
  const [formBranch, setFormBranch] = useState<string>('');
  const [formDutyDay, setFormDutyDay] = useState<Teacher['dutyDay']>('Cuma');

  // Active exam day & period
  const examDay = activeExam?.dayOfWeek || 'Cuma';
  const examPeriod = activeExam?.period || 1;

  // Auto-sync schedule items with `teachers` prop
  const syncWithTeachers = (items: WeeklyScheduleItem[]) => {
    const teacherMap = new Map<
      string,
      {
        lessons: {
          day: WeeklyScheduleItem['day'];
          period: number;
          classroomName: string;
          subjectName: string;
        }[];
        branch?: string;
      }
    >();

    items.forEach(item => {
      const cleanName = item.teacherName.trim();
      if (!cleanName) return;

      if (!teacherMap.has(cleanName)) {
        teacherMap.set(cleanName, { lessons: [], branch: item.branch });
      }
      const record = teacherMap.get(cleanName)!;
      record.lessons.push({
        day: item.day,
        period: item.period,
        classroomName: item.classroomName,
        subjectName: item.branch || 'Genel',
      });
    });

    setTeachers(prevTeachers => {
      const existingTeacherMap = new Map<string, Teacher>();
      prevTeachers.forEach(t => existingTeacherMap.set(t.name.toLowerCase().trim(), t));

      const updatedList: Teacher[] = [];

      teacherMap.forEach((data, teacherName) => {
        const lowerName = teacherName.toLowerCase().trim();
        const existing = existingTeacherMap.get(lowerName);

        if (existing) {
          updatedList.push({
            ...existing,
            schedule: data.lessons,
            branch: data.branch || existing.branch,
          });
          existingTeacherMap.delete(lowerName);
        } else {
          updatedList.push({
            id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: teacherName,
            branch: data.branch || 'Genel',
            dutyDay: data.lessons[0]?.day || 'Cuma',
            schedule: data.lessons,
          });
        }
      });

      // Keep existing teachers that might not have lessons in the schedule
      existingTeacherMap.forEach(t => {
        updatedList.push({
          ...t,
          schedule: [],
        });
      });

      return updatedList;
    });
  };

  // Sync on initial mount if teachers schedule is empty
  useEffect(() => {
    syncWithTeachers(scheduleItems);
  }, []);

  // Show temporary toast notification
  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // Filtered schedule items
  const filteredItems = useMemo(() => {
    return scheduleItems.filter(item => {
      if (selectedDayFilter !== 'ALL' && item.day !== selectedDayFilter) return false;
      if (selectedPeriodFilter !== 'ALL' && String(item.period) !== selectedPeriodFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTeacher = item.teacherName.toLowerCase().includes(query);
        const matchesClassroom = item.classroomName.toLowerCase().includes(query);
        const matchesHour = item.periodLabel.toLowerCase().includes(query);
        if (!matchesTeacher && !matchesClassroom && !matchesHour) return false;
      }

      return true;
    });
  }, [scheduleItems, selectedDayFilter, selectedPeriodFilter, searchQuery]);

  // Statistics
  const uniqueTeachersCount = useMemo(() => {
    return new Set(scheduleItems.map(i => i.teacherName.trim().toLowerCase())).size;
  }, [scheduleItems]);

  const uniqueSalonsCount = useMemo(() => {
    return new Set(scheduleItems.map(i => i.classroomName.trim().toLowerCase())).size;
  }, [scheduleItems]);

  const leaveTeachersCount = useMemo(() => {
    return teachers.filter(t => t.isLeave).length;
  }, [teachers]);

  // Handle Teacher Duty Day Change directly
  const handleTeacherDutyDayChange = (teacherId: string, newDutyDay: Teacher['dutyDay']) => {
    setTeachers(prev =>
      prev.map(t => (t.id === teacherId ? { ...t, dutyDay: newDutyDay } : t))
    );
    notify('success', 'Nöbet günü güncellendi.');
  };

  // Handle Teacher Leave Toggle
  const handleToggleLeave = (teacherId: string) => {
    setTeachers(prev =>
      prev.map(t => {
        if (t.id === teacherId) {
          const nextIsLeave = !t.isLeave;
          return {
            ...t,
            isLeave: nextIsLeave,
            leaveReason: nextIsLeave ? t.leaveReason || 'Sağlık Raporu' : undefined,
            leaveDate: nextIsLeave ? t.leaveDate || activeExam?.date || new Date().toISOString().split('T')[0] : undefined,
          };
        }
        return t;
      })
    );
  };

  const handleUpdateLeaveDetails = (
    teacherId: string,
    reason: string,
    date: string
  ) => {
    setTeachers(prev =>
      prev.map(t => {
        if (t.id === teacherId) {
          return {
            ...t,
            leaveReason: reason,
            leaveDate: date,
          };
        }
        return t;
      })
    );
  };

  // Handle Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormDay('Cuma');
    setFormPeriod(1);
    setFormPeriodLabel(formatPeriodWithTimes(1));
    setFormClassroom('');
    setFormTeacher('');
    setFormBranch('');
    setFormDutyDay('Cuma');
    setShowAddModal(true);
  };

  // Handle Open Edit Modal
  const handleOpenEdit = (item: WeeklyScheduleItem) => {
    setEditingItem(item);
    setFormDay(item.day);
    setFormPeriod(item.period);
    setFormPeriodLabel(item.periodLabel || formatPeriodWithTimes(item.period));
    setFormClassroom(item.classroomName);
    setFormTeacher(item.teacherName);
    setFormBranch(item.branch || '');
    const matchedTeacher = teachers.find(
      t => t.name.toLowerCase().trim() === item.teacherName.toLowerCase().trim()
    );
    setFormDutyDay(matchedTeacher?.dutyDay || (item.day as Teacher['dutyDay']));
    setShowAddModal(true);
  };

  // Handle Save Form (Add or Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTeacher.trim()) {
      notify('error', 'Lütfen öğretmen adını giriniz.');
      return;
    }
    if (!formClassroom.trim()) {
      notify('error', 'Lütfen salon / sınıf adını giriniz.');
      return;
    }

    const calculatedPeriodLabel = formatPeriodWithTimes(formPeriod);

    if (editingItem) {
      const updated = scheduleItems.map(item =>
        item.id === editingItem.id
          ? {
              ...item,
              day: formDay,
              period: formPeriod,
              periodLabel: calculatedPeriodLabel,
              classroomName: formClassroom.trim(),
              teacherName: formTeacher.trim(),
              branch: formBranch.trim() || undefined,
            }
          : item
      );
      setScheduleItems(updated);
      syncWithTeachers(updated);
      // Update duty day on teacher object
      setTeachers(prev =>
        prev.map(t =>
          t.name.toLowerCase().trim() === formTeacher.trim().toLowerCase()
            ? { ...t, dutyDay: formDutyDay, branch: formBranch.trim() || t.branch }
            : t
        )
      );
      notify('success', `Ders programı kaydı (${formTeacher}) başarıyla güncellendi.`);
    } else {
      const newItem: WeeklyScheduleItem = {
        id: `sched-${Date.now()}`,
        day: formDay,
        period: formPeriod,
        periodLabel: calculatedPeriodLabel,
        classroomName: formClassroom.trim(),
        teacherName: formTeacher.trim(),
        branch: formBranch.trim() || undefined,
      };
      const updated = [...scheduleItems, newItem];
      setScheduleItems(updated);
      syncWithTeachers(updated);
      setTeachers(prev =>
        prev.map(t =>
          t.name.toLowerCase().trim() === formTeacher.trim().toLowerCase()
            ? { ...t, dutyDay: formDutyDay, branch: formBranch.trim() || t.branch }
            : t
        )
      );
      notify('success', `Yeni ders programı kaydı eklendi: ${newItem.classroomName} - ${newItem.teacherName}`);
    }

    setShowAddModal(false);
  };

  // Handle Delete Single Row
  const handleConfirmDeleteRow = () => {
    if (!deletingItemId) return;
    const updated = scheduleItems.filter(i => i.id !== deletingItemId);
    setScheduleItems(updated);
    syncWithTeachers(updated);
    setDeletingItemId(null);
    notify('success', 'Ders programı kaydı silindi.');
  };

  // Handle Load Sample Program
  const handleLoadSample = () => {
    setScheduleItems(sampleScreenshotWeeklySchedule);
    syncWithTeachers(sampleScreenshotWeeklySchedule);
    notify('success', `Örnek haftalık ders programı (${sampleScreenshotWeeklySchedule.length} kayıt) başarıyla yüklendi!`);
  };

  // Handle Clear All
  const handleConfirmClear = () => {
    setScheduleItems([]);
    syncWithTeachers([]);
    setShowClearConfirmModal(false);
    notify('success', 'Haftalık ders programı temizlendi.');
  };

  // Handle File Upload (CSV / Excel)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const items = await parseWeeklyScheduleFile(file);
      if (items.length === 0) {
        notify('error', 'Dosyadan geçerli bir ders programı kaydı okunamadı. Lütfen sütun başlıklarını kontrol ediniz.');
      } else {
        setScheduleItems(items);
        syncWithTeachers(items);
        notify('success', `Başarılı! ${items.length} adet ders programı kaydı içeri aktarıldı.`);
      }
    } catch (err) {
      console.error(err);
      notify('error', 'Dosya okunurken bir hata oluştu. Lütfen CSV veya Excel dosyasını kontrol ediniz.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-xs font-bold transition-all border ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30'
              : 'bg-red-600 text-white border-red-500 shadow-red-600/30'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Hidden File Input for CSV */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv, .xlsx, .xls, .txt"
        className="hidden"
      />

      {/* Bell Schedule Modal */}
      <BellScheduleModal
        isOpen={isBellModalOpen}
        onClose={() => setIsBellModalOpen(false)}
        onSlotsUpdated={() => {
          notify('success', 'Zil ve ders saatleri güncellendi.');
        }}
      />

      {/* Sub-Tabs Navigation Bar */}
      <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('SCHEDULE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeSubTab === 'SCHEDULE'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>1. Haftalık Ders Programı</span>
            <span className="bg-white/20 text-current px-1.5 py-0.2 rounded-full text-[10px]">
              {scheduleItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('TEACHERS_DUTY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeSubTab === 'TEACHERS_DUTY'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. Öğretmenler & Nöbet Günleri</span>
            <span className="bg-white/20 text-current px-1.5 py-0.2 rounded-full text-[10px]">
              {teachers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('LEAVE_MANAGEMENT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeSubTab === 'LEAVE_MANAGEMENT'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>3. İzinli / Raporlu Öğretmenler</span>
            {leaveTeachersCount > 0 ? (
              <span className="bg-rose-500 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {leaveTeachersCount}
              </span>
            ) : (
              <span className="bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-full text-[10px]">
                0
              </span>
            )}
          </button>
        </div>

        {/* Bell Schedule Configuration Button */}
        <button
          type="button"
          onClick={() => setIsBellModalOpen(true)}
          className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer shadow-2xs"
          title="Okul zil ve ders giriş-çıkış saatlerini özelleştir"
        >
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span>Zil & Ders Saatleri Çizelgesi</span>
        </button>
      </div>

      {/* SUB-TAB 1: Haftalık Ders Programı (Schedule view) */}
      {activeSubTab === 'SCHEDULE' && (
        <div className="flex flex-col lg:flex-row items-start gap-4">
          {/* LEFT SIDEBAR: Haftalık Ders Programı */}
          <div className="w-full lg:w-72 shrink-0">
            <fieldset className="border-2 border-blue-400 rounded-xl p-4 bg-white shadow-xs space-y-3.5">
              <legend className="px-2 font-black text-blue-700 text-sm tracking-wide">
                Haftalık Ders Programı
              </legend>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Gözetmen ataması için haftalık ders programını yükleyin.
              </p>

              <div className="space-y-2 pt-1">
                {/* Button 1: Ders Programı Yükle (CSV) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg shadow-xs flex items-center justify-center gap-2 text-xs transition active:scale-[0.98] cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Ders Programı Yükle (CSV)</span>
                </button>

                {/* Button 1.5: Google Sheets'ten İçe Aktar */}
                <button
                  type="button"
                  onClick={() => setIsGoogleSheetsModalOpen(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg shadow-xs flex items-center justify-center gap-2 text-xs transition active:scale-[0.98] cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Google Sheets'ten İçeri Aktar</span>
                </button>

                {/* Button 2: Örnek Program */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="flex-1 bg-white hover:bg-teal-50 text-teal-700 font-bold py-2 px-2.5 rounded-lg border border-teal-500 shadow-2xs flex items-center justify-center gap-1.5 text-xs transition active:scale-[0.98] cursor-pointer"
                    title="Ekrandaki örnek ders programını yükle"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>Örnek Program</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadWeeklyScheduleCSV(scheduleItems)}
                    className="bg-white hover:bg-slate-100 text-slate-600 font-semibold p-2 rounded-lg border border-slate-300 text-xs transition cursor-pointer"
                    title="CSV Şablonu / Mevcut Listeyi İndir"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Button 3: Ders Programı Ekle */}
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg shadow-xs flex items-center justify-center gap-2 text-xs transition active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ders Programı Ekle</span>
                </button>

                {/* Button 4: Temizle */}
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(true)}
                  disabled={scheduleItems.length === 0}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded-lg shadow-xs flex items-center justify-center gap-2 text-xs transition active:scale-[0.98] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Temizle</span>
                </button>
              </div>

              {/* Quick Stats Summary */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                <div className="flex justify-between items-center">
                  <span>Toplam Ders Kaydı:</span>
                  <strong className="text-slate-800 font-mono">{scheduleItems.length}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Öğretmen Sayısı:</span>
                  <strong className="text-slate-800 font-mono">{uniqueTeachersCount}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Derslik / Salon:</span>
                  <strong className="text-slate-800 font-mono">{uniqueSalonsCount}</strong>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-200">
                  <span className="text-blue-700 font-semibold">Aktif Sınav Saati:</span>
                  <span className="bg-blue-100 text-blue-900 font-extrabold px-1.5 py-0.2 rounded text-[10px]">
                    {examDay} {examPeriod}. Ders
                  </span>
                </div>
              </div>
            </fieldset>
          </div>

          {/* RIGHT MAIN AREA: Table with vibrant blue header */}
          <div className="flex-1 w-full bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
            {/* Top Filter and Search Bar */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-slate-700">Gün:</span>
                  <select
                    value={selectedDayFilter}
                    onChange={e => setSelectedDayFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1 bg-white font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="ALL">Tüm Günler</option>
                    <option value="Pazartesi">Pazartesi</option>
                    <option value="Salı">Salı</option>
                    <option value="Çarşamba">Çarşamba</option>
                    <option value="Perşembe">Perşembe</option>
                    <option value="Cuma">Cuma</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">Saat:</span>
                  <select
                    value={selectedPeriodFilter}
                    onChange={e => setSelectedPeriodFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1 bg-white font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="ALL">Tüm Saatler</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                      <option key={p} value={String(p)}>
                        {p}. Ders
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick exam filter button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDayFilter(examDay);
                    setSelectedPeriodFilter(String(examPeriod));
                  }}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold px-2.5 py-1 rounded-lg border border-amber-300 transition text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Aktif sınav saatinin derslerine filtrele"
                >
                  <span>⚡ Sınav Saatini Filtrele</span>
                  <span>({examDay} {examPeriod}. Ders)</span>
                </button>

                {(selectedDayFilter !== 'ALL' || selectedPeriodFilter !== 'ALL' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDayFilter('ALL');
                      setSelectedPeriodFilter('ALL');
                      setSearchQuery('');
                    }}
                    className="text-slate-500 hover:text-slate-800 text-[11px] underline font-medium cursor-pointer"
                  >
                    Filtreleri Sıfırla
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Öğretmen, salon veya ders ara..."
                    className="rounded-lg border border-slate-300 pl-8 pr-3 py-1 bg-white text-xs w-48 sm:w-56 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <span className="bg-blue-100 text-blue-800 font-extrabold px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap">
                  {filteredItems.length} Kayıt
                </span>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-blue-600 text-white font-bold text-xs uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-32">Gün</th>
                    <th className="py-2.5 px-4 w-36">Saat & Zaman</th>
                    <th className="py-2.5 px-4 w-44">Salon</th>
                    <th className="py-2.5 px-4">Öğretmen</th>
                    <th className="py-2.5 px-4 w-24 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredItems.length > 0 ? (
                    filteredItems.map(item => {
                      const isExamSlot =
                        item.day === examDay && item.period === examPeriod;
                      const matchedTeacher = teachers.find(
                        t => t.name.toLowerCase().trim() === item.teacherName.toLowerCase().trim()
                      );

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-blue-50/60 transition ${
                            isExamSlot ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="py-2 px-4 whitespace-nowrap font-semibold">
                            <span className="text-slate-800">{item.day}</span>
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap font-medium text-slate-700">
                            <span>{item.periodLabel || `${item.period}. Ders`}</span>
                            {isExamSlot && (
                              <span className="ml-1.5 text-[10px] bg-amber-200 text-amber-900 font-black px-1.5 py-0.2 rounded border border-amber-300">
                                Sınav Saati
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap font-bold text-slate-900 font-mono">
                            {item.classroomName}
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap font-bold text-slate-950">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{item.teacherName}</span>
                              {item.branch && (
                                <span className="text-slate-400 font-normal text-[11px]">
                                  ({item.branch})
                                </span>
                              )}
                              {matchedTeacher?.dutyDay && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Nöbet: {matchedTeacher.dutyDay}
                                </span>
                              )}
                              {matchedTeacher?.isLeave && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                  İzinli / Raporlu
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                title="Kaydı Düzenle"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingItemId(item.id)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                title="Kaydı Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                          <p className="font-semibold text-slate-500">
                            {scheduleItems.length === 0
                              ? 'Henüz ders programı yüklenmedi.'
                              : 'Filtrelere uygun ders programı kaydı bulunamadı.'}
                          </p>
                          {scheduleItems.length === 0 && (
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={handleLoadSample}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                              >
                                Örnek Programı Yükle
                              </button>
                              <button
                                onClick={handleOpenAdd}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                              >
                                Manuel Ders Ekle
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Öğretmenler & Nöbet Günleri */}
      {activeSubTab === 'TEACHERS_DUTY' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">
                Öğretmen Listesi & Nöbet Günü Tanımları
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Öğretmenlerin nöbet günlerini belirleyiniz. Sınav saatinde dersi olmayan nöbetçi öğretmenler gözetmen olarak görevlendirilir.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={teacherSearchQuery}
                  onChange={e => setTeacherSearchQuery(e.target.value)}
                  placeholder="Öğretmen veya branş ara..."
                  className="rounded-lg border border-slate-300 pl-8 pr-3 py-1 bg-white text-xs w-48 sm:w-56 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <span className="bg-blue-100 text-blue-800 font-extrabold px-2.5 py-1 rounded-lg text-[11px]">
                {teachers.length} Öğretmen
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Öğretmen Adı Soyadı</th>
                  <th className="py-2.5 px-4">Branş</th>
                  <th className="py-2.5 px-4 w-48">Nöbet Günü</th>
                  <th className="py-2.5 px-4 w-32 text-center">Programdaki Dersi</th>
                  <th className="py-2.5 px-4 w-36 text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {teachers
                  .filter(t => {
                    if (!teacherSearchQuery.trim()) return true;
                    const q = teacherSearchQuery.toLowerCase().trim();
                    return (
                      t.name.toLowerCase().includes(q) ||
                      (t.branch && t.branch.toLowerCase().includes(q))
                    );
                  })
                  .map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-4 text-center text-slate-400 font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-4 font-black text-slate-900">
                        {t.name}
                      </td>
                      <td className="py-2 px-4 text-slate-600 font-semibold">
                        {t.branch || 'Genel'}
                      </td>
                      <td className="py-1.5 px-4">
                        <select
                          value={t.dutyDay || 'Yok'}
                          onChange={e => handleTeacherDutyDayChange(t.id, e.target.value as Teacher['dutyDay'])}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-indigo-500 cursor-pointer"
                        >
                          <option value="Yok">Nöbet Yok</option>
                          <option value="Pazartesi">Pazartesi</option>
                          <option value="Salı">Salı</option>
                          <option value="Çarşamba">Çarşamba</option>
                          <option value="Perşembe">Perşembe</option>
                          <option value="Cuma">Cuma</option>
                        </select>
                      </td>
                      <td className="py-2 px-4 text-center font-bold text-slate-700">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-mono">
                          {t.schedule?.length || 0} Ders
                        </span>
                      </td>
                      <td className="py-2 px-4 text-center">
                        {t.isLeave ? (
                          <span className="bg-rose-100 text-rose-800 border border-rose-300 font-extrabold px-2 py-0.5 rounded text-[10.5px]">
                            İzinli / Raporlu
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold px-2 py-0.5 rounded text-[10.5px]">
                            Görevde
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: İzinli / Raporlu Öğretmenler */}
      {activeSubTab === 'LEAVE_MANAGEMENT' && (
        <div className="space-y-3.5">
          {/* Info Banner */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-xs text-rose-950 shadow-2xs">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-black text-sm text-rose-900">
                Sınav Günü İzinli ve Raporlu Öğretmen Yönetimi
              </h4>
              <p className="text-rose-800 leading-relaxed font-medium">
                Burada <strong>İzinli / Raporlu</strong> olarak işaretlenen öğretmenlere, kelebek sınav dağıtımı yapılırken <strong>asla gözetmenlik görevi verilmez</strong>. O öğretmenin dersi olan sınav salonuna öncelikle boşta nöbetçi öğretmen, nöbetçi yoksa diğer dersi olmayan öğretmenler otomatik atanır.
              </p>
            </div>
          </div>

          {/* Teacher Leave Table Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-800">
                  Toplam İzinli / Raporlu:
                </span>
                <span className="bg-rose-600 text-white font-black px-2.5 py-0.5 rounded-full text-xs">
                  {leaveTeachersCount} Öğretmen
                </span>
                {activeExam && (
                  <span className="text-slate-500 font-medium ml-2">
                    (Aktif Sınav: <strong>{activeExam.name}</strong> - {activeExam.date})
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={leaveSearchQuery}
                  onChange={e => setLeaveSearchQuery(e.target.value)}
                  placeholder="Öğretmen ara..."
                  className="rounded-lg border border-slate-300 pl-8 pr-3 py-1 bg-white text-xs w-48 sm:w-56 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-rose-700 text-white font-bold text-xs uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">Öğretmen Adı Soyadı</th>
                    <th className="py-2.5 px-4">Branş</th>
                    <th className="py-2.5 px-4 w-36">Nöbet Günü</th>
                    <th className="py-2.5 px-4 w-44">İzin / Rapor Nedeni</th>
                    <th className="py-2.5 px-4 w-36">İzin Tarihi</th>
                    <th className="py-2.5 px-4 w-36 text-center">Durum / İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {teachers
                    .filter(t => {
                      if (!leaveSearchQuery.trim()) return true;
                      const q = leaveSearchQuery.toLowerCase().trim();
                      return (
                        t.name.toLowerCase().includes(q) ||
                        (t.branch && t.branch.toLowerCase().includes(q))
                      );
                    })
                    .map((t, idx) => {
                      const isLeave = !!t.isLeave;

                      return (
                        <tr
                          key={t.id}
                          className={`transition ${
                            isLeave ? 'bg-rose-50/50 hover:bg-rose-100/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2 px-4 text-center text-slate-400 font-mono font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-4 font-black text-slate-900">
                            {t.name}
                          </td>
                          <td className="py-2 px-4 text-slate-600 font-semibold">
                            {t.branch || 'Genel'}
                          </td>
                          <td className="py-2 px-4 font-semibold text-slate-700">
                            {t.dutyDay || 'Yok'}
                          </td>
                          <td className="py-1.5 px-4">
                            {isLeave ? (
                              <input
                                type="text"
                                value={t.leaveReason || 'Sağlık Raporu'}
                                onChange={e =>
                                  handleUpdateLeaveDetails(
                                    t.id,
                                    e.target.value,
                                    t.leaveDate || activeExam?.date || ''
                                  )
                                }
                                placeholder="Örn: Sağlık Raporu, İdari İzin"
                                className="w-full bg-white border border-rose-300 rounded px-2 py-1 text-xs font-semibold text-rose-900 focus:outline-rose-500"
                              />
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="py-1.5 px-4">
                            {isLeave ? (
                              <input
                                type="date"
                                value={t.leaveDate || activeExam?.date || ''}
                                onChange={e =>
                                  handleUpdateLeaveDetails(
                                    t.id,
                                    t.leaveReason || 'Sağlık Raporu',
                                    e.target.value
                                  )
                                }
                                className="w-full bg-white border border-rose-300 rounded px-2 py-1 text-xs font-mono font-semibold text-rose-900 focus:outline-rose-500"
                              />
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleLeave(t.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 mx-auto shadow-2xs ${
                                isLeave
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                  : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300'
                              }`}
                            >
                              {isLeave ? (
                                <>
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>İzni Kaldır</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>İzin / Rapor Gir</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: DERS PROGRAMI EKLE / DÜZENLE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    {editingItem ? 'Ders Programı Kaydını Düzenle' : 'Yeni Ders Programı Kaydı Ekle'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Öğretmenin ders saatini, bulunduğu salonu ve nöbet gününü giriniz.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                {/* Gün */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dersin Günü <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formDay}
                    onChange={e => setFormDay(e.target.value as WeeklyScheduleItem['day'])}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                    required
                  >
                    <option value="Pazartesi">Pazartesi</option>
                    <option value="Salı">Salı</option>
                    <option value="Çarşamba">Çarşamba</option>
                    <option value="Perşembe">Perşembe</option>
                    <option value="Cuma">Cuma</option>
                  </select>
                </div>

                {/* Saat / Ders */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Saat / Ders <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formPeriod}
                    onChange={e => {
                      const p = parseInt(e.target.value, 10);
                      setFormPeriod(p);
                      setFormPeriodLabel(formatPeriodWithTimes(p));
                    }}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                    required
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                      <option key={p} value={p}>
                        {formatPeriodWithTimes(p)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Salon / Sınıf */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Salon / Sınıf <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formClassroom}
                  onChange={e => setFormClassroom(e.target.value)}
                  placeholder="Örn: MES11, ATP 11-AB, Salon 1"
                  list="classroom-suggestions"
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <datalist id="classroom-suggestions">
                  {classrooms.map(c => (
                    <option key={c.id} value={c.name} />
                  ))}
                  <option value="MES11" />
                  <option value="MES12" />
                  <option value="MES9" />
                  <option value="MES10" />
                  <option value="ATP 11-AB" />
                  <option value="ATP 9-A" />
                  <option value="ATP 9-B" />
                  <option value="AMP 9-A" />
                  <option value="AMP 9-B" />
                  <option value="AMP 10-AB" />
                </datalist>
                {classrooms.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {classrooms.slice(0, 4).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFormClassroom(c.name)}
                        className="text-[10px] bg-slate-100 hover:bg-blue-50 text-slate-600 px-2 py-0.5 rounded font-mono border border-slate-200 cursor-pointer"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Öğretmen */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Öğretmen Adı Soyadı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTeacher}
                  onChange={e => {
                    const name = e.target.value;
                    setFormTeacher(name);
                    const found = teachers.find(
                      t => t.name.toLowerCase().trim() === name.toLowerCase().trim()
                    );
                    if (found) {
                      if (found.branch) setFormBranch(found.branch);
                      if (found.dutyDay) setFormDutyDay(found.dutyDay);
                    }
                  }}
                  placeholder="Örn: A.SALDIR veya Selin Aydın"
                  list="teacher-suggestions"
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <datalist id="teacher-suggestions">
                  {teachers.map(t => (
                    <option key={t.id} value={t.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Branş */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Branş (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    value={formBranch}
                    onChange={e => setFormBranch(e.target.value)}
                    placeholder="Bilişim, Matematik..."
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Öğretmenin Nöbet Günü */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Öğretmenin Nöbet Günü
                  </label>
                  <select
                    value={formDutyDay}
                    onChange={e => setFormDutyDay(e.target.value as Teacher['dutyDay'])}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Pazartesi">Pazartesi</option>
                    <option value="Salı">Salı</option>
                    <option value="Çarşamba">Çarşamba</option>
                    <option value="Perşembe">Perşembe</option>
                    <option value="Cuma">Cuma</option>
                    <option value="Yok">Nöbet Yok</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {editingItem ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TEKİL KAYIT SİLME ONAYI */}
      {deletingItemId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-center font-bold text-sm text-slate-800 mb-1">
              Ders Kaydını Sil
            </h3>
            <p className="text-center text-xs text-slate-500 mb-4">
              Bu ders programı kaydını silmek istediğinize emin misiniz?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingItemId(null)}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRow}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-sm cursor-pointer"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: TÜM LİSTEYİ TEMİZLEME ONAYI */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-center font-bold text-sm text-slate-800 mb-1">
              Tüm Programı Temizle
            </h3>
            <p className="text-center text-xs text-slate-500 mb-4">
              Haftalık ders programındaki tüm kayıtlar silinecektir. Bu işlemi onaylıyor musunuz?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-sm cursor-pointer"
              >
                Hepsini Temizle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: GOOGLE SHEETS DERS PROGRAMI AKTARIMI */}
      <GoogleSheetsImportModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        mode="SCHEDULE"
        onScheduleImported={items => {
          setScheduleItems(items);
          syncWithTeachers(items);
          notify('success', `Harika! ${items.length} adet ders programı kaydı Google E-Tablodan başarıyla yüklendi.`);
        }}
      />
    </div>
  );
};
