import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Users,
  DoorClosed,
  GraduationCap,
  LayoutGrid,
  Split,
  Calendar,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  ChevronDown,
  CheckCircle2,
  LogOut,
  Sparkles,
  BarChart3,
  Lightbulb,
  LayoutDashboard,
  Printer,
  Award,
} from 'lucide-react';
import { Exam } from '../types';
import { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: number;
  setActiveTab: (tab: number) => void;
  exams: Exam[];
  activeExamId: string;
  setActiveExamId: (id: string) => void;
  user: User | null;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onLoadDemoData: () => void;
  onResetData: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onOpenHelpTips: () => void;
  onOpenPrintModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  exams,
  activeExamId,
  setActiveExamId,
  user,
  onGoogleSignIn,
  onGoogleSignOut,
  onLoadDemoData,
  onResetData,
  onExportBackup,
  onImportBackup,
  onOpenHelpTips,
  onOpenPrintModal,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 0, label: 'Dashboard', icon: LayoutDashboard },
    { id: 1, label: '1. Sınav Tanımlama', icon: Calendar },
    { id: 2, label: '2. Öğrenci Listesi', icon: Users },
    { id: 3, label: '3. Salon Yönetimi', icon: DoorClosed },
    { id: 4, label: '4. Gözetmen Programı', icon: GraduationCap },
    { id: 5, label: '5. Oturma Düzeni', icon: LayoutGrid },
    { id: 6, label: '6. Sınıf Dağılımları', icon: Split },
    { id: 7, label: '7. Sınav Analizi', icon: BarChart3 },
    { id: 8, label: '8. Yazdır & PDF Al', icon: Printer },
    { id: 9, label: '9. Sorumluluk Sınavları', icon: Award },
  ];

  const activeExam = exams.find(e => e.id === activeExamId);

  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-30 no-print border-b border-slate-800 w-full overflow-x-hidden">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 w-full">
        <div className="flex items-center justify-between min-h-[4rem] py-1.5 gap-2 sm:gap-3 w-full">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 py-0.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="font-black text-xs sm:text-sm md:text-base lg:text-lg tracking-tight text-white uppercase truncate leading-normal pt-0.5">
                  SINAV OTURMA DÜZENİ PLANLAYICI
                </span>
                <span className="text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded-full hidden 2xl:inline shrink-0">
                  Kelebek Sistemi
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium hidden 2xl:block leading-tight truncate">
                Ortak Sınav Salon Yerleşim ve Gözetmen Dağıtım Motoru
              </p>
            </div>
          </div>

          {/* Active Exam Selector & Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {activeExam && (
              <div className="hidden 2xl:flex items-center gap-1.5 text-cyan-300 font-bold text-xs max-w-xs truncate bg-cyan-950/40 border border-cyan-800/60 px-2.5 py-1.5 rounded-lg">
                <span className="text-sm">📝</span>
                <span className="truncate">{activeExam.name} - {activeExam.date}</span>
              </div>
            )}

            {exams.length > 0 && (
              <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg px-2 sm:px-2.5 py-1 text-xs">
                <span className="text-slate-400 mr-1.5 font-medium hidden 2xl:inline">Aktif Sınav:</span>
                <select
                  value={activeExamId}
                  onChange={e => setActiveExamId(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer max-w-[105px] sm:max-w-[150px] truncate"
                >
                  {exams.map(exam => (
                    <option key={exam.id} value={exam.id} className="bg-slate-800 text-white">
                      {exam.name} ({exam.date})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Google Sign in / Auth status */}
            {user ? (
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2 sm:px-2.5 py-1 rounded-lg text-xs">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-[10px]">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="max-w-[80px] sm:max-w-[110px] truncate font-medium text-slate-200 hidden sm:inline">
                  {user.displayName || user.email}
                </span>
                <button
                  onClick={onGoogleSignOut}
                  title="Google Oturumunu Kapat"
                  className="text-slate-400 hover:text-red-400 ml-0.5 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onGoogleSignIn}
                className="flex items-center gap-1.5 bg-white text-slate-800 hover:bg-slate-100 font-semibold px-2 sm:px-3 py-1.5 rounded-lg text-xs shadow-sm transition border border-slate-200 cursor-pointer"
                title="Google Sheets senkronizasyonu için bağlan"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.09C3.31 21.46 7.37 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.27C.46 8.21 0 10.05 0 12s.46 3.79 1.27 5.41l4.01-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.31 2.54 1.27 6.59l4.01 3.09c.95-2.83 3.6-4.93 6.72-4.93z"
                  />
                </svg>
                <span className="hidden xl:inline">Google ile Bağlan</span>
              </button>
            )}

            {/* Manage Data Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition"
              >
                <span className="hidden sm:inline">Veri</span>
                <span className="hidden md:inline"> Yönetimi</span>
                <span className="sm:hidden">Veri</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 z-20 text-xs">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onLoadDemoData();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700 text-slate-200 flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Örnek Demo Okul Verisi Yükle</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onExportBackup();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700 text-slate-200 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Tüm Verileri Yedekle (JSON)</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700 text-slate-200 flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4 text-blue-400" />
                      <span>Yedekten Geri Yükle (JSON)</span>
                    </button>
                    <div className="border-t border-slate-700 my-1" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onResetData();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-red-500/20 text-red-400 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Tüm Verileri Temizle</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Quick Print & PDF Button */}
            <button
              onClick={() => {
                if (onOpenPrintModal) {
                  onOpenPrintModal();
                } else {
                  setActiveTab(8);
                }
              }}
              className="flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-700/20 shrink-0"
              title="Sınav Salon Planları, Kapı Listeleri ve Resmi Evrakları Yazdır / PDF İndir"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Yazdır</span>
            </button>

            {/* Help & Tips Button */}
            <button
              onClick={onOpenHelpTips}
              className="flex items-center gap-1 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 hover:text-white px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold border border-indigo-500/30 transition cursor-pointer shadow-xs shrink-0"
              title="Kullanım Rehberi & Yardımcı İpuçları (Kısayol: ?)"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden lg:inline">İpuçları</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  onImportBackup(file);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="bg-slate-950/60 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex space-x-1 overflow-x-auto py-2 scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
