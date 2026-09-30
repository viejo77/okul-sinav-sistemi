import React from 'react';

interface PrintHeaderProps {
  documentTitle: string;
  documentCategory?: string;
  examName: string;
  examDate: string;
  examPeriod: number;
  subjectName: string;
  badgeText?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  documentTitle,
  documentCategory = 'ORTAK SINAV BELGESİ',
  examName,
  examDate,
  examPeriod,
  subjectName,
  badgeText,
}) => {
  return (
    <div className="border-2 border-black rounded-lg bg-white overflow-hidden mb-3 shrink-0">
      {/* Top Banner (Black background with white text) */}
      <div className="bg-black text-white px-3 py-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-white text-black font-black text-[9px] px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0">
            T.C. MEB
          </span>
          <span className="font-extrabold text-[10.5px] uppercase tracking-wider text-white">
            ORTAK SINAV SİSTEMİ
          </span>
        </div>
        <div className="text-[9px] font-bold text-white uppercase tracking-widest">
          {documentCategory}
        </div>
      </div>

      {/* Main Header Content (White background, black text) */}
      <div className="p-2 sm:p-2.5 bg-white border-b border-black flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="font-black text-sm uppercase text-black tracking-tight leading-tight">
            {documentTitle}
          </h1>
          <div className="font-bold text-xs text-black uppercase tracking-tight mt-0.5 truncate">
            {examName}
          </div>
        </div>

        {badgeText && (
          <div className="border-2 border-black px-2.5 py-0.5 rounded font-black text-[10px] shrink-0 uppercase tracking-wide bg-white text-black">
            {badgeText}
          </div>
        )}
      </div>

      {/* Exam Details Bar */}
      <div className="bg-white px-3 py-1 text-[10px] flex flex-wrap items-center justify-between gap-x-4 text-black font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="font-bold">📅 Tarih:</span>
          <strong className="text-black font-extrabold">{examDate}</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold">⏰ Sınav Saati:</span>
          <strong className="text-black font-extrabold">{examPeriod}. Ders Saati</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold">📖 Sınav Dersi:</span>
          <span className="font-black px-2 py-0.2 rounded border border-black bg-white text-black">
            {subjectName}
          </span>
        </div>
      </div>
    </div>
  );
};
