import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  X,
  Download,
  FileText,
  CheckCircle2,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  Layers,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { SeatingPlanResult } from '../../types';
import { SalonSeatingPrint } from '../print/SalonSeatingPrint';
import { SupervisorListPrint } from '../print/SupervisorListPrint';
import { BEPStudentPrint } from '../print/BEPStudentPrint';
import { ClassDoorListsPrint } from '../print/ClassDoorListsPrint';
import { exportToPdf, printElementDirectly } from '../../utils/pdfExport';

interface Props {
  initialMode: 'SALON' | 'SUPERVISOR' | 'BEP' | 'CLASSES' | 'ALL';
  plan: SeatingPlanResult;
  onClose: () => void;
}

export const PrintPreviewModal: React.FC<Props> = ({ initialMode, plan, onClose }) => {
  const [activeTab, setActiveTab] = useState<'SALON' | 'SUPERVISOR' | 'BEP' | 'CLASSES' | 'ALL'>(
    initialMode
  );
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [roomsPerPage, setRoomsPerPage] = useState<1 | 2>(2);
  const [zoomScale, setZoomScale] = useState<number>(0.9);

  // PDF Exporting State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reportContainerRef = useRef<HTMLDivElement>(null);

  // Extract available class names for filter
  const classNamesSet = new Set<string>();
  plan.rooms.forEach(room => {
    room.seats.forEach(seat => {
      if (seat.student) {
        classNamesSet.add(seat.student.classLevel);
      }
    });
  });
  const availableClasses = Array.from(classNamesSet).sort((a, b) => a.localeCompare(b, 'tr'));

  // Get current orientation
  const isLandscape = activeTab === 'CLASSES';

  // Generate appropriate filename based on current report and filters
  const getExportFilename = () => {
    const safeExamName = plan.examName.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_ -]/g, '').trim().replace(/\s+/g, '_');
    const safeDate = plan.examDate.replace(/\./g, '-');

    switch (activeTab) {
      case 'SALON':
        if (selectedRoomFilter !== 'ALL') {
          const roomObj = plan.rooms.find(r => r.classroomId === selectedRoomFilter);
          const roomName = (roomObj?.classroomName || 'Salon').replace(/\s+/g, '_');
          return `${safeExamName}_Salon_${roomName}_Oturma_Plani.pdf`;
        }
        return `${safeExamName}_Salon_Oturma_Planlari_Tum.pdf`;
      case 'SUPERVISOR':
        return `${safeExamName}_Gozetmen_ve_Komisyon_Listesi.pdf`;
      case 'BEP':
        return `${safeExamName}_BEP_Ogrenci_Listesi.pdf`;
      case 'CLASSES':
        if (selectedClassFilter !== 'ALL') {
          return `${safeExamName}_Kapi_Listesi_Sinif_${selectedClassFilter.replace(/\s+/g, '_')}.pdf`;
        }
        return `${safeExamName}_Sinif_Kapi_Cizelgeleri_Tum.pdf`;
      case 'ALL':
        return `${safeExamName}_Tum_Sinav_Evraklari_Paketi_${safeDate}.pdf`;
      default:
        return `${safeExamName}_Rapor.pdf`;
    }
  };

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    if (!reportContainerRef.current || isExporting) return;

    try {
      setIsExporting(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setExportProgress({ current: 1, total: 1 });

      const filename = getExportFilename();

      await exportToPdf(reportContainerRef.current, {
        filename,
        orientation: isLandscape ? 'landscape' : 'portrait',
        onProgress: (current, total) => {
          setExportProgress({ current, total });
        },
      });

      setSuccessMessage(`${filename} başarıyla indirildi!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      console.error('PDF export error:', err);
      setErrorMessage(
        'PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyiniz veya yazıcı seçeneğini kullanınız.'
      );
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // Check if embedded in an iframe (e.g. AI Studio development preview)
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Handle Direct Print & Native PDF Save across all browsers
  const handlePrint = async () => {
    if (!reportContainerRef.current) return;

    if (isInIframe) {
      // In an iframe (AI Studio preview environment), browser security blocks window.print() modal dialogs.
      // Automatically generate and download the high-resolution print PDF directly!
      setSuccessMessage(
        'Önizleme ortamı güvenlik kısıtlaması nedeniyle yazdırma penceresi açılamadığından, belgeniz yazdırmaya hazır A4 PDF olarak hazırlanıp indiriliyor...'
      );
      await handleDownloadPdf();
      return;
    }

    try {
      const title = getExportFilename().replace('.pdf', '');
      printElementDirectly(reportContainerRef.current, {
        title,
        landscape: isLandscape,
      });
    } catch (err) {
      console.warn('Native print failed, falling back to PDF download:', err);
      await handleDownloadPdf();
    }
  };

  // Keyboard shortcut listener: Ctrl+P / Cmd+P to trigger clean isolated print
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, selectedRoomFilter, selectedClassFilter, roomsPerPage, isLandscape]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col no-print animate-in fade-in duration-200">
      {/* 1. TOP HEADER & NAVIGATION */}
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold tracking-tight">Sınav Raporları & PDF Çıktı Merkezi</h2>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                PDF Desteği Aktif
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {plan.examName} | {plan.examDate} ({plan.examPeriod}. Ders)
            </p>
          </div>
        </div>

        {/* Report Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl text-xs border border-slate-700/60 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setActiveTab('SALON');
              setSuccessMessage(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'SALON'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <span>Salon Oturma (A4)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('SUPERVISOR');
              setSuccessMessage(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'SUPERVISOR'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <span>Görevli / Komisyon (A4)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('BEP');
              setSuccessMessage(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'BEP'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <span>BEP Listesi (A4)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('CLASSES');
              setSuccessMessage(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'CLASSES'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <span>Kapı Çizelgeleri (Yatay A4)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('ALL');
              setSuccessMessage(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'ALL'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-purple-300 hover:text-white hover:bg-purple-900/40'
            }`}
            title="Tüm evrakları tek bir PDF paketinde birleştirir"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tüm Evraklar Paketi</span>
          </button>
        </div>

        {/* Main Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Direct PDF Download Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className={`flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition cursor-pointer ${
              isExporting
                ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-600/30'
            }`}
            title="Belgeyi doğrudan .pdf formatında bilgisayarınıza indirir"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>
                  {exportProgress
                    ? `PDF Hazırlanıyor (${exportProgress.current}/${exportProgress.total})...`
                    : 'PDF Hazırlanıyor...'}
                </span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>PDF Olarak İndir (.pdf)</span>
              </>
            )}
          </button>

          {/* Direct Print & Native PDF Save Button */}
          <button
            onClick={handlePrint}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition cursor-pointer shadow-md shadow-blue-600/30"
            title="Yazıcıdan doğrudan çıktı alın veya 'PDF Olarak Kaydet' ile anında yüksek kaliteli vektör PDF kaydedin (Kısayol: Ctrl+P)"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Yazdır / PDF (A4)</span>
          </button>

          {/* If in iframe, allow user to open in full tab for direct hardware printing */}
          {isInIframe && (
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold px-2.5 py-2 rounded-xl text-xs border border-slate-700 transition"
              title="Tarayıcının yerel yazdırma penceresini açabilmek için uygulamayı tam sekmede açın"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Yeni Sekmede Aç</span>
            </a>
          )}

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
            title="Pencereyi Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. SUB-BAR: FILTERS, ZOOM & NOTICES */}
      <div className="bg-slate-900/90 text-slate-200 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          {/* Tab-specific filter for SALON */}
          {activeTab === 'SALON' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] text-slate-300 font-medium">Salon Seçimi:</span>
                <select
                  value={selectedRoomFilter}
                  onChange={e => setSelectedRoomFilter(e.target.value)}
                  className="bg-slate-900 text-white font-bold text-xs rounded px-2 py-0.5 border border-slate-600 focus:outline-none focus:border-indigo-400"
                >
                  <option value="ALL">Tüm Salonlar ({plan.rooms.length} Salon)</option>
                  {plan.rooms.map(room => (
                    <option key={room.classroomId} value={room.classroomId}>
                      {room.classroomName} ({room.totalAssigned} Öğrenci)
                    </option>
                  ))}
                </select>
              </div>

              {/* Page Layout Selector */}
              <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-[11px]">
                <button
                  type="button"
                  onClick={() => setRoomsPerPage(2)}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    roomsPerPage === 2
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Her A4 sayfasına 2 salon yerleştirilir (Standart)"
                >
                  2 Salon / A4 (Standart)
                </button>
                <button
                  type="button"
                  onClick={() => setRoomsPerPage(1)}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    roomsPerPage === 1
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Her A4 sayfasına 1 salon yerleştirilir"
                >
                  1 Salon / A4 (Geniş)
                </button>
              </div>
            </div>
          )}

          {/* Tab-specific filter for CLASSES */}
          {activeTab === 'CLASSES' && (
            <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] text-slate-300 font-medium">Sınıf Seçimi:</span>
              <select
                value={selectedClassFilter}
                onChange={e => setSelectedClassFilter(e.target.value)}
                className="bg-slate-900 text-white font-bold text-xs rounded px-2 py-0.5 border border-slate-600 focus:outline-none focus:border-indigo-400"
              >
                <option value="ALL">Tüm Sınıflar ({availableClasses.length} Şube)</option>
                {availableClasses.map(cls => (
                  <option key={cls} value={cls}>
                    {cls} Şubesi
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Feedback Messages */}
          {successMessage && (
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-lg animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-950/60 border border-rose-800 px-3 py-1 rounded-lg">
              <Info className="w-4 h-4 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!successMessage && !errorMessage && (
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {activeTab === 'CLASSES' ? (
                  <>
                    <strong className="text-amber-300">Yatay A4 Formatı:</strong> Her sınıf kendi bağımsız başlığına ve detaylarına sahiptir (kolay kesim için ortadan kesme çizgisi mevcuttur).
                  </>
                ) : activeTab === 'ALL' ? (
                  <>
                    <strong className="text-purple-300">Toplu Sınav Dosyası:</strong> Tüm salonlar, gözetmenler, BEP ve sınıf kapı listeleri eksiksiz tek PDF dosyası haline getirilir.
                  </>
                ) : (
                  <>
                    <strong className="text-slate-200">A4 Dikey Format:</strong> Standart A4 sayfa düzeni ve imza tutanağı formatı.
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
          <span className="text-[10px] text-slate-400 font-medium mr-1">Önizleme:</span>
          <button
            onClick={() => setZoomScale(z => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
            className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700 transition"
            title="Uzaklaştır"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono font-bold text-white px-1 min-w-[42px] text-center">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            onClick={() => setZoomScale(z => Math.min(1.5, Number((z + 0.1).toFixed(1))))}
            className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700 transition"
            title="Yakınlaştır"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomScale(0.9)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition ml-1"
            title="Varsayılana Sıfırla"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 3. DOCUMENT PREVIEW CONTENT VIEW */}
      <div className="flex-1 overflow-auto bg-slate-800/80 p-4 sm:p-8 flex justify-center items-start">
        <div
          ref={reportContainerRef}
          style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="flex flex-col items-center gap-6"
        >
          {activeTab === 'SALON' && (
            <SalonSeatingPrint
              plan={plan}
              selectedRoomId={selectedRoomFilter}
              forPrint={false}
              roomsPerPage={roomsPerPage}
            />
          )}

          {activeTab === 'SUPERVISOR' && (
            <SupervisorListPrint plan={plan} forPrint={false} />
          )}

          {activeTab === 'BEP' && (
            <BEPStudentPrint plan={plan} forPrint={false} />
          )}

          {activeTab === 'CLASSES' && (
            <ClassDoorListsPrint
              plan={plan}
              selectedClassFilter={selectedClassFilter}
              forPrint={false}
            />
          )}

          {activeTab === 'ALL' && (
            <div className="space-y-6">
              <SalonSeatingPrint plan={plan} forPrint={false} />
              <SupervisorListPrint plan={plan} forPrint={false} />
              <BEPStudentPrint plan={plan} forPrint={false} />
              <ClassDoorListsPrint plan={plan} forPrint={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
