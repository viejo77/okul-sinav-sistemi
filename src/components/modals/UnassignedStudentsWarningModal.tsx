import React from 'react';
import {
  AlertTriangle,
  DoorClosed,
  Users,
  Sparkles,
  X,
  ArrowRight,
  ShieldAlert,
  Info,
  Layers,
  Armchair,
} from 'lucide-react';
import { Student } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  unassignedStudents: Student[];
  totalStudents: number;
  totalCapacity: number;
  activeRoomsCount: number;
  neededRoomsCount: number;
  onRelaxAndDistribute: () => void;
  onGoToClassrooms?: () => void;
}

export const UnassignedStudentsWarningModal: React.FC<Props> = ({
  isOpen,
  onClose,
  unassignedStudents,
  totalStudents,
  totalCapacity,
  activeRoomsCount,
  neededRoomsCount,
  onRelaxAndDistribute,
  onGoToClassrooms,
}) => {
  if (!isOpen) return null;

  const unassignedCount = unassignedStudents.length;
  const isPhysicalCapacityDeficit = totalCapacity < totalStudents;
  const physicalShortage = Math.max(0, totalStudents - totalCapacity);

  // Group unassigned students by class
  const classBreakdown: Record<string, number> = {};
  unassignedStudents.forEach(s => {
    classBreakdown[s.classLevel] = (classBreakdown[s.classLevel] || 0) + 1;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-300 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header (Amber / Red Alert Banner) */}
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-amber-700 text-white px-5 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-xs">
              <ShieldAlert className="w-6 h-6 text-amber-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-900/60 text-amber-200 border border-amber-300/40 font-mono text-[10px] font-black px-2 py-0.5 rounded uppercase">
                  Dağıtım Durduruldu
                </span>
                <span className="text-xs text-amber-100 font-semibold">Salon / Kural Yetersizliği</span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                Dağıtılamayan Öğrenciler Tespit Edildi
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {/* Strict Rule Notice */}
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-xl text-red-900 space-y-1">
            <div className="font-extrabold flex items-center gap-1.5 text-xs text-red-950">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Kural Gereği Kısmi Dağıtım Yapılmadı</span>
            </div>
            <p className="text-[11.5px] text-red-800 leading-snug">
              Sınavda hiçbir öğrencinin salonda koltuksuz kalmaması için dağıtım kesinlikle onaylanmamış ve askıya alınmıştır. Dağıtılmayan tek bir öğrenci dahi varsa sistem yarım dağıtım yapmaz.
            </p>
          </div>

          {/* Key Metric Highlights (2 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Card 1: Açıkta Kalan Öğrenci */}
            <div className="bg-amber-50/80 border border-amber-300 p-3 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-amber-800">
                  Açıkta Kalan Öğrenci
                </div>
                <div className="text-xl font-black text-amber-950 font-mono">
                  {unassignedCount} <span className="text-xs font-semibold text-amber-800">Öğrenci</span>
                </div>
              </div>
            </div>

            {/* Card 2: İhtiyaç Duyulan Ek Salon */}
            <div className="bg-blue-50/80 border border-blue-300 p-3 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <DoorClosed className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-blue-800">
                  İhtiyaç Duyulan Salon
                </div>
                <div className="text-xl font-black text-blue-950 font-mono">
                  +{neededRoomsCount} <span className="text-xs font-semibold text-blue-800">Ek Salon Gerekli</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cause Analysis & Capacity Stats */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Salon ve Kapasite Durumu Analizi:</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-200">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[9.5px] text-slate-500 font-bold uppercase">Sınava Girecek</div>
                <div className="font-black text-slate-900 font-mono text-sm mt-0.5">{totalStudents}</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[9.5px] text-slate-500 font-bold uppercase">Mevcut Koltuk</div>
                <div className="font-black text-slate-900 font-mono text-sm mt-0.5">{totalCapacity}</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[9.5px] text-slate-500 font-bold uppercase">Seçili Salon</div>
                <div className="font-black text-slate-900 font-mono text-sm mt-0.5">{activeRoomsCount} Salon</div>
              </div>
            </div>

            {/* Explanation based on case */}
            {isPhysicalCapacityDeficit ? (
              <div className="text-[11px] text-red-800 bg-red-100/70 p-2.5 rounded-lg border border-red-200 leading-snug">
                <strong>Fiziksel Koltuk Yetersiz:</strong> Seçilen salonlardaki toplam koltuk sayısı ({totalCapacity}), sınava girecek öğrenci sayısından ({totalStudents}) <strong>{physicalShortage} eksiktir</strong>. Bu öğrencileri yerleştirebilmek için okuldan yeni sınav salonu seçilmesi zorunludur.
              </div>
            ) : (
              <div className="text-[11px] text-amber-900 bg-amber-100/70 p-2.5 rounded-lg border border-amber-200 leading-snug">
                <strong>Kelebek Kuralı Kısıtlaması:</strong> Salonlarda fiziksel olarak boş koltuklar mevcuttur ({totalCapacity - (totalStudents - unassignedCount)} boş koltuk). Ancak <em>&quot;aynı kademedeki öğrencilerin yan yana oturamaması&quot;</em> kuralı gereği, farklı kademeden öğrenci kalmadığı için bu {unassignedCount} öğrenci açıkta kalmıştır.
              </div>
            )}
          </div>

          {/* Breakdown by Class Level */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1.5">
            <span className="font-extrabold text-slate-800 text-[11px] block">
              Açıkta Kalan Öğrencilerin Sınıf Dağılımı ({unassignedCount} Öğrenci):
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.entries(classBreakdown).map(([cls, count]) => (
                <div
                  key={cls}
                  className="bg-amber-100 text-amber-950 border border-amber-300 font-bold px-2 py-0.5 rounded-md text-[10.5px] flex items-center gap-1 shadow-2xs"
                >
                  <span>{cls}:</span>
                  <span className="bg-amber-800 text-white font-mono px-1 rounded text-[9.5px]">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Button 1: Cancel / Go to Classrooms */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onGoToClassrooms) onGoToClassrooms();
            }}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <DoorClosed className="w-4 h-4 text-slate-500" />
            <span>Dağıtımı İptal Et / Salon Yönetimine Git</span>
          </button>

          {/* Button 2: Relax Constraints & Distribute Anyway */}
          <button
            type="button"
            onClick={onRelaxAndDistribute}
            disabled={isPhysicalCapacityDeficit}
            className={`px-4 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer ${
              isPhysicalCapacityDeficit
                ? 'bg-slate-400 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 active:scale-95'
            }`}
            title={
              isPhysicalCapacityDeficit
                ? 'Fiziksel masa yetersiz olduğu için önce salon eklenmelidir.'
                : 'Kelebek kısıtlarını minimum düzeyde esneterek tüm öğrencileri boş koltuklara yerleştir'
            }
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>Kısıtlamalara Rağmen Yine de Dağıt (Minimum Esnetme)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
