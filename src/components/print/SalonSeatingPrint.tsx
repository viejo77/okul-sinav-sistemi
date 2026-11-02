import React from 'react';
import { RoomSeatingPlan, SeatingPlanResult, SeatedStudentInfo, Student, Exam } from '../../types';
import {
  getStudentSubject,
  getSubjectShortCode,
  getRoomSubjectGradeDistributions,
} from '../../utils/subjectCodes';

interface Props {
  plan: SeatingPlanResult;
  exam?: Exam;
  selectedRoomId?: string;
  forPrint?: boolean;
  roomsPerPage?: 1 | 2;
}

export const SalonSeatingPrint: React.FC<Props> = ({
  plan,
  exam,
  selectedRoomId = 'ALL',
  forPrint = false,
  roomsPerPage = 2,
}) => {
  const roomsToDisplay =
    selectedRoomId && selectedRoomId !== 'ALL'
      ? plan.rooms.filter(r => r.classroomId === selectedRoomId)
      : plan.rooms;

  // Group rooms per A4 page based on roomsPerPage (default 2 rooms per page)
  const roomGroups: RoomSeatingPlan[][] = [];
  const chunkSize = roomsPerPage;
  for (let i = 0; i < roomsToDisplay.length; i += chunkSize) {
    roomGroups.push(roomsToDisplay.slice(i, i + chunkSize));
  }

  // Helper to render student name and surname on separate lines as requested
  const renderStudentNameAndSurname = (std: Student) => {
    // If student has multiple given names, keep them together on line 1, surname on line 2
    const nameStr = std.name.trim();
    const surnameStr = std.surname.trim();

    return (
      <div className="text-center flex-1 flex flex-col justify-center items-center m-0 p-0 overflow-visible leading-normal">
        {/* Name on line 1 */}
        <div
          className="font-bold text-[9.5px] text-black uppercase m-0 p-0 leading-snug whitespace-nowrap overflow-visible"
          title={nameStr}
        >
          {nameStr}
        </div>
        {/* Surname on line 2 (bold & clear) */}
        <div
          className="font-black text-[10px] text-black uppercase m-0 p-0 leading-snug whitespace-nowrap overflow-visible"
          title={surnameStr}
        >
          {surnameStr}
        </div>
      </div>
    );
  };

  // Helper to render an individual seat card in pure black and white (no colors, no gray fill)
  const renderSeatCard = (seat?: SeatedStudentInfo) => {
    if (!seat || !seat.student) {
      // Empty seat: Pure white background, thin dashed border, NO gray fill
      return (
        <div className="border border-dashed border-slate-400 rounded p-1 flex-1 flex flex-col justify-between bg-white min-w-0">
          <div className="flex items-center justify-between m-0 p-0">
            <span className="font-mono text-[10px] text-black font-black leading-none m-0 border border-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              #{seat?.seatNumber || '-'}
            </span>
          </div>
          <div className="text-center font-bold text-[9.5px] text-slate-400 uppercase tracking-widest my-auto leading-normal m-0">
            BOŞ
          </div>
          <div className="text-[7px] text-transparent leading-none select-none m-0">
            -
          </div>
        </div>
      );
    }

    const std = seat.student;
    const subjName = getStudentSubject(std.classLevel, plan, exam);
    const subjCode = getSubjectShortCode(subjName);

    return (
      <div
        className="border-2 border-black rounded p-0.5 sm:p-1 flex-1 flex flex-col justify-between bg-white min-w-0 overflow-hidden"
        title={`Koltuk #${seat.seatNumber} | ${std.classLevel} - No: ${std.number} - ${std.name} ${std.surname} | Sınav Dersi: ${subjName}`}
      >
        {/* Top row: Sıra Numarası (Left) & Sınıf (Right - e.g. AMP 9-A, ATP 10-B) */}
        <div className="flex items-center justify-between gap-1 pb-0.5 border-b border-black m-0 leading-tight w-full min-w-0">
          <span className="bg-black text-white font-mono font-black text-[9px] sm:text-[9.5px] px-1.5 py-0.2 rounded shrink-0 leading-none">
            #{seat.seatNumber}
          </span>
          <div className="flex items-center gap-0.5 min-w-0">
            <span
              className="font-black text-[8px] sm:text-[8.5px] text-black border border-black bg-white px-1 py-0.2 rounded leading-none truncate max-w-[60px]"
              title={std.classLevel}
            >
              {std.classLevel}
            </span>
            {std.isBEP && (
              <span className="bg-black text-white font-black text-[6.5px] px-0.5 py-0.2 rounded uppercase shrink-0 leading-none">
                B
              </span>
            )}
          </div>
        </div>

        {/* Middle row: Student Name & Surname on separate lines (No vertical slicing) */}
        {renderStudentNameAndSurname(std)}

        {/* Bottom row: Öğrenci Numarası (Left - No 'No:' prefix as requested) & Sınav Dersi Kodu (Right) */}
        <div className="pt-0.5 border-t border-slate-300 flex items-center justify-between text-[8px] sm:text-[8.5px] leading-none m-0 gap-1 min-w-0">
          <span className="font-mono font-black text-[8.5px] sm:text-[9px] text-black truncate" title={`Okul No: ${std.number}`}>
            {std.number}
          </span>
          <span
            className="font-mono font-black text-[7.5px] sm:text-[8px] bg-black text-white px-1.5 py-0.2 rounded leading-none shrink-0"
            title={`Sınav Dersi: ${subjName}`}
          >
            {subjCode}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`${forPrint ? 'print-only' : ''} font-sans text-black leading-tight bg-white`}>
      {roomGroups.map((group, pageIdx) => {
        const isSingle = group.length === 1;

        return (
          <div
            key={pageIdx}
            data-pdf-page="true"
            data-orientation="portrait"
            className="w-[210mm] h-[297mm] max-h-[297mm] p-[3mm] mx-auto box-border flex flex-col justify-start bg-white shadow-md my-3 print:my-0 print:shadow-none print:p-0 print:border-none print:max-h-[285mm] print:h-auto overflow-hidden"
            style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
          >
            {group.map((room, roomIdx) => {
              const cols = room.columnsCount || 4;
              const rowsPerCol =
                room.rowsPerColumn || Math.max(1, Math.ceil(Math.ceil(room.capacity / 2) / cols));
              const isDoorLeft = room.doorPosition === 'left';
              const isDoorRight = !isDoorLeft;

              return (
                <div
                  key={room.classroomId}
                  className={`border-2 border-black rounded-lg p-2 bg-white flex flex-col justify-between box-border overflow-hidden ${
                    !isSingle && roomIdx === 0 ? 'mb-2' : ''
                  }`}
                  style={{
                    height: '138mm',
                    maxHeight: '138mm',
                  }}
                >
                  {/* COMPACT & COMPLETE EXAM HEADER:
                      - Clean 2-row layout with zero color fills
                      - NO "KAPI SOLDA / KAPI SAĞDA" in top row as requested
                  */}
                  <div className="border border-black rounded bg-white p-1.5 shrink-0">
                    {/* Header Row 1: MEB, Exam Name, Date, Period, Subject */}
                    <div className="flex justify-between items-center pb-1 border-b border-black gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[9px] font-black bg-black text-white px-2 py-0.5 rounded uppercase tracking-wider shrink-0 leading-none">
                          T.C. MEB
                        </span>
                        <span className="font-black text-xs text-black uppercase truncate leading-normal">
                          {plan.examName}
                        </span>
                      </div>
                      <div className="text-[9.5px] font-bold text-black shrink-0 flex items-center gap-1 whitespace-nowrap leading-normal">
                        <span>{plan.examDate}</span>
                        <span>•</span>
                        <span>{plan.examPeriod}. Ders</span>
                        {plan.subjectName && (
                          <>
                            <span>•</span>
                            <strong className="text-black font-black">{plan.subjectName}</strong>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Header Row 2: Room Name (Left) + Supervisor (Right) */}
                    <div className="flex justify-between items-center pt-1 text-[9.5px] gap-2">
                      {/* Left: Salon & Total Students */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-black text-xs text-black border-2 border-black px-2 py-0.5 rounded uppercase leading-none">
                          SALON: {room.classroomName}
                        </span>
                        <span className="font-bold text-black border border-black px-1.5 py-0.5 rounded leading-none">
                          {room.totalAssigned} / {room.capacity} Öğrenci
                        </span>
                      </div>

                      {/* Right: Supervisor */}
                      <div className="shrink-0 font-bold border border-black px-2 py-0.5 rounded text-black whitespace-nowrap leading-none">
                        Gözetmen: <strong className="font-black text-black">{room.supervisorName}</strong>
                        {room.supervisorBranch ? ` (${room.supervisorBranch})` : ''}
                      </div>
                    </div>

                    {/* Header Row 3: Dedicated Full-Width Subject & Grade Distribution Bar (Soru Kitapçığı & Evrak Dağıtımı)
                        Full width, zero horizontal cutoff, wraps cleanly so all subjects and all grades are 100% visible!
                    */}
                    <div className="pt-1 mt-1 border-t border-black flex flex-wrap items-center gap-1.5 text-[9px] w-full">
                      <span className="font-black text-black bg-black text-white px-1.5 py-0.5 rounded uppercase text-[8px] shrink-0 leading-none">
                        Evrak Dağılımı:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                        {(() => {
                          const distributions = getRoomSubjectGradeDistributions(room, plan, exam);
                          return distributions.map(dist => {
                            const gradeEntries = Object.entries(dist.gradeCounts)
                              .sort(([gA], [gB]) => (Number(gA) || 0) - (Number(gB) || 0))
                              .map(([grade, count]) => `${grade}. Sınıf: ${count}`);

                            return (
                              <span
                                key={dist.subjectName}
                                className="px-1.5 py-0.5 rounded font-extrabold text-[8.5px] border border-black bg-slate-50 text-black flex items-center gap-1 leading-none shadow-2xs"
                              >
                                <span className="bg-black text-white px-1 py-0.2 rounded text-[7.5px] font-mono font-black">
                                  {dist.subjectCode}
                                </span>
                                <span className="font-extrabold">{dist.subjectName}:</span>
                                <strong className="font-black text-black">
                                  {gradeEntries.join(' • ')}
                                </strong>
                                <span className="text-[7.5px] text-slate-600 font-mono font-normal">
                                  (Top: {dist.totalStudents})
                                </span>
                              </span>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* 2D SEATING PLAN GRID:
                      - Clean monochrome desks
                      - Students have First Name on line 1, Surname on line 2
                      - Zero letter clipping
                  */}
                  <div className="flex-1 flex flex-col justify-between my-1 min-h-0">
                    <div
                      className="grid gap-1.5 items-stretch flex-1 min-h-0"
                      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                    >
                      {(() => {
                        const visualColIndices = isDoorRight
                          ? Array.from({ length: cols }, (_, i) => i)
                          : Array.from({ length: cols }, (_, i) => cols - 1 - i);

                        return visualColIndices.map(cIdx => {
                          return (
                            <div
                              key={cIdx}
                              className="border border-black rounded p-1 bg-white flex flex-col justify-between gap-1 h-full min-w-0"
                            >
                              {Array.from({ length: rowsPerCol })
                                .map((_, idx) => rowsPerCol - 1 - idx) // Back to Front
                                .map(rIdx => {
                                  const seatWall =
                                    room.seats.find(
                                      s =>
                                        s.deskColumnIndex === cIdx &&
                                        s.deskRowIndex === rIdx &&
                                        s.colIndex === 0
                                    ) || room.seats[(cIdx * rowsPerCol + rIdx) * 2];

                                  const seatInner =
                                    room.seats.find(
                                      s =>
                                        s.deskColumnIndex === cIdx &&
                                        s.deskRowIndex === rIdx &&
                                        s.colIndex === 1
                                    ) || room.seats[(cIdx * rowsPerCol + rIdx) * 2 + 1];

                                  if (!seatWall && !seatInner) return null;

                                  const leftSeat = isDoorRight ? seatWall : seatInner;
                                  const rightSeat = isDoorRight ? seatInner : seatWall;

                                  return (
                                    /* Double Desk Bench (Çiftli Sıra) */
                                    <div
                                      key={rIdx}
                                      className="border-2 border-black rounded p-0.5 bg-white flex-1 flex gap-1 items-stretch min-w-0"
                                    >
                                      {/* Left Seat */}
                                      <div className="flex-1 flex flex-col justify-between min-w-0">
                                        {renderSeatCard(leftSeat)}
                                      </div>

                                      {/* Right Seat */}
                                      <div className="flex-1 flex flex-col justify-between min-w-0">
                                        {renderSeatCard(rightSeat)}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* FRONT OF CLASSROOM (BOTTOM):
                      Rule: If door is on the LEFT (isDoorLeft):
                            - Left side: GİRİŞ KAPISI (Sol)
                            - Middle: YAZI TAHTASI
                            - Right side: ÖĞRETMEN MASASI / KÜRSÜSÜ
                            If door is on the RIGHT (!isDoorLeft):
                            - Left side: ÖĞRETMEN MASASI / KÜRSÜSÜ
                            - Middle: YAZI TAHTASI
                            - Right side: GİRİŞ KAPISI (Sağ)
                      Monochrome black and white styling!
                  */}
                  <div className="border-t-2 border-black pt-1 shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      {/* Left Block */}
                      <div className="px-3 py-1 rounded border-2 border-black font-black text-[9.5px] text-center shrink-0 w-36 bg-white text-black">
                        {isDoorLeft ? '🚪 GİRİŞ KAPISI (Sol)' : '👨‍🏫 ÖĞRETMEN MASASI'}
                      </div>

                      {/* Middle Block: Blackboard */}
                      <div className="flex-1 border-2 border-black bg-white px-3 py-1 rounded text-center font-bold text-[9.5px] text-black uppercase tracking-widest">
                        📋 YAZI TAHTASI
                      </div>

                      {/* Right Block */}
                      <div className="px-3 py-1 rounded border-2 border-black font-black text-[9.5px] text-center shrink-0 w-36 bg-white text-black">
                        {isDoorLeft ? '👨‍🏫 ÖĞRETMEN MASASI' : '🚪 GİRİŞ KAPISI (Sağ)'}
                      </div>
                    </div>

                    {/* Bottom Line & Supervisor Signature */}
                    <div className="flex justify-between items-center pt-0.5 text-[9px] text-black">
                      <span className="font-medium text-[8.5px]">
                        * Öğrenciler sınav süresince belirlenen koltukta oturmak zorundadır.
                      </span>
                      <span className="font-bold">
                        Salon Sınav Gözetmeni İmzası: ____________________________
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
