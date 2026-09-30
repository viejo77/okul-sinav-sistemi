import React from 'react';
import { SeatingPlanResult, Student } from '../../types';
import { PrintHeader } from './PrintHeader';

interface Props {
  plan: SeatingPlanResult;
  forPrint?: boolean;
}

export const BEPStudentPrint: React.FC<Props> = ({ plan, forPrint = false }) => {
  // Collect all seated BEP students
  const bepAssignments: {
    student: Student;
    roomName: string;
    seatNumber: number;
    supervisorName: string;
  }[] = [];

  plan.rooms.forEach(room => {
    room.seats
      .filter(s => s.student && s.student.isBEP)
      .forEach(seat => {
        bepAssignments.push({
          student: seat.student!,
          roomName: room.classroomName,
          seatNumber: seat.seatNumber,
          supervisorName: room.supervisorName,
        });
      });
  });

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
            documentTitle="KAYNAŞTIRMA (BEP) ÖĞRENCİLERİ SINAV YERLEŞİM PLANI"
            documentCategory="ÖZEL EĞİTİM & REHBERLİK SERVİSİ"
            examName={plan.examName}
            examDate={plan.examDate}
            examPeriod={plan.examPeriod}
            subjectName={plan.subjectName}
            badgeText={`Toplam ${bepAssignments.length} BEP Öğrencisi`}
          />

          {/* Important Accommodations Notice Banner (Monochrome) */}
          <div className="bg-white border-2 border-black p-2.5 rounded-lg mb-3 flex items-start gap-2.5">
            <span className="text-base shrink-0">⚠️</span>
            <div className="text-[10px] text-black leading-relaxed font-semibold">
              <strong>Salon Gözetmenleri ve Komisyonun Dikkatine:</strong> Bu çizelgede yer alan kaynaştırma/BEP kapsamındaki öğrencilere, RAM ve Okul BEP Geliştirme Birimi kararları doğrultusunda sınav tedbirleri (ek süre, büyük punto soru kitapçığı, okuyucu/kodlayıcı desteği, ön sıra vb.) eksiksiz olarak uygulanmalıdır.
            </div>
          </div>

          {/* Main BEP Table */}
          <div className="flex-1">
            <div className="bg-black text-white px-3 py-1.5 rounded-t-lg font-black text-xs uppercase flex justify-between items-center">
              <span>BİREYSELLEŞTİRİLMİŞ EĞİTİM PROGRAMI (BEP) SINAV DAĞILIM ÇİZELGESİ</span>
              <span className="text-[10px] font-bold text-white">
                Resmi Sınav Evrakı
              </span>
            </div>

            <table className="w-full border-collapse border-2 border-black text-xs">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-black text-black font-extrabold text-[10px] uppercase">
                  <th className="border border-black p-1.5 text-center w-10">S.No</th>
                  <th className="border border-black p-1.5 text-center w-20">Öğr. No</th>
                  <th className="border border-black p-1.5 text-left">Öğrenci Adı Soyadı</th>
                  <th className="border border-black p-1.5 text-center w-20">Sınıfı</th>
                  <th className="border border-black p-1.5 text-left w-36">Sınav Salonu</th>
                  <th className="border border-black p-1.5 text-center w-20">Sıra No</th>
                  <th className="border border-black p-1.5 text-left w-40">Salon Gözetmeni</th>
                </tr>
              </thead>
              <tbody>
                {bepAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border border-black p-6 text-center text-slate-500 italic bg-white">
                      Bu sınava katılan sınıflarda BEP (kaynaştırma) öğrencisi bulunmamaktadır.
                    </td>
                  </tr>
                ) : (
                  bepAssignments.map((item, idx) => {
                    const fullName = `${item.student.name} ${item.student.surname}`;
                    const nameLen = fullName.length;
                    const nameFont = nameLen > 22 ? 'text-[10.5px]' : 'text-xs';

                    return (
                      <tr
                        key={idx}
                        className="border-b border-black bg-white"
                      >
                        <td className="border border-black p-1.5 text-center font-mono font-bold text-black">
                          {idx + 1}
                        </td>

                        {/* Student Number */}
                        <td className="border border-black p-1.5 text-center font-mono font-black text-black">
                          {item.student.number}
                        </td>

                        {/* Student Name with Dynamic Sizing & Prominence */}
                        <td className="border border-black p-1.5">
                          <div className={`font-black text-black uppercase ${nameFont}`}>
                            {fullName}
                          </div>
                          <div className="text-[9px] font-bold text-slate-600">
                            ★ Kaynaştırma / BEP Öğrencisi
                          </div>
                        </td>

                        {/* Student Class (Monochrome) */}
                        <td className="border border-black p-1.5 text-center">
                          <span className="font-black px-2 py-0.5 rounded text-[10px] border border-black inline-block bg-white text-black">
                            {item.student.classLevel}
                          </span>
                        </td>

                        {/* Prominent Classroom Name (Monochrome) */}
                        <td className="border border-black p-1.5">
                          <span className="font-black text-xs text-black border border-black px-2 py-0.5 rounded inline-block bg-white">
                            {item.roomName}
                          </span>
                        </td>

                        {/* Seat Number */}
                        <td className="border border-black p-1.5 text-center">
                          <span className="font-mono font-black text-[12px] bg-black text-white px-2 py-0.5 rounded inline-block leading-none">
                            #{item.seatNumber}
                          </span>
                        </td>

                        {/* Supervisor Name */}
                        <td className="border border-black p-1.5 font-bold text-black text-[11px]">
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

        {/* Footer Approval */}
        <div className="pt-4 mt-4 border-t-2 border-slate-800 text-xs flex justify-between items-end shrink-0">
          <div className="text-[10px] text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">* Uygulama Esasları:</span>
            <br />
            BEP öğrencileri sınav esnasında diğer öğrencileri rahatsız etmeyecek ve kendilerini güvende hissedecekleri ön sıralara yerleştirilmiştir.
            <br />
            <span className="text-slate-400 font-mono mt-0.5 inline-block">
              Rapor Oluşturma: {plan.generatedAt}
            </span>
          </div>

          <div className="flex gap-8 pr-4">
            <div className="text-center font-bold">
              <div className="text-slate-700 text-[10.5px] mb-8">UYGUNDUR</div>
              <div className="text-xs font-black text-slate-900">Özel Eğitim / Rehberlik</div>
              <div className="text-[9.5px] text-slate-500">Koordinatör Öğretmen</div>
            </div>

            <div className="text-center font-bold">
              <div className="text-slate-700 text-[10.5px] mb-8">ONAY</div>
              <div className="text-xs font-black text-black">Okul Müdürü</div>
              <div className="text-[9.5px] text-slate-500">Mühür / İmza</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
