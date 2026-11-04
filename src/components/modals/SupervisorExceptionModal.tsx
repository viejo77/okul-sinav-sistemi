import React, { useState } from 'react';
import {
  AlertTriangle,
  UserCheck,
  Users,
  Check,
  Search,
  Sparkles,
  X,
  Edit3,
  HelpCircle,
  Building,
} from 'lucide-react';
import { SupervisorExceptionData, TeacherAtSlotInfo } from '../../services/kelebekEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  exceptionData: SupervisorExceptionData | null;
  onConfirm: (selections: Record<string, string>) => void;
}

export const SupervisorExceptionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  exceptionData,
  onConfirm,
}) => {
  // Map of roomId -> teacherId OR custom teacher name string
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    return {};
  });

  // Track active input mode per room: 'LIST' | 'MANUAL'
  const [roomModes, setRoomModes] = useState<Record<string, 'LIST' | 'MANUAL'>>({});
  // Manual text input per room
  const [manualInputs, setManualInputs] = useState<Record<string, string>>({});
  // Search query for teacher list per room
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  // Filter for only free teachers
  const [onlyFreeFilter, setOnlyFreeFilter] = useState(false);

  if (!isOpen || !exceptionData || exceptionData.unstaffedRooms.length === 0) {
    return null;
  }

  const { unstaffedRooms, teachersAtSlot, allSchoolTeachers } = exceptionData;

  const handleSelectTeacher = (roomId: string, teacherIdentifier: string) => {
    setSelections(prev => ({
      ...prev,
      [roomId]: teacherIdentifier,
    }));
  };

  const handleManualInputChange = (roomId: string, value: string) => {
    setManualInputs(prev => ({
      ...prev,
      [roomId]: value,
    }));
    setSelections(prev => ({
      ...prev,
      [roomId]: value.trim(),
    }));
  };

  const handleAutoAssignFree = () => {
    const newSelections: Record<string, string> = { ...selections };
    const usedIds = new Set<string>();

    // Free teachers first
    const freeTeachers = teachersAtSlot.filter(t => t.isFreeAtSlot);

    unstaffedRooms.forEach(room => {
      const candidate = freeTeachers.find(t => !usedIds.has(t.id));
      if (candidate) {
        newSelections[room.roomId] = candidate.id;
        usedIds.add(candidate.id);
      } else {
        // Fallback to any teacher at school not yet used
        const fallback = teachersAtSlot.find(t => !usedIds.has(t.id));
        if (fallback) {
          newSelections[room.roomId] = fallback.id;
          usedIds.add(fallback.id);
        }
      }
    });

    setSelections(newSelections);
  };

  const handleConfirm = () => {
    onConfirm(selections);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <AlertTriangle className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>İstisnai Gözetmen Ataması</span>
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded font-bold uppercase">
                  {unstaffedRooms.length} Salon İçin Gerekli
                </span>
              </h3>
              <p className="text-xs text-amber-100 font-medium mt-0.5">
                Derslik öğretmeni, boşta eş öğretmen veya boş nöbetçi öğretmen bulunamadı.
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

        {/* Informative Guidance Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-xs text-amber-950 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Nasıl İşler?</span> Bu sınav saatinde salonun kendi derslik öğretmeni ve boş nöbetçi öğretmen mevcut değildir. 
              Aşağıdaki listeden o saatte okulda bulunan öğretmenleri seçebilir veya salona <strong>elle serbest görevli</strong> atayabilirsiniz.
            </div>
          </div>
          {teachersAtSlot.some(t => t.isFreeAtSlot) && (
            <button
              type="button"
              onClick={handleAutoAssignFree}
              className="bg-amber-200 hover:bg-amber-300 text-amber-900 border border-amber-300 text-[11px] font-black px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 transition cursor-pointer"
              title="O saatte boş dersi olan öğretmenleri otomatik olarak salonlara paylaştır"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-800" />
              <span>Boş Öğretmenleri Öner</span>
            </button>
          )}
        </div>

        {/* Content - Unstaffed Rooms List */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {unstaffedRooms.map((room, roomIdx) => {
            const currentSelected = selections[room.roomId] || '';
            const activeMode = roomModes[room.roomId] || 'LIST';
            const searchQuery = (searchQueries[room.roomId] || '').toLowerCase().trim();

            // Filter teachers present at slot
            const filteredTeachers = teachersAtSlot.filter(t => {
              if (onlyFreeFilter && !t.isFreeAtSlot) return false;
              if (!searchQuery) return true;
              return (
                t.name.toLowerCase().includes(searchQuery) ||
                t.branch.toLowerCase().includes(searchQuery)
              );
            });

            // Find name of currently selected teacher
            let selectedTeacherLabel = '';
            const matchedTeacher = allSchoolTeachers.find(
              t => t.id === currentSelected || t.name.toLowerCase() === currentSelected.toLowerCase()
            );
            if (matchedTeacher) {
              selectedTeacherLabel = `${matchedTeacher.name} (${matchedTeacher.branch})`;
            } else if (currentSelected) {
              selectedTeacherLabel = currentSelected;
            }

            return (
              <div
                key={room.roomId}
                className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-xs space-y-3.5"
              >
                {/* Room Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {roomIdx + 1}
                    </span>
                    <div>
                      <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                        <span>{room.roomName}</span>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {room.capacity} Kapasite
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-800 font-medium">
                        Derslik öğretmeni veya boşta nöbetçi öğretmen bulunamadı.
                      </div>
                    </div>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() =>
                        setRoomModes(prev => ({ ...prev, [room.roomId]: 'LIST' }))
                      }
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                        activeMode === 'LIST'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Okuldaki Öğretmenler ({teachersAtSlot.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRoomModes(prev => ({ ...prev, [room.roomId]: 'MANUAL' }))
                      }
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                        activeMode === 'MANUAL'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Elle / Özel Görevli Ata</span>
                    </button>
                  </div>
                </div>

                {/* Selected Status Bar */}
                {selectedTeacherLabel ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-medium text-emerald-700">Seçilen Gözetmen: </span>
                        <strong className="font-black text-emerald-950">{selectedTeacherLabel}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectTeacher(room.roomId, '')}
                      className="text-emerald-700 hover:text-red-600 font-bold text-[11px] underline cursor-pointer"
                    >
                      Kaldır
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Bu salon için henüz bir gözetmen seçilmedi. Aşağıdan bir öğretmen belirleyiniz.</span>
                  </div>
                )}

                {/* Tab Content: LIST MODE (Teachers present at school at this slot) */}
                {activeMode === 'LIST' && (
                  <div className="space-y-2.5">
                    {/* Search and Filters */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQueries[room.roomId] || ''}
                          onChange={e =>
                            setSearchQueries(prev => ({
                              ...prev,
                              [room.roomId]: e.target.value,
                            }))
                          }
                          placeholder="Öğretmen adı veya branş ara..."
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
                        />
                      </div>

                      <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer self-start sm:self-auto">
                        <input
                          type="checkbox"
                          checked={onlyFreeFilter}
                          onChange={e => setOnlyFreeFilter(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span>Sadece O Saatte Dersi Olmayanlar</span>
                      </label>
                    </div>

                    {/* Teacher Cards Grid */}
                    {filteredTeachers.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                        Arama kriterlerine uygun öğretmen bulunamadı.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-0.5">
                        {filteredTeachers.map(t => {
                          const isSelected = currentSelected === t.id || currentSelected.toLowerCase() === t.name.toLowerCase();

                          return (
                            <div
                              key={t.id}
                              onClick={() => handleSelectTeacher(room.roomId, t.id)}
                              className={`p-2.5 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                                isSelected
                                  ? 'bg-amber-50/90 border-amber-600 shadow-xs ring-1 ring-amber-400'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div>
                                  <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                                    <span>{t.name}</span>
                                    {t.isFreeAtSlot ? (
                                      <span className="bg-emerald-100 text-emerald-800 text-[9.5px] font-extrabold px-1.5 py-0.2 rounded border border-emerald-300">
                                        Boşta
                                      </span>
                                    ) : (
                                      <span className="bg-amber-100 text-amber-800 text-[9.5px] font-bold px-1.5 py-0.2 rounded border border-amber-300">
                                        Derste
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                    {t.branch} • Nöbet: {t.dutyDay}
                                  </div>
                                </div>

                                <div
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? 'bg-amber-600 border-amber-600 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                                <span>
                                  {t.isFreeAtSlot
                                    ? '✓ Sınav saatinde dersi yok'
                                    : `⚠ ${t.teachingClassroom || 'Normal derste'}`}
                                </span>
                                <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.2 rounded">
                                  {t.dutyCount} Görev
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Content: MANUAL MODE (Type any name or choose from entire school) */}
                {activeMode === 'MANUAL' && (
                  <div className="space-y-3 bg-amber-50/40 p-4 rounded-xl border border-amber-200">
                    <div className="text-xs text-slate-700 font-bold flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                      <span>Elle Serbest Görevli Girişi veya Okul Genelinden Seçim:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option 1: Select ANY teacher from school */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Okuldaki Tüm Öğretmenler:
                        </label>
                        <select
                          value={allSchoolTeachers.some(t => t.id === currentSelected) ? currentSelected : ''}
                          onChange={e => handleSelectTeacher(room.roomId, e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">-- Öğretmen Seçiniz --</option>
                          {allSchoolTeachers.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.branch}) - {t.dutyCount} Görev
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Option 2: Custom Free Text Input */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Veya Serbest Görevli Adı Yazınız:
                        </label>
                        <input
                          type="text"
                          value={manualInputs[room.roomId] || (!allSchoolTeachers.some(t => t.id === currentSelected) ? currentSelected : '')}
                          onChange={e => handleManualInputChange(room.roomId, e.target.value)}
                          placeholder="Örn: Hasan Yılmaz (Ücretli), Müdür Yrd. vb."
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      * Yazdığınız veya seçtiğiniz öğretmen doğrudan bu salona gözetmen olarak atanacaktır.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600 font-medium">
            Toplam <strong>{unstaffedRooms.length}</strong> salondan <strong>{Object.values(selections).filter(Boolean).length}</strong> tanesi belirlendi.
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition cursor-pointer"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Seçimleri Onayla ve Dağıtımı Başlat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
