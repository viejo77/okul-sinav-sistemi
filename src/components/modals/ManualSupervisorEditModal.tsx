import React, { useState, useEffect } from 'react';
import { Edit2, Users, Search, Check, X, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';
import { RoomSeatingPlan, Teacher, SeatingPlanResult } from '../../types';
import { getTeacherSupervisorCounts } from '../../services/kelebekEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  room: RoomSeatingPlan | null;
  teachers: Teacher[];
  savedPlans?: Record<string, SeatingPlanResult>;
  onSave: (supervisorName: string, supervisorBranch: string) => void;
}

export const ManualSupervisorEditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  room,
  teachers,
  savedPlans,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'TEACHER_LIST' | 'CUSTOM_TEXT'>('TEACHER_LIST');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [customBranch, setCustomBranch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const dutyCounts = React.useMemo(() => {
    return getTeacherSupervisorCounts(teachers, savedPlans);
  }, [teachers, savedPlans]);

  // Sync state when modal opens or room changes
  useEffect(() => {
    if (room) {
      setCustomName(room.supervisorName !== 'Atanmadı' && !room.supervisorName.includes('Yetersiz') ? room.supervisorName : '');
      setCustomBranch(room.supervisorBranch || '');
      setSearchQuery('');

      // Check if current supervisor matches a teacher in teachers
      const matched = teachers.find(
        t => t.name.toLowerCase().trim() === room.supervisorName.toLowerCase().trim()
      );
      if (matched) {
        setSelectedTeacherId(matched.id);
        setActiveTab('TEACHER_LIST');
      } else if (room.supervisorName && !room.supervisorName.includes('Atanmadı')) {
        setSelectedTeacherId('');
        setActiveTab('CUSTOM_TEXT');
      } else {
        setSelectedTeacherId('');
        setActiveTab('TEACHER_LIST');
      }
    }
  }, [room, teachers, isOpen]);

  if (!isOpen || !room) return null;

  const filteredTeachers = teachers.filter(t => {
    if (t.isLeave) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return t.name.toLowerCase().includes(q) || t.branch.toLowerCase().includes(q);
  });

  const handleSave = () => {
    if (activeTab === 'TEACHER_LIST') {
      const selected = teachers.find(t => t.id === selectedTeacherId);
      if (selected) {
        onSave(selected.name, selected.branch);
        onClose();
        return;
      }
    }

    if (customName.trim()) {
      onSave(customName.trim(), customBranch.trim() || 'Özel / Harici');
      onClose();
    } else {
      alert('Lütfen geçerli bir öğretmen seçiniz veya görevli adı yazınız.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <Edit2 className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Gözetmen Değiştir / Elle Ata
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                {room.classroomName} • Kapasite: {room.capacity} Öğrenci
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Supervisor Status */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs shrink-0">
          <div>
            <span className="text-slate-500 font-medium">Mevcut Gözetmen: </span>
            <strong className="text-slate-900 font-black">{room.supervisorName}</strong>
            {room.supervisorBranch && (
              <span className="text-slate-500 font-normal"> ({room.supervisorBranch})</span>
            )}
          </div>
          <span className="bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded text-[10px]">
            {room.supervisorReason || 'Otomatik'}
          </span>
        </div>

        {/* Tab Selection */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('TEACHER_LIST')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'TEACHER_LIST'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Okuldaki Öğretmenler Listesi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CUSTOM_TEXT')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'CUSTOM_TEXT'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Elle Serbest Görevli Adı Yaz</span>
            </button>
          </div>

          {activeTab === 'TEACHER_LIST' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Öğretmen adı veya branş ara..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-0.5">
                {filteredTeachers.map(t => {
                  const isSelected = selectedTeacherId === t.id;
                  const count = dutyCounts.get(t.name.toLowerCase().trim()) || 0;

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTeacherId(t.id)}
                      className={`p-2.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-blue-50 border-blue-600 shadow-xs ring-1 ring-blue-400'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs text-slate-900 truncate">
                          {t.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate">
                          {t.branch} • {count} Görev
                        </div>
                      </div>

                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'CUSTOM_TEXT' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gözetmen Adı Soyadı:
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Örn: Hasan Yılmaz, Müdür Yrd. Ali Veli vb."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Branş / Ünvan (İsteğe Bağlı):
                </label>
                <input
                  type="text"
                  value={customBranch}
                  onChange={e => setCustomBranch(e.target.value)}
                  placeholder="Örn: Matematik, Dış Gözetmen vb."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="text-[11px] text-slate-500">
                * Bu isim resmi sınav evraklarında ve oturma planında gözetmen olarak yazılacaktır.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition cursor-pointer"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <UserCheck className="w-4 h-4 stroke-[2.5]" />
            <span>Gözetmeni Güncelle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
