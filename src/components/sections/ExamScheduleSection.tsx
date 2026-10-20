import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Printer,
  Download,
  School,
  FileText,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Info,
  CheckCircle2,
  Users,
  Layers,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { Exam, Subject } from '../../types';

interface ExamScheduleSectionProps {
  exams: Exam[];
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>;
  subjects: Subject[];
  availableClasses: string[];
  activeExamId: string;
  setActiveExamId: (id: string) => void;
  onNavigateToExamTab: () => void;
}

export const ExamScheduleSection: React.FC<ExamScheduleSectionProps> = ({
  exams,
  setExams,
  subjects,
  availableClasses,
  activeExamId,
  setActiveExamId,
  onNavigateToExamTab,
}) => {
  // Pano ayarları (yerel hafızadan veya varsayılan)
  const [schoolName, setSchoolName] = useState<string>(() => {
    return localStorage.getItem('school_name_schedule') || 'ŞEHİT MEHMET ŞENGÜL ANADOLU LİSESİ';
  });
  const [academicYearTerm, setAcademicYearTerm] = useState<string>(() => {
    return localStorage.getItem('term_name_schedule') || '2024-2025 EĞİTİM ÖĞRETİM YILI 1. DÖNEM 1. ORTAK SINAV TAKVİMİ';
  });
  const [principalName, setPrincipalName] = useState<string>(() => {
    return localStorage.getItem('principal_name_schedule') || 'Ahmet YILMAZ';
  });
  const [vicePrincipalName, setVicePrincipalName] = useState<string>(() => {
    return localStorage.getItem('vp_name_schedule') || 'Mehmet KAYA';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL'); // ALL, 9, 10, 11, 12
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS' | 'BY_GRADE'>('TABLE');

  // Save settings to localStorage
  const handleSaveSettings = () => {
    localStorage.setItem('school_name_schedule', schoolName);
    localStorage.setItem('term_name_schedule', academicYearTerm);
    localStorage.setItem('principal_name_schedule', principalName);
    localStorage.setItem('vp_name_schedule', vicePrincipalName);
    setIsSettingsOpen(false);
  };

  // Sort exams chronologically by date and period
  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (a.period || 0) - (b.period || 0);
    });
  }, [exams]);

  // Extract distinct dates
  const distinctDates = useMemo(() => {
    return Array.from(new Set(sortedExams.map(e => e.date))).sort();
  }, [sortedExams]);

  // Extract all grade levels present across exams
  const gradeLevels = ['9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf'];

  // Helper to format date TR
  const formatTRDate = (isoDate: string): string => {
    if (!isoDate) return '';
    if (isoDate.includes('.')) return isoDate;
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return isoDate;
  };

  // Helper to find which subject a grade is taking in an exam
  const getSubjectForGrade = (exam: Exam, grade: string): string | null => {
    const match = exam.assignedClasses.find(ac => {
      // Normalize: "9-A" or "AMP 9-A" matches "9. Sınıf"
      const gradeNum = grade.split('.')[0].trim();
      return (
        ac.classLevel.startsWith(`${gradeNum}-`) ||
        ac.classLevel.includes(` ${gradeNum}-`) ||
        ac.classLevel.startsWith(gradeNum)
      );
    });
    return match ? (match.subjectName || exam.subjectName) : null;
  };

  // Direct print noticeboard schedule
  const handlePrintSchedule = () => {
    window.print();
  };

  return (
    <div className="flex flex-col space-y-3 pb-8">
      {/* 1. TOP HEADER & ACTION TOOLBAR (Hidden in Print) */}
      <div className="no-print bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-100 text-purple-800 font-black px-2 py-0.5 rounded text-[11px] shrink-0">
                PANO İLANI
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Ortak Sınav Takvimi & Pano Çizelgesi
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Okul panolarına, sınıflara ve öğretmenler odasına asılmak üzere hangi gün, hangi ders saatinde, hangi sınıfların hangi sınavlarının olduğunu duyurma merkezi.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center text-xs">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                viewMode === 'TABLE' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏢 Pano Tablosu
            </button>
            <button
              onClick={() => setViewMode('BY_GRADE')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                viewMode === 'BY_GRADE' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎓 Sınıf Bazlı Pano
            </button>
            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                viewMode === 'CARDS' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗓️ Günlük Kartlar
            </button>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition cursor-pointer"
            title="Okul adı, onaylayan müdür ve başlık bilgilerini özelleştir"
          >
            <School className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pano Başlığı & İdare</span>
          </button>

          {/* New Exam Shortcut */}
          <button
            onClick={onNavigateToExamTab}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition cursor-pointer"
            title="Yeni Sınav Ekle / Düzenle"
          >
            <Plus className="w-3.5 h-3.5 text-purple-600" />
            <span>Yeni Sınav Tanımla</span>
          </button>

          {/* Primary Print Button */}
          <button
            onClick={handlePrintSchedule}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold px-3.5 py-1.5 rounded-lg text-xs shadow-md transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Resmi MEB A4 formatında panoya asılacak sınav takvimini yazdır veya PDF olarak indir"
          >
            <Printer className="w-4 h-4" />
            <span>🖨️ Panoya Asmak İçin Yazdır / PDF İndir</span>
          </button>
        </div>
      </div>

      {/* 2. CUSTOMIZABLE SCHOOL HEADER SETTINGS ACCORDION (No Print) */}
      {isSettingsOpen && (
        <div className="no-print bg-indigo-50/70 border-2 border-indigo-200 rounded-xl p-4 text-xs space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-indigo-950 flex items-center gap-2">
              <School className="w-4 h-4 text-indigo-600" />
              <span>Resmi Pano İlanı & İdare Onay Bilgileri</span>
            </h4>
            <span className="text-[11px] text-indigo-700 font-medium">
              Bu bilgiler panoya asılacak belgenin üst ve alt antetinde yer alır.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Okul Adı:</label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                placeholder="Örn: ATATÜRK ANADOLU LİSESİ"
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Dönem & Sınav Başlığı:</label>
              <input
                type="text"
                value={academicYearTerm}
                onChange={e => setAcademicYearTerm(e.target.value)}
                placeholder="Örn: 2024-2025 1. DÖNEM 1. ORTAK SINAV TAKVİMİ"
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">İnceleyen (Müdür Yrd.):</label>
              <input
                type="text"
                value={vicePrincipalName}
                onChange={e => setVicePrincipalName(e.target.value)}
                placeholder="Örn: Mehmet KAYA"
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Onaylayan (Okul Müdürü):</label>
              <input
                type="text"
                value={principalName}
                onChange={e => setPrincipalName(e.target.value)}
                placeholder="Örn: Ahmet YILMAZ"
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 font-bold"
            >
              Vazgeç
            </button>
            <button
              onClick={handleSaveSettings}
              className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-2xs"
            >
              Kaydet & Uygula
            </button>
          </div>
        </div>
      )}

      {/* 3. QUICK STATS SUMMARY BANNER (No Print) */}
      <div className="no-print bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-3 text-slate-600 font-semibold flex-wrap">
          <span>
            📋 Toplam Sınav Sayısı: <strong className="text-slate-900 font-mono">{exams.length}</strong>
          </span>
          <span>•</span>
          <span>
            📅 Sınav Günleri: <strong className="text-indigo-700 font-mono">{distinctDates.length} Gün</strong>
          </span>
          <span>•</span>
          <span>
            👥 Dahil Sınıflar: <strong className="text-purple-700 font-mono">{availableClasses.length || 'Tüm Şubeler'}</strong>
          </span>
        </div>

        {/* Grade filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-bold text-[11px]">Kademeye Göre Filtrele:</span>
          <select
            value={selectedGradeFilter}
            onChange={e => setSelectedGradeFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Tüm Sınıflar (9, 10, 11, 12)</option>
            <option value="9">Sadece 9. Sınıflar</option>
            <option value="10">Sadece 10. Sınıflar</option>
            <option value="11">Sadece 11. Sınıflar</option>
            <option value="12">Sadece 12. Sınıflar</option>
          </select>
        </div>
      </div>

      {/* 4. OFFICIAL NOTICEBOARD PRINTABLE DOCUMENT (A4 Optimized) */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 p-6 sm:p-8 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 print:w-full">
        {/* Printable Official School Header */}
        <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
          <div className="text-xs font-bold tracking-widest text-slate-700 uppercase">
            T.C. MİLLÎ EĞİTİM BAKANLIĞI
          </div>
          <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase mt-0.5">
            {schoolName} MÜDÜRLÜĞÜ
          </div>
          <div className="inline-block bg-slate-900 text-white font-black text-xs sm:text-sm px-4 py-1 rounded-full uppercase tracking-wide mt-2">
            {academicYearTerm}
          </div>
          <div className="text-[11px] font-bold text-purple-900 tracking-wider uppercase mt-1.5">
            📢 ÖĞRENCİ VE ÖĞRETMEN DUYURU PANOSU SINAV İLAN ÇİZELGESİ
          </div>
        </div>

        {/* View Mode 1: MEB Standard Pano Tablosu (Master Schedule Matrix) */}
        {viewMode === 'TABLE' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-800 text-slate-900 font-black text-center uppercase tracking-wider text-[11px]">
                  <th className="border border-slate-800 p-2 w-10">S.No</th>
                  <th className="border border-slate-800 p-2 w-32">Sınav Tarihi & Gün</th>
                  <th className="border border-slate-800 p-2 w-36">Ders Saati</th>
                  {gradeLevels
                    .filter(g => selectedGradeFilter === 'ALL' || g.startsWith(selectedGradeFilter))
                    .map(grade => (
                      <th key={grade} className="border border-slate-800 p-2 font-black">
                        {grade}
                      </th>
                    ))}
                  <th className="border border-slate-800 p-2 w-28">Sınav Şekli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedExams.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      Henüz tanımlanmış bir sınav bulunamadı. Yukarıdaki &quot;Yeni Sınav Tanımla&quot; butonundan veya &quot;Veri Yönetimi &gt; Demo Veri Yükle&quot; seçeneğinden sınavları ekleyebilirsiniz.
                    </td>
                  </tr>
                ) : (
                  sortedExams.map((exam, idx) => {
                    return (
                      <tr key={exam.id} className="hover:bg-purple-50/30 transition text-center font-medium">
                        <td className="border border-slate-800 p-2 font-mono font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-800 p-2 font-bold text-slate-900 bg-slate-50/60">
                          <div>{formatTRDate(exam.date)}</div>
                          <div className="text-[11px] text-purple-700 font-extrabold">{exam.dayOfWeek}</div>
                        </td>
                        <td className="border border-slate-800 p-2 font-black text-indigo-950">
                          <div className="bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md text-[11.5px]">
                            {exam.periodLabel || `${exam.period}. Ders Saati`}
                          </div>
                        </td>

                        {/* Grade Columns */}
                        {gradeLevels
                          .filter(g => selectedGradeFilter === 'ALL' || g.startsWith(selectedGradeFilter))
                          .map(grade => {
                            const subject = getSubjectForGrade(exam, grade);
                            return (
                              <td
                                key={grade}
                                className={`border border-slate-800 p-2 text-center ${
                                  subject ? 'bg-amber-50/50' : 'bg-slate-50/30 text-slate-400'
                                }`}
                              >
                                {subject ? (
                                  <div className="font-black text-slate-900 text-xs sm:text-[13px] uppercase">
                                    {subject}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">
                                    — (Ders İşlenecek)
                                  </span>
                                )}
                              </td>
                            );
                          })}

                        <td className="border border-slate-800 p-2 text-[11px] font-bold text-slate-700 bg-slate-50/50">
                          Kelebek Sistemi
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* View Mode 2: Sınıf Bazlı Pano Çizelgesi (By Grade Cards) */}
        {viewMode === 'BY_GRADE' && (
          <div className="space-y-6">
            {gradeLevels
              .filter(g => selectedGradeFilter === 'ALL' || g.startsWith(selectedGradeFilter))
              .map(grade => {
                const gradeExams = sortedExams.filter(e => getSubjectForGrade(e, grade) !== null);
                return (
                  <div key={grade} className="border-2 border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                    <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between font-black text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-500 text-white px-2 py-0.5 rounded text-[11px]">
                          PANO ÇİZELGESİ
                        </span>
                        <span>{grade.toUpperCase()} ORTAK SINAV TAKVİMİ</span>
                      </div>
                      <span className="font-mono text-purple-300 text-xs">
                        {gradeExams.length} Sınav
                      </span>
                    </div>

                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-extrabold uppercase text-[10.5px]">
                          <th className="p-2 text-center w-12 border-r border-slate-200">S.No</th>
                          <th className="p-2 text-left w-36 border-r border-slate-200">Sınav Tarihi & Gün</th>
                          <th className="p-2 text-center w-40 border-r border-slate-200">Ders Saati</th>
                          <th className="p-2 text-left border-r border-slate-200">Sınav Yapılacak Ders</th>
                          <th className="p-2 text-center w-32">Sınav Uygulaması</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        {gradeExams.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                              Bu sınıf düzeyi için tanımlı sınav bulunmamaktadır.
                            </td>
                          </tr>
                        ) : (
                          gradeExams.map((exam, idx) => {
                            const sub = getSubjectForGrade(exam, grade);
                            return (
                              <tr key={exam.id} className="hover:bg-slate-50">
                                <td className="p-2 text-center font-mono font-bold text-slate-400 border-r border-slate-200">
                                  {idx + 1}
                                </td>
                                <td className="p-2 font-bold text-slate-900 border-r border-slate-200">
                                  {formatTRDate(exam.date)} - {exam.dayOfWeek}
                                </td>
                                <td className="p-2 text-center font-black text-indigo-900 border-r border-slate-200">
                                  {exam.periodLabel || `${exam.period}. Ders Saati`}
                                </td>
                                <td className="p-2 font-black text-slate-900 text-xs sm:text-[13px] border-r border-slate-200">
                                  {sub}
                                </td>
                                <td className="p-2 text-center font-bold text-slate-600">
                                  Kelebek Dağıtım
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}
          </div>
        )}

        {/* View Mode 3: Günlük Zaman Çizelgesi Kartları */}
        {viewMode === 'CARDS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {distinctDates.map(date => {
              const dayExams = sortedExams.filter(e => e.date === date);
              const dayName = dayExams[0]?.dayOfWeek || '';
              return (
                <div key={date} className="border-2 border-slate-800 rounded-xl p-4 bg-slate-50 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
                    <div>
                      <div className="font-black text-sm text-slate-900">
                        {formatTRDate(date)}
                      </div>
                      <div className="font-extrabold text-xs text-purple-700 uppercase">
                        {dayName}
                      </div>
                    </div>
                    <span className="bg-slate-900 text-white font-mono font-bold text-[11px] px-2.5 py-1 rounded-lg">
                      {dayExams.length} Sınav Oturumu
                    </span>
                  </div>

                  <div className="space-y-2">
                    {dayExams.map(ex => (
                      <div key={ex.id} className="bg-white border border-slate-300 rounded-lg p-3 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                            {ex.periodLabel || `${ex.period}. Ders`}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            Kelebek Düzeni
                          </span>
                        </div>
                        <div className="font-extrabold text-sm text-slate-900 uppercase">
                          {ex.subjectName}
                        </div>
                        <div className="text-[11px] text-slate-600 font-semibold flex flex-wrap gap-1 mt-1">
                          <span className="text-slate-400">Giren Sınıflar:</span>
                          {ex.assignedClasses.map(ac => (
                            <span key={ac.id} className="bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-mono font-bold text-[10px]">
                              {ac.classLevel}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Official MEB Noticeboard Rules Box */}
        <div className="mt-6 border-2 border-slate-800 rounded-xl p-4 bg-slate-50 text-[11px] leading-relaxed text-slate-800">
          <div className="font-black uppercase text-xs text-slate-900 mb-2 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-700" />
            <span>ÖĞRENCİ VE VELİLERİMİZ İÇİN ÖNEMLİ ORTAK SINAV UYGULAMA KURALLARI:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 font-medium text-slate-700 pl-1">
            <li>
              Ortak sınavlar okul genelinde <strong>Kelebek (Karma) Oturma Düzeni</strong> ile yapılmaktadır. Öğrenciler kendi sınıflarında değil, her sınav öncesinde okul panosuna ve kapılara asılan <strong>Salon Yerleşim Çizelgesinde</strong> ilan edilen salonda ve belirlenen sıra numarasında sınava gireceklerdir.
            </li>
            <li>
              Öğrencilerimizin sınav başlama saatinden en az <strong>10 dakika önce</strong> ilgili sınav salonunda hazır bulunmaları gerekmektedir.
            </li>
            <li>
              Sınav salonlarına cep telefonu, akıllı saat, kulaklık ve her türlü elektronik iletişim aracı sokulması kesinlikle yasaktır.
            </li>
            <li>
              Öğrencilerimiz yanlarında geçerli kimlik belgesi, kurşun kalem, silgi ve kalemtıraş bulundurmakla yükümlüdür. Sınav esnasında araç-gereç alışverişi yapılamaz.
            </li>
            <li>
              Sağlık raporu olan öğrencilerin mazeret sınavları, MEB Ortaöğretim Kurumları Yönetmeliği uyarınca okul idaresi ve zümre öğretmenlerince ilan edilecek tarihlerde yapılacaktır.
            </li>
          </ol>
        </div>

        {/* Official Signatures & Seal Area */}
        <div className="mt-8 pt-4 border-t-2 border-slate-800 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="text-slate-600 font-semibold">İnceleyen / Düzenleyen</div>
            <div className="font-black text-slate-900 text-sm mt-1">{vicePrincipalName}</div>
            <div className="text-[11px] text-slate-500 font-medium">Müdür Yardımcısı</div>
            <div className="mt-6 text-slate-400 font-mono text-[10px]">... / ... / 2024</div>
            <div className="text-slate-400 text-[10px]">İmza</div>
          </div>

          <div>
            <div className="text-slate-600 font-semibold">UYGUNDUR / ONAY</div>
            <div className="font-black text-slate-900 text-sm mt-1">{principalName}</div>
            <div className="text-[11px] text-slate-500 font-medium">Okul Müdürü</div>
            <div className="mt-6 text-slate-400 font-mono text-[10px]">... / ... / 2024</div>
            <div className="text-slate-400 text-[10px]">İmza - Mühür</div>
          </div>
        </div>
      </div>
    </div>
  );
};
