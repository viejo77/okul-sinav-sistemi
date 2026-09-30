import React from 'react';
import { SeatingPlanResult } from '../../types';
import { PrintHeader } from './PrintHeader';

interface Props {
  plan: SeatingPlanResult;
  forPrint?: boolean;
}

export const SupervisorListPrint: React.FC<Props> = ({ plan, forPrint = false }) => {
  const totalSupervisors = plan.rooms.length;
  const totalCommission = plan.commissionMembers.length;
  const totalAssignedStudents = plan.rooms.reduce((acc, r) => acc + r.totalAssigned, 0);

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
            subjectName={plan.subjectName}
            badgeText={`${totalSupervisors} Salon • ${totalCommission} Komisyon • ${totalAssignedStudents} Öğrenci`}
          />

          {/* Section 1: Sınav Dersi Komisyon Üyeleri */}
          <div className="mb-4">
            <div className="bg-black text-white px-3 py-1.5 rounded-t-lg font-black text-xs uppercase flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <span>⚖️</span>
                <span>SINAV KOMİSYON ÜYELERİ (SORU VE DEĞERLENDİRME)</span>
              </span>
              <span className="text-[9.5px] font-normal text-slate-300 italic">
                *Komisyon üyeleri bu sınavda gözetmen olamaz.
              </span>
            </div>

            <table className="w-full border-collapse border-2 border-black text-xs">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-black text-black font-extrabold text-[10px] uppercase">
                  <th className="border border-black p-1.5 text-center w-10">S.No</th>
                  <th className="border border-black p-1.5 text-left">Öğretmen Adı Soyadı</th>
                  <th className="border border-black p-1.5 text-left w-56">Görevi / Branşı</th>
                  <th className="border border-black p-1.5 text-center w-36">İmza</th>
                </tr>
              </thead>
              <tbody>
                {plan.commissionMembers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="border border-black p-2 text-center text-slate-500 italic">
                      Komisyon üyesi tanımlanmamış.
                    </td>
                  </tr>
                ) : (
                  plan.commissionMembers.map((member, idx) => (
                    <tr key={idx} className="border-b border-black bg-white">
                      <td className="border border-black p-1.5 text-center font-mono font-bold text-black">
                        {idx + 1}
                      </td>
                      <td className="border border-black p-1.5 font-black text-black">
                        {member}
                      </td>
                      <td className="border border-black p-1.5 text-black text-[11px] font-medium">
                        Sınav Komisyon Üyesi ({plan.subjectName})
                      </td>
                      <td className="border border-black p-1.5 text-center"></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
