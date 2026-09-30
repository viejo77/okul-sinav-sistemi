import React, { useState } from 'react';
import {
  FileSpreadsheet,
  X,
  Download,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Table,
  RefreshCw,
} from 'lucide-react';
import {
  listSpreadsheetTabs,
  importStudentsFromGoogleSheet,
  importWeeklyScheduleFromGoogleSheet,
  extractSpreadsheetId,
  SheetMetadata,
} from '../../services/googleSheets';
import { Student } from '../../types';
import { WeeklyScheduleItem } from '../../services/excelService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: 'STUDENTS' | 'SCHEDULE';
  onStudentsImported?: (students: Student[]) => void;
  onScheduleImported?: (items: WeeklyScheduleItem[]) => void;
}

export const GoogleSheetsImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  mode,
  onStudentsImported,
  onScheduleImported,
}) => {
  const [sheetUrlOrId, setSheetUrlOrId] = useState('');
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [importing, setImporting] = useState(false);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string | null>(null);
  const [availableTabs, setAvailableTabs] = useState<SheetMetadata[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchTabs = async () => {
    if (!sheetUrlOrId.trim()) {
      setError('Lütfen bir Google E-Tablo URL linki veya Tablo ID giriniz.');
      return;
    }

    setError(null);
    setSuccessInfo(null);
    setLoadingTabs(true);

    try {
      const result = await listSpreadsheetTabs(sheetUrlOrId);
      setSpreadsheetTitle(result.title);
      setAvailableTabs(result.sheets);
      if (result.sheets.length > 0) {
        setSelectedTab(result.sheets[0].title);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'E-Tablo sayfaları listelenemedi.';
      setError(msg);
    } finally {
      setLoadingTabs(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!sheetUrlOrId.trim()) {
      setError('Lütfen Google E-Tablo URL veya ID giriniz.');
      return;
    }

    const tabName = selectedTab || (availableTabs[0]?.title ?? 'Sheet1');
    setError(null);
    setSuccessInfo(null);
    setImporting(true);

    try {
      if (mode === 'STUDENTS') {
        const students = await importStudentsFromGoogleSheet(sheetUrlOrId, tabName);
        if (students.length === 0) {
          throw new Error('Belirtilen sayfada geçerli öğrenci verisi bulunamadı.');
        }
        if (onStudentsImported) {
          onStudentsImported(students);
        }
        setSuccessInfo(`Başarılı! ${students.length} öğrenci Google E-Tablodan aktarıldı.`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        const items = await importWeeklyScheduleFromGoogleSheet(sheetUrlOrId, tabName);
        if (items.length === 0) {
          throw new Error('Belirtilen sayfada geçerli ders programı verisi bulunamadı.');
        }
        if (onScheduleImported) {
          onScheduleImported(items);
        }
        setSuccessInfo(`Başarılı! ${items.length} ders programı kaydı Google E-Tablodan aktarıldı.`);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'İçeri aktarma sırasında bir hata oluştu.';
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  const cleanId = extractSpreadsheetId(sheetUrlOrId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">
                {mode === 'STUDENTS'
                  ? 'Google Sheets’ten Öğrenci İçe Aktar'
                  : 'Google Sheets’ten Ders Programı İçe Aktar'}
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium">
                Google E-Tablonuz ile doğrudan senkronizasyon
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug">{error}</div>
            </div>
          )}

          {successInfo && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-800 font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* Step 1: E-Tablo Link or ID */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span>Google E-Tablo Linki veya Tablo ID:</span>
              {cleanId && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${cleanId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 text-[11px]"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Tabloyu Aç</span>
                </a>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sheetUrlOrId}
                onChange={e => setSheetUrlOrId(e.target.value)}
                placeholder="Örn: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
              />
              <button
                type="button"
                onClick={handleFetchTabs}
                disabled={loadingTabs || !sheetUrlOrId.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {loadingTabs ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Table className="w-3.5 h-3.5" />
                )}
                <span>{loadingTabs ? 'Taranıyor...' : 'Sayfaları Bul'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              E-Tablo bağlantısını tarayıcınızın adres çubuğundan kopyalayıp buraya yapıştırabilirsiniz.
            </p>
          </div>

          {/* Step 2: Tab Selection (if tabs loaded) */}
          {availableTabs.length > 0 && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">
                  {spreadsheetTitle ? `"${spreadsheetTitle}"` : 'Tablo Başlığı'}
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                  {availableTabs.length} sayfa/sekme bulundu
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-medium">Hangi sayfadaki veriler aktarılsın?</label>
                <select
                  value={selectedTab}
                  onChange={e => setSelectedTab(e.target.value)}
                  className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {availableTabs.map(tab => (
                    <option key={tab.id} value={tab.title}>
                      {tab.title} {tab.rowCount ? `(~${tab.rowCount} satır)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Format Requirements Info */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 space-y-1">
            <div className="font-bold flex items-center gap-1">
              <span>📌</span>
              <span>
                {mode === 'STUDENTS' ? 'Beklenen Sütun Başlıkları:' : 'Beklenen Sütun Başlıkları:'}
              </span>
            </div>
            {mode === 'STUDENTS' ? (
              <p className="leading-relaxed text-blue-800">
                E-Tablonuzun ilk satırında <strong>Numara</strong> (veya Okul No), <strong>Adı</strong>,{' '}
                <strong>Soyadı</strong>, <strong>Sınıfı</strong> (Örn: 9-A) ve opsiyonel <strong>BEP</strong>{' '}
                sütunları yer almalıdır.
              </p>
            ) : (
              <p className="leading-relaxed text-blue-800">
                E-Tablonuzun ilk satırında <strong>Öğretmen Adı</strong>, <strong>Derslik/Salon</strong>,{' '}
                <strong>Gün</strong> (Pazartesi...Cuma), <strong>Ders Saati</strong> (1-8) ve <strong>Branş</strong>{' '}
                sütunları yer almalıdır.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-200 font-bold transition cursor-pointer"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={importing || !sheetUrlOrId.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            {importing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{importing ? 'İçe Aktarılıyor...' : 'Verileri İçe Aktar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
