import React, { useMemo } from 'react';
import { SeatingPlanResult, Exam, Subject } from '../../types';
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

  return (
    <div className={`${forPrint ? 'print-only' : ''} font-sans text-black leading-tight`}>
      <div
        data-pdf-page="true"
        data-orientation="portrait"
        className="w-[210mm] min-h-[297mm] p-[10mm] mx-auto box-border flex flex-col justify-between bg-white shadow-md my-3 print:my-0 print:shadow-none print:p-0"
        style={{ pageBreakAfter: 'always' }}
      >
        <div className="flex-1 flex flex-col">
          {/* Institutional Clean Header */}
          <PrintHeader
            documentTitle="ORTAK SINAV GÖREVLİ & GÖZETMEN İMZA SİRKÜSÜ"
            documentCategory="RESMİ GÖREV VE İMZA TUTANAĞI"
            examName={plan.examName}
            examDate={plan.examDate}
            examPeriod={plan.examPeriod}
            subjectName={displaySubjectName}
            badgeText={`${totalSupervisors} Salon • ${totalCommissionCount} Komisyon • ${totalAssignedStudents} Öğrenci`}
          />

          {/* Section 1: Sınav Dersi Komisyon Üyeleri (Aynı saatteki her ders için ayrı ayrı) */}
          <div className="mb-4 space-y-2.5">
            <div className="bg-black text-white px-3 py-1.5 rounded-t-lg font-black text-xs uppercase flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <span>⚖️</span>
                <span>SINAV KOMİSYON ÜYELERİ (SORU VE DEĞERLENDİRME)</span>
              </span>
              <span className="text-[9.5px] font-normal text-slate-300 italic">
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
                  <div className="bg-slate-200 border-b border-black px-2.5 py-1 text-black font-black text-[11px] uppercase flex justify-between items-center">
                    <span>
                      {resolvedCommissions.length > 1 ? `${sIdx + 1}. DERS: ` : ''}
                      {subComm.subjectName} KOMİSYONU
                    </span>
                    <span className="text-[9.5px] font-bold text-slate-700">{classesLabel}</span>
                  </div>

                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-black text-black font-extrabold text-[10px] uppercase">
                        <th className="border-r border-black p-1 text-center w-10">S.No</th>
                        <th className="border-r border-black p-1 text-left">Öğretmen Adı Soyadı</th>
                        <th className="border-r border-black p-1 text-left w-64">Görevi / Branşı</th>
                        <th className="p-1 text-center w-36">İmza</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                      {subComm.teachers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-1.5 text-center text-slate-500 italic text-[11px]">
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
                            <td className="border-r border-black p-1 text-black text-[10.5px] font-medium">
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

          {/* Section 2: Salon Sınav Gözetmenleri */}
          <div className="flex-1">
            <div className="bg-black text-white px-3 py-1.5 rounded-t-lg font-black text-xs uppercase flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <span>👨‍🏫</span>
                <span>SALON SINAV GÖZETMENLERİ VE İMZA ÇİZELGESİ</span>
              </span>
              <span className="text-[9.5px] font-bold text-white">
                Toplam: {plan.rooms.length} Salon
              </span>
            </div>

            <table className="w-full border-collapse border-2 border-black text-xs">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-black text-black font-extrabold text-[10px] uppercase">
                  <th className="border border-black p-1.5 text-center w-10">S.No</th>
                  <th className="border border-black p-1.5 text-left w-48">Sınav Salonu</th>
                  <th className="border border-black p-1.5 text-left">Gözetmen Öğretmen Adı Soyadı</th>
                  <th className="border border-black p-1.5 text-left w-32">Branş</th>
                  <th className="border border-black p-1.5 text-center w-20">Öğrenci</th>
                  <th className="border border-black p-1.5 text-center w-36">İmza</th>
                </tr>
              </thead>
              <tbody>
                {plan.rooms.map((room, idx) => {
                  const nameLen = room.supervisorName.length;
                  const nameFont = nameLen > 24 ? 'text-[10px]' : 'text-xs';

                  return (
                    <tr
                      key={room.classroomId}
                      className="border-b border-black bg-white"
                    >
                      <td className="border border-black p-1.5 text-center font-mono font-bold text-black">
                        {idx + 1}
                      </td>

                      {/* Prominent Salon Name (Monochrome) */}
                      <td className="border border-black p-1.5">
                        <span className="font-black text-xs text-black border border-black px-2 py-0.5 rounded inline-block bg-white">
                          {room.classroomName}
                        </span>
                      </td>

                      {/* Supervisor Name with dynamic font size */}
                      <td className="border border-black p-1.5">
                        <div className={`font-black text-black ${nameFont}`}>
                          {room.supervisorName}
                        </div>
                        <div className="text-[9.5px] text-slate-600 font-medium">
                          {room.supervisorReason}
                        </div>
                      </td>

                      <td className="border border-black p-1.5 text-black font-medium text-[11px]">
                        {room.supervisorBranch || '-'}
                      </td>

                      {/* Student Count */}
                      <td className="border border-black p-1.5 text-center font-black font-mono text-black">
                        <span className="border border-black px-2 py-0.5 rounded text-[11px] bg-white">
                          {room.totalAssigned}
                        </span>
                      </td>

                      {/* Signature Cell */}
                      <td className="border border-black p-1.5 text-center"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Approval */}
        <div className="pt-4 mt-4 border-t-2 border-slate-800 text-xs flex justify-between items-end shrink-0">
          <div className="text-[10px] text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">* Sınav Görevlilerinin Dikkatine:</span>
            <br />
            1. Sınav evrakları sınav başlamadan 15 dakika önce komisyondan imza karşılığı teslim alınacaktır.
            <br />
            2. Sınav bitiminde salon oturma planı ve imzalı tutanaklar eksiksiz olarak teslim edilecektir.
            <br />
            <span className="text-slate-400 font-mono mt-0.5 inline-block">
              Sistem Belge No: {plan.examId} • Belge Tarihi: {plan.generatedAt}
            </span>
          </div>

          <div className="text-center font-bold pr-6">
            <div className="text-slate-700 text-[11px] mb-8">UYGUNDUR</div>
            <div className="text-sm font-black text-black">Okul Müdürü</div>
            <div className="text-[10px] text-slate-500">Mühür / İmza</div>
          </div>
        </div>
      </div>
    </div>
  );
};
