import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw, Save, X, CheckCircle2 } from 'lucide-react';
import {
  PeriodTimeSlot,
  DEFAULT_PERIOD_TIME_SLOTS,
  getSavedPeriodTimeSlots,
  savePeriodTimeSlots,
} from '../../services/periodTimes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSlotsUpdated?: (slots: PeriodTimeSlot[]) => void;
}

export const BellScheduleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSlotsUpdated,
}) => {
  const [slots, setSlots] = useState<PeriodTimeSlot[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSlots(getSavedPeriodTimeSlots());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleTimeChange = (period: number, field: 'startTime' | 'endTime', value: string) => {
    setSlots(prev =>
      prev.map(s => {
        if (s.period === period) {
          const updated = { ...s, [field]: value };
          updated.label = `${updated.period}. Ders (${updated.startTime} - ${updated.endTime})`;
          return updated;
        }
        return s;
      })
    );
  };

  const handleResetToDefault = () => {
    setSlots(DEFAULT_PERIOD_TIME_SLOTS);
    savePeriodTimeSlots(DEFAULT_PERIOD_TIME_SLOTS);
    if (onSlotsUpdated) onSlotsUpdated(DEFAULT_PERIOD_TIME_SLOTS);
    showToast('MEB standart zil saatlerine sıfırlandı.');
  };

  const handleSave = () => {
    savePeriodTimeSlots(slots);
    if (onSlotsUpdated) onSlotsUpdated(slots);
    showToast('Ders zil saatleri kaydedildi.');
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <Clock className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Zil & Ders Saatleri Çizelgesi
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                Sınav ve ders giriş-çıkış saatlerini okulunuza göre uyarlayın
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="bg-emerald-600 text-white text-xs font-bold py-2 px-4 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* Body Table */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Sınav tanımlarken ve pano takviminde ders saati seçildiğinde, buradaki giriş-çıkış saatleri otomatik olarak yazılır ve evraklara yansıtılır.
          </p>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Ders Saati</th>
                  <th className="py-2.5 px-3">Giriş Saati</th>
                  <th className="py-2.5 px-3">Çıkış Saati</th>
                  <th className="py-2.5 px-3">Saat Aralığı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {slots.map(s => (
                  <tr key={s.period} className="hover:bg-blue-50/50 transition">
                    <td className="py-2 px-3 font-black text-slate-900">
                      {s.period}. Ders
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="time"
                        value={s.startTime}
                        onChange={e => handleTimeChange(s.period, 'startTime', e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 focus:outline-blue-500 text-xs w-24"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="time"
                        value={s.endTime}
                        onChange={e => handleTimeChange(s.period, 'endTime', e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 focus:outline-blue-500 text-xs w-24"
                      />
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-blue-700 font-bold whitespace-nowrap">
                      {s.startTime} - {s.endTime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Varsayılanlara Sıfırla</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
            >
              Kapat
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xs transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Kaydet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
