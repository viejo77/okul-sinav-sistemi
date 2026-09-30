import React from 'react';
import { ResponsibilityExam, ResponsibilitySettings } from '../../types';

export type ResponsibilityDocType =
  | 'ALL_DOCUMENTS'      // 📦 Tüm Sınav Evrakları (Eksiksiz Paket)
  | 'TEACHER_ASSIGNMENT' // 1. Öğretmen Görevlendirmesi
  | 'DAILY_SIGNATURE'    // 2. Günlük İmza Tutanağı
  | 'SCHEDULE_NOTICE'    // 3. Asılacak Sınav Tarihleri
  | 'ENVELOPE_COVER'     // 4. Sınav Zarfı Kapağı
  | 'OFFICIAL_MINUTES'   // 5. Sınav Tutanağı
  | 'STUDENT_LIST';      // 6. Öğrenci Yoklama & Not Listesi (Ek)

export interface IncludedDocsConfig {
  scheduleNotice: boolean;
  dailySignature: boolean;
  teacherAssignment: boolean;
  envelopeCover: boolean;
  officialMinutes: boolean;
}

interface Props {
  documentType: ResponsibilityDocType;
  exams: ResponsibilityExam[];
  selectedExamId?: string; // specific exam id or 'ALL'
  selectedTeacher?: string; // specific teacher or 'ALL'
  selectedDate?: string; // specific date or 'ALL'
  selectedGradeFilter?: string; // 'ALL' or '9', '10', '11', '12'
  envelopeNo?: string;
  settings: ResponsibilitySettings;
  includedDocs?: IncludedDocsConfig;
}

// Helper to subtract 1 hour for commission meeting time (e.g. 10:45 -> 09:45, 13:00 -> 12:00)
const getOneHourBefore = (timeStr: string): string => {
  if (!timeStr) return '09:00';
  const clean = timeStr.replace(/\s*(AM|PM)/i, '').trim();
  const parts = clean.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const mins = parts[1];
    const newHours = (hours - 1 + 24) % 24;
    return `${newHours.toString().padStart(2, '0')}:${mins}`;
  }
  return '09:00';
};

// 24 saatlik zaman formatlayıcı (AM/PM kaldırılarak standart format, örn: "10:45:00", "13:50:00")
const format24HourTime = (timeStr: string, withSeconds: boolean = true): string => {
  if (!timeStr) return '';
  const clean = timeStr.replace(/\s*(AM|PM)/i, '').trim();
  const parts = clean.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const mins = parts[1];
    const secs = parts[2] || '00';
    const paddedHours = hours.toString().padStart(2, '0');
    return withSeconds ? `${paddedHours}:${mins}:${secs}` : `${paddedHours}:${mins}`;
  }
  return clean;
};

