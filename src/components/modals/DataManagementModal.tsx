import React, { useRef } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  Sparkles,
  Trash2,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Users,
  DoorClosed,
  GraduationCap,
  Info,
} from 'lucide-react';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDemoData: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onResetData: () => void;
  stats: {
    examsCount: number;
    studentsCount: number;
    classroomsCount: number;
    teachersCount: number;
    activeExamName?: string;
  };
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  onLoadDemoData,
  onExportBackup,
  onImportBackup,
  onResetData,
  stats,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      {/* Hidden File Input for JSON restore */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
                <span>Veri Yönetimi & Yedekleme Merkezi</span>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  KVKK Uyumlu
                </span>
              </h3>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Okul sınav ve öğrenci verilerinizi yedekleyin, başka bilgisayara aktarın veya sıfırlayın.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Pencereyi Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Current System Status & Statistics Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                <HardDrive className="w-4 h-4 text-indigo-600" />
                Mevcut Sistem Durumu
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Yerel Depolama Aktif
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-white border border-slate-200 rounded-lg p-2 text-center">
                <div className="text-[10.5px] text-slate-500 font-medium">Sınav Sayısı</div>
                <div className="font-mono font-black text-slate-900 text-sm mt-0.5">
                  {stats.examsCount}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2 text-center">
                <div className="text-[10.5px] text-slate-500 font-medium">Kayıtlı Öğrenci</div>
                <div className="font-mono font-black text-slate-900 text-sm mt-0.5">
                  {stats.studentsCount}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2 text-center">
                <div className="text-[10.5px] text-slate-500 font-medium">Sınav Salonu</div>
                <div className="font-mono font-black text-slate-900 text-sm mt-0.5">
                  {stats.classroomsCount}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2 text-center">
                <div className="text-[10.5px] text-slate-500 font-medium">Öğretmen / Gözetmen</div>
                <div className="font-mono font-black text-slate-900 text-sm mt-0.5">
                  {stats.teachersCount}
                </div>
              </div>
            </div>
          </div>

          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Card 1: JSON Export Backup */}
            <div className="border border-slate-200 hover:border-emerald-400 bg-white rounded-xl p-3.5 flex flex-col justify-between transition group shadow-2xs">
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
                  <Download className="w-4 h-4" />
                </div>
                <h4 className="font-black text-slate-900 text-[13px]">
                  Tüm Verileri Yedekle (JSON İndir)
                </h4>
                <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                  Tüm sınavlarınızı, öğrenci listelerinizi, salonlarınızı ve oturma planlarınızı tek bir yedek dosyası (.json) olarak bilgisayarınıza indirir.
                </p>
              </div>
              <button
                onClick={() => {
                  onExportBackup();
                  onClose();
                }}
                className="mt-3.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Yedek Dosyasını İndir</span>
              </button>
            </div>

            {/* Card 2: JSON Import Restore */}
            <div className="border border-slate-200 hover:border-blue-400 bg-white rounded-xl p-3.5 flex flex-col justify-between transition group shadow-2xs">
              <div>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
                  <Upload className="w-4 h-4" />
                </div>
                <h4 className="font-black text-slate-900 text-[13px]">
                  Yedekten Geri Yükle (JSON Yükle)
                </h4>
                <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                  Başka bir bilgisayardan veya daha önce aldığınız .json yedek dosyasını seçerek tüm verileri sisteme geri yükler.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-3.5 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Bilgisayardan Dosya Seç</span>
              </button>
            </div>

            {/* Card 3: Demo Data Load */}
            <div className="border border-slate-200 hover:border-amber-400 bg-white rounded-xl p-3.5 flex flex-col justify-between transition group shadow-2xs">
              <div>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="font-black text-slate-900 text-[13px]">
                  Örnek Demo Okul Verisi Yükle
                </h4>
                <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                  Sistemi denemek için 100+ öğrenci, 4 salon, 6 öğretmen, haftalık ortak sınav takvimi ve sorumluluk sınavlarını tek tıkla yükler.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onLoadDemoData();
                }}
                className="mt-3.5 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-3 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Örnek Okul Verilerini Yükle</span>
              </button>
            </div>

            {/* Card 4: Reset All Data */}
            <div className="border border-slate-200 hover:border-rose-400 bg-white rounded-xl p-3.5 flex flex-col justify-between transition group shadow-2xs">
              <div>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h4 className="font-black text-slate-900 text-[13px]">
                  Tüm Verileri Sıfırla / Temizle
                </h4>
                <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                  Sınavları, öğrencileri, salonları ve oturma planlarını temizleyerek yeni bir eğitim-öğretim dönemi için sistemi sıfırlar.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onResetData();
                }}
                className="mt-3.5 w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold py-2 px-3 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sistemi Sıfırla</span>
              </button>
            </div>
          </div>

          {/* Privacy & Security Note (KVKK) */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-indigo-900">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>%100 Yerel Veri Güvenliği (KVKK Uyumlu):</strong> Öğrenci T.C. no, okul no ve sınav sonuçları hiçbir harici sunucuya veya buluta gönderilmez. Tüm veriler yalnızca kullandığınız bu cihazın tarayıcısında şifreli olarak barındırılır. Başka bir bilgisayara geçmek için yukarıdaki <strong>&quot;Tüm Verileri Yedekle (JSON İndir)&quot;</strong> butonunu kullanabilirsiniz.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Dosya formatı: <strong>.json</strong> (Evrensel veri standardı)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
