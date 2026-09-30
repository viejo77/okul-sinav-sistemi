import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Printer,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  Users,
  ShieldCheck,
  School,
  ExternalLink,
  Columns,
  LayoutGrid,
  Search,
  Filter,
  DoorClosed,
  RotateCcw,
  BarChart3,
  Armchair,
  BookOpen,
  Info,
} from 'lucide-react';
import { Classroom, Exam, Student, Subject, Teacher, SeatingPlanResult, SeatedStudentInfo } from '../../types';
import { generateKelebekPlan } from '../../services/kelebekEngine';
import { exportPlanToExcelFile } from '../../services/excelService';
import { exportPlanToGoogleSheets } from '../../services/googleSheets';
import { getClassColor } from '../../utils/classColors';

interface Props {
  activeExam: Exam | undefined;
  subject: Subject | undefined;
  students: Student[];
  classrooms: Classroom[];
  teachers: Teacher[];
  currentPlan: SeatingPlanResult | undefined;
  setCurrentPlan: (plan: SeatingPlanResult) => void;
  onOpenPrintModal: (mode: 'SALON' | 'SUPERVISOR' | 'BEP' | 'CLASSES') => void;
  onGoToAnalysis?: () => void;
}

export const SeatingPlanSection: React.FC<Props> = ({
  activeExam,
  subject,
  students,
  classrooms,
  teachers,
  currentPlan,
  setCurrentPlan,
  onOpenPrintModal,
  onGoToAnalysis,
}) => {
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);
  const [layoutMode, setLayoutMode] = useState<'COLUMNS' | 'ROWS'>('COLUMNS');
  const [perspective, setPerspective] = useState<'TEACHER_VIEW' | 'BOARD_TO_BACK'>('TEACHER_VIEW');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingToGoogle, setIsExportingToGoogle] = useState(false);
  const [googleSheetResult, setGoogleSheetResult] = useState<{ url: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');

  // Run Butterfly Algorithm
  const handleGenerate = () => {
    if (!activeExam) {
      alert('Lütfen önce Sınav Tanımlama bölümünden bir sınav seçiniz.');
      return;
    }
    if (!subject) {
      alert('Sınava ait ders tanımı bulunamadı.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage(null);

      const plan = generateKelebekPlan({
        exam: activeExam,
        subject,
        students,
        classrooms,
        teachers,
      });

      setCurrentPlan(plan);
      setSelectedRoomIndex(0);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Kelebek dağıtımı sırasında bir hata oluştu.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Google Sheets Export
  const handleExportGoogleSheets = async () => {
    if (!currentPlan) return;

    try {
      setIsExportingToGoogle(true);
      const res = await exportPlanToGoogleSheets(currentPlan);
      setGoogleSheetResult({ url: res.spreadsheetUrl });
    } catch (err: unknown) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : 'Google E-Tablolara aktarılırken hata oluştu. Lütfen Google ile giriş yapıldığından emin olunuz.'
      );
    } finally {
      setIsExportingToGoogle(false);
    }
  };

  const selectedRoom = currentPlan?.rooms[selectedRoomIndex];

  // Distinct classes in current room for filtering
  const roomClasses = useMemo(() => {
    if (!selectedRoom) return [];
    return Object.keys(selectedRoom.classDistribution).sort();
  }, [selectedRoom]);

  // Overall Statistics
  const totalAssignedStudents = useMemo(() => {
    if (!currentPlan) return 0;
    return currentPlan.rooms.reduce((acc, r) => acc + r.totalAssigned, 0);
  }, [currentPlan]);

  const totalDesksInRooms = useMemo(() => {
    if (!currentPlan) return 0;
    return currentPlan.rooms.reduce((acc, r) => acc + Math.ceil(r.capacity / 2), 0);
  }, [currentPlan]);

  const totalBEPStudentsAssigned = useMemo(() => {
    if (!currentPlan) return 0;
    let count = 0;
    currentPlan.rooms.forEach(r => {
      r.seats.forEach(s => {
        if (s.student?.isBEP) count++;
      });
    });
    return count;
  }, [currentPlan]);

  // Check if seat matches active search or filter
  const isSeatHighlighted = (seat: SeatedStudentInfo | undefined) => {
    if (!seat || !seat.student) return false;
    const std = seat.student;

    if (selectedClassFilter !== 'ALL' && std.classLevel !== selectedClassFilter) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const fullName = `${std.name} ${std.surname}`.toLowerCase();
      const num = std.number.toLowerCase();
      const cls = std.classLevel.toLowerCase();
      return fullName.includes(q) || num.includes(q) || cls.includes(q);
    }

    return selectedClassFilter !== 'ALL';
  };

  return (
    <div className="space-y-3.5">
      {/* TOP HEADER BAR (Matching the other 4 sections) */}
      <div className="bg-white rounded-xl px-3 sm:px-4 py-2 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs w-full min-w-0">
        <div className="flex items-center gap-2 min-w-0 py-0.5">
          <span className="text-xs sm:text-sm md:text-base font-black text-blue-600 tracking-wide uppercase flex items-center gap-1.5 leading-normal">
            <span>🎓</span>
            <span className="truncate">SINAV OTURMA DÜZENİ PLANLAYICI</span>
          </span>
          <span className="text-slate-300 hidden md:inline">|</span>
          <span className="font-bold text-slate-700 hidden md:inline truncate">5. Oturma Düzeni & Kelebek Planı</span>
        </div>

        {activeExam && (
          <div className="flex items-center gap-1.5 text-cyan-700 font-bold italic text-[11px] truncate max-w-xs sm:max-w-md shrink-0 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-lg">
            <span className="shrink-0">📝</span>
            <span className="truncate">
              {activeExam.name} ({activeExam.date} • {activeExam.period}. Ders)
            </span>
          </div>
        )}
      </div>

      {/* Error or Warning Banner */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 flex items-center gap-2 text-red-800 text-xs font-semibold shadow-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {currentPlan && currentPlan.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 space-y-1 shadow-xs">
          <div className="font-bold flex items-center gap-1.5 mb-0.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Kelebek Dağıtım Bildirimleri & Kontrolleri:</span>
          </div>
          {currentPlan.warnings.map((w, idx) => (
            <div key={idx} className="pl-5 list-item text-[11.5px]">
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Google Sheets Link Notification */}
      {googleSheetResult && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Kelebek sınav oturma planınız ve listeleriniz Google E-Tablolar&apos;a başarıyla aktarıldı!
            </span>
          </div>
          <a
            href={googleSheetResult.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-emerald-700 transition"
          >
            <span>Drive&apos;da Aç</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* MAIN TWO-COLUMN LAYOUT (Identical layout structure to Previous 4 Sections) */}
      <div className="flex flex-col lg:flex-row items-start gap-3.5">
        {/* LEFT COLUMN: Fieldset with Actions & Statistics (w-full lg:w-72 shrink-0) */}
        <div className="w-full lg:w-72 shrink-0 space-y-3">
          <fieldset className="border-2 border-blue-400 rounded-xl p-4 bg-white shadow-xs space-y-3.5">
            <legend className="px-2 font-black text-blue-700 text-sm tracking-wide">
              Oturma Düzeni & Dağıtım
            </legend>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Kelebek dağıtım kurallarına göre öğrencileri salonlara karma dağıtın ve krokileri oluşturun.
            </p>

            <div className="space-y-2 pt-1">
              {/* Button 1: Kelebek Dağıtımını Başlat (Ana Buton) */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 text-white font-extrabold py-2.5 px-3 rounded-lg shadow-xs flex items-center justify-center gap-2 text-xs transition active:scale-[0.98] cursor-pointer"
              >
                {isGenerating ? (
                  <RotateCcw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-300" />
                )}
                <span>
                  {isGenerating
                    ? 'Yerleştiriliyor...'
                    : currentPlan
                    ? 'Yeniden Dağıt (Kelebek)'
                    : 'Kelebek Dağıtımını Başlat'}
                </span>
              </button>

              {/* Rapor & Çıktı Butonları */}
              {currentPlan && (
                <>
                  <div className="pt-2 border-t border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Resmi Raporlar & PDF</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-extrabold px-1.5 py-0.2 rounded">PDF / A4</span>
                    </div>
                  </div>

                  {/* Button 2: Salon Oturma Planı (A4 / 2 Salon) */}
                  <button
                    type="button"
                    onClick={() => onOpenPrintModal('SALON')}
                    className="w-full bg-white hover:bg-slate-100 text-slate-700 font-bold py-2 px-3 rounded-lg border border-slate-300 shadow-2xs flex items-center justify-between text-xs transition cursor-pointer"
                    title="A4 kağıdında iki salon olacak şekilde PDF veya yazdır"
                  >
                    <div className="flex items-center gap-2">
                      <Printer className="w-3.5 h-3.5 text-blue-600" />
                      <span>Salon Oturma Planı</span>
                    </div>
                    <span className="text-[9px] font-mono bg-blue-50 text-blue-700 font-bold px-1.5 py-0.2 rounded border border-blue-200">PDF</span>
                  </button>

                  {/* Button 3: Sınav Görevli & Komisyon Listesi */}
                  <button
                    type="button"
                    onClick={() => onOpenPrintModal('SUPERVISOR')}
                    className="w-full bg-white hover:bg-slate-100 text-slate-700 font-bold py-2 px-3 rounded-lg border border-slate-300 shadow-2xs flex items-center justify-between text-xs transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                      <span>Görevli & Komisyon Listesi</span>
                    </div>
                    <span className="text-[9px] font-mono bg-amber-50 text-amber-700 font-bold px-1.5 py-0.2 rounded border border-amber-200">PDF</span>
                  </button>

                  {/* Button 4: BEP (Kaynaştırma) Listesi */}
                  <button
                    type="button"
                    onClick={() => onOpenPrintModal('BEP')}
                    className="w-full bg-white hover:bg-slate-100 text-slate-700 font-bold py-2 px-3 rounded-lg border border-slate-300 shadow-2xs flex items-center justify-between text-xs transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>BEP Öğrenci Listesi</span>
                    </div>
                    <span className="text-[9px] font-mono bg-purple-50 text-purple-700 font-bold px-1.5 py-0.2 rounded border border-purple-200">PDF</span>
                  </button>

                  {/* Button 5: Sınıf Kapı Listeleri */}
                  <button
                    type="button"
                    onClick={() => onOpenPrintModal('CLASSES')}
                    className="w-full bg-white hover:bg-slate-100 text-slate-700 font-bold py-2 px-3 rounded-lg border border-slate-300 shadow-2xs flex items-center justify-between text-xs transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <DoorClosed className="w-3.5 h-3.5 text-slate-600" />
                      <span>Sınıf Kapı Listeleri</span>
                    </div>
                    <span className="text-[9px] font-mono bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded border border-slate-200">PDF</span>
                  </button>

                  {/* Button 6: Excel (.xlsx) İndir */}
                  <button
                    type="button"
                    onClick={() => exportPlanToExcelFile(currentPlan)}
                    className="w-full bg-white hover:bg-emerald-50 text-emerald-700 font-bold py-2 px-3 rounded-lg border border-emerald-500 shadow-2xs flex items-center justify-between text-xs transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Excel (.xlsx) İndir</span>
                    </div>
                    <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">XLSX</span>
                  </button>

                  {/* Button 7: Google Sheets'e Aktar */}
                  <button
                    type="button"
                    onClick={handleExportGoogleSheets}
                    disabled={isExportingToGoogle}
                    className="w-full bg-white hover:bg-blue-50 text-blue-700 font-bold py-2 px-3 rounded-lg border border-blue-400 shadow-2xs flex items-center justify-center gap-2 text-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isExportingToGoogle ? 'Aktarılıyor...' : "Google Sheets'e Aktar"}</span>
                  </button>

                  {/* Button 8: Sınav Analizine Git */}
                  {onGoToAnalysis && (
                    <button
                      type="button"
                      onClick={onGoToAnalysis}
                      className="w-full bg-white hover:bg-indigo-50 text-indigo-700 font-bold py-2 px-3 rounded-lg border border-indigo-400 shadow-2xs flex items-center justify-center gap-2 text-xs transition cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Sınav Analiz Grafikleri</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Quick Stats Summary */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
              <div className="flex justify-between items-center">
                <span>Dağıtılan Öğrenci:</span>
                <strong className="text-slate-900 font-mono font-bold">
                  {totalAssignedStudents} / {students.length}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Kullanılan Salon:</span>
                <strong className="text-slate-900 font-mono font-bold">
                  {currentPlan ? currentPlan.rooms.length : 0} Salon
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Toplam Sıra (Masa):</span>
                <strong className="text-slate-900 font-mono font-bold">
                  {totalDesksInRooms} Sıra
                </strong>
              </div>
              {currentPlan && (
                <div className="flex justify-between items-center text-emerald-700">
                  <span>Dengeli Dağılım:</span>
                  <span className="bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.2 rounded text-[10px]">
                    Salonlara Eşit Dağıtıldı
                  </span>
                </div>
              )}
              {totalBEPStudentsAssigned > 0 && (
                <div className="flex justify-between items-center text-purple-700">
                  <span>Ön Sırada BEP:</span>
                  <strong className="font-mono font-bold">{totalBEPStudentsAssigned} Öğrenci</strong>
                </div>
              )}
              {currentPlan && currentPlan.unassignedStudents.length > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span>Açıkta Kalan:</span>
                  <strong className="font-mono font-bold">
                    {currentPlan.unassignedStudents.length} Öğrenci
                  </strong>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-200">
                <span className="text-blue-700 font-semibold">Oturma Kuralı:</span>
                <span className="bg-blue-100 text-blue-900 font-extrabold px-1.5 py-0.2 rounded text-[10px]">
                  Boş Yerde Tekli, Gerekirse İkili
                </span>
              </div>
            </div>
          </fieldset>

          {/* Sınav Dağıtım İlkeleri Bilgi Kartı */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-slate-600 text-[11px] space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs text-blue-700">
              <Info className="w-3.5 h-3.5" />
              <span>Sınav Dağıtım İlkeleri:</span>
            </div>
            <p className="leading-snug">
              • <strong>Salonlara Eşit Dağıtım:</strong> Öğrenciler sınav salonlarına eşit olarak paylaştırılır; bir salon doluyken diğeri yarım kalmaz.
            </p>
            <p className="leading-snug">
              • <strong>Sıralara Yayılma (Tekli Oturma):</strong> Salonda boş yer varken sıralar tamamen boş bırakılmaz; öğrenciler tekli oturtulur.
            </p>
            <p className="leading-snug">
              • <strong>Kelebek Eşleşmesi:</strong> Sıralarda yan yana veya peş peşe asla aynı sınıftan öğrenci bulunamaz.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Room Tabs, Filters, and Side-by-Side Visual Seating Plan */}
        <div className="flex-1 min-w-0 w-full bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
          {/* If No Plan Yet: Guidance Placeholder */}
          {!currentPlan ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <School className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Henüz Oturma Düzeni Oluşturulmadı
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Öğrencileri sınav salonlarına kelebek dağıtım kuralına göre (bir sırada iki öğrenci yan yana gelecek şekilde) yerleştirmek için soldaki <strong>&quot;Kelebek Dağıtımını Başlat&quot;</strong> butonuna tıklayınız.
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer transition active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Kelebek Dağıtımını Başlat</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col min-w-0">
              {/* 1. Room Selector Tabs (Vibrant Blue Style) */}
              <div className="bg-slate-100/80 p-2.5 border-b border-slate-200 flex flex-wrap items-center gap-1.5">
                {currentPlan.rooms.map((room, idx) => {
                  const isActive = idx === selectedRoomIndex;
                  return (
                    <button
                      key={room.classroomId}
                      type="button"
                      onClick={() => setSelectedRoomIndex(idx)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-200/70 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span>{room.classroomName}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {room.totalAssigned} / {room.capacity}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedRoom && (
                <div className="p-4 space-y-4">
                  {/* 2. Room Information & Supervisor Card */}
                  <div className="bg-gradient-to-r from-blue-50/70 to-slate-50 p-4 rounded-xl border border-blue-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900 tracking-wide">
                          {selectedRoom.classroomName}
                        </h3>
                        <span className="text-xs bg-blue-100 text-blue-800 font-extrabold px-2.5 py-0.5 rounded-md border border-blue-200">
                          {selectedRoom.totalAssigned} / {selectedRoom.capacity} Koltuk Dolu
                        </span>
                        <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md border border-slate-200 font-mono">
                          {Math.ceil(selectedRoom.capacity / 2)} Çiftli Sıra (Masa)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap items-center gap-3">
                        <span>
                          Kapı Konumu: <strong>{selectedRoom.doorPosition === 'right' ? 'Sağda' : 'Solda'}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Öğretmen Masası: <strong>{selectedRoom.doorPosition === 'right' ? 'Sol Önde' : 'Sağ Önde'}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          1 No Sıra Başlangıcı: <strong>{selectedRoom.doorPosition === 'right' ? 'Sol Duvar Önü' : 'Sağ Duvar Önü'}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Gözetmen Bilgisi */}
                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-2xs text-xs min-w-[220px]">
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        Salon Sınav Gözetmeni
                      </div>
                      <div className="font-extrabold text-slate-900 text-xs mt-0.5">
                        {selectedRoom.supervisorName}
                      </div>
                      <div className="flex justify-between items-center text-[10.5px] text-slate-500 mt-0.5">
                        <span>{selectedRoom.supervisorBranch || 'Genel'}</span>
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-bold text-[9.5px]">
                          {selectedRoom.supervisorReason}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Sınıf Dağılımı Rozetleri */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-700 mr-1 text-[11px]">Salondaki Sınıf Dağılımı:</span>
                    {Object.entries(selectedRoom.classDistribution).map(([cls, cnt]) => {
                      const col = getClassColor(cls);
                      const isSelected = selectedClassFilter === cls;
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setSelectedClassFilter(isSelected ? 'ALL' : cls)}
                          className={`px-2 py-0.5 rounded-md font-bold text-xs border transition flex items-center gap-1.5 cursor-pointer ${
                            col.lightBadge
                          } ${isSelected ? 'ring-2 ring-blue-500 shadow-xs' : 'hover:opacity-90'}`}
                          title={`${cls} sınıfındaki öğrencileri vurgula`}
                        >
                          <span>{cls}</span>
                          <span className="text-[10px] font-mono opacity-80">({cnt})</span>
                        </button>
                      );
                    })}
                    {selectedClassFilter !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setSelectedClassFilter('ALL')}
                        className="text-[10px] text-blue-600 hover:underline font-semibold ml-auto"
                      >
                        Filtreyi Temizle
                      </button>
                    )}
                  </div>

                  {/* 4. Controls & Search Toolbar */}
                  <div className="p-2.5 bg-slate-50/90 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          placeholder="Öğrenci adı, no veya sınıf ara..."
                          className="rounded-lg border border-slate-300 pl-8 pr-3 py-1 bg-white text-xs w-48 sm:w-56 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        {searchTerm && (
                          <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Filter by class dropdown */}
                      <div className="flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                        <select
                          value={selectedClassFilter}
                          onChange={e => setSelectedClassFilter(e.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1 bg-white font-semibold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="ALL">Tüm Sınıflar</option>
                          {roomClasses.map(cls => (
                            <option key={cls} value={cls}>
                              {cls}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Perspective Switcher */}
                      <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-300 text-xs">
                        <button
                          type="button"
                          onClick={() => setPerspective('TEACHER_VIEW')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                            perspective === 'TEACHER_VIEW'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Öğretmen masası önde (altta); 1 numaralı sıra en önde kürsü yanında yer alır."
                        >
                          Öğretmen Kürsüsü Bakışı
                        </button>
                        <button
                          type="button"
                          onClick={() => setPerspective('BOARD_TO_BACK')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                            perspective === 'BOARD_TO_BACK'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Düz Bakış
                        </button>
                      </div>

                      {/* Layout Mode Switcher */}
                      <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-300 text-xs">
                        <button
                          type="button"
                          onClick={() => setLayoutMode('COLUMNS')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            layoutMode === 'COLUMNS'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Sütunlar halinde gerçek sınıf krokisi"
                        >
                          <Columns className="w-3 h-3" />
                          <span>Sütun Düzeni ({selectedRoom.columnsCount || 4} Sütun)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLayoutMode('ROWS')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            layoutMode === 'ROWS'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Sıra sıra çiftli masa listesi"
                        >
                          <LayoutGrid className="w-3 h-3" />
                          <span>Sıra Listesi</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 5. VISUAL SEATING PLAN (SALON KROKİSİ - YATAY KAYDIRMA OLMADAN TAM EKRAN OTURAN DÜZEN) */}
                  <div className="border border-slate-300 rounded-xl p-2 sm:p-3 bg-slate-100/60 shadow-inner w-full min-w-0">
                    {/* Top: Arka Duvar */}
                    <div className="text-center font-bold text-[9.5px] text-slate-500 mb-2 uppercase tracking-widest bg-slate-200/70 py-1 rounded-md">
                      [ SINIFIN ARKA TARAFI / ARKA DUVAR ]
                    </div>

                    {/* SEATING PLAN DISPLAY: COLUMNS MODE (Realistic Classroom with Side-by-Side Seats, No Horizontal Scroll) */}
                    {layoutMode === 'COLUMNS' ? (
                      (() => {
                        const cols = selectedRoom.columnsCount || 4;
                        const rowsPerCol =
                          selectedRoom.rowsPerColumn ||
                          Math.max(1, Math.ceil(Math.ceil(selectedRoom.capacity / 2) / cols));

                        // In TEACHER_VIEW: Back rows are at the top, Front rows (rIdx = 0, Koltuk 1) are at the bottom closest to teacher desk!
                        const rowIndices =
                          perspective === 'TEACHER_VIEW'
                            ? Array.from({ length: rowsPerCol }).map((_, idx) => rowsPerCol - 1 - idx)
                            : Array.from({ length: rowsPerCol }).map((_, idx) => idx);

                        const isDoorRight = selectedRoom.doorPosition === 'right';
                        const visualColIndices = isDoorRight
                          ? Array.from({ length: cols }, (_, i) => i)
                          : Array.from({ length: cols }, (_, i) => cols - 1 - i);

                        return (
                          <div
                            className="grid gap-2 w-full mx-auto"
                            style={{
                              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
                            }}
                          >
                            {visualColIndices.map(cIdx => {
                              const isWallCol = cIdx === 0;
                              const isDoorCol = cIdx === cols - 1;
                              const colHeader = isWallCol
                                ? `1. SÜTUN (${isDoorRight ? 'Sol' : 'Sağ'} Duvar / Kürsü)`
                                : isDoorCol
                                ? `${cols}. SÜTUN (Kapı)`
                                : `${cIdx + 1}. SÜTUN`;

                              return (
                                <div
                                  key={cIdx}
                                  className={`rounded-lg p-1.5 border shadow-2xs space-y-1.5 min-w-0 ${
                                    isWallCol
                                      ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-200'
                                      : 'bg-white/90 border-slate-200'
                                  }`}
                                >
                                  {/* Sütun Başlığı */}
                                  <div
                                    className={`text-center font-extrabold text-[10.5px] py-1 px-1 rounded-md border truncate ${
                                      isWallCol
                                        ? 'text-blue-950 bg-blue-100 border-blue-300'
                                        : 'text-slate-800 bg-slate-100 border-slate-200'
                                    }`}
                                  >
                                    {colHeader}
                                  </div>

                                  {/* Desks inside Column: Desks are ordered front-to-back or back-to-front */}
                                  <div className="space-y-1.5 min-w-0">
                                    {rowIndices.map(rIdx => {
                                      const deskIdx = cIdx * rowsPerCol + rIdx;

                                      // Find seats for this desk:
                                      // colIndex 0 = Left Seat (Sol Koltuk)
                                      // colIndex 1 = Right Seat (Sağ Koltuk)
                                      const seatWall =
                                        selectedRoom.seats.find(
                                          s =>
                                            s.deskColumnIndex === cIdx &&
                                            s.deskRowIndex === rIdx &&
                                            s.colIndex === 0
                                        ) || selectedRoom.seats[deskIdx * 2];

                                      const seatInner =
                                        selectedRoom.seats.find(
                                          s =>
                                            s.deskColumnIndex === cIdx &&
                                            s.deskRowIndex === rIdx &&
                                            s.colIndex === 1
                                        ) || selectedRoom.seats[deskIdx * 2 + 1];

                                      if (!seatWall && !seatInner) return null;

                                      const leftSeat = isDoorRight ? seatWall : seatInner;
                                      const rightSeat = isDoorRight ? seatInner : seatWall;
                                      const leftIsWall = isDoorRight;
                                      const rightIsWall = !isDoorRight;
                                      const isFrontRow = rIdx === 0;

                                      const leftHighlighted = isSeatHighlighted(leftSeat);
                                      const rightHighlighted = isSeatHighlighted(rightSeat);

                                      const hasTwoStudents = leftSeat?.student && rightSeat?.student;
                                      const hasOneStudent = (leftSeat?.student && !rightSeat?.student) || (!leftSeat?.student && rightSeat?.student);

                                      return (
                                        /* AUTHENTIC SCHOOL DESK BENCH (ÇİFTLİ SIRA) */
                                        <div
                                          key={rIdx}
                                          className={`bg-white rounded-lg border p-1.5 shadow-2xs transition-all min-w-0 ${
                                            isFrontRow && isWallCol
                                              ? 'border-amber-400 ring-2 ring-amber-300/60 bg-amber-50/15'
                                              : isFrontRow
                                              ? 'border-blue-300 ring-1 ring-blue-200/50'
                                              : 'border-slate-300 hover:border-blue-400'
                                          }`}
                                        >
                                          {/* Desk Header (Sıra Bilgisi ve Yan Yana / Tekli Rozeti) */}
                                          <div className="text-[9.5px] font-bold text-slate-700 flex justify-between items-center border-b border-slate-100 pb-1 mb-1 min-w-0">
                                            <div className="flex items-center gap-1 min-w-0">
                                              <span className="font-extrabold text-slate-900 bg-slate-100 px-1 py-0.2 rounded text-[9px] font-mono border border-slate-200 shrink-0">
                                                Sıra {deskIdx + 1}
                                              </span>
                                              {hasTwoStudents ? (
                                                <span className="text-[8px] font-bold bg-blue-100 text-blue-900 px-1 py-0.2 rounded shrink-0">
                                                  İkili
                                                </span>
                                              ) : hasOneStudent ? (
                                                <span className="text-[8px] font-bold bg-emerald-100 text-emerald-900 px-1 py-0.2 rounded shrink-0">
                                                  Tekli
                                                </span>
                                              ) : null}
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                              {isFrontRow ? (
                                                <span
                                                  className={`text-[8.5px] px-1 py-0.2 rounded font-black ${
                                                    isWallCol
                                                      ? 'bg-amber-200 text-amber-950 border border-amber-400'
                                                      : 'bg-amber-100 text-amber-800'
                                                  }`}
                                                >
                                                  {isWallCol ? '★ 1 (Kürsü)' : 'Ön Sıra'}
                                                </span>
                                              ) : (
                                                <span className="text-[8.5px] text-slate-400 font-normal">
                                                  {rIdx + 1}. Sıra
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {/* DESK SURFACE: TWO STUDENTS SITTING SIDE-BY-SIDE (YAN YANA) */}
                                          <div className="grid grid-cols-2 gap-1 items-stretch min-w-0">
                                            {/* SOL KOLTUK (Left Seat) */}
                                            <div className="flex flex-col min-w-0">
                                              <div className="text-[8.5px] font-bold text-slate-400 mb-0.5 flex items-center justify-between px-0.5">
                                                <span>Sol</span>
                                                <span className="text-[8px] opacity-75">
                                                  {leftIsWall ? '(Duvar)' : '(İç)'}
                                                </span>
                                              </div>
                                              {leftSeat?.student ? (
                                                <SideBySideSeatCard
                                                  seatNumber={leftSeat.seatNumber}
                                                  student={leftSeat.student}
                                                  isHighlighted={leftHighlighted}
                                                  isFrontAndWall={isFrontRow && isWallCol && leftIsWall}
                                                />
                                              ) : (
                                                <div className="h-full min-h-[48px] border border-dashed border-slate-200 rounded-md p-1 flex flex-col items-center justify-center text-center text-slate-400 text-[8.5px] italic bg-slate-50/70 min-w-0">
                                                  <Armchair className="w-3 h-3 mb-0.5 opacity-35" />
                                                  <span className="truncate">#{leftSeat?.seatNumber} Boş</span>
                                                </div>
                                              )}
                                            </div>

                                            {/* SAĞ KOLTUK (Right Seat) */}
                                            <div className="flex flex-col min-w-0">
                                              <div className="text-[8.5px] font-bold text-slate-400 mb-0.5 flex items-center justify-between px-0.5">
                                                <span>Sağ</span>
                                                <span className="text-[8px] opacity-75">
                                                  {rightIsWall ? '(Duvar)' : '(İç)'}
                                                </span>
                                              </div>
                                              {rightSeat?.student ? (
                                                <SideBySideSeatCard
                                                  seatNumber={rightSeat.seatNumber}
                                                  student={rightSeat.student}
                                                  isHighlighted={rightHighlighted}
                                                  isFrontAndWall={isFrontRow && isWallCol && rightIsWall}
                                                />
                                              ) : (
                                                <div className="h-full min-h-[48px] border border-dashed border-slate-200 rounded-md p-1 flex flex-col items-center justify-center text-center text-slate-400 text-[8.5px] italic bg-slate-50/70 min-w-0">
                                                  <Armchair className="w-3 h-3 mb-0.5 opacity-35" />
                                                  <span className="truncate">#{rightSeat?.seatNumber} Boş</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : (
                      /* ROWS LIST MODE (Linear double desks list - Two students side by side) */
                      <div className="space-y-2 max-w-4xl mx-auto min-w-0">
                        {Array.from({ length: Math.ceil(selectedRoom.capacity / 2) }).map((_, dIdx) => {
                          const seat1 = selectedRoom.seats[dIdx * 2];
                          const seat2 = selectedRoom.seats[dIdx * 2 + 1];

                          const seat1Highlighted = isSeatHighlighted(seat1);
                          const seat2Highlighted = isSeatHighlighted(seat2);

                          return (
                            <div
                              key={dIdx}
                              className="bg-white rounded-lg border border-slate-300 p-2 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 hover:border-blue-400 transition min-w-0"
                            >
                              <div className="flex sm:flex-col items-center justify-between sm:justify-center text-[10px] font-bold text-slate-500 sm:w-16 shrink-0 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                <span className="font-extrabold text-slate-800 text-xs font-mono">
                                  Sıra {dIdx + 1}
                                </span>
                                <span className="text-[9px] text-slate-400">Çiftli Masa</span>
                              </div>

                              {/* Two Seats Side-by-Side (Yan Yana) in List View */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-w-0">
                                {/* Sol Koltuk */}
                                <div className="min-w-0">
                                  <div className="text-[9px] font-bold text-slate-400 mb-0.5">
                                    Sol Koltuk (#{seat1?.seatNumber})
                                  </div>
                                  {seat1?.student ? (
                                    <SideBySideSeatCard
                                      seatNumber={seat1.seatNumber}
                                      student={seat1.student}
                                      isHighlighted={seat1Highlighted}
                                    />
                                  ) : (
                                    <div className="border border-dashed border-slate-300 rounded-md p-1.5 text-center text-slate-400 text-xs italic bg-slate-50/50">
                                      #{seat1?.seatNumber} [Boş Koltuk]
                                    </div>
                                  )}
                                </div>

                                {/* Sağ Koltuk */}
                                <div className="min-w-0">
                                  <div className="text-[9px] font-bold text-slate-400 mb-0.5">
                                    Sağ Koltuk (#{seat2?.seatNumber})
                                  </div>
                                  {seat2?.student ? (
                                    <SideBySideSeatCard
                                      seatNumber={seat2.seatNumber}
                                      student={seat2.student}
                                      isHighlighted={seat2Highlighted}
                                    />
                                  ) : (
                                    <div className="border border-dashed border-slate-300 rounded-md p-1.5 text-center text-slate-400 text-xs italic bg-slate-50/50">
                                      #{seat2?.seatNumber} [Boş Koltuk]
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* TEACHER DESK & DOOR AT THE BOTTOM (FRONT OF CLASSROOM) */}
                    <div className="mt-4 pt-3 border-t-2 border-slate-300 w-full mx-auto min-w-0">
                      <div className="text-center font-bold text-[10px] text-slate-500 mb-2 uppercase tracking-widest bg-slate-200/80 py-1 rounded-md">
                        [ SINIFIN ÖN TARAFI - YAZI TAHTASI & ÖĞRETMEN KÜRSÜSÜ ]
                      </div>
                      <div className="flex justify-between items-center gap-2 px-1">
                        {/* Sol Taraf (Masa veya Kapı) */}
                        <div
                          className={`p-2 rounded-lg border-2 transition-all w-36 sm:w-44 text-center shrink-0 ${
                            selectedRoom.doorPosition === 'right'
                              ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-black text-xs shadow-xs'
                              : 'bg-emerald-100/90 border-emerald-400 text-emerald-950 font-bold text-xs'
                          }`}
                        >
                          {selectedRoom.doorPosition === 'right'
                            ? 'ÖĞRETMEN KÜRSÜSÜ'
                            : 'GİRİŞ KAPISI (Sol)'}
                        </div>

                        {/* Orta Yazı Tahtası */}
                        <div className="text-xs font-bold text-slate-600 uppercase tracking-wider hidden sm:flex items-center gap-1.5 bg-slate-200/60 px-3 py-1 rounded-lg border border-slate-300">
                          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                          <span>Yazı Tahtası</span>
                        </div>

                        {/* Sağ Taraf (Masa veya Kapı) */}
                        <div
                          className={`p-2 rounded-lg border-2 transition-all w-36 sm:w-44 text-center shrink-0 ${
                            selectedRoom.doorPosition === 'right'
                              ? 'bg-emerald-100/90 border-emerald-400 text-emerald-950 font-bold text-xs'
                              : 'bg-amber-100/90 border-amber-400 text-amber-950 font-black text-xs shadow-xs'
                          }`}
                        >
                          {selectedRoom.doorPosition === 'right'
                            ? 'GİRİŞ KAPISI (Sağ)'
                            : 'ÖĞRETMEN KÜRSÜSÜ'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Side-by-Side Seat Card Component: Compact, legible, distinct
interface SeatCardProps {
  seatNumber: number;
  student: Student;
  isHighlighted?: boolean;
  isFrontAndWall?: boolean;
}

const SideBySideSeatCard: React.FC<SeatCardProps> = ({
  seatNumber,
  student,
  isHighlighted = false,
  isFrontAndWall = false,
}) => {
  const col = getClassColor(student.classLevel);

  return (
    <div
      className={`border rounded-md p-1 transition flex flex-col justify-between min-h-[48px] min-w-0 overflow-hidden ${col.bg} ${col.border} ${
        isHighlighted
          ? 'ring-2 ring-blue-500 shadow-md scale-[1.02] bg-blue-50'
          : isFrontAndWall
          ? 'ring-1 ring-amber-400 shadow-xs'
          : 'hover:shadow-2xs'
      }`}
      title={`Koltuk #${seatNumber} | ${student.classLevel} - No: ${student.number} - ${student.name} ${student.surname}`}
    >
      {/* Top row: Seat Number badge & Class Badge */}
      <div className="flex items-center justify-between gap-0.5 min-w-0">
        <span className="w-4 h-4 rounded bg-slate-900 text-white font-mono font-black text-[8.5px] flex items-center justify-center shrink-0 shadow-2xs">
          #{seatNumber}
        </span>

        <div className="flex items-center gap-0.5 overflow-hidden min-w-0">
          <span
            className={`font-black px-1 py-0.2 rounded text-[8.5px] shadow-2xs truncate max-w-[55px] ${col.badge}`}
          >
            {student.classLevel}
          </span>
          {student.isBEP && (
            <span className="bg-purple-700 text-white font-black text-[7.5px] px-1 py-0.2 rounded uppercase shrink-0">
              BEP
            </span>
          )}
        </div>
      </div>

      {/* Bottom row: Student Full Name & Number */}
      <div className="mt-0.5 pt-0.5 border-t border-black/5 min-w-0">
        <div className="font-extrabold text-[9.5px] text-slate-900 truncate leading-tight">
          {student.name} {student.surname}
        </div>
        <div className="text-[8.5px] text-slate-500 font-mono font-medium leading-none mt-0.5 truncate">
          No: {student.number}
        </div>
      </div>
    </div>
  );
};
