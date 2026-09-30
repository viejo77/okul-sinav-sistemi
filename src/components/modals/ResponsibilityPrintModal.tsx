import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Printer,
  X,
  Download,
  FileText,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  Calendar,
  FileCheck,
  UserCheck,
  Mail,
  ClipboardList,
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  Package,
} from 'lucide-react';
import { ResponsibilityExam, ResponsibilitySettings } from '../../types';
import {
  ResponsibilityExamPrint,
  ResponsibilityDocType,
  IncludedDocsConfig,
} from '../print/ResponsibilityExamPrint';
import { exportToPdf, printElementDirectly } from '../../utils/pdfExport';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  exams: ResponsibilityExam[];
  initialExamId?: string;
  initialDocType?: ResponsibilityDocType;
  settings: ResponsibilitySettings;
}

export const ResponsibilityPrintModal: React.FC<Props> = ({
  isOpen,
  onClose,
  exams,
  initialExamId,
  initialDocType = 'ALL_DOCUMENTS',
  settings,
}) => {
  const [docType, setDocType] = useState<ResponsibilityDocType>(initialDocType);
  const [selectedExamId, setSelectedExamId] = useState<string>(
    initialExamId || (exams[0]?.id ?? '')
  );
  const [selectedTeacher, setSelectedTeacher] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');
  const [envelopeNo, setEnvelopeNo] = useState<string>('2574');

  // Included docs in the bulk packet
  const [includedDocs, setIncludedDocs] = useState<IncludedDocsConfig>({
    scheduleNotice: true,
    dailySignature: true,
    teacherAssignment: true,
    envelopeCover: true,
    officialMinutes: true,
  });

  const [zoomScale, setZoomScale] = useState<number>(0.92);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initialDocType if modal opens with a specific tab
  useEffect(() => {
    if (isOpen && initialDocType) {
      setDocType(initialDocType);
    }
  }, [isOpen, initialDocType]);

  // Unique teachers with assigned duties
  const teachersList = useMemo(() => {
    const set = new Set<string>();
    exams.forEach(ex => {
      ex.commissionMembers.forEach(m => m && set.add(m.trim()));
      if (ex.supervisorName) set.add(ex.supervisorName.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [exams]);

  // Unique exam dates
  const datesList = useMemo(() => {
    const set = new Set<string>();
    exams.forEach(ex => {
      if (ex.examDate) set.add(ex.examDate.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
  }, [exams]);

  // Estimate total pages in bulk packet
  const estimatedBulkPages = useMemo(() => {
    let pages = 0;
    if (includedDocs.scheduleNotice) pages += 1;
    if (includedDocs.dailySignature) pages += datesList.length || 1;
    if (includedDocs.teacherAssignment) pages += teachersList.length || 1;
    if (includedDocs.envelopeCover) pages += exams.length;
    if (includedDocs.officialMinutes) pages += exams.length;
    return pages;
  }, [includedDocs, datesList, teachersList, exams]);

  if (!isOpen) return null;

  const currentExam = exams.find(e => e.id === selectedExamId) || exams[0];

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handlePrint = async () => {
    if (!containerRef.current) return;

    if (isInIframe) {
      setSuccessMessage(
        'Önizleme ortamı güvenlik kısıtlaması nedeniyle doğrudan yazdırma penceresi açılamadığından, belgeniz yazdırmaya hazır A4 PDF olarak hazırlanıp indiriliyor...'
      );
      await handleDownloadPdf();
      return;
    }

    try {
      const docTitles: Record<ResponsibilityDocType, string> = {
        ALL_DOCUMENTS: 'Sorumluluk_Tum_Sinav_Evraklari_Paketi',
        TEACHER_ASSIGNMENT: 'Ogretmen_Gorevlendirmesi_Tebligatlari',
        DAILY_SIGNATURE: 'Gunluk_Imza_Tutanagi',
        SCHEDULE_NOTICE: 'Asilacak_Sinav_Tarihleri_Panosu',
        ENVELOPE_COVER: 'Sinav_Zarfi_Kapagi',
        OFFICIAL_MINUTES: 'Sinav_Tutanagi_3_Asamali',
        STUDENT_LIST: 'Ogrenci_Yoklama_Not_Cizelgesi',
      };
      printElementDirectly(containerRef.current, {
        title: docTitles[docType] || 'Sorumluluk_Evraki',
        landscape: false,
      });
    } catch (e) {
      console.warn('Native print failed, falling back to PDF download:', e);
      await handleDownloadPdf();
    }
  };

  const handleDownloadPdf = async () => {
    if (!containerRef.current || isExporting) return;
    try {
      setIsExporting(true);
      const safeSchool = (settings.schoolName || 'Okul')
        .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_ -]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .substring(0, 30);
      const filename =
        docType === 'ALL_DOCUMENTS'
          ? `Sorumluluk_Tum_Sinav_Evraklari_${safeSchool}.pdf`
          : `Sorumluluk_${docType}_${safeSchool}.pdf`;

      await exportToPdf(containerRef.current, {
        filename,
        orientation: 'portrait',
      });
      setSuccessMessage(`${filename} başarıyla indirildi!`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      console.error(err);
      setSuccessMessage('PDF oluşturulurken bir hata meydana geldi.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleAllDocs = (value: boolean) => {
    setIncludedDocs({
      scheduleNotice: value,
      dailySignature: value,
      teacherAssignment: value,
      envelopeCover: value,
      officialMinutes: value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* TOP CONTROL BAR */}
        <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
              <Package className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>MEB Sorumluluk Sınavı Evrak Çıkarma Merkezi</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  Resmi Standart A4
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Okul Müdürü: <strong>{settings.principalName}</strong> · {settings.schoolName}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.1))}
                className="p-1 hover:bg-slate-700 rounded text-slate-300 transition cursor-pointer"
                title="Küçült"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[10px] text-slate-400 px-1 font-bold">
                %{Math.round(zoomScale * 100)}
              </span>
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.min(1.3, prev + 0.1))}
                className="p-1 hover:bg-slate-700 rounded text-slate-300 transition cursor-pointer"
                title="Büyüt"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(0.92)}
                className="p-1 hover:bg-slate-700 rounded text-slate-300 transition cursor-pointer"
                title="Sıfırla"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Direct Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır (A4)</span>
            </button>

            {/* PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-md"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>PDF Hazırlanıyor...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{docType === 'ALL_DOCUMENTS' ? 'Tüm Paketi PDF İndir' : 'PDF İndir'}</span>
                </>
              )}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DOCUMENT TABS: WITH PROMINENT "TÜM EVRAKLAR" FIRST */}
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-1.5 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* 📦 TÜM EVRAKLAR (EKSİKSİZ PAKET) */}
            <button
              type="button"
              onClick={() => setDocType('ALL_DOCUMENTS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs transition cursor-pointer shadow-xs ${
                docType === 'ALL_DOCUMENTS'
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white ring-1 ring-white/20'
                  : 'bg-purple-950/40 text-purple-300 hover:text-white hover:bg-purple-900/60 border border-purple-800/40'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>📦 Tüm Sınav Evrakları Paketi</span>
            </button>

            {/* 1. Öğretmen Görevlendirmesi */}
            <button
              type="button"
              onClick={() => setDocType('TEACHER_ASSIGNMENT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                docType === 'TEACHER_ASSIGNMENT'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>1. Öğretmen Görevlendirmesi</span>
            </button>

            {/* 2. Günlük İmza Tutanağı */}
            <button
              type="button"
              onClick={() => setDocType('DAILY_SIGNATURE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                docType === 'DAILY_SIGNATURE'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>2. Günlük İmza Tutanağı</span>
            </button>

            {/* 3. Asılacak Sınav Tarihleri */}
            <button
              type="button"
              onClick={() => setDocType('SCHEDULE_NOTICE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                docType === 'SCHEDULE_NOTICE'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>3. Asılacak Sınav Tarihleri</span>
            </button>

            {/* 4. Sınav Zarfı Kapağı */}
            <button
              type="button"
              onClick={() => setDocType('ENVELOPE_COVER')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                docType === 'ENVELOPE_COVER'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>4. Sınav Zarfı Kapağı</span>
            </button>

            {/* 5. Sınav Tutanağı */}
            <button
              type="button"
              onClick={() => setDocType('OFFICIAL_MINUTES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                docType === 'OFFICIAL_MINUTES'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>5. Sınav Tutanağı (3 Aşamalı)</span>
            </button>

            {/* 6. Ek: Öğrenci Yoklama & Not Listesi */}
            <button
              type="button"
              onClick={() => setDocType('STUDENT_LIST')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-[11px] transition cursor-pointer ${
                docType === 'STUDENT_LIST'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
              title="Öğrenci sınav not ve imza tablosu"
            >
              <Layers className="w-3 h-3" />
              <span>6. Not Çizelgesi</span>
            </button>
          </div>
        </div>

        {/* CONTEXTUAL FILTERS & SELECTORS BAR */}
        <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* ALL DOCUMENTS (BULK PACKET) SELECTORS & CHECKBOXES */}
          {docType === 'ALL_DOCUMENTS' && (
            <div className="w-full flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400 font-bold text-[11px]">Pakete Dahil Evraklar:</span>

                {/* 1. Schedule notice checkbox */}
                <label className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 hover:border-purple-500 text-white px-2.5 py-1 rounded-lg cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={includedDocs.scheduleNotice}
                    onChange={e =>
                      setIncludedDocs(prev => ({ ...prev, scheduleNotice: e.target.checked }))
                    }
                    className="accent-purple-600 rounded"
                  />
                  <span>1. Pano İlanı</span>
                </label>

                {/* 2. Daily signatures checkbox */}
                <label className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 hover:border-purple-500 text-white px-2.5 py-1 rounded-lg cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={includedDocs.dailySignature}
                    onChange={e =>
                      setIncludedDocs(prev => ({ ...prev, dailySignature: e.target.checked }))
                    }
                    className="accent-purple-600 rounded"
                  />
                  <span>2. Günlük İmza ({datesList.length} Gün)</span>
                </label>

                {/* 3. Teacher assignment checkbox */}
                <label className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 hover:border-purple-500 text-white px-2.5 py-1 rounded-lg cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={includedDocs.teacherAssignment}
                    onChange={e =>
                      setIncludedDocs(prev => ({ ...prev, teacherAssignment: e.target.checked }))
                    }
                    className="accent-purple-600 rounded"
                  />
                  <span>3. Öğretmen Tebligatı ({teachersList.length} Kişi)</span>
                </label>

                {/* 4. Envelope cover checkbox */}
                <label className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 hover:border-purple-500 text-white px-2.5 py-1 rounded-lg cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={includedDocs.envelopeCover}
                    onChange={e =>
                      setIncludedDocs(prev => ({ ...prev, envelopeCover: e.target.checked }))
                    }
                    className="accent-purple-600 rounded"
                  />
                  <span>4. Zarf Kapakları ({exams.length})</span>
                </label>

                {/* 5. Official minutes checkbox */}
                <label className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 hover:border-purple-500 text-white px-2.5 py-1 rounded-lg cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={includedDocs.officialMinutes}
                    onChange={e =>
                      setIncludedDocs(prev => ({ ...prev, officialMinutes: e.target.checked }))
                    }
                    className="accent-purple-600 rounded"
                  />
                  <span>5. Sınav Tutanakları ({exams.length})</span>
                </label>

                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    type="button"
                    onClick={() => toggleAllDocs(true)}
                    className="text-[10px] text-purple-400 hover:text-purple-300 underline font-semibold"
                  >
                    Tümünü Seç
                  </button>
                  <span className="text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => toggleAllDocs(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-300 underline font-semibold"
                  >
                    Temizle
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-purple-950/60 border border-purple-700/50 px-3 py-1 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px] text-purple-200 font-bold">
                  Tahmini Toplam: <strong className="text-white font-mono text-xs">{estimatedBulkPages}</strong> Sayfa A4 (Tek Tıkla Eksiksiz Dönem Klasörü)
                </span>
              </div>
            </div>
          )}

          {/* TEACHER ASSIGNMENT SELECTORS */}
          {docType === 'TEACHER_ASSIGNMENT' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-semibold text-[11px]">Öğretmen Seçimi:</span>
              <select
                value={selectedTeacher}
                onChange={e => setSelectedTeacher(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white font-bold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="ALL">👥 TÜM GÖREVLİ ÖĞRETMENLER (Toplu Baskı - {teachersList.length} Kişi)</option>
                {teachersList.map(t => (
                  <option key={t} value={t}>
                    👤 {t}
                  </option>
                ))}
              </select>
              <span className="text-[10.5px] text-slate-400">
                * "Tüm Öğretmenler" seçildiğinde her öğretmene ait tebligat ayrı A4 sayfası olarak hazırlanır.
              </span>
            </div>
          )}

          {/* DAILY SIGNATURE SELECTORS */}
          {docType === 'DAILY_SIGNATURE' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-semibold text-[11px]">Sınav Tarihi:</span>
              <select
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white font-bold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer font-mono"
              >
                <option value="ALL">📅 TÜM GÜNLER (Gün Gün Sayfalar - {datesList.length} Gün)</option>
                {datesList.map(d => (
                  <option key={d} value={d}>
                    {d} Tarihi
                  </option>
                ))}
              </select>
              <span className="text-[10.5px] text-slate-400">
                * Günlük olarak öğretmenler odasında imzalatılan komisyon imza tutanağıdır.
              </span>
            </div>
          )}

          {/* SCHEDULE NOTICE SELECTORS */}
          {docType === 'SCHEDULE_NOTICE' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-semibold text-[11px]">Kategori / Kademe Filtresi:</span>
              <select
                value={selectedGradeFilter}
                onChange={e => setSelectedGradeFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white font-bold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="ALL">Tüm Sınıf Kademeleri (9, 10, 11, 12)</option>
                <option value="9">Sadece 9. Sınıf Sınavları</option>
                <option value="10">Sadece 10. Sınıf Sınavları</option>
                <option value="11">Sadece 11. Sınıf Sınavları</option>
                <option value="12">Sadece 12. Sınıf Sınavları</option>
              </select>
              <span className="text-[10.5px] text-slate-400">
                * Okul girişine ve panolara asılmak üzere onaylı resmi takvim tablosudur.
              </span>
            </div>
          )}

          {/* ENVELOPE COVER SELECTORS */}
          {docType === 'ENVELOPE_COVER' && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold text-[11px]">Sınav:</span>
                <select
                  value={selectedExamId}
                  onChange={e => setSelectedExamId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white font-bold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="ALL">📦 TÜM SINAVLARIN ZARF KAPAKLARI ({exams.length} Adet Toplu)</option>
                  {exams.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.subjectName} ({e.gradeLevel}) - {e.examDate}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold text-[11px]">Evrak / Zarf No:</span>
                <input
                  type="text"
                  value={envelopeNo}
                  onChange={e => setEnvelopeNo(e.target.value)}
                  placeholder="2574"
                  className="bg-slate-800 border border-slate-700 text-white font-mono font-bold rounded-lg px-2 py-1 text-xs w-20 text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          {/* OFFICIAL MINUTES SELECTORS */}
          {docType === 'OFFICIAL_MINUTES' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-semibold text-[11px]">Sınav Seçimi:</span>
              <select
                value={selectedExamId}
                onChange={e => setSelectedExamId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white font-bold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="ALL">📑 TÜM SINAVLARIN RESMİ TUTANAKLARI ({exams.length} Tutanak)</option>
                {exams.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.subjectName} ({e.gradeLevel}) - {e.examDate}
                  </option>
                ))}
              </select>
              <span className="text-[10.5px] text-slate-400">
                * Sınav hazırlığı, başlama-katılma ve 1. inceleme 3 aşamalı standart tutanaktır.
              </span>
            </div>
          )}

          {/* STUDENT LIST SELECTORS */}
          {docType === 'STUDENT_LIST' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-semibold text-[11px]">Sınav Seçimi:</span>
              <select
                value={selectedExamId}
                onChange={e => setSelectedExamId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white font-bold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                {exams.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.subjectName} ({e.gradeLevel}) - {e.students.length} Öğrenci
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* SUCCESS TOAST IF ANY */}
        {successMessage && (
          <div className="bg-emerald-600 text-white text-xs font-bold py-1.5 px-4 text-center shrink-0 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* PREVIEW VIEWPORT CONTAINER */}
        <div className="flex-1 min-h-0 overflow-auto bg-slate-950 p-4 sm:p-6 flex justify-center items-start">
          <div
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="w-full flex justify-center"
          >
            <div
              ref={containerRef}
              className="bg-white rounded-lg shadow-2xl border border-slate-300 w-[210mm] min-h-[297mm] p-6 text-black"
            >
              <ResponsibilityExamPrint
                documentType={docType}
                exams={exams}
                selectedExamId={selectedExamId}
                selectedTeacher={selectedTeacher}
                selectedDate={selectedDate}
                selectedGradeFilter={selectedGradeFilter}
                envelopeNo={envelopeNo}
                settings={settings}
                includedDocs={includedDocs}
              />
            </div>
          </div>
        </div>

        {/* FOOTER INFO BAR */}
        <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 flex flex-wrap justify-between items-center text-[11px] text-slate-400 shrink-0 gap-2">
          <span>
            {docType === 'ALL_DOCUMENTS' &&
              `📦 Tüm Sınav Evrakları Paketi · Toplam ${exams.length} sınav, ${teachersList.length} öğretmen, ${datesList.length} sınav günü`}
            {docType === 'TEACHER_ASSIGNMENT' &&
              `Toplam ${teachersList.length} görevli öğretmen · ${selectedTeacher === 'ALL' ? 'Tüm Öğretmenler' : selectedTeacher}`}
            {docType === 'DAILY_SIGNATURE' &&
              `Toplam ${datesList.length} sınav günü · ${selectedDate === 'ALL' ? 'Tüm Tarihler' : selectedDate}`}
            {docType === 'SCHEDULE_NOTICE' &&
              `Toplam ${exams.length} sınavın takvimi listelenmektedir.`}
            {docType === 'ENVELOPE_COVER' &&
              `Sınav Zarfı Kapağı · ${selectedExamId === 'ALL' ? `Tüm Sınavlar (${exams.length})` : currentExam?.subjectName}`}
            {docType === 'OFFICIAL_MINUTES' &&
              `MEB Resmi Sınav Tutanağı · ${selectedExamId === 'ALL' ? `Tüm Sınavlar (${exams.length})` : currentExam?.subjectName}`}
            {docType === 'STUDENT_LIST' &&
              `${currentExam?.subjectName || ''} (${currentExam?.gradeLevel || ''}) · ${currentExam?.students.length || 0} Öğrenci`}
          </span>

          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>MEB Standart A4 Formatı · Yazıcı ve PDF Baskısına Tam Uyumlu</span>
          </span>
        </div>
      </div>
    </div>
  );
};
