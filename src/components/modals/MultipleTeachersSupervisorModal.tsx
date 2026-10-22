import React, { useState } from 'react';
import { Users, Check, Sparkles, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { MultipleTeacherConflict } from '../../services/kelebekEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conflicts: MultipleTeacherConflict[];
  onConfirm: (selections: Record<string, string>) => void;
}

export const MultipleTeachersSupervisorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  conflicts,
  onConfirm,
}) => {
  // Map of roomId -> selected teacher id
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    conflicts.forEach(c => {
      initial[c.roomId] = c.recommendedTeacherId;
    });
    return initial;
  });

  if (!isOpen || conflicts.length === 0) return null;

  const handleSelectTeacher = (roomId: string, teacherId: string) => {
    setSelections(prev => ({
      ...prev,
      [roomId]: teacherId,
    }));
  };

  const handleApplyRecommendedAll = () => {
    const recommended: Record<string, string> = {};
    conflicts.forEach(c => {
      recommended[c.roomId] = c.recommendedTeacherId;
    });
    setSelections(recommended);
  };

  const handleConfirm = () => {
    onConfirm(selections);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <Users className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Aynı Salonda Birden Fazla Öğretmen Tespiti
              </h3>
              <p className="text-xs text-indigo-100 font-medium">
                Atölye/grup derslerinde salonda bulunan öğretmenlerden gözetmen seçimi yapınız.
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

        {/* Info Box */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-6 py-3 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Görev Dağılımı Dengeleme:</span> Sistem, geçmiş sınavlarda daha az gözetmenlik görevi almış öğretmenleri otomatik olarak önermektedir. Dilerseniz seçimleri manuel değiştirebilirsiniz.
          </div>
        </div>

        {/* Conflict List */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {conflicts.map((conflict, idx) => {
            const currentSelected = selections[conflict.roomId] || conflict.recommendedTeacherId;

            return (
              <div
                key={conflict.roomId}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-black text-slate-800 text-sm">
                      {conflict.roomName} Salonu
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {conflict.candidates.length} Öğretmen Mevcut
                    </span>
                  </div>

                  <span className="text-[11px] font-semibold text-indigo-700">
                    Bir gözetmen seçiniz:
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {conflict.candidates.map(candidate => {
                    const isSelected = currentSelected === candidate.id;
                    const isRecommended = conflict.recommendedTeacherId === candidate.id;

                    return (
                      <div
                        key={candidate.id}
                        onClick={() => handleSelectTeacher(conflict.roomId, candidate.id)}
                        className={`p-3 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between gap-2 relative ${
                          isSelected
                            ? 'bg-indigo-50/80 border-indigo-600 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                              <span>{candidate.name}</span>
                              {isRecommended && (
                                <span className="bg-emerald-100 text-emerald-800 text-[9.5px] font-extrabold px-1.5 py-0.2 rounded border border-emerald-300">
                                  Dengeli Öneri
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {candidate.branch}
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                          <span className="text-slate-500">
                            Nöbet Günü: <strong className="text-slate-700">{candidate.dutyDay}</strong>
                          </span>
                          <span
                            className={`font-black px-1.5 py-0.5 rounded text-[10.5px] ${
                              candidate.dutyCount === 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {candidate.dutyCount} Sınav Görevi
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleApplyRecommendedAll}
            className="flex items-center gap-1.5 text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Tümünde Dengeli Otomatik Seç</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition cursor-pointer active:scale-98"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Seçimleri Onayla ve Dağıtımı Başlat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
