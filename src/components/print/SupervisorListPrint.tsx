import React, { useMemo } from 'react';
import { SeatingPlanResult, Exam, Subject, RoomSeatingPlan } from '../../types';
import { PrintHeader } from './PrintHeader';

interface Props {
  plan: SeatingPlanResult;
  exam?: Exam;
  subjects?: Subject[];
  forPrint?: boolean;
}

export const SupervisorListPrint: React.FC<Props> = ({
  plan,
  exam,
  subjects,
  forPrint = false,
}) => {
  const totalSupervisors = plan.rooms.length;
  const totalAssignedStudents = plan.rooms.reduce((acc, r) => acc + r.totalAssigned, 0);

  // Synthesize or retrieve commissions per subject
  const resolvedCommissions = useMemo(() => {
    if (plan.subjectCommissions && plan.subjectCommissions.length > 0) {
      return plan.subjectCommissions;
    }

    if (exam && exam.assignedClasses && exam.assignedClasses.length > 0) {
      const subjectMap = new Map<string, Subject>();
      if (subjects) {
        subjects.forEach(s => {
          subjectMap.set(s.id, s);
          subjectMap.set(s.name.toLowerCase().trim(), s);
        });
      }

      const map = new Map<string, { subjectName: string; teachers: string[]; classes: string[] }>();
      exam.assignedClasses.forEach(ac => {
        const sName = ac.subjectName || exam.subjectName || plan.subjectName;
        const matched = subjectMap.get(ac.subjectId) || subjectMap.get(sName.toLowerCase().trim());
        if (!map.has(sName)) {
          map.set(sName, {
            subjectName: sName,
            teachers: matched?.teachers || [],
            classes: [],
          });
        }
        map.get(sName)!.classes.push(ac.classLevel);
      });

      const list = Array.from(map.values());
      if (list.length > 0) return list;
    }

    return [
      {
        subjectName: plan.subjectName,
        teachers: plan.commissionMembers,
        classes: [],
      },
    ];
  }, [plan, exam, subjects]);

  const totalCommissionCount = useMemo(() => {
    const unique = new Set<string>();
    resolvedCommissions.forEach(sc => {
      sc.teachers.forEach(t => unique.add(t.trim().toLowerCase()));
    });
    return Math.max(unique.size, plan.commissionMembers.length);
  }, [resolvedCommissions, plan.commissionMembers]);

  const displaySubjectName = useMemo(() => {
    if (resolvedCommissions.length > 1) {
      return resolvedCommissions.map(s => s.subjectName).join(' • ');
    }
    return plan.subjectName;
  }, [resolvedCommissions, plan.subjectName]);

  // Total commission rows count (used to compute Page 1 capacity)
  const totalCommissionRows = useMemo(() => {
    return resolvedCommissions.reduce((acc, c) => acc + Math.max(1, c.teachers.length), 0);
  }, [resolvedCommissions]);

  // Dynamic pagination calculation so NO supervisor or room is cut off in PDF or print
  const pages = useMemo<RoomSeatingPlan[][]>(() => {
    const p1CapacitySingle = totalCommissionRows <= 3 ? 13 : 10;
    const p1CapacityMulti = totalCommissionRows <= 3 ? 15 : 12;
    const middleCapacity = 24;
    const lastCapacity = 19;

    if (plan.rooms.length <= p1CapacitySingle) {
      return [plan.rooms];
    }

    const chunks: RoomSeatingPlan[][] = [];
    // Ensure Page 1 doesn't swallow all items if plan.rooms.length just exceeds p1CapacitySingle
    const p1Count = Math.min(p1CapacityMulti, Math.max(6, plan.rooms.length - 4));
    chunks.push(plan.rooms.slice(0, p1Count));
    let currentIndex = p1Count;

    while (currentIndex < plan.rooms.length) {
      const remaining = plan.rooms.length - currentIndex;
      if (remaining <= lastCapacity) {
        chunks.push(plan.rooms.slice(currentIndex));
        break;
      } else {
        const take = Math.min(middleCapacity, remaining - 2);
        chunks.push(plan.rooms.slice(currentIndex, currentIndex + take));
        currentIndex += take;
      }
    }
    return chunks;
  }, [plan.rooms, totalCommissionRows]);

  const totalPages = pages.length;

  return (
    <div className={`${forPrint ? 'print-only' : ''} font-sans text-black leading-tight bg-white`}>
      {pages.map((roomChunk, pageIdx) => {
        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === totalPages - 1;

        // Calculate global starting index for room numbering
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
              {/* Header: Full header on Page 1, compact continuation header on Page 2+ */}
              {isFirstPage ? (
                <>
                  <PrintHeader
                    documentTitle="ORTAK SINAV GÖREVLİ & GÖZETMEN İMZA SİRKÜSÜ"
                    documentCategory="RESMİ GÖREV VE İMZA TUTANAĞI"
                    examName={plan.examName}
                    examDate={plan.examDate}
                    examPeriod={plan.examPeriod}
                    subjectName={displaySubjectName}
                    badgeText={`${totalSupervisors} Salon • ${totalCommissionCount} Komisyon • ${totalAssignedStudents} Öğrenci ${totalPages > 1 ? `· Sayfa 1/${totalPages}` : ''}`}
                  />

                  {/* Section 1: Sınav Dersi Komisyon Üyeleri (Only on Page 1) */}
                  <div className="mb-3 space-y-2 shrink-0">
                    <div className="bg-black text-white px-3 py-1 rounded-t-lg font-black text-xs uppercase flex justify-between items-center">
                      <span className="flex items-center gap-1.5">
                        <span>⚖️</span>
                        <span>SINAV KOMİSYON ÜYELERİ (SORU VE DEĞERLENDİRME)</span>
                      </span>
                      <span className="text-[9px] font-normal text-slate-300 italic">
                        *Komisyon üyeleri bu sınavda gözetmen olamaz.
                      </span>
                    </div>

                    {resolvedCommissions.map((subComm, sIdx) => {
                      const classesLabel =
                        subComm.classes && subComm.classes.length > 0
                          ? ` • Sınava Giren Şubeler: ${subComm.classes.join(', ')}`
                          : '';

                      return (
                        <div key={sIdx} className="border-2 border-black rounded-lg overflow-hidden bg-white">
                          <div className="bg-slate-200 border-b border-black px-2.5 py-0.5 text-black font-black text-[10.5px] uppercase flex justify-between items-center">
                            <span>
                              {resolvedCommissions.length > 1 ? `${sIdx + 1}. DERS: ` : ''}
                              {subComm.subjectName} KOMİSYONU
                            </span>
                            <span className="text-[9px] font-bold text-slate-700">{classesLabel}</span>
                          </div>

                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100 border-b border-black text-black font-extrabold text-[9.5px] uppercase">
                                <th className="border-r border-black p-1 text-center w-10">S.No</th>
                                <th className="border-r border-black p-1 text-left">Öğretmen Adı Soyadı</th>
                                <th className="border-r border-black p-1 text-left w-64">Görevi / Branşı</th>
                                <th className="p-1 text-center w-36">İmza</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black">
                              {subComm.teachers.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="p-1.5 text-center text-slate-500 italic text-[10.5px]">
                                    {subComm.subjectName} dersi için komisyon üyesi tanımlanmamış.
                                  </td>
                                </tr>
                              ) : (
                                subComm.teachers.map((member, idx) => (
                                  <tr key={idx} className="bg-white">
                                    <td className="border-r border-black p-1 text-center font-mono font-bold text-black text-[11px]">
                                      {idx + 1}
                                    </td>
                                    <td className="border-r border-black p-1 font-black text-black text-[11px]">
                                      {member}
                                    </td>
                                    <td className="border-r border-black p-1 text-black text-[10px] font-medium">
                                      Sınav Komisyon Üyesi ({subComm.subjectName})
                                    </td>
                                    <td className="p-1 text-center"></td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
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
                        ORTAK SINAV GÖREVLİ & GÖZETMEN İMZA SİRKÜSÜ
                      </span>
                    </div>
                    <div className="text-[9.5px] font-bold text-white uppercase tracking-wider">
                      Sayfa {pageIdx + 1} / {totalPages}
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-white flex justify-between items-center text-[9.5px] font-semibold text-black border-t border-black">
                    <div className="truncate font-black">
                      {plan.examName} · {displaySubjectName}
                    </div>
                    <div className="text-[9px] text-slate-700">
                      📅 {plan.examDate} · {plan.examPeriod}. Ders Saati
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: Salon Sınav Gözetmenleri Table */}
              <div className="flex-1 min-h-0">
                <div className="bg-black text-white px-3 py-1 rounded-t-lg font-black text-xs uppercase flex justify-between items-center shrink-0">
                  <span className="flex items-center gap-1.5">
                    <span>👨‍🏫</span>
                    <span>
                      SALON SINAV GÖZETMENLERİ VE İMZA ÇİZELGESİ
                      {totalPages > 1 && ` (Sayfa ${pageIdx + 1}/${totalPages})`}
                    </span>
                  </span>
                  <span className="text-[9.5px] font-bold text-white">
                    Toplam: {plan.rooms.length} Salon
                  </span>
                </div>

                <table className="w-full border-collapse border-2 border-black text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-black text-black font-extrabold text-[9.5px] uppercase">
                      <th className="border border-black p-1 text-center w-10">S.No</th>
                      <th className="border border-black p-1 text-left w-44">Sınav Salonu</th>
                      <th className="border border-black p-1 text-left">Gözetmen Öğretmen Adı Soyadı</th>
                      <th className="border border-black p-1 text-left w-32">Branş</th>
                      <th className="border border-black p-1 text-center w-20">Öğrenci</th>
                      <th className="border border-black p-1 text-center w-36">İmza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomChunk.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="border border-black p-6 text-center text-slate-500 italic bg-white">
                          Tanımlı sınav salonu bulunmamaktadır.
                        </td>
                      </tr>
                    ) : (
                      roomChunk.map((room, idx) => {
                        const globalNo = startIndex + idx + 1;
                        const nameLen = room.supervisorName.length;
                        const nameFont = nameLen > 24 ? 'text-[10px]' : 'text-[11px]';

                        return (
                          <tr
                            key={room.classroomId || idx}
                            className="border-b border-black bg-white"
                          >
                            <td className="border border-black p-1 text-center font-mono font-bold text-black text-[11px]">
                              {globalNo}
                            </td>

                            {/* Prominent Salon Name (Monochrome) */}
                            <td className="border border-black p-1">
                              <span className="font-black text-xs text-black border border-black px-2 py-0.2 rounded inline-block bg-white">
                                {room.classroomName}
                              </span>
                            </td>

                            {/* Supervisor Name with reason badge */}
                            <td className="border border-black p-1">
                              <div className={`font-black text-black ${nameFont}`}>
                                {room.supervisorName}
                              </div>
                              <div className="text-[8.5px] text-slate-600 font-medium">
                                {room.supervisorReason}
                              </div>
                            </td>

                            <td className="border border-black p-1 text-black font-medium text-[10.5px]">
                              {room.supervisorBranch || '-'}
                            </td>

                            {/* Student Count */}
                            <td className="border border-black p-1 text-center font-black font-mono text-black">
                              <span className="border border-black px-2 py-0.2 rounded text-[11px] bg-white">
                                {room.totalAssigned}
                              </span>
                            </td>

                            {/* Signature Cell */}
                            <td className="border border-black p-1 text-center"></td>
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
                  <span className="font-bold text-slate-800">* Sınav Görevlilerinin Dikkatine:</span>
                  <br />
                  1. Sınav evrakları sınav başlamadan 15 dakika önce komisyondan imza karşılığı teslim alınacaktır.
                  <br />
                  2. Sınav bitiminde salon oturma planı ve imzalı tutanaklar eksiksiz olarak teslim edilecektir.
                  <br />
                  <span className="text-slate-400 font-mono mt-0.5 inline-block">
                    Sistem Belge No: {plan.examId} • Belge Tarihi: {plan.generatedAt} {totalPages > 1 ? `• Sayfa ${pageIdx + 1} / ${totalPages}` : ''}
                  </span>
                </div>

                <div className="text-center font-bold pr-6">
                  <div className="text-slate-700 text-[10.5px] mb-7">UYGUNDUR</div>
                  <div className="text-sm font-black text-black">Okul Müdürü</div>
                  <div className="text-[9px] text-slate-500">Mühür / İmza</div>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-300 text-[9.5px] text-slate-500 flex justify-between items-center shrink-0">
                <span>* Sınav evrakları sınav başlamadan 15 dakika önce komisyondan imza karşılığı teslim alınacaktır.</span>
                <span className="font-bold text-black">
                  Sayfa {pageIdx + 1} / {totalPages} (Gözetmen listesi sonraki sayfada devam etmektedir →)
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
