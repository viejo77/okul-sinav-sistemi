import React, { useState, useMemo } from 'react';
import {
  Users,
  X,
  RotateCcw,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  DoorClosed,
  Check,
  UserCheck,
  UserX,
} from 'lucide-react';
import { SeatingPlanResult, Teacher, Exam, RoomSeatingPlan } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  plan: SeatingPlanResult;
  exam: Exam;
  teachers: Teacher[];
  onAutoRedistribute: () => void;
  onUpdateRoomSupervisor: (
    classroomId: string,
    newSupervisorName: string,
    newBranch: string,
    reason?: string
  ) => void;
}

export const ManageSupervisorsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  plan,
  exam,
  teachers,
  onAutoRedistribute,
  onUpdateRoomSupervisor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'LEAVE_ONLY'>('ALL');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [customNameInput, setCustomNameInput] = useState<string>('');
  const [customBranchInput, setCustomBranchInput] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Map teachers by lowercase name for fast lookup of leave status
  const teacherMap = useMemo(() => {
    const map = new Map<string, Teacher>();
    teachers.forEach(t => {
      map.set(t.name.toLowerCase().trim(), t);
      map.set(t.id, t);
    });
    return map;
  }, [teachers]);

  // Determine if a room's current supervisor is on leave
  const getRoomSupervisorStatus = (room: RoomSeatingPlan) => {
    const teacher = teacherMap.get(room.supervisorName.toLowerCase().trim());
    if (teacher && teacher.isLeave) {
      return {
        isLeave: true,
        reason: teacher.leaveReason || 'İzinli / Raporlu',
        date: teacher.leaveDate || '',
      };
    }
    const isUnassigned =
      !room.supervisorName ||
      room.supervisorName === 'Atanmadı' ||
      room.supervisorName.includes('Yetersiz') ||
      room.supervisorName.includes('Atanmadı');

    return {
      isLeave: false,
      isUnassigned,
    };
  };

  // Rooms that have a supervisor on leave or unassigned
  const problematicRoomsCount = useMemo(() => {
    return plan.rooms.filter(r => {
      const status = getRoomSupervisorStatus(r);
      return status.isLeave || status.isUnassigned;
    }).length;
  }, [plan.rooms, teacherMap]);

  if (!isOpen) return null;

  // Filtered rooms list
  const filteredRooms = plan.rooms.filter(r => {
    const status = getRoomSupervisorStatus(r);
    if (filterMode === 'LEAVE_ONLY' && !status.isLeave && !status.isUnassigned) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.classroomName.toLowerCase().includes(q) ||
      r.supervisorName.toLowerCase().includes(q) ||
      (r.supervisorBranch && r.supervisorBranch.toLowerCase().includes(q))
    );
  });

  const handleStartEditing = (room: RoomSeatingPlan) => {
    setEditingRoomId(room.classroomId);
    setIsCustomMode(false);
    const matched = teachers.find(
      t => t.name.toLowerCase().trim() === room.supervisorName.toLowerCase().trim()
    );
    if (matched) {
      setSelectedTeacherId(matched.id);
      setCustomNameInput('');
      setCustomBranchInput('');
    } else {
      setSelectedTeacherId('');
      setCustomNameInput(room.supervisorName.includes('Atanmadı') ? '' : room.supervisorName);
      setCustomBranchInput(room.supervisorBranch || '');
      if (room.supervisorName && !room.supervisorName.includes('Atanmadı')) {
        setIsCustomMode(true);
      }
    }
  };

  const handleSaveRoomSupervisor = (classroomId: string) => {
    if (isCustomMode) {
      if (!customNameInput.trim()) {
        alert('Lütfen geçerli bir görevli adı giriniz.');
        return;
      }
      onUpdateRoomSupervisor(
        classroomId,
        customNameInput.trim(),
        customBranchInput.trim() || 'Özel / Harici',
        'Elle Manuel Atandı'
      );
    } else {
      const selected = teachers.find(t => t.id === selectedTeacherId);
      if (!selected) {
        alert('Lütfen listeden bir öğretmen seçiniz.');
        return;
      }
      onUpdateRoomSupervisor(
        classroomId,
        selected.name,
        selected.branch,
        'Yönetim Panelinden Seçildi'
      );
    }
    setEditingRoomId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-emerald-200 shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">
                  Gözetmen Öğretmenleri Yönet & Değiştir
                </h3>
                <span className="bg-emerald-500/20 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Oturma Düzeni Korunur
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                {plan.examName} • {plan.examDate} ({plan.examPeriod}. Ders) • Toplam {plan.rooms.length} Sınav Salonu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Alert Banner */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            {problematicRoomsCount > 0 ? (
              <div className="flex items-center gap-2 bg-amber-100/80 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>{problematicRoomsCount} salonun</strong> gözetmeni şu anda izinli veya atanmamış durumda!
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-100/80 border border-emerald-300 text-emerald-900 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tüm salonlarda görevli öğretmenler aktif ve görevdedir.</span>
              </div>
            )}
          </div>

          {/* Quick Action: Redistribute all automatically */}
          <button
            type="button"
            onClick={onAutoRedistribute}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-2"
            title="Öğrenci oturma planını hiç bozmadan tüm gözetmenleri izin ve nöbet kurallarına göre baştan ata"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Tüm Gözetmenleri Otomatik Yeniden Ata</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600">Filtrele:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                  filterMode === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tüm Salonlar ({plan.rooms.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('LEAVE_ONLY')}
                className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1 ${
                  filterMode === 'LEAVE_ONLY'
                    ? 'bg-amber-600 text-white shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-amber-800'
                }`}
              >
                <span>İzinli / Atanmamış Olanlar</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                  {problematicRoomsCount}
                </span>
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Salon veya gözetmen ara..."
              className="rounded-lg border border-slate-300 pl-8 pr-3 py-1 bg-white text-xs w-48 sm:w-56 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Room List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
          {filteredRooms.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200 text-slate-400 text-xs italic">
              Arama kriterlerinize uygun sınav salonu bulunamadı.
            </div>
          ) : (
            filteredRooms.map(room => {
              const status = getRoomSupervisorStatus(room);
              const isEditing = editingRoomId === room.classroomId;

              return (
                <div
                  key={room.classroomId}
                  className={`bg-white rounded-xl border p-4 transition shadow-2xs ${
                    status.isLeave
                      ? 'border-amber-300 ring-2 ring-amber-200/50 bg-amber-50/20'
                      : status.isUnassigned
                      ? 'border-rose-300 ring-2 ring-rose-200/50 bg-rose-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Salon Title & Capacity */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          status.isLeave
                            ? 'bg-amber-100 text-amber-700 border border-amber-300'
                            : status.isUnassigned
                            ? 'bg-rose-100 text-rose-700 border border-rose-300'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        }`}
                      >
                        <DoorClosed className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-slate-900">
                            {room.classroomName}
                          </h4>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {room.totalAssigned} / {room.capacity} Koltuk Dolu
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Kapı: {room.doorPosition === 'right' ? 'Sağda' : 'Solda'} • {Math.ceil(room.capacity / 2)} Çiftli Sıra
                        </p>
                      </div>
                    </div>

                    {/* Current Supervisor & Status Badges */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-black text-xs text-slate-900">
                            {room.supervisorName}
                          </span>
                          {status.isLeave ? (
                            <span className="bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              <UserX className="w-3 h-3" />
                              <span>İzinli / Raporlu!</span>
                            </span>
                          ) : status.isUnassigned ? (
                            <span className="bg-rose-100 text-rose-800 border border-rose-300 font-black text-[10px] px-2 py-0.5 rounded-full">
                              Gözetmen Yok!
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-emerald-600" />
                              <span>Görevde</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-slate-500">
                          {room.supervisorBranch || 'Genel'} • {room.supervisorReason}
                          {status.isLeave && status.reason && ` (${status.reason})`}
                        </div>
                      </div>

                      {/* Edit Button */}
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => handleStartEditing(room)}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Gözetmeni Değiştir</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Edit Form when active */}
                  {isEditing && (
                    <div className="mt-3 pt-3 border-t border-slate-200 bg-slate-50/80 p-3 rounded-xl animate-in fade-in duration-150 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          Bu Salon İçin Yeni Gözetmen Seçiniz:
                        </span>

                        <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => setIsCustomMode(false)}
                            className={`px-2 py-0.5 rounded transition ${
                              !isCustomMode ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600'
                            }`}
                          >
                            Öğretmen Listesinden Seç
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCustomMode(true)}
                            className={`px-2 py-0.5 rounded transition ${
                              isCustomMode ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600'
                            }`}
                          >
                            Elle İsim Yaz
                          </button>
                        </div>
                      </div>

                      {!isCustomMode ? (
                        <div>
                          <select
                            value={selectedTeacherId}
                            onChange={e => setSelectedTeacherId(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-emerald-500 cursor-pointer"
                          >
                            <option value="">-- Bir Öğretmen Seçiniz --</option>
                            {teachers
                              .filter(t => !t.isLeave)
                              .map(t => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.branch || 'Genel'}) - {t.dutyDay && t.dutyDay !== 'Yok' ? `${t.dutyDay} Nöbetçi` : 'Nöbetsiz'}
                                </option>
                              ))}
                          </select>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={customNameInput}
                            onChange={e => setCustomNameInput(e.target.value)}
                            placeholder="Örn: Ahmet Yılmaz veya Nöbetçi Görevli"
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-emerald-500"
                          />
                          <input
                            type="text"
                            value={customBranchInput}
                            onChange={e => setCustomBranchInput(e.target.value)}
                            placeholder="Branş (Örn: Matematik veya Harici)"
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-emerald-500"
                          />
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingRoomId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                        >
                          Vazgeç
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveRoomSupervisor(room.classroomId)}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Bu Salona Ata</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              <strong>Önemli:</strong> Gözetmen öğretmen değişiklikleri öğrencilerin koltuk ve salon yerleşimini <strong>kesinlikle bozmaz</strong>.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer text-xs"
          >
            Tamamla ve Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
