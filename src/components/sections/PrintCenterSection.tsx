import React from 'react';
import {
  Printer,
  Layers,
  Users,
  ShieldCheck,
  DoorClosed,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  ArrowRight,
  Sparkles,
  Info,
  Calendar,
  School,
  Check,
} from 'lucide-react';
import { SeatingPlanResult } from '../../types';

interface Props {
  plan: SeatingPlanResult | undefined;
  onOpenPrintModal: (mode: 'ALL' | 'SALON' | 'SUPERVISOR' | 'BEP' | 'CLASSES') => void;
  onGoToPlan: () => void;
}

export const PrintCenterSection: React.FC<Props> = ({
  plan,
  onOpenPrintModal,
  onGoToPlan,
}) => {
  if (!plan) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-dashed border-slate-300 max-w-xl mx-auto my-6 shadow-2xs">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-base font-extrabold text-slate-800">
          Kelebek Oturma Planı Henüz Hazır Değil
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
          Resmi sınav salon planları, kapı çizelgeleri ve gözetmen tutanaklarını alabilmek için lütfen
          önce <strong>5. Oturma Düzeni</strong> bölümünden kelebek dağıtımını çalıştırınız.
        </p>
        <div className="mt-5 flex justify-center">
          <button
            onClick={onGoToPlan}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition cursor-pointer"
          >
            <span>5. Oturma Düzeni Bölümüne Git</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const totalRooms = plan.rooms.length;
  const totalAssigned = plan.rooms.reduce((acc, r) => acc + r.totalAssigned, 0);
  const totalCommission = plan.commissionMembers.length;
  const totalBEP = plan.rooms.reduce(
    (acc, r) => acc + r.seats.filter(s => s.student?.isBEP).length,
    0
  );
  const totalClasses = Array.from(
    new Set(plan.rooms.flatMap(r => Object.keys(r.classDistribution)))
  ).length;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[calc(100vh-140px)] space-y-2.5 overflow-hidden">
      {/* 1. TOP COMPACT HEADER BAR */}
      <div className="shrink-0 bg-white rounded-xl px-3.5 py-2 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="bg-indigo-100 text-indigo-700 font-black px-2 py-0.5 rounded text-[11px] shrink-0">
            BÖLÜM 8
          </span>
          <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight shrink-0">
            Sınav Raporları & Resmi Evrak Çıktı Merkezi
          </h2>
          <span className="text-slate-300 hidden md:inline">|</span>
          <span className="text-[11px] text-slate-500 font-semibold truncate hidden md:inline">
            {plan.examName} ({plan.subjectName})
          </span>
        </div>

        {/* Bulk PDF Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenPrintModal('ALL')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-2xs transition cursor-pointer"
            title="Tüm evrakları (Krokiler, Gözetmenler, BEP ve Kapı Listeleri) tek PDF dosyasında birleştirir"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tüm Evrakları Tek PDF Olarak İndir</span>
          </button>
        </div>
      </div>

      {/* 2. FOUR OFFICIAL DOCUMENT CARDS IN A SINGLE HORIZONTAL ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-stretch shrink-0">
        {/* CARD 1: Salon Oturma Planı */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-blue-400 transition space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Printer className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded">
                Dikey A4
              </span>
            </div>
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-[13px] leading-snug">
              1. Salon Oturma Planları
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              Her salon için sıra numaralı, 2D resmi oturma düzeni ve gözetmen imza tutanağı.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="text-[10.5px] font-semibold text-slate-600 bg-slate-50 px-2 py-1 rounded flex justify-between">
              <span>Mevcut:</span>
              <strong className="text-slate-900 font-mono">
                {totalRooms} Salon · {totalAssigned} Öğrenci
              </strong>
            </div>

            <button
              onClick={() => onOpenPrintModal('SALON')}
              className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-2.5 rounded-lg text-xs shadow-2xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Görüntüle, Yazdır & PDF</span>
            </button>
          </div>
        </div>

        {/* CARD 2: Gözetmen İmza Sirküsü */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-amber-400 transition space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded">
                Resmi Tutanak
              </span>
            </div>
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-[13px] leading-snug">
              2. Gözetmen İmza Sirküsü
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              Komisyon üyeleri ile salonlara görevlendirilen öğretmenlerin resmi imza çizelgesi.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="text-[10.5px] font-semibold text-slate-600 bg-slate-50 px-2 py-1 rounded flex justify-between">
              <span>Görevliler:</span>
              <strong className="text-slate-900 font-mono">
                {totalCommission} Komisyon · {totalRooms} Salon
              </strong>
            </div>

            <button
              onClick={() => onOpenPrintModal('SUPERVISOR')}
              className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-2.5 rounded-lg text-xs shadow-2xs transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Görüntüle, Yazdır & PDF</span>
            </button>
          </div>
        </div>

        {/* CARD 3: BEP Öğrenci Listesi */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-purple-400 transition space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded">
                Özel Tedbir
              </span>
            </div>
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-[13px] leading-snug">
              3. BEP Öğrenci Listesi
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              Özel eğitim ve ek süre tedbiri uygulanacak öğrencilerin resmi takip çizelgesi.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="text-[10.5px] font-semibold text-slate-600 bg-slate-50 px-2 py-1 rounded flex justify-between">
              <span>BEP Tedbiri:</span>
              <strong className="text-purple-700 font-mono font-bold">
                {totalBEP} Öğrenci Planlandı
              </strong>
            </div>

            <button
              onClick={() => onOpenPrintModal('BEP')}
              className="w-full flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold py-1.5 px-2.5 rounded-lg text-xs shadow-2xs transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Görüntüle, Yazdır & PDF</span>
            </button>
          </div>
        </div>

        {/* CARD 4: Sınıf Kapı Listeleri */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-teal-400 transition space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <DoorClosed className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.2 rounded">
                Yatay A4 (2 Şube)
              </span>
            </div>
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-[13px] leading-snug">
              4. Sınıf Kapı Çizelgeleri
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              Öğrencilerin kapı ve panolarda sınav yerlerini görmesini sağlayan ekonomik listeler.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="text-[10.5px] font-semibold text-slate-600 bg-slate-50 px-2 py-1 rounded flex justify-between">
              <span>Şube Sayısı:</span>
              <strong className="text-teal-800 font-mono font-bold">
                {totalClasses} Şube · 2 Şube/Sayfa
              </strong>
            </div>

            <button
              onClick={() => onOpenPrintModal('CLASSES')}
              className="w-full flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold py-1.5 px-2.5 rounded-lg text-xs shadow-2xs transition cursor-pointer"
            >
              <DoorClosed className="w-3.5 h-3.5" />
              <span>Görüntüle, Yazdır & PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. DUAL COLUMN DETAILS ROW (FIELDSET DESIGN MATCHING SECTIONS 1-5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1 min-h-0 overflow-hidden items-stretch">
        {/* LEFT PANEL: Fieldset with print standards & privacy verification (col-span-8) */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
          <fieldset className="border-2 border-indigo-400 rounded-xl p-3 bg-white shadow-2xs flex-1 flex flex-col justify-between overflow-hidden">
            <legend className="px-2 text-xs font-black text-indigo-700 bg-white">
              Resmi Evrak Kontrol & Baskı Standartları
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-[11.5px]">A4 Formatı ve Hızlı Baskı</h4>
                  <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                    Tüm çıktılar MEB standartlarına tam uyumludur. Donma yapmadan doğrudan yazdırılır.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-[11.5px]">Ekonomik Kağıt Tasarrufu</h4>
                  <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                    Kapı listeleri A4 kağıdına yan yana 2 şube olarak basılır ve ortadan kesilir.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-[11.5px]">Öğrenci Gizliliği Koruması</h4>
                  <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                    Kapı listelerinde BEP ibaresi gizlenir; özel tedbirler yalnızca idare listesinde kalır.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-[11.5px]">Net Sıra & Koltuk Numaraları</h4>
                  <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                    #1, #2 koltuk numaraları belirgin siyah rozetlerle uzaktan dahi rahatça okunur.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick reminder ribbon */}
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Tek tıklamayla doğrudan tarayıcı penceresinden yazdırabilir veya PDF indirebilirsiniz.</span>
              </span>
              <button
                onClick={onGoToPlan}
                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Krokiyi İncele</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </fieldset>
        </div>

        {/* RIGHT PANEL: Fieldset with quick distribution metrics & export (col-span-4) */}
        <div className="lg:col-span-4 flex flex-col h-full overflow-hidden">
          <fieldset className="border-2 border-blue-400 rounded-xl p-3 bg-white shadow-2xs flex-1 flex flex-col justify-between overflow-hidden">
            <legend className="px-2 text-xs font-black text-blue-700 bg-white">
              Sınav ve Çıktı Özeti
            </legend>

            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                <span className="text-[11px]">Sınav Adı:</span>
                <strong className="text-slate-900 truncate max-w-[140px] text-[11px]">
                  {plan.examName}
                </strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                <span className="text-[11px]">Ders:</span>
                <strong className="text-slate-900 text-[11px]">
                  {plan.subjectName}
                </strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                <span className="text-[11px]">Toplam Salon:</span>
                <strong className="text-slate-900 font-mono text-[11px]">{totalRooms} Salon</strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                <span className="text-[11px]">Toplam Öğrenci:</span>
                <strong className="text-slate-900 font-mono text-[11px]">{totalAssigned} Öğrenci</strong>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-[11px]">Görevli Gözetmen:</span>
                <strong className="text-slate-900 font-mono text-[11px]">{totalRooms} Öğretmen</strong>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onOpenPrintModal('ALL')}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tüm Evrakları Yazdır / PDF Al</span>
              </button>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
};