export const ResponsibilityExamPrint: React.FC<Props> = ({
  documentType,
  exams,
  selectedExamId,
  selectedTeacher = 'ALL',
  selectedDate = 'ALL',
  selectedGradeFilter = 'ALL',
  envelopeNo = '2574',
  settings,
  includedDocs = {
    scheduleNotice: true,
    dailySignature: true,
    teacherAssignment: true,
    envelopeCover: true,
    officialMinutes: true,
  },
}) => {
  // Sort exams by date, then time
  const sortedExams = [...exams].sort((a, b) => {
    const dateCmp = (a.examDate || '').localeCompare(b.examDate || '', 'tr', { numeric: true });
    if (dateCmp !== 0) return dateCmp;
    return (a.examTime || '').localeCompare(b.examTime || '');
  });

  // Unique teachers who have assignments
  const allAssignedTeachers = React.useMemo(() => {
    const set = new Set<string>();
    exams.forEach(ex => {
      ex.commissionMembers.forEach(m => m && set.add(m.trim()));
      if (ex.supervisorName) set.add(ex.supervisorName.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [exams]);

  // Unique exam dates
  const allExamDates = React.useMemo(() => {
    const set = new Set<string>();
    exams.forEach(ex => {
      if (ex.examDate) set.add(ex.examDate.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
  }, [exams]);

  // Active exam for single exam documents
  const activeExam =
    exams.find(e => e.id === selectedExamId) || sortedExams[0] || exams[0] || null;

  // =========================================================================
  // SUB-RENDERER: 1. ÖĞRETMEN GÖREVLENDİRMESİ
  // =========================================================================
  const renderTeacherAssignment = (targetTeachers: string[]) => {
    if (targetTeachers.length === 0) {
      return (
        <div className="p-8 text-center text-slate-500 text-xs">
          Görevlendirilmiş öğretmen bulunamadı. Lütfen sınav tanımlarından komisyon üyelerini belirleyiniz.
        </div>
      );
    }

    return (
      <div className="bg-white text-black font-sans leading-normal">
        {targetTeachers.map((teacher, tIdx) => {
          const duties: Array<{
            exam: ResponsibilityExam;
            role: 'KOMİSYON ÜYESİ' | 'GÖZCÜ';
          }> = [];

          sortedExams.forEach(ex => {
            if (ex.commissionMembers.some(m => m.trim().toLowerCase() === teacher.trim().toLowerCase())) {
              duties.push({ exam: ex, role: 'KOMİSYON ÜYESİ' });
            } else if (ex.supervisorName && ex.supervisorName.trim().toLowerCase() === teacher.trim().toLowerCase()) {
              duties.push({ exam: ex, role: 'GÖZCÜ' });
            }
          });

          const dutiesByDate: Record<string, typeof duties> = {};
          duties.forEach(d => {
            const date = d.exam.examDate || 'Belirtilmedi';
            if (!dutiesByDate[date]) dutiesByDate[date] = [];
            dutiesByDate[date].push(d);
          });

          return (
            <div
              key={teacher}
              data-pdf-page="true"
              className="p-6 sm:p-10 max-w-[210mm] mx-auto print:max-w-none print:p-8 min-h-[297mm] flex flex-col justify-between"
              style={{ pageBreakAfter: 'always' }}
            >
              <div>
                {/* Official Header */}
                <div className="text-center space-y-1 mb-8">
                  <div className="text-sm font-bold tracking-widest text-slate-800 uppercase">T.C.</div>
                  <div className="text-sm font-bold tracking-wider text-slate-900 uppercase">MİLLİ EĞİTİM BAKANLIĞI</div>
                  <div className="text-sm sm:text-base font-black uppercase text-slate-900 leading-snug">
                    {settings.schoolName} Müdürlüğü
                  </div>
                </div>

                {/* Sub Bar (Sayı, Konu & Tarih) */}
                <div className="flex justify-between items-start text-xs sm:text-sm font-medium mb-8">
                  <div className="space-y-1">
                    <div>
                      <span className="font-bold">Sayı : </span>
                      <span className="font-mono">{settings.docNumber || '71646280.125.01-'}</span>
                    </div>
                    <div>
                      <span className="font-bold">Konu : </span>
                      <span>Sınav Görevi</span>
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold">
                    {settings.docDate || new Date().toLocaleDateString('tr-TR')}
                  </div>
                </div>

                {/* Recipient */}
                <div className="text-center sm:text-left font-bold text-sm sm:text-base mb-6 pl-0 sm:pl-16">
                  <span>Sayın : </span>
                  <span className="uppercase font-black text-slate-900 underline underline-offset-4 decoration-1">
                    {teacher}
                  </span>
                </div>

                {/* Body Text */}
                <div className="text-xs sm:text-sm text-justify leading-relaxed mb-8 indent-8 space-y-3 font-normal">
                  <p>
                    <strong>{settings.academicYear}</strong> Öğretim yılı <strong>{settings.term}</strong> Sorumluluk Sınavlarında Görevlendirildiniz.
                  </p>
                  <p>
                    Görevleriniz liste halinde aşağıya çıkarılmıştır. Komisyon üyesi olmanız durumunda sınav saatinden 2 saat önce, gözcü olmanız halinde sınavın başlamasından 30 dakika önce, görev mahallinde hazır bulunmanızı, sınavların huzurlu ve verimli geçmesi için diğer tüm görevlilerle işbirliği yaparak mevzuat doğrultusunda gerekli hazırlıklarınızı yapmanızı; geçerli bir mazeretiniz nedeniyle göreve gelemediğiniz durumda bir gün önceden mazeretinizi belgesiyle birlikte Okul idaresine bildirmenizi ve gereğini rica ederim.
                  </p>
                </div>

                {/* Middle Signature Blocks */}
                <div className="flex justify-between items-start text-xs sm:text-sm my-6 px-4">
                  <div className="text-center">
                    <div className="text-slate-400 font-mono text-xs">......../......../20......</div>
                    <div className="font-bold italic mt-3 text-slate-800">Aslını Aldım</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">(İmza)</div>
                  </div>

                  <div className="text-center min-w-[200px]">
                    <div className="font-black text-sm uppercase text-slate-900">{settings.principalName}</div>
                    <div className="font-bold text-xs text-slate-700 italic mt-0.5">Okul Müdürü</div>
                    <div className="text-[11px] text-slate-500 mt-3">(İmza & Mühür)</div>
                  </div>
                </div>

                {/* Duties Table */}
                <div className="mt-8">
                  <table className="w-full border-collapse border border-slate-700 text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-700 font-black text-[11px] sm:text-xs uppercase text-slate-900">
                        <th className="border border-slate-600 p-2 text-center w-28">TARİH</th>
                        <th className="border border-slate-600 p-2 text-center w-36">SAAT</th>
                        <th className="border border-slate-600 p-2 text-left">DERSLER</th>
                        <th className="border border-slate-600 p-2 text-center w-40">GÖREVİ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(dutiesByDate).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="border border-slate-600 p-3 text-center text-slate-500 italic">
                            Bu öğretmene ait aktif sınav görevi bulunmamaktadır.
                          </td>
                        </tr>
                      ) : (
                        Object.entries(dutiesByDate).map(([date, dateDuties]) => (
                          <React.Fragment key={date}>
                            {dateDuties.map((duty, dIdx) => (
                              <tr key={`${duty.exam.id}-${dIdx}`} className="border-b border-slate-600 hover:bg-slate-50">
                                {dIdx === 0 && (
                                  <td
                                    rowSpan={dateDuties.length}
                                    className="border border-slate-600 p-2 text-center font-bold font-mono align-middle bg-slate-50/50"
                                  >
                                    {date}
                                  </td>
                                )}
                                <td className="border border-slate-600 p-2 text-center font-semibold font-mono">
                                  <span className="font-bold">{duty.exam.examTime}</span>{' '}
                                  <span className="text-[11px] text-slate-700">({duty.exam.gradeLevel})</span>
                                </td>
                                <td className="border border-slate-600 p-2 font-bold uppercase text-slate-900">
                                  {duty.exam.subjectName}
                                  <span className="block text-[10.5px] font-normal text-slate-600">
                                    Salon: {duty.exam.classroomName}
                                  </span>
                                </td>
                                <td className="border border-slate-600 p-2 text-center font-bold text-xs">
                                  {duty.role}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Page Footer Note */}
              <div className="pt-6 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500">
                <span>T.C. MEB Sorumluluk Sınavları Resmi Tebligat Belgesi</span>
                <span>Öğretmen: {teacher} · Sayfa {tIdx + 1} / {targetTeachers.length}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // =========================================================================
  // SUB-RENDERER: 2. GÜNLÜK İMZA TUTANAĞI
  // =========================================================================
  const renderDailySignature = (targetDates: string[]) => {
    if (targetDates.length === 0) {
      return (
        <div className="p-8 text-center text-slate-500 text-xs">
          Sınav tarihi bulunamadı. Lütfen sınav tanımlarından sınav tarihlerini giriniz.
        </div>
      );
    }

    return (
      <div className="bg-white text-black font-sans leading-normal">
        {targetDates.map((date, dateIdx) => {
          const dateExams = sortedExams.filter(ex => ex.examDate === date);

          return (
            <div
              key={date}
              data-pdf-page="true"
              className="p-6 sm:p-10 max-w-[210mm] mx-auto print:max-w-none print:p-8 min-h-[297mm] flex flex-col justify-between"
              style={{ pageBreakAfter: 'always' }}
            >
              <div>
                {/* Official Header */}
                <div className="text-center space-y-1 mb-4">
                  <div className="text-xs font-bold tracking-widest text-slate-800 uppercase">T.C.</div>
                  <div className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                    {settings.districtName || 'MELİKGAZİ KAYMAKAMLIĞI'}
                  </div>
                  <div className="text-sm font-black uppercase text-slate-900 leading-snug">
                    {settings.schoolName} Müdürlüğü
                  </div>
                </div>

                {/* Sub-Header: Date and Subject Banner */}
                <div className="mt-4 mb-4 pb-2 border-b-2 border-slate-800">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900">
                    <span className="font-mono text-blue-900">{date}</span> TARİHLİ{' '}
                    <span>{settings.term}</span> SORUMLULUK SINAVLARINDA GÖREVLİ KOMİSYONLAR
                  </h3>
                </div>

                {/* Exam List Rows (Blocks 1, 2, 3...) */}
                <div className="space-y-4">
                  {dateExams.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs italic">
                      Bu tarihte planlanmış sınav bulunmamaktadır.
                    </div>
                  ) : (
                    dateExams.map((exam, exIdx) => {
                      const member1 = exam.commissionMembers[0] || '';
                      const member2 = exam.commissionMembers[1] || '';
                      const supervisor = exam.supervisorName || '';

                      return (
                        <div key={exam.id} className="border-b border-slate-700 pb-3">
                          {/* Row 1: Index - Category - Grade Level - Time */}
                          <div className="flex items-center justify-between text-xs sm:text-sm font-black text-slate-900 mb-1">
                            <div className="flex items-center gap-3">
                              <span className="w-5 font-bold font-mono">{exIdx + 1}</span>
                              <span className="uppercase tracking-wider">ORTAK DERSLER</span>
                            </div>
                            <div className="flex items-center gap-8 font-mono">
                              <span className="uppercase font-black">{exam.gradeLevel.toUpperCase()}</span>
                              <span className="font-black text-sm">{exam.examTime}</span>
                            </div>
                          </div>

                          {/* Row 2: Subject & Signatures Column */}
                          <div className="grid grid-cols-12 gap-2 items-start text-xs sm:text-sm pl-8">
                            <div className="col-span-5 pt-0.5">
                              <span className="font-bold text-slate-700">DERS: </span>
                              <strong className="font-black uppercase text-slate-900">{exam.subjectName}</strong>
                              <span className="block text-[11px] text-slate-500 font-medium">
                                Salon: {exam.classroomName} · {exam.students.length} Öğrenci
                              </span>
                            </div>

                            <div className="col-span-7 space-y-1.5">
                              <div className="text-right text-[11px] font-bold text-slate-700 pr-4">İmza</div>

                              {member1 && (
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-slate-500 text-[11px]">1</span>
                                    <span className="font-bold uppercase text-slate-900">{member1}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-slate-700">KOMİSYON ÜYESİ</span>
                                    <span className="font-mono text-slate-400">...................</span>
                                  </div>
                                </div>
                              )}

                              {member2 && (
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-slate-500 text-[11px]">2</span>
                                    <span className="font-bold uppercase text-slate-900">{member2}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-slate-700">KOMİSYON ÜYESİ</span>
                                    <span className="font-mono text-slate-400">...................</span>
                                  </div>
                                </div>
                              )}

                              {supervisor && (
                                <div className="flex items-center justify-between gap-2 text-xs text-slate-800">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-slate-500 text-[11px]">3</span>
                                    <span className="font-bold uppercase">{supervisor}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold">GÖZCÜ</span>
                                    <span className="font-mono text-slate-400">...................</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Bottom Approval Footer */}
              <div className="mt-8 pt-4 flex justify-between items-end text-xs">
                <div className="text-slate-500 text-[11px]">
                  <span>Tarih: {date} · Toplam Sınav: {dateExams.length}</span>
                </div>
                <div className="text-center min-w-[180px]">
                  <div className="font-black text-sm uppercase text-slate-900">{settings.principalName}</div>
                  <div className="font-bold text-xs text-slate-700 italic mt-0.5">Okul Müdürü</div>
                  <div className="text-[10px] text-slate-500 mt-1">(İmza & Mühür)</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // =========================================================================
  // SUB-RENDERER: 3. ASILACAK SINAV TARİHLERİ
  // =========================================================================
  const renderScheduleNotice = (filteredExams: ResponsibilityExam[] = sortedExams) => {
    return (
      <div
        data-pdf-page="true"
        className="bg-white text-black font-sans leading-normal p-6 sm:p-10 max-w-[210mm] mx-auto print:max-w-none print:p-8 min-h-[297mm] flex flex-col justify-between"
        style={{ pageBreakAfter: 'always' }}
      >
        <div>
          {/* Official Header */}
          <div className="text-center space-y-1 mb-4">
            <div className="text-xs font-bold tracking-widest text-slate-800 uppercase">T.C.</div>
            <div className="text-xs font-bold tracking-wider text-slate-900 uppercase">
              {settings.districtName || 'MELİKGAZİ KAYMAKAMLIĞI'}
            </div>
            <div className="text-sm sm:text-base font-black uppercase text-slate-900 leading-snug">
              {settings.schoolName} Müdürlüğü
            </div>
          </div>

          {/* Title Banner */}
          <div className="mt-4 mb-4 pb-2 border-b-2 border-slate-900 text-center sm:text-left">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900">
              {settings.term} DÖNEMİ SORUMLULUK SINAV TARİHLERİ
            </h3>
          </div>

          {/* Schedule Table */}
          <table className="w-full border-collapse border border-slate-700 text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-700 font-black text-[11px] sm:text-xs uppercase text-slate-900">
                <th className="border border-slate-600 p-2 text-left w-28">SEVİYE</th>
                <th className="border border-slate-600 p-2 text-center w-28">- TARİH</th>
                <th className="border border-slate-600 p-2 text-center w-16">SAAT</th>
                <th className="border border-slate-600 p-2 text-left">DERS ADI</th>
                <th className="border border-slate-600 p-2 text-left w-36">SINAV YERİ</th>
              </tr>
            </thead>
            <tbody>
              {filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-slate-600 p-4 text-center text-slate-500 italic">
                    Belirlenen kritere uygun sınav bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredExams.map((ex) => (
                  <tr key={ex.id} className="border-b border-slate-400 hover:bg-slate-50 h-8">
                    <td className="border border-slate-400 p-1.5 font-bold uppercase text-slate-900">
                      {ex.gradeLevel.toUpperCase()}
                    </td>
                    <td className="border border-slate-400 p-1.5 text-center font-mono font-bold text-slate-800">
                      - {ex.examDate}
                    </td>
                    <td className="border border-slate-400 p-1.5 text-center font-mono font-black text-slate-900">
                      {ex.examTime}
                    </td>
                    <td className="border border-slate-400 p-1.5 font-bold uppercase text-slate-900">
                      {ex.subjectName}
                    </td>
                    <td className="border border-slate-400 p-1.5 font-semibold text-xs text-slate-800 uppercase">
                      {ex.classroomName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Student Rules Note */}
          <div className="mt-4 text-[10.5px] text-slate-600 space-y-0.5 leading-snug">
            <p>• Öğrenciler sınav saatinden en az 15 dakika önce fotoğraflı kimlik kartları ile sınav salonunda hazır bulunmalıdır.</p>
            <p>• Sınav salonuna cep telefonu, akıllı saat veya ders notu sokulması kesinlikle yasaktır.</p>
          </div>
        </div>

        {/* Footer Approval */}
        <div className="mt-8 pt-4 flex justify-between items-end text-xs">
          <div className="text-left space-y-1">
            <div className="text-slate-500 text-[11px] font-mono">
              İlan Tarihi: {new Date().toLocaleDateString('tr-TR')}
            </div>
            <div className="text-slate-400 text-[10px]">Okul Girişi & Pano İlan Çizelgesi</div>
          </div>
          <div className="text-center min-w-[200px]">
            <div className="text-slate-400 font-mono text-xs mb-2">........./........./20......</div>
            <div className="font-black text-sm uppercase text-slate-900">{settings.principalName}</div>
            <div className="font-bold text-xs text-slate-700 italic mt-0.5">Okul Müdürü</div>
            <div className="text-[10px] text-slate-500 mt-1">(İmza & Mühür)</div>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // SUB-RENDERER: 4. SINAV ZARFI KAPAĞI
  // =========================================================================
  const renderEnvelopeCover = (targetExams: ResponsibilityExam[]) => {
    if (targetExams.length === 0) {
      return (
        <div className="p-8 text-center text-slate-500 text-xs">
          Zarf kapağı için sınav bulunamadı.
        </div>
      );
    }

    return (
      <div className="bg-white text-black font-sans leading-normal">
        {targetExams.map((exam) => {
          const member1 = exam.commissionMembers[0] || 'Branş Öğretmeni';
          const member2 = exam.commissionMembers[1] || 'Branş Öğretmeni';
          const supervisor = exam.supervisorName || '';

          return (
            <div
              key={exam.id}
              data-pdf-page="true"
              className="p-8 sm:p-12 max-w-[210mm] mx-auto print:max-w-none print:p-10 min-h-[297mm] flex flex-col justify-between"
              style={{ pageBreakAfter: 'always' }}
            >
              <div>
                {/* School Name Top Title */}
                <div className="text-center mb-8 pb-3 border-b-2 border-slate-900">
                  <h1 className="text-base sm:text-xl font-black uppercase tracking-tight text-slate-900">
                    {settings.schoolName.toUpperCase()}
                  </h1>
                </div>

                {/* Tracking / Envelope Number Box */}
                <div className="flex justify-end mb-8">
                  <span className="font-mono font-black text-sm sm:text-base border-2 border-slate-900 px-3 py-1 rounded bg-slate-50">
                    {envelopeNo || '2574'}
                  </span>
                </div>

                {/* Main Exam Attributes Box */}
                <div className="space-y-4 text-sm sm:text-base mb-12 pl-4 sm:pl-8">
                  <div className="flex items-center">
                    <span className="w-40 font-bold uppercase text-slate-700 tracking-wide">DERS ADI</span>
                    <span className="font-bold text-slate-700 mr-4">:</span>
                    <strong className="font-black text-lg sm:text-xl uppercase text-slate-900">
                      {exam.subjectName}
                    </strong>
                  </div>

                  <div className="flex items-center">
                    <span className="w-40 font-bold uppercase text-slate-700 tracking-wide">SINIF SEVİYESİ</span>
                    <span className="font-bold text-slate-700 mr-4">:</span>
                    <strong className="font-bold text-base sm:text-lg uppercase text-slate-900">
                      {exam.gradeLevel.toUpperCase()}
                    </strong>
                  </div>

                  <div className="flex items-center">
                    <span className="w-40 font-bold uppercase text-slate-700 tracking-wide">TARİH SAAT</span>
                    <span className="font-bold text-slate-700 mr-4">:</span>
                    <div className="flex items-center gap-8 font-mono font-bold text-base sm:text-lg">
                      <span>{exam.examDate}</span>
                      <span>{format24HourTime(exam.examTime, true)}</span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <span className="w-40 font-bold uppercase text-slate-700 tracking-wide">SINAV YERİ</span>
                    <span className="font-bold text-slate-700 mr-4">:</span>
                    <strong className="font-black text-base sm:text-lg uppercase text-slate-900">
                      {exam.classroomName.toUpperCase()}
                    </strong>
                  </div>

                  <div className="flex items-center">
                    <span className="w-40 font-bold uppercase text-slate-700 tracking-wide">ÖĞRENCİ SAYISI</span>
                    <span className="font-bold text-slate-700 mr-4">:</span>
                    <strong className="font-black font-mono text-base text-slate-900">
                      {exam.students.length} Öğrenci
                    </strong>
                  </div>
                </div>

                {/* Commission Members Signatures */}
                <div className="mt-12 pl-4 sm:pl-8 space-y-4 text-xs sm:text-sm">
                  <div className="font-black text-xs uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-300">
                    KOMİSYON ÜYELERİ
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between pr-8">
                      <div className="w-48 font-bold uppercase text-slate-900">{member1}</div>
                      <div className="w-36 font-semibold text-slate-700 text-xs">KOMİSYON ÜYESİ</div>
                      <div className="font-mono text-slate-500">İmza:...............................</div>
                    </div>

                    <div className="flex items-center justify-between pr-8">
                      <div className="w-48 font-bold uppercase text-slate-900">{member2}</div>
                      <div className="w-36 font-semibold text-slate-700 text-xs">KOMİSYON ÜYESİ</div>
                      <div className="font-mono text-slate-500">İmza:...............................</div>
                    </div>

                    {supervisor && (
                      <div className="flex items-center justify-between pr-8">
                        <div className="w-48 font-bold uppercase text-slate-900">{supervisor}</div>
                        <div className="w-36 font-semibold text-slate-700 text-xs">GÖZCÜ</div>
                        <div className="font-mono text-slate-500">İmza:...............................</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Envelope Bottom Approval */}
              <div className="mt-16 flex justify-end pr-12 text-center text-xs sm:text-sm">
                <div>
                  <div className="font-bold text-slate-700 mb-6">Komisyon Başkanı</div>
                  <div className="font-black text-sm uppercase text-slate-900">{settings.principalName}</div>
                  <div className="font-bold text-xs text-slate-700 italic mt-0.5">Okul Müdürü</div>
                  <div className="text-[10px] text-slate-500 mt-1">(İmza & Mühür)</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // =========================================================================
  // SUB-RENDERER: 5. SINAV TUTANAĞI (3 AŞAMALI)
  // =========================================================================
  const renderOfficialMinutes = (targetExams: ResponsibilityExam[]) => {
    if (targetExams.length === 0) {
      return (
        <div className="p-8 text-center text-slate-500 text-xs">
          Tutanak için sınav bulunamadı.
        </div>
      );
    }

    return (
      <div className="bg-white text-black font-sans leading-normal">
        {targetExams.map((exam) => {
          const prepTime = getOneHourBefore(exam.examTime);
          const member1 = exam.commissionMembers[0] || 'Komisyon Üyesi 1';
          const member2 = exam.commissionMembers[1] || 'Komisyon Üyesi 2';

          return (
            <div
              key={exam.id}
              data-pdf-page="true"
              className="p-6 sm:p-8 max-w-[210mm] mx-auto print:max-w-none print:p-6 min-h-[297mm] flex flex-col justify-between"
              style={{ pageBreakAfter: 'always' }}
            >
              <div>
                {/* Official Header */}
                <div className="text-center space-y-0.5 mb-3">
                  <div className="text-xs font-bold tracking-widest text-slate-800 uppercase">T.C.</div>
                  <div className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                    {settings.districtName || 'MELİKGAZİ KAYMAKAMLIĞI'}
                  </div>
                  <div className="text-sm font-black uppercase text-slate-900 leading-snug">
                    {settings.schoolName.toUpperCase()}
                  </div>
                  <div className="text-xs font-bold text-slate-800 uppercase">
                    {settings.academicYear} ÖĞRETİM YILI {settings.term.toUpperCase()} SORUMLULUK SINAVI DÖNEMİ
                  </div>
                  <div className="text-sm font-black uppercase tracking-wide underline underline-offset-2 pt-1 text-slate-900">
                    SINAV TUTANAĞI
                  </div>
                </div>

                {/* 1. KUTU: SINAVIN TANIMI */}
                <div className="mb-3">
                  <div className="border border-black text-center font-black text-xs py-0.5 bg-slate-100 uppercase">
                    SINAVIN TANIMI
                  </div>
                  <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                      <tr className="bg-slate-50 font-bold text-[11px] text-center border-b border-black">
                        <th className="border border-black p-1.5 w-1/4">ÖĞRETİM YILI DÖNEMİ</th>
                        <th className="border border-black p-1.5 w-1/4">SINAV ADI - DÖNEM</th>
                        <th className="border border-black p-1.5 w-1/3">DERS ADI</th>
                        <th className="border border-black p-1.5">SINAV TARİHİ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-center font-bold text-xs">
                        <td className="border border-black p-2 font-mono">
                          {settings.academicYear}
                          <div className="text-[10px] font-normal text-slate-600 mt-0.5">
                            {settings.term} SORUMLULUK SINAVI DÖNEMİ
                          </div>
                        </td>
                        <td className="border border-black p-2 uppercase">
                          SORUMLULUK SINAVI {settings.term} SINAVI
                        </td>
                        <td className="border border-black p-2 uppercase font-black">
                          {exam.subjectName} {exam.gradeLevel}
                        </td>
                        <td className="border border-black p-2 font-mono font-black">
                          {exam.examDate}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. KUTU: SINAV HAZIRLIĞI */}
                <div className="mb-3">
                  <div className="border border-black grid grid-cols-12 text-xs">
                    <div className="col-span-3 border-r border-black p-2 font-black flex items-center justify-center bg-slate-100 text-center uppercase">
                      SINAV HAZIRLIĞI
                    </div>
                    <div className="col-span-9">
                      <div className="border-b border-black flex justify-between p-1.5 px-3">
                        <span className="font-semibold">Sınav Komisyonunun toplandığı saat</span>
                        <strong className="font-mono">{format24HourTime(prepTime, true)}</strong>
                      </div>
                      <div className="flex justify-between p-1.5 px-3">
                        <span className="font-semibold">Soruların ve Cevap Anahtarının hazırlanarak sınav başlama durumuna gelindiği saat</span>
                        <strong className="font-mono">{format24HourTime(exam.examTime, true)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-800 space-y-0.5 mt-1.5 px-1 leading-tight">
                    <p>1) Sınav Komisyonu, sınav saatinden 1 saat önce toplanarak ekteki soruları ve cevap anahtarını hazırlamıştır.</p>
                    <p>2) Sınav Soru ve Cevap Anahtarı imzalanıp onaylandıktan sonra birinci nüshaları sınav komisyon başkanlığına teslim edilmiştir.</p>
                  </div>

                  {/* İmza Bloğu 1 */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="font-black uppercase text-xs">{settings.principalName}</div>
                      <div className="font-bold text-[10px] text-slate-700">SINAV KOMİSYON BAŞKANI</div>
                      <div className="text-[10px] text-slate-600">Okul Müdürü</div>
                    </div>
                    <div>
                      <div className="font-black uppercase text-xs">{member1}</div>
                      <div className="font-bold text-[10px] text-slate-700">KOMİSYON ÜYESİ</div>
                    </div>
                    <div>
                      <div className="font-black uppercase text-xs">{member2}</div>
                      <div className="font-bold text-[10px] text-slate-700">KOMİSYON ÜYESİ</div>
                    </div>
                  </div>
                </div>

                {/* 3. KUTU: SINAVA BAŞLAMA-KATILMA-SINAV NOTU */}
                <div className="mb-3">
                  <div className="border border-black grid grid-cols-12 text-xs">
                    <div className="col-span-3 border-r border-black p-2 font-black flex items-center justify-center bg-slate-100 text-center uppercase text-[11px]">
                      SINAVA BAŞLAMA-KATILMA-SINAV NOTU
                    </div>
                    <div className="col-span-9 divide-y divide-black">
                      <div className="flex justify-between p-1 px-3">
                        <span className="font-semibold">Sınavın başladığı saat</span>
                        <strong className="font-mono">{format24HourTime(exam.examTime, true)}</strong>
                      </div>
                      <div className="flex justify-between p-1 px-3">
                        <span className="font-semibold">Sınava katılan öğrenci sayısı</span>
                        <span className="font-mono"></span>
                      </div>
                      <div className="flex justify-between p-1 px-3">
                        <span className="font-semibold">Sınava katılmayan öğrenci sayısı</span>
                        <span className="font-mono"></span>
                      </div>
                      <div className="flex justify-between p-1 px-3">
                        <span className="font-semibold">Toplam öğrenci sayısı</span>
                        <strong className="font-mono">{exam.students.length}</strong>
                      </div>
                      <div className="flex justify-between p-1 px-3">
                        <span className="font-semibold">Kullanılan sınav kağıdı sayısı</span>
                        <span className="font-mono"></span>
                      </div>
                      <div className="flex justify-between p-1 px-3">
                        <span className="font-semibold">Sınavın sona erdiği saat</span>
                        <span className="font-mono"></span>
                      </div>
                      <div className="flex justify-between p-1 px-3">
                        <span className="font-semibold">Birinci incelemenin yapılacağı tarih</span>
                        <strong className="font-mono">{exam.examDate}</strong>
                      </div>
                    </div>
                  </div>

                  {/* İmza Bloğu 2 */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="font-black uppercase text-xs">{settings.principalName}</div>
                      <div className="font-bold text-[10px] text-slate-700">SINAV KOMİSYON BAŞKANI</div>
                      <div className="text-[10px] text-slate-600">Okul Müdürü</div>
                    </div>
                    <div>
                      <div className="font-black uppercase text-xs">{member1}</div>
                      <div className="font-bold text-[10px] text-slate-700">KOMİSYON ÜYESİ</div>
                    </div>
                    <div>
                      <div className="font-black uppercase text-xs">{member2}</div>
                      <div className="font-bold text-[10px] text-slate-700">KOMİSYON ÜYESİ</div>
                    </div>
                  </div>
                </div>

                {/* 4. KUTU: 1. İNCELEME */}
                <div className="mb-2">
                  <div className="border border-black grid grid-cols-12 text-xs">
                    <div className="col-span-3 border-r border-black p-2 font-black flex items-center justify-center bg-slate-100 text-center uppercase">
                      1. İNCELEME
                    </div>
                    <div className="col-span-9 divide-y divide-black">
                      <div className="flex justify-between p-1 px-3">
                        <span className="font-semibold">1.İncelemenin yapıldığı tarih</span>
                        <strong className="font-mono">{exam.examDate}</strong>
                      </div>
                      <div className="flex justify-between p-1 px-3">
                        <span className="font-semibold">1.İncelemede başarılı olan öğrenci sayısı</span>
                        <span className="font-mono"></span>
                      </div>
                      <div className="flex justify-between p-1 px-3">
                        <span className="font-semibold">1.İncelemede başarısız olan öğrenci sayısı</span>
                        <span className="font-mono"></span>
                      </div>
                      <div className="flex justify-between p-1 px-3">
                        <span className="font-bold">TOPLAM</span>
                        <strong className="font-mono">{exam.students.length}</strong>
                      </div>
                      <div className="flex justify-between p-1 px-3">
                        <span className="font-semibold">2.İncelemenin yapıldığı tarih - saat</span>
                        <span className="font-mono"></span>
                      </div>
                    </div>
                  </div>

                  {/* İmza Bloğu 3 */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="font-black uppercase text-xs">{settings.principalName}</div>
                      <div className="font-bold text-[10px] text-slate-700">SINAV KOMİSYON BAŞKANI</div>
                      <div className="text-[10px] text-slate-600">Okul Müdürü</div>
                    </div>
                    <div>
                      <div className="font-black uppercase text-xs">{member1}</div>
                      <div className="font-bold text-[10px] text-slate-700">KOMİSYON ÜYESİ</div>
                    </div>
                    <div>
                      <div className="font-black uppercase text-xs">{member2}</div>
                      <div className="font-bold text-[10px] text-slate-700">KOMİSYON ÜYESİ</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="pt-2 border-t border-slate-300 text-[10px] text-slate-500 text-center">
                MEB Ortaöğretim Kurumları Yönetmeliği Resmi Sorumluluk Sınav Tutanağı Standart Formu
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // =========================================================================
  // SUB-RENDERER: 6. ÖĞRENCİ YOKLAMA & NOT LİSTESİ (EK)
  // =========================================================================
  const renderStudentList = (examToRender: ResponsibilityExam | null) => {
    if (!examToRender) {
      return (
        <div className="p-8 text-center text-slate-500 text-xs">
          Lütfen yazdırılacak bir sorumluluk sınavı seçiniz.
        </div>
      );
    }

    const presentCount = examToRender.students.filter(s => s.result !== 'GİRMEDİ' && s.result !== 'BEKLİYOR').length;
    const absentCount = examToRender.students.filter(s => s.result === 'GİRMEDİ').length;
    const passedCount = examToRender.students.filter(s => s.result === 'GEÇTİ').length;
    const failedCount = examToRender.students.filter(s => s.result === 'KALDI').length;

    return (
      <div className="bg-white text-black p-4 sm:p-6 max-w-[210mm] mx-auto print:max-w-none print:p-0 font-sans">
        {/* Official Header */}
        <div className="text-center border-b-2 border-black pb-2 mb-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-700">T.C.</div>
          <div className="text-xs font-bold text-slate-800 uppercase">
            {settings.districtName || 'MELİKGAZİ KAYMAKAMLIĞI'}
          </div>
          <div className="text-sm font-black uppercase tracking-wider">{settings.schoolName} MÜDÜRLÜĞÜ</div>
          <div className="text-xs font-bold text-slate-800 uppercase mt-0.5">
            {settings.academicYear} EĞİTİM-ÖĞRETİM YILI {settings.term}
          </div>
          <div className="text-xs sm:text-sm font-black uppercase mt-1 tracking-wide bg-slate-100 py-1 border-y border-black">
            SORUMLULUK SINAVI SINAV YOKLAMA VE NOT TUTANAĞI
          </div>
        </div>

        {/* Exam Information Grid Box */}
        <div className="border border-black p-2 mb-3 bg-slate-50/60 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <span className="font-bold text-slate-600 block text-[10px] uppercase">Dersin Adı:</span>
            <strong className="text-xs uppercase font-black">{examToRender.subjectName}</strong>
          </div>
          <div>
            <span className="font-bold text-slate-600 block text-[10px] uppercase">Ders Seviyesi:</span>
            <strong className="text-xs font-bold">{examToRender.gradeLevel}</strong>
          </div>
          <div>
            <span className="font-bold text-slate-600 block text-[10px] uppercase">Sınav Tarihi & Saati:</span>
            <strong className="text-xs font-bold font-mono">{examToRender.examDate} - {examToRender.examTime}</strong>
          </div>
          <div>
            <span className="font-bold text-slate-600 block text-[10px] uppercase">Sınav Salonu:</span>
            <strong className="text-xs font-bold">{examToRender.classroomName}</strong>
          </div>
        </div>

        {/* Students List Table */}
        <table className="w-full border-collapse border border-black text-xs text-left mb-3">
          <thead>
            <tr className="bg-slate-100 text-black uppercase font-black text-[10.5px] border-b border-black">
              <th className="border border-black p-1 text-center w-8">S.No</th>
              <th className="border border-black p-1 text-center w-20">Okul No</th>
              <th className="border border-black p-1.5">Öğrencinin Adı Soyadı</th>
              <th className="border border-black p-1 text-center w-16">Şubesi</th>
              <th className="border border-black p-1 text-center w-24">Öğrenci İmzası</th>
              <th className="border border-black p-1 text-center w-16">Rakamla Not</th>
              <th className="border border-black p-1 text-center w-24">Yazıyla Not</th>
              <th className="border border-black p-1 text-center w-18">Sonuç</th>
            </tr>
          </thead>
          <tbody>
            {examToRender.students.map((st, idx) => (
              <tr key={st.id} className="border-b border-black h-7">
                <td className="border border-black p-1 text-center font-mono text-[11px] font-bold">{idx + 1}</td>
                <td className="border border-black p-1 text-center font-mono font-black text-xs">{st.number}</td>
                <td className="border border-black p-1.5 font-bold uppercase text-[11px]">
                  <span>{st.name} {st.surname}</span>
                  {st.isBEP && <span className="ml-1 text-[9px] font-black border border-black px-1 rounded">BEP</span>}
                </td>
                <td className="border border-black p-1 text-center font-semibold text-[11px]">{st.classLevel}</td>
                <td className="border border-black p-1 text-center text-[10px] text-slate-400"></td>
                <td className="border border-black p-1 text-center font-mono font-bold text-xs">
                  {st.score !== undefined && st.score !== null ? st.score : ''}
                </td>
                <td className="border border-black p-1 text-center text-[10px] capitalize font-medium">
                  {st.scoreText || ''}
                </td>
                <td className="border border-black p-1 text-center font-black text-[10.5px]">
                  {st.result === 'GEÇTİ' && <span className="text-black">GEÇTİ</span>}
                  {st.result === 'KALDI' && <span className="text-black">KALDI</span>}
                  {st.result === 'GİRMEDİ' && <span className="text-slate-600 font-normal">GİRMEDİ</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Statistics Box */}
        <div className="border border-black p-2 mb-4 bg-slate-50 text-[11px] flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-4">
            <div>Toplam Öğrenci: <strong className="font-mono font-bold">{examToRender.students.length}</strong></div>
            <div>Sınava Giren: <strong className="font-mono font-bold">{presentCount}</strong></div>
            <div>Girmeyen: <strong className="font-mono font-bold">{absentCount}</strong></div>
          </div>
          <div className="flex items-center gap-4">
            <div>Başarılı (Geçti): <strong className="font-mono font-bold">{passedCount}</strong></div>
            <div>Başarısız (Kaldı): <strong className="font-mono font-bold">{failedCount}</strong></div>
          </div>
        </div>

        {/* Signatures Area */}
        <div className="mt-6 pt-2 grid grid-cols-3 gap-4 text-center text-xs">
          <div className="border-t border-black pt-2">
            <div className="font-bold text-[11px] text-slate-600">1. Sınav Komisyon Üyesi</div>
            <div className="font-black text-xs uppercase mt-1">{examToRender.commissionMembers[0] || 'Ders Öğretmeni'}</div>
            <div className="text-[10px] text-slate-500">Branş Öğretmeni</div>
            <div className="h-8 mt-1 border-b border-dashed border-slate-300"></div>
            <div className="text-[9.5px] text-slate-400 mt-0.5">İmza</div>
          </div>

          <div className="border-t border-black pt-2">
            <div className="font-bold text-[11px] text-slate-600">2. Sınav Komisyon Üyesi</div>
            <div className="font-black text-xs uppercase mt-1">{examToRender.commissionMembers[1] || 'Ders Öğretmeni'}</div>
            <div className="text-[10px] text-slate-500">Branş Öğretmeni</div>
            <div className="h-8 mt-1 border-b border-dashed border-slate-300"></div>
            <div className="text-[9.5px] text-slate-400 mt-0.5">İmza</div>
          </div>

          <div className="border-t border-black pt-2 bg-slate-50/50 p-1.5 rounded">
            <div className="font-black text-[11px] text-slate-800">UYGUNDUR</div>
            <div className="text-[10px] text-slate-600">{examToRender.examDate}</div>
            <div className="font-black text-xs uppercase mt-1">{settings.principalName}</div>
            <div className="font-bold text-[10.5px] text-slate-700">Okul Müdürü / Komisyon Başkanı</div>
            <div className="h-6 mt-1 border-b border-dashed border-slate-400"></div>
            <div className="text-[9.5px] text-slate-500 mt-0.5">Mühür & İmza</div>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // MAIN SWITCHER: TEK BELGE VEYA TÜM EVRAKLAR EKSİKSİZ PAKETİ
  // =========================================================================
  if (documentType === 'ALL_DOCUMENTS') {
    return (
      <div className="bg-white text-black font-sans leading-normal">
        {/* 1. Asılacak Sınav Tarihleri Panosu */}
        {includedDocs.scheduleNotice && (
          <div className="w-full">
            {renderScheduleNotice(sortedExams)}
          </div>
        )}

        {/* 2. Günlük İmza Tutanakları */}
        {includedDocs.dailySignature && (
          <div className="w-full">
            {renderDailySignature(allExamDates)}
          </div>
        )}

        {/* 3. Öğretmen Görevlendirmeleri */}
        {includedDocs.teacherAssignment && (
          <div className="w-full">
            {renderTeacherAssignment(allAssignedTeachers)}
          </div>
        )}

        {/* 4. Sınav Zarfı Kapakları */}
        {includedDocs.envelopeCover && (
          <div className="w-full">
            {renderEnvelopeCover(sortedExams)}
          </div>
        )}

        {/* 5. 3 Aşamalı Resmi Sınav Tutanakları */}
        {includedDocs.officialMinutes && (
          <div className="w-full">
            {renderOfficialMinutes(sortedExams)}
          </div>
        )}
      </div>
    );
  }

  if (documentType === 'TEACHER_ASSIGNMENT') {
    const targetTeachers =
      selectedTeacher === 'ALL'
        ? allAssignedTeachers
        : allAssignedTeachers.filter(t => t === selectedTeacher);
    return renderTeacherAssignment(targetTeachers);
  }

  if (documentType === 'DAILY_SIGNATURE') {
    const targetDates =
      selectedDate === 'ALL'
        ? allExamDates
        : allExamDates.filter(d => d === selectedDate);
    return renderDailySignature(targetDates);
  }

  if (documentType === 'SCHEDULE_NOTICE') {
    const filteredExams =
      selectedGradeFilter === 'ALL'
        ? sortedExams
        : sortedExams.filter(e => e.gradeLevel.includes(selectedGradeFilter));
    return renderScheduleNotice(filteredExams);
  }

  if (documentType === 'ENVELOPE_COVER') {
    const targetExams =
      selectedExamId === 'ALL'
        ? sortedExams
        : activeExam
        ? [activeExam]
        : sortedExams;
    return renderEnvelopeCover(targetExams);
  }

  if (documentType === 'OFFICIAL_MINUTES') {
    const targetExams =
      selectedExamId === 'ALL'
        ? sortedExams
        : activeExam
        ? [activeExam]
        : sortedExams;
    return renderOfficialMinutes(targetExams);
  }

  // documentType === 'STUDENT_LIST'
  return renderStudentList(activeExam);
};
