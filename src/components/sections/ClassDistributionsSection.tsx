import React, { useState, useMemo } from 'react';
import {
  Split,
  Printer,
  Search,
  Filter,
  Users,
  School,
  ArrowRight,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { SeatingPlanResult, Student } from '../../types';
import { getClassColor } from '../../utils/classColors';

interface Props {
  plan: SeatingPlanResult | undefined;
  onOpenPrintModal: (mode: 'SALON' | 'SUPERVISOR' | 'BEP' | 'CLASSES') => void;
}

interface SeatedStudentEntry {
  student: Student;
  roomName: string;
  seatNumber: number;
  supervisorName: string;
}

export const ClassDistributionsSection: React.FC<Props> = ({ plan, onOpenPrintModal }) => {
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 1. Group all seated students by class
  const { classMap, availableClasses, totalAssignedStudents } = useMemo(() => {
    if (!plan) {
      return { classMap: {}, availableClasses: [], totalAssignedStudents: 0 };
    }

    const map: Record<string, SeatedStudentEntry[]> = {};
    let total = 0;

    plan.rooms.forEach(room => {
      room.seats
        .filter(s => s.student)
        .forEach(seat => {
          const cls = seat.student!.classLevel;
          if (!map[cls]) map[cls] = [];
          map[cls].push({
            student: seat.student!,
            roomName: room.classroomName,
            seatNumber: seat.seatNumber,
            supervisorName: room.supervisorName,
          });
          total++;
        });
    });

    // Sort students in each class by school number
    Object.keys(map).forEach(cls => {
      map[cls].sort((a, b) => {
        const numA = parseInt(a.student.number.replace(/\D/g, ''), 10);
        const numB = parseInt(b.student.number.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.student.number.localeCompare(b.student.number, 'tr');
      });
    });

    const classes = Object.keys(map).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));

    return {
      classMap: map,
      availableClasses: classes,
      totalAssignedStudents: total,
    };
  }, [plan]);

  if (!plan) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-dashed border-slate-300 max-w-xl mx-auto my-6 shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <Split className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Sınav Dağılımı Henüz Yapılmadı</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 leading-relaxed">
          Sınıf bazlı öğrenci sınav yerleşim listelerini görmek ve kapı listesi çıktısı alabilmek için
          lütfen <strong>5. Oturma Düzeni</strong> sekmesinden Kelebek dağıtımını çalıştırınız.
        </p>
      </div>
    );
  }

  // Filter entries based on search and selected class
  const filteredClasses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const targetClasses = selectedClass === 'ALL' ? availableClasses : [selectedClass];

    return targetClasses
      .map(cls => {
        const entries = (classMap[cls] || []).filter(item => {
          if (!term) return true;
          const fullName = `${item.student.name} ${item.student.surname}`.toLowerCase();
          return (
            fullName.includes(term) ||
            item.student.number.includes(term) ||
            item.roomName.toLowerCase().includes(term) ||
            item.supervisorName.toLowerCase().includes(term)
          );
        });
        return { cls, entries };
      })
      .filter(group => group.entries.length > 0 || !searchTerm);
  }, [classMap, availableClasses, selectedClass, searchTerm]);

  const totalFilteredStudents = filteredClasses.reduce((sum, g) => sum + g.entries.length, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[calc(100vh-140px)] space-y-2 overflow-hidden">
      {/* 1. TOP COMPACT HEADER BAR */}
      <div className="shrink-0 bg-white rounded-xl px-3 py-1.5 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="bg-indigo-100 text-indigo-700 font-black px-2 py-0.5 rounded text-[11px] shrink-0">
            6. BÖLÜM
          </span>
          <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight shrink-0">
            Sınıflara Göre Sınav Salonu Dağılımları
          </h2>
          <span className="text-slate-300 hidden md:inline">|</span>
          <span className="text-[11px] text-slate-500 font-semibold truncate hidden md:inline">
            {plan.examName} ({plan.subjectName})
          </span>
        </div>

        {/* Quick Actions & Search */}
        <div className="flex items-center gap-2">
          <div className="relative w-36 sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="No, isim, salon ara..."
              className="w-full text-xs pl-7 pr-2 py-1 bg-slate-50 rounded-lg border border-slate-300 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="bg-slate-100 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-700 hidden sm:inline-block">
            {totalFilteredStudents} Öğrenci
          </div>

          <button
            onClick={() => onOpenPrintModal('CLASSES')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition shadow-2xs cursor-pointer shrink-0"
            title="Sınıf kapı ve duyuru panosu listelerini yatay A4 (2 sınıf/sayfa) olarak yazdır"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Kapı Listeleri (A4)</span>
          </button>
        </div>
      </div>

      {/* 2. DUAL COLUMN LAYOUT (IDENTICAL TO FIRST 5 SECTIONS) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch overflow-hidden">
        {/* LEFT COLUMN: Fieldset with actions, class selector and quick stats (col-span-3) */}
        <div className="lg:col-span-3 flex flex-col h-full overflow-hidden space-y-2">
          <fieldset className="border-2 border-blue-400 rounded-xl p-2.5 bg-white shadow-2xs flex-1 flex flex-col justify-between overflow-hidden">
            <legend className="px-2 text-xs font-black text-blue-700 bg-white">
              Sınıf Listesi & İşlemler
            </legend>

            {/* Quick Action Button */}
            <div className="shrink-0 space-y-1.5 mb-2">
              <button
                type="button"
                onClick={() => onOpenPrintModal('CLASSES')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Kapı Listesi Yazdır (A4)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedClass('ALL')}
                className={`w-full text-xs font-bold py-1 px-2 rounded-lg transition flex items-center justify-between border cursor-pointer ${
                  selectedClass === 'ALL'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 font-black'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>👥</span>
                  <span>Tüm Sınıfları Göster</span>
                </div>
                <span className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.2 rounded font-black text-slate-700">
                  {totalAssignedStudents}
                </span>
              </button>
            </div>

            {/* Scrollable Class List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 border border-slate-100 rounded-lg p-1 bg-slate-50/50">
              {availableClasses.map(cls => {
                const studentsInClass = classMap[cls] || [];
                const isSelected = selectedClass === cls;
                const colorInfo = getClassColor(cls);
                const roomsCount = new Set(studentsInClass.map(s => s.roomName)).size;

                return (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`w-full text-left px-2 py-1 rounded-md text-xs transition flex items-center justify-between cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-50 border-blue-400 text-blue-950 font-black shadow-2xs'
                        : 'border-transparent text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-black shrink-0 ${colorInfo.badge}`}>
                        {cls}
                      </span>
                      <span className="text-[10.5px] text-slate-500 truncate">
                        {roomsCount} Salona Dağıtıldı
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200/70 text-slate-700'
                      }`}
                    >
                      {studentsInClass.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Stats Summary Footer (Like sections 2, 4, 5) */}
            <div className="shrink-0 pt-2 mt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
              <div className="flex justify-between items-center">
                <span>Toplam Şube:</span>
                <strong className="text-slate-900 font-mono">{availableClasses.length} Sınıf</strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Dağıtılan Öğrenci:</span>
                <strong className="text-slate-900 font-mono">{totalAssignedStudents} Kişi</strong>
              </div>
              <div className="flex justify-between items-center text-blue-700 font-semibold">
                <span>Yazdırma Formatı:</span>
                <span className="text-[10px] bg-blue-50 border border-blue-200 px-1 rounded">
                  A4 Yatay · 2 Şube/Sayfa
                </span>
              </div>
            </div>
          </fieldset>
        </div>

        {/* RIGHT COLUMN: Dense, fixed-header distribution table with internal scroll (col-span-9) */}
        <div className="lg:col-span-9 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between overflow-hidden h-full">
          {/* Table Header Controls */}
          <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800">
                {selectedClass === 'ALL' ? 'Tüm Sınıfların Sınav Dağılım Listesi' : `${selectedClass} Sınıfı Sınav Yerleşim Listesi`}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                ({totalFilteredStudents} Öğrenci)
              </span>
            </div>

            <div className="text-[11px] font-semibold text-slate-500 hidden sm:block">
              Sıralama: Okul Numarasına Göre
            </div>
          </div>

          {/* Table Container - Internally Scrollable only */}
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-300 text-[11px] uppercase tracking-wider text-slate-700 font-extrabold shadow-2xs">
                <tr>
                  <th className="p-1.5 w-12 text-center">S.No</th>
                  <th className="p-1.5 w-20 text-center font-mono">Okul No</th>
                  <th className="p-1.5">Öğrenci Adı Soyadı</th>
                  <th className="p-1.5 w-20 text-center">Sınıf</th>
                  <th className="p-1.5 w-40">Sınav Salonu</th>
                  <th className="p-1.5 w-24 text-center">Sıra No</th>
                  <th className="p-1.5">Salon Gözetmeni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClasses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                      Arama kriterine uygun öğrenci bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredClasses.map(group => {
                    const colorInfo = getClassColor(group.cls);

                    return (
                      <React.Fragment key={group.cls}>
                        {selectedClass === 'ALL' && (
                          <tr className="bg-slate-50/90 font-bold border-y border-slate-200">
                            <td colSpan={7} className="px-2.5 py-0.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className={`font-black text-[10.5px] px-1.5 py-0.2 rounded ${colorInfo.badge}`}>
                                  {group.cls} Sınıfı ({group.entries.length} Öğrenci)
                                </span>
                                <span className="text-[10px] text-slate-500 font-normal">
                                  {new Set(group.entries.map(e => e.roomName)).size} Farklı Salonda
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}

                        {group.entries.map((item, idx) => (
                          <tr key={`${group.cls}-${item.student.id}`} className="hover:bg-blue-50/40 transition">
                            <td className="p-1.5 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="p-1.5 font-mono font-black text-center text-slate-900 text-xs">
                              {item.student.number}
                            </td>
                            <td className="p-1.5 font-bold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{item.student.name} {item.student.surname}</span>
                                {item.student.isBEP && (
                                  <span className="text-[9px] bg-purple-100 text-purple-800 border border-purple-200 px-1 py-0.2 rounded font-black shrink-0">
                                    BEP
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-1.5 text-center">
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${colorInfo.badge}`}>
                                {item.student.classLevel}
                              </span>
                            </td>
                            <td className="p-1.5 font-bold text-blue-900 text-xs truncate" title={item.roomName}>
                              {item.roomName}
                            </td>
                            <td className="p-1.5 text-center">
                              <span className="font-mono font-black text-[11.5px] bg-black text-white px-2 py-0.5 rounded inline-block shadow-2xs leading-none">
                                #{item.seatNumber}
                              </span>
                            </td>
                            <td className="p-1.5 text-slate-600 font-medium text-[11px] truncate" title={item.supervisorName}>
                              {item.supervisorName}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Bar */}
          <div className="bg-slate-50 px-3 py-1 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between shrink-0">
            <span>
              Listelenen: <strong>{totalFilteredStudents}</strong> öğrenci
            </span>
            <span className="text-[11px] text-slate-400">
              Kelebek Dağıtım Motoru
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
