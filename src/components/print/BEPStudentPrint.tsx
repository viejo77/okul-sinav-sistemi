import React, { useMemo } from 'react';
import { SeatingPlanResult, Student } from '../../types';
import { PrintHeader } from './PrintHeader';

interface Props {
  plan: SeatingPlanResult;
  forPrint?: boolean;
}

interface BepAssignmentEntry {
  student: Student;
  roomName: string;
  seatNumber: number;
  supervisorName: string;
}

export const BEPStudentPrint: React.FC<Props> = ({ plan, forPrint = false }) => {
  // 1. Collect all seated BEP students (and any unassigned BEP students)
  const bepAssignments = useMemo(() => {
    const list: BepAssignmentEntry[] = [];

    // From rooms
    plan.rooms.forEach(room => {
      room.seats
        .filter(s => s.student && s.student.isBEP)
        .forEach(seat => {
          list.push({
            student: seat.student!,
            roomName: room.classroomName,
            seatNumber: seat.seatNumber,
            supervisorName: room.supervisorName,
          });
        });
    });

    // Also include unassigned BEP students if any
    if (plan.unassignedStudents && plan.unassignedStudents.length > 0) {
      plan.unassignedStudents
        .filter(s => s && s.isBEP)
        .forEach(s => {
          list.push({
            student: s,
            roomName: 'Yerleşemedi (Açıkta)',
            seatNumber: 0,
            supervisorName: '-',
          });
        });
    }

    // Sort cleanly by class level and student number
    return list.sort((a, b) => {
      const c = a.student.classLevel.localeCompare(b.student.classLevel, 'tr');
      if (c !== 0) return c;
      return Number(a.student.number) - Number(b.student.number);
    });
  }, [plan]);

  // 2. Chunk into pages so NO student is cut off in PDF or print
  // If <= 18 items -> 1 single page with header, banner, table and footer
  // If > 18 items -> Page 1 takes 16 items. Middle pages take up to 20. Last page takes up to 18 (with footer).
  const pages = useMemo<BepAssignmentEntry[][]>(() => {
    if (bepAssignments.length <= 18) {
      return [bepAssignments];
    }
    const chunks: BepAssignmentEntry[][] = [];
    const p1Count = 16;
    chunks.push(bepAssignments.slice(0, p1Count));
    let currentIndex = p1Count;

    while (currentIndex < bepAssignments.length) {
      const remaining = bepAssignments.length - currentIndex;
      if (remaining <= 18) {
        chunks.push(bepAssignments.slice(currentIndex));
        break;
      } else {
        const take = Math.min(20, remaining - 1);
        chunks.push(bepAssignments.slice(currentIndex, currentIndex + take));
        currentIndex += take;
      }
    }
    return chunks;
  }, [bepAssignments]);

  const totalPages = pages.length;

  return (
    <div className={`${forPrint ? 'print-only' : ''} font-sans text-black leading-tight bg-white`}>
      {pages.map((pageItems, pageIdx) => {
        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === totalPages - 1;

        // Calculate global starting index for row numbering
        let startIndex = 0;
        for (let p = 0; p < pageIdx; p++) {
          startIndex += pages[p].length;
        }

        return (
          <div
            key={pageIdx}
            data-pdf-page="true"
            data-orientation="portrait"
            className="w-[210mm] min-h-[297mm] h-[297mm] p-[10mm] mx-auto box-border flex flex-col justify-between bg-white shadow-md my-3 print:my-0 print:shadow-none print:p-0 overflow-hidden"
            style={{ pageBreakAfter: 'always' }}
          >
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header: Full header on Page 1, compact header on Page 2+ */}
              {isFirstPage ? (
                <>
                  <PrintHeader
                    documentTitle="KAYNAŞTIRMA (BEP) ÖĞRENCİLERİ SINAV YERLEŞİM PLANI"
                    documentCategory="ÖZEL EĞİTİM & REHBERLİK SERVİSİ"
                    examName={plan.examName}
                    examDate={plan.examDate}
                    examPeriod={plan.examPeriod}
                    subjectName={plan.subjectName}
                    badgeText={`Toplam ${bepAssignments.length} BEP Öğrencisi ${totalPages > 1 ? `· Sayfa 1/${totalPages}` : ''}`}
                  />

                  {/* Important Accommodations Notice Banner (Monochrome) */}
                  <div className="bg-white border-2 border-black p-2 rounded-lg mb-2.5 flex items-start gap-2 shrink-0">
                    <span className="text-sm shrink-0">⚠️</span>
                    <div className="text-[9.5px] text-black leading-relaxed font-semibold">
                      <strong>Salon Gözetmenleri ve Komisyonun Dikkatine:</strong> Bu çizelgede yer alan kaynaştırma/BEP kapsamındaki öğrencilere, RAM ve Okul BEP Geliştirme Birimi kararları doğrultusunda sınav tedbirleri (ek süre, büyük punto soru kitapçığı, okuyucu/kodlayıcı desteği, ön sıra vb.) eksiksiz uygulanmalıdır.
                    </div>
                  </div>
                </>
              ) : (
                /* Continuation Header on Page 2+ */
                <div className="border-2 border-black rounded-lg bg-white overflow-hidden mb-2.5 shrink-0">
                  <div className="bg-black text-white px-3 py-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="bg-white text-black font-black text-[9px] px-1.5 py-0.2 rounded uppercase">
                        T.C. MEB
                      </span>
                      <span className="font-extrabold text-[10px] uppercase text-white">
                        KAYNAŞTIRMA (BEP) ÖĞRENCİLERİ SINAV PLANI
                      </span>
                    </div>
                    <div className="text-[9.5px] font-bold text-white uppercase tracking-wider">
                      Sayfa {pageIdx + 1} / {totalPages}
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-white flex justify-between items-center text-[9.5px] font-semibold text-black border-t border-black">
                    <div className="truncate font-black">
                      {plan.examName} · {plan.subjectName}
                    </div>
                    <div className="text-[9px] text-slate-700">
                      📅 {plan.examDate} · {plan.examPeriod}. Ders Saati
                    </div>
                  </div>
                </div>
              )}

              {/* Main BEP Table */}
              <div className="flex-1 min-h-0">
                <div className="bg-black text-white px-3 py-1 rounded-t-lg font-black text-xs uppercase flex justify-between items-center shrink-0">
                  <span>
                    BİREYSELLEŞTİRİLMİŞ EĞİTİM PROGRAMI (BEP) SINAV DAĞILIMI
                    {totalPages > 1 && ` (Sayfa ${pageIdx + 1}/${totalPages})`}
                  </span>
                  <span className="text-[9.5px] font-bold text-white">
                    Toplam: {bepAssignments.length} Öğrenci
                  </span>
                </div>

                <table className="w-full border-collapse border-2 border-black text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-black text-black font-extrabold text-[9.5px] uppercase">
                      <th className="border border-black p-1 text-center w-10">S.No</th>
                      <th className="border border-black p-1 text-center w-20">Öğr. No</th>
                      <th className="border border-black p-1 text-left">Öğrenci Adı Soyadı</th>
                      <th className="border border-black p-1 text-center w-20">Sınıfı</th>
                      <th className="border border-black p-1 text-left w-36">Sınav Salonu</th>
                      <th className="border border-black p-1 text-center w-20">Sıra No</th>
                      <th className="border border-black p-1 text-left w-40">Salon Gözetmeni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="border border-black p-6 text-center text-slate-500 italic bg-white">
                          Bu sınava katılan sınıflarda BEP (kaynaştırma) öğrencisi bulunmamaktadır.
                        </td>
                      </tr>
                    ) : (
                      pageItems.map((item, idx) => {
                        const globalNo = startIndex + idx + 1;
                        const fullName = `${item.student.name} ${item.student.surname}`;
                        const nameLen = fullName.length;
                        const nameFont = nameLen > 22 ? 'text-[10px]' : 'text-[11px]';

                        return (
                          <tr key={item.student.id || idx} className="border-b border-black bg-white">
                            <td className="border border-black p-1 text-center font-mono font-bold text-black text-[11px]">
                              {globalNo}
                            </td>

                            <td className="border border-black p-1 text-center font-mono font-black text-black text-[11px]">
                              {item.student.number}
                            </td>

                            <td className="border border-black p-1">
                              <div className={`font-black text-black uppercase ${nameFont}`}>
                                {fullName}
                              </div>
                              <div className="text-[8.5px] font-bold text-slate-600">
                                ★ Kaynaştırma / BEP Öğrencisi
                              </div>
                            </td>

                            <td className="border border-black p-1 text-center">
                              <span className="font-black px-2 py-0.2 rounded text-[10px] border border-black inline-block bg-white text-black">
                                {item.student.classLevel}
                              </span>
                            </td>

                            <td className="border border-black p-1">
                              <span className="font-black text-xs text-black border border-black px-2 py-0.2 rounded inline-block bg-white">
                                {item.roomName}
                              </span>
                            </td>

                            <td className="border border-black p-1 text-center">
                              <span className="font-mono font-black text-[11px] bg-black text-white px-2 py-0.2 rounded inline-block leading-none">
                                {item.seatNumber > 0 ? `#${item.seatNumber}` : '-'}
                              </span>
                            </td>

                            <td className="border border-black p-1 font-bold text-black text-[10.5px]">
                              {item.supervisorName}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Section: If last page -> Approval Footer. If intermediate page -> Continuation Notice */}
            {isLastPage ? (
              <div className="pt-3 mt-3 border-t-2 border-slate-800 text-xs flex justify-between items-end shrink-0">
                <div className="text-[9.5px] text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-800">* Uygulama Esasları:</span>
                  <br />
                  BEP öğrencileri sınav esnasında diğer öğrencileri rahatsız etmeyecek ve kendilerini güvende hissedecekleri ön sıralara yerleştirilmiştir.
                  <br />
                  <span className="text-slate-400 font-mono mt-0.5 inline-block">
                    Rapor Oluşturma: {plan.generatedAt} {totalPages > 1 ? `• Sayfa ${pageIdx + 1} / ${totalPages}` : ''}
                  </span>
                </div>

                <div className="flex gap-6 pr-4">
                  <div className="text-center font-bold">
                    <div className="text-slate-700 text-[10px] mb-7">UYGUNDUR</div>
                    <div className="text-xs font-black text-slate-900">Özel Eğitim / Rehberlik</div>
                    <div className="text-[9px] text-slate-500">Koordinatör Öğretmen</div>
                  </div>

                  <div className="text-center font-bold">
                    <div className="text-slate-700 text-[10px] mb-7">ONAY</div>
                    <div className="text-xs font-black text-black">Okul Müdürü</div>
                    <div className="text-[9px] text-slate-500">Mühür / İmza</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-300 text-[9.5px] text-slate-500 flex justify-between items-center shrink-0">
                <span>* BEP öğrencilerine okul kararları doğrultusunda sınav tedbirleri uygulanmalıdır.</span>
                <span className="font-bold text-black">
                  Sayfa {pageIdx + 1} / {totalPages} (Liste sonraki sayfada devam etmektedir →)
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
