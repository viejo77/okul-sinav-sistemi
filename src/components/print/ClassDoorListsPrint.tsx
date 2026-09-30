import React from 'react';
import { SeatingPlanResult, Student } from '../../types';

interface Props {
  plan: SeatingPlanResult;
  selectedClassFilter?: string; // If user selects a specific class to print, or 'ALL'
  forPrint?: boolean;
}

interface SeatedStudentEntry {
  student: Student;
  roomName: string;
  seatNumber: number;
  supervisorName: string;
}

export const ClassDoorListsPrint: React.FC<Props> = ({
  plan,
  selectedClassFilter = 'ALL',
  forPrint = false,
}) => {
  // 1. Group all seated students by classLevel
  const classMap: Record<string, SeatedStudentEntry[]> = {};

  plan.rooms.forEach(room => {
    room.seats
      .filter(s => s.student)
      .forEach(seat => {
        const cls = seat.student!.classLevel;
        if (!classMap[cls]) classMap[cls] = [];
        classMap[cls].push({
          student: seat.student!,
          roomName: room.classroomName,
          seatNumber: seat.seatNumber,
          supervisorName: room.supervisorName,
        });
      });
  });

  // Sort students in each class by school number
  Object.keys(classMap).forEach(cls => {
    classMap[cls].sort((a, b) => Number(a.student.number) - Number(b.student.number));
  });

  // Filter classes if user only wants to print a specific class
  let classNames = Object.keys(classMap).sort((a, b) => a.localeCompare(b, 'tr'));
  if (selectedClassFilter !== 'ALL') {
    classNames = classNames.filter(c => c === selectedClassFilter);
  }

  // Pair up classes (2 classes per A4 landscape page)
  const classPairs: string[][] = [];
  for (let i = 0; i < classNames.length; i += 2) {
    classPairs.push(classNames.slice(i, i + 2));
  }

  // Helper to render student row with optimized font sizes and prominent badges
  const renderStudentRow = (entry: SeatedStudentEntry, isCompact: boolean) => {
    const fullName = `${entry.student.name} ${entry.student.surname}`;
    const nameLen = fullName.length;
    const nameFont = isCompact
      ? nameLen > 22
        ? 'text-[8.5px]'
        : 'text-[9.5px]'
      : nameLen > 22
      ? 'text-[9.5px]'
      : 'text-[10.5px]';

    return (
      <tr key={entry.student.id} className="border-b border-slate-300 hover:bg-slate-50">
        {/* Student School Number */}
        <td className="border border-slate-300 p-0.5 sm:p-1 text-center font-mono font-black text-slate-800">
          {entry.student.number}
        </td>

        {/* Student Full Name */}
        <td
          className="border border-slate-300 p-0.5 sm:p-1 font-black text-slate-950 uppercase truncate leading-tight"
          style={{ maxWidth: isCompact ? '95px' : '150px' }}
          title={fullName}
        >
          <div className="min-w-0">
            <span className={`truncate block ${nameFont}`}>{fullName}</span>
          </div>
        </td>

        {/* Prominent Salon Name Badge (Monochrome) */}
        <td className="border border-slate-300 p-0.5 sm:p-1">
          <span className="font-black text-[9px] sm:text-[9.5px] text-black border border-black px-1.5 py-0.2 rounded block truncate text-center bg-white">
            {entry.roomName}
          </span>
        </td>

        {/* Prominent Seat Number Badge (Monochrome) */}
        <td className="border border-slate-300 p-0.5 sm:p-1 text-center">
          <span className="font-mono font-black text-[11px] sm:text-[11.5px] bg-black text-white px-2 py-0.5 rounded inline-block shadow-2xs leading-none">
            #{entry.seatNumber}
          </span>
        </td>
      </tr>
    );
  };

  return (
    <div className={`${forPrint ? 'print-only' : ''} font-sans text-black leading-tight`}>
      {classPairs.map((pair, pageIdx) => (
        <div
          key={pageIdx}
          data-pdf-page="true"
          data-orientation="landscape"
          className="w-[297mm] min-h-[210mm] max-h-[210mm] p-[6mm] mx-auto box-border flex flex-col justify-between bg-white shadow-md my-3 print:my-0 print:shadow-none print:p-0 overflow-hidden"
          style={{ pageBreakAfter: 'always' }}
        >
          {/* Two classes side by side (A4 landscape) with dotted center cut line */}
          <div className="flex-1 grid grid-cols-2 gap-4 relative h-full">
            {/* Dotted vertical cut guide in the middle */}
            {pair.length === 2 && (
              <div
                className="absolute top-0 bottom-0 left-1/2 -ml-px border-l-2 border-dashed border-slate-400 pointer-events-none hidden md:block print:block"
                title="Ortadan ikiye kesme çizgisi"
              />
            )}

            {pair.map(clsName => {
              const students = classMap[clsName] || [];
              const isLargeClass = students.length > 17;
              const midPoint = Math.ceil(students.length / 2);
              const col1Students = isLargeClass ? students.slice(0, midPoint) : students;
              const col2Students = isLargeClass ? students.slice(midPoint) : [];

              return (
                <div
                  key={clsName}
                  className="border-2 border-black rounded-lg p-2.5 flex flex-col justify-between text-xs bg-white overflow-hidden box-border h-full"
                >
                  <div className="flex-1 flex flex-col">
                    {/* Official Clean Header for THIS Class */}
                    <div className="border border-black rounded bg-slate-50 p-2 mb-2 shrink-0">
                      {/* Row 1: MEB & Exam Title on Left, Class Badge on Right */}
                      <div className="flex justify-between items-start gap-2 pb-1 border-b border-slate-300">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-slate-900 text-white font-black text-[8.5px] px-1.5 py-0.2 rounded uppercase">
                              T.C. MEB
                            </span>
                            <span className="font-extrabold text-[9.5px] text-blue-950 uppercase tracking-wide truncate">
                              ORTAK SINAV KAPI VE PANO ÇİZELGESİ
                            </span>
                          </div>
                          <h1 className="font-black text-xs uppercase tracking-tight text-slate-950 mt-0.5 truncate">
                            {plan.examName}
                          </h1>
                        </div>

                        {/* Distinct Class Badge (Monochrome) */}
                        <div className="text-right shrink-0 border-2 border-black px-2.5 py-0.5 rounded bg-white">
                          <span className="block text-xs font-black text-black">
                            {clsName} ŞUBESİ
                          </span>
                          <span className="text-[9px] font-bold text-black">
                            {students.length} Öğrenci
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Date, Period, Subject info */}
                      <div className="pt-1 flex flex-wrap justify-between items-center text-[9px] text-slate-800 font-semibold gap-x-2">
                        <span>📅 <strong>Tarih:</strong> {plan.examDate}</span>
                        <span>⏰ <strong>Saat:</strong> {plan.examPeriod}. Ders</span>
                        <span>📖 <strong>Ders:</strong> <strong className="text-black">{plan.subjectName}</strong></span>
                      </div>
                    </div>

                    {/* Table Area: Dual-column for large classes, single-column for smaller */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                      {isLargeClass ? (
                        <div className="grid grid-cols-2 gap-2 h-full">
                          {/* Sub-column 1 */}
                          <table className="w-full border-collapse border border-black text-[9px]">
                            <thead>
                              <tr className="bg-slate-100 border-b border-black font-extrabold text-[8.5px] uppercase text-slate-800">
                                <th className="border border-black p-0.5 text-center w-8">No</th>
                                <th className="border border-black p-0.5 text-left">Öğrenci Adı</th>
                                <th className="border border-black p-0.5 text-center w-18">Salon</th>
                                <th className="border border-black p-0.5 text-center w-8">Sıra</th>
                              </tr>
                            </thead>
                            <tbody>
                              {col1Students.map(entry => renderStudentRow(entry, true))}
                            </tbody>
                          </table>

                          {/* Sub-column 2 */}
                          <table className="w-full border-collapse border border-black text-[9px]">
                            <thead>
                              <tr className="bg-slate-100 border-b border-black font-extrabold text-[8.5px] uppercase text-slate-800">
                                <th className="border border-black p-0.5 text-center w-8">No</th>
                                <th className="border border-black p-0.5 text-left">Öğrenci Adı</th>
                                <th className="border border-black p-0.5 text-center w-18">Salon</th>
                                <th className="border border-black p-0.5 text-center w-8">Sıra</th>
                              </tr>
                            </thead>
                            <tbody>
                              {col2Students.map(entry => renderStudentRow(entry, true))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <table className="w-full border-collapse border border-black text-[9.5px]">
                          <thead>
                            <tr className="bg-slate-100 border-b border-black font-extrabold text-[9px] uppercase text-slate-800">
                              <th className="border border-black p-1 text-center w-10">No</th>
                              <th className="border border-black p-1 text-left">Öğrenci Adı Soyadı</th>
                              <th className="border border-black p-1 text-center w-28">Sınav Salonu</th>
                              <th className="border border-black p-1 text-center w-14">Sıra No</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map(entry => renderStudentRow(entry, false))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Clean Footer Notice */}
                  <div className="text-[8.5px] text-slate-600 pt-1 border-t border-slate-300 mt-1 flex justify-between items-center shrink-0">
                    <span className="font-medium">
                      * Öğrenciler sınav saatinden 10 dk önce sınav salonunda hazır bulunmalıdır.
                    </span>
                    <span className="font-extrabold text-slate-800">
                      {clsName} Kapı Çizelgesi
                    </span>
                  </div>
                </div>
              );
            })}

            {/* If odd number of classes, fill second side neatly */}
            {pair.length === 1 && (
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-400 text-xs italic">
                <span>Bu sayfada başka sınıf bulunmamaktadır.</span>
              </div>
            )}
          </div>

          {/* Bottom Generation Info */}
          <div className="text-right text-[8.5px] text-slate-400 pt-1 shrink-0">
            MEB Kelebek Sınav Sistemi • Belge Tarihi: {plan.generatedAt}
          </div>
        </div>
      ))}
    </div>
  );
};
