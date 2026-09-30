import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  PieChart as PieChartIcon,
  DoorClosed,
  Users,
  GraduationCap,
  Layers,
  Printer,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  TrendingUp,
  LayoutGrid,
  Filter,
  Search,
  UserCheck,
  Briefcase,
  Clock,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { SeatingPlanResult, Teacher, Exam } from '../../types';
import { getClassColor } from '../../utils/classColors';

interface Props {
  plan: SeatingPlanResult | undefined;
  teachers?: Teacher[];
  activeExam?: Exam;
  onGoToPlan: () => void;
  onOpenPrintModal: (mode: 'SALON' | 'SUPERVISOR' | 'BEP' | 'CLASSES') => void;
}

// Color palette for charts
const LEVEL_COLORS: Record<string, string> = {
  '9. Sınıf': '#3b82f6',
  '10. Sınıf': '#10b981',
  '11. Sınıf': '#f59e0b',
  '12. Sınıf': '#8b5cf6',
  'Diğer': '#06b6d4',
};

const BRANCH_PALETTE = [
  '#3b82f6',
  '#2563eb',
  '#10b981',
  '#059669',
  '#f59e0b',
  '#d97706',
  '#8b5cf6',
  '#7c3aed',
  '#ec4899',
  '#06b6d4',
  '#14b8a6',
];

export const ExamAnalysisSection: React.FC<Props> = ({
  plan,
  teachers,
  activeExam,
  onGoToPlan,
  onOpenPrintModal,
}) => {
  const [analysisTab, setAnalysisTab] = useState<'MAP' | 'CHARTS' | 'TABLE' | 'SUPERVISORS'>('MAP');
  const [chartSubView, setChartSubView] = useState<'ALL' | 'GRADES' | 'ROOMS'>('ALL');
  const [classViewMode, setClassViewMode] = useState<'GRADE' | 'BRANCH'>('GRADE');
  const [occupancyFilter, setOccupancyFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  // Gözetmen Dağılım Tablosu Filtre ve Sıralama Durumları
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [supervisorBranchFilter, setSupervisorBranchFilter] = useState('ALL');
  const [supervisorReasonFilter, setSupervisorReasonFilter] = useState('ALL');
  const [supervisorSortBy, setSupervisorSortBy] = useState<'LOAD_DESC' | 'LOAD_ASC' | 'NAME_ASC' | 'ROOM_ASC'>('LOAD_DESC');

  // Compute metrics and chart datasets
  const analysisData = useMemo(() => {
    if (!plan) return null;

    const totalRooms = plan.rooms.length;
    const totalCapacity = plan.rooms.reduce((sum, r) => sum + r.capacity, 0);
    const totalSeated = plan.rooms.reduce((sum, r) => sum + r.totalAssigned, 0);
    const occupancyRate = totalCapacity > 0 ? (totalSeated / totalCapacity) * 100 : 0;
    const unassignedCount = plan.unassignedStudents.length;

    // Room occupancy map items & thresholds
    const roomMapItems = plan.rooms.map(room => {
      const occPct = room.capacity > 0 ? (room.totalAssigned / room.capacity) * 100 : 0;
      const occRound = Math.round(occPct);
      let category: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
      if (occRound >= 80) category = 'HIGH';
      else if (occRound < 50) category = 'LOW';
      else category = 'MEDIUM';

      return {
        id: room.classroomId,
        name: room.classroomName,
        capacity: room.capacity,
        totalAssigned: room.totalAssigned,
        emptySeats: Math.max(0, room.capacity - room.totalAssigned),
        occupancyRate: occRound,
        category,
        supervisor: room.supervisorName,
        supervisorBranch: room.supervisorBranch,
        supervisorReason: room.supervisorReason,
        doorPosition: room.doorPosition,
        classDistribution: room.classDistribution,
        seats: room.seats,
      };
    });

    const highCount = roomMapItems.filter(r => r.category === 'HIGH').length;
    const mediumCount = roomMapItems.filter(r => r.category === 'MEDIUM').length;
    const lowCount = roomMapItems.filter(r => r.category === 'LOW').length;

    // Class and Grade aggregations
    const branchCountMap: Record<string, number> = {};
    const gradeCountMap: Record<string, number> = {
      '9. Sınıf': 0,
      '10. Sınıf': 0,
      '11. Sınıf': 0,
      '12. Sınıf': 0,
      'Diğer': 0,
    };

    let bepStudentCount = 0;

    plan.rooms.forEach(room => {
      room.seats.forEach(seat => {
        if (seat.student) {
          const cls = seat.student.classLevel.trim();
          branchCountMap[cls] = (branchCountMap[cls] || 0) + 1;

          if (seat.student.isBEP) {
            bepStudentCount++;
          }

          if (cls.startsWith('9')) {
            gradeCountMap['9. Sınıf']++;
          } else if (cls.startsWith('10')) {
            gradeCountMap['10. Sınıf']++;
          } else if (cls.startsWith('11')) {
            gradeCountMap['11. Sınıf']++;
          } else if (cls.startsWith('12')) {
            gradeCountMap['12. Sınıf']++;
          } else {
            gradeCountMap['Diğer']++;
          }
        }
      });
    });

    // 1. Grade-level chart data
    const gradeChartData = Object.entries(gradeCountMap)
      .filter(([_, count]) => count > 0)
      .map(([grade, count]) => ({
        name: grade,
        ogrenciSayisi: count,
        yuzde: totalSeated > 0 ? Number(((count / totalSeated) * 100).toFixed(1)) : 0,
        fill: LEVEL_COLORS[grade] || '#6366f1',
      }));

    // 2. Branch-level chart data (sorted by class code)
    const branchChartData = Object.entries(branchCountMap)
      .sort(([a], [b]) => a.localeCompare(b, 'tr'))
      .map(([branch, count], idx) => ({
        name: branch,
        ogrenciSayisi: count,
        yuzde: totalSeated > 0 ? Number(((count / totalSeated) * 100).toFixed(1)) : 0,
        fill: BRANCH_PALETTE[idx % BRANCH_PALETTE.length],
      }));

    // 3. Room capacity vs assigned chart data
    const roomOccupancyData = plan.rooms.map(room => {
      const occPct = room.capacity > 0 ? Math.round((room.totalAssigned / room.capacity) * 100) : 0;
      return {
        name: room.classroomName.replace(/^Salon\s*/i, 'S.'),
        fullName: room.classroomName,
        yerlesen: room.totalAssigned,
        bosKapasite: Math.max(0, room.capacity - room.totalAssigned),
        kapasite: room.capacity,
        dolulukYuzdesi: occPct,
        supervisor: room.supervisorName,
      };
    });

    // 4. Room stacked class distribution (Butterfly mix per salon)
    const allGradeKeys = ['9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf', 'Diğer'];
    const roomMixData = plan.rooms.map(room => {
      const roomGradeCounts: Record<string, number> = {
        '9. Sınıf': 0,
        '10. Sınıf': 0,
        '11. Sınıf': 0,
        '12. Sınıf': 0,
        'Diğer': 0,
      };

      room.seats.forEach(s => {
        if (s.student) {
          const c = s.student.classLevel;
          if (c.startsWith('9')) roomGradeCounts['9. Sınıf']++;
          else if (c.startsWith('10')) roomGradeCounts['10. Sınıf']++;
          else if (c.startsWith('11')) roomGradeCounts['11. Sınıf']++;
          else if (c.startsWith('12')) roomGradeCounts['12. Sınıf']++;
          else roomGradeCounts['Diğer']++;
        }
      });

      return {
        name: room.classroomName.replace(/^Salon\s*/i, 'S.'),
        fullName: room.classroomName,
        ...roomGradeCounts,
        toplam: room.totalAssigned,
      };
    });

    return {
      totalRooms,
      totalCapacity,
      totalSeated,
      occupancyRate,
      unassignedCount,
      bepStudentCount,
      branchCount: Object.keys(branchCountMap).length,
      gradeChartData,
      branchChartData,
      roomOccupancyData,
      roomMixData,
      allGradeKeys: allGradeKeys.filter(k => gradeCountMap[k] > 0),
      roomMapItems,
      highCount,
      mediumCount,
      lowCount,
    };
  }, [plan]);

  // Gözetmen Dağılım ve Yük Analizi
  const supervisorAnalysis = useMemo(() => {
    if (!plan) return null;

    const map = new Map<
      string,
      {
        name: string;
        branch: string;
        dutyDay: string;
        assignedRooms: {
          id: string;
          name: string;
          capacity: number;
          studentCount: number;
          reason: string;
          occupancyRate: number;
        }[];
        totalStudents: number;
        totalCapacity: number;
        primaryReason: string;
      }
    >();

    plan.rooms.forEach(room => {
      const sName = room.supervisorName?.trim() || 'Atanmadı';
      const teacherObj = (teachers || []).find(
        t => t.name.trim().toLowerCase() === sName.toLowerCase()
      );
      const branch = room.supervisorBranch || teacherObj?.branch || 'Genel';
      const dutyDay = teacherObj?.dutyDay || activeExam?.dayOfWeek || 'Belirtilmedi';
      const occ = room.capacity > 0 ? Math.round((room.totalAssigned / room.capacity) * 100) : 0;

      if (!map.has(sName)) {
        map.set(sName, {
          name: sName,
          branch,
          dutyDay,
          assignedRooms: [],
          totalStudents: 0,
          totalCapacity: 0,
          primaryReason: room.supervisorReason || 'Derslik Öğretmeni',
        });
      }

      const item = map.get(sName)!;
      item.assignedRooms.push({
        id: room.classroomId,
        name: room.classroomName,
        capacity: room.capacity,
        studentCount: room.totalAssigned,
        reason: room.supervisorReason || 'Derslik Öğretmeni',
        occupancyRate: occ,
      });
      item.totalStudents += room.totalAssigned;
      item.totalCapacity += room.capacity;
    });

    const list = Array.from(map.values());

    // Branch breakdown for supervisors
    const branchStats: Record<string, { count: number; totalStudents: number }> = {};
    list.forEach(s => {
      if (!branchStats[s.branch]) {
        branchStats[s.branch] = { count: 0, totalStudents: 0 };
      }
      branchStats[s.branch].count += 1;
      branchStats[s.branch].totalStudents += s.totalStudents;
    });

    // Unique branches for dropdown
    const uniqueBranches = Array.from(new Set(list.map(s => s.branch))).sort((a, b) =>
      a.localeCompare(b, 'tr')
    );

    // Unique reasons for dropdown
    const uniqueReasons = Array.from(
      new Set(list.map(s => s.primaryReason).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'tr'));

    // Idle teachers on duty who were not assigned
    const assignedLower = new Set(list.map(s => s.name.toLowerCase()));
    const commissionLower = new Set((plan.commissionMembers || []).map(m => m.toLowerCase()));
    const idleTeachers = (teachers || []).filter(
      t =>
        !assignedLower.has(t.name.trim().toLowerCase()) &&
        !commissionLower.has(t.name.trim().toLowerCase())
    );

    const totalSupervisors = list.length;
    const totalSupervisedStudents = list.reduce((sum, s) => sum + s.totalStudents, 0);
    const avgLoad =
      totalSupervisors > 0 ? Math.round(totalSupervisedStudents / totalSupervisors) : 0;

    return {
      supervisors: list,
      uniqueBranches,
      uniqueReasons,
      branchStats,
      idleTeachers,
      totalSupervisors,
      totalSupervisedStudents,
      avgLoad,
      commissionCount: (plan.commissionMembers || []).length,
    };
  }, [plan, teachers, activeExam]);

  // Filtrelenmiş ve Sıralanmış Gözetmen Listesi
  const filteredAndSortedSupervisors = useMemo(() => {
    if (!supervisorAnalysis) return [];
    const { supervisors } = supervisorAnalysis;

    const filtered = supervisors.filter(sup => {
      const q = supervisorSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        sup.name.toLowerCase().includes(q) ||
        sup.branch.toLowerCase().includes(q) ||
        sup.assignedRooms.some(r => r.name.toLowerCase().includes(q));

      const matchesBranch =
        supervisorBranchFilter === 'ALL' || sup.branch === supervisorBranchFilter;

      const matchesReason =
        supervisorReasonFilter === 'ALL' ||
        sup.assignedRooms.some(r => r.reason === supervisorReasonFilter);

      return matchesSearch && matchesBranch && matchesReason;
    });

    return filtered.sort((a, b) => {
      if (supervisorSortBy === 'LOAD_DESC') {
        return b.totalStudents - a.totalStudents;
      }
      if (supervisorSortBy === 'LOAD_ASC') {
        return a.totalStudents - b.totalStudents;
      }
      if (supervisorSortBy === 'NAME_ASC') {
        return a.name.localeCompare(b.name, 'tr');
      }
      if (supervisorSortBy === 'ROOM_ASC') {
        const roomA = a.assignedRooms[0]?.name || '';
        const roomB = b.assignedRooms[0]?.name || '';
        return roomA.localeCompare(roomB, 'tr', { numeric: true });
      }
      return 0;
    });
  }, [
    supervisorAnalysis,
    supervisorSearch,
    supervisorBranchFilter,
    supervisorReasonFilter,
    supervisorSortBy,
  ]);

  if (!plan || !analysisData) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
        <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Sınav Analizi Henüz Hazır Değil</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
          Kullanılan toplam salon sayısı, sınava giren toplam öğrenci sayısı ve sınıf düzeylerine göre
          öğrenci dağılım grafiklerini görüntülemek için lütfen önce Kelebek Dağıtımını çalıştırınız.
        </p>
        <div className="mt-6 flex justify-center">
          <button
            onClick={onGoToPlan}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <span>5. Oturma Düzenine Git ve Dağıtımı Başlat</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const {
    totalRooms,
    totalCapacity,
    totalSeated,
    occupancyRate,
    unassignedCount,
    bepStudentCount,
    branchCount,
    gradeChartData,
    branchChartData,
    roomOccupancyData,
    roomMixData,
    allGradeKeys,
    roomMapItems,
    highCount,
    mediumCount,
    lowCount,
  } = analysisData;

  const displayedRoomItems = useMemo(() => {
    if (occupancyFilter === 'ALL') return roomMapItems;
    return roomMapItems.filter(r => r.category === occupancyFilter);
  }, [roomMapItems, occupancyFilter]);

  const activeDistributionData =
    classViewMode === 'GRADE' ? gradeChartData : branchChartData;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[calc(100vh-140px)] space-y-2 overflow-hidden">
      {/* 1. COMPACT TOP HEADER & SUB-TABS */}
      <div className="shrink-0 bg-white rounded-xl px-3 py-1.5 border border-slate-200 shadow-2xs space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="bg-indigo-100 text-indigo-700 font-black px-2 py-0.5 rounded text-[11px] shrink-0">
              7. BÖLÜM
            </span>
            <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight shrink-0">
              Sınav ve Oturma Düzeni Analizi
            </h2>
            <span className="text-slate-300 hidden md:inline">|</span>
            <span className="text-[11px] text-slate-500 font-semibold truncate hidden md:inline">
              {plan.examName} · {plan.subjectName}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-[11px] text-slate-700">
              {totalRooms} Salon ({totalCapacity} Kap.)
            </span>
            <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-[11px] text-slate-700">
              {totalSeated} Öğrenci ({branchCount} Şube)
            </span>
            <span
              className={`px-2 py-0.5 rounded font-black text-[11px] ${
                occupancyRate >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}
            >
              %{occupancyRate.toFixed(1)} Doluluk
            </span>
            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold text-[11px]">
              {supervisorAnalysis ? supervisorAnalysis.totalSupervisors : totalRooms} Gözetmen
            </span>

            <button
              onClick={() => onOpenPrintModal('SALON')}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-xs transition cursor-pointer"
            >
              <Printer className="w-3 h-3 text-slate-500" />
              <span className="hidden sm:inline">Rapor Çıktısı</span>
            </button>
            <button
              onClick={onGoToPlan}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-0.5 rounded text-xs shadow-2xs transition cursor-pointer"
            >
              <span>Kroki</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setAnalysisTab('MAP')}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                analysisTab === 'MAP'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>1. Salon Doluluk Haritası</span>
              <span
                className={`text-[10px] px-1 rounded font-black ${
                  analysisTab === 'MAP' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {totalRooms}
              </span>
            </button>

            <button
              onClick={() => setAnalysisTab('CHARTS')}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                analysisTab === 'CHARTS'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>2. Dağılım Grafikleri</span>
            </button>

            <button
              onClick={() => setAnalysisTab('TABLE')}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                analysisTab === 'TABLE'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>3. Salon Dağıtım Tablosu</span>
            </button>

            <button
              onClick={() => setAnalysisTab('SUPERVISORS')}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                analysisTab === 'SUPERVISORS'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>4. Gözetmen Tablosu</span>
              {supervisorAnalysis && (
                <span
                  className={`text-[10px] px-1 rounded font-black ${
                    analysisTab === 'SUPERVISORS'
                      ? 'bg-indigo-700 text-white'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {supervisorAnalysis.totalSupervisors}
                </span>
              )}
            </button>
          </div>

          {unassignedCount > 0 && (
            <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded text-[11px] flex items-center gap-1 border border-rose-200">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>{unassignedCount} öğrenci yerleşemedi!</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. MAIN VIEWPORT-BOUNDED CONTENT CONTAINER (NO WINDOW SCROLLBAR) */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between overflow-hidden">
        {/* Tab 1: Salon Doluluk Haritası (Kapasite Isı Haritası) */}
        {analysisTab === 'MAP' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header & Filter Controls */}
            <div className="shrink-0 px-3.5 py-2 border-b border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <LayoutGrid className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Salon Doluluk ve Kapasite Isı Haritası
                </span>
              </div>

              {/* Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setOccupancyFilter('ALL')}
                  className={`px-2.5 py-0.5 rounded font-bold transition cursor-pointer text-[11px] ${
                    occupancyFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tümü ({totalRooms})
                </button>
                <button
                  onClick={() => setOccupancyFilter('HIGH')}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded font-bold transition cursor-pointer text-[11px] ${
                    occupancyFilter === 'HIGH'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>≥ %80 ({highCount})</span>
                </button>
                <button
                  onClick={() => setOccupancyFilter('MEDIUM')}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded font-bold transition cursor-pointer text-[11px] ${
                    occupancyFilter === 'MEDIUM'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>%50 - %79 ({mediumCount})</span>
                </button>
                <button
                  onClick={() => setOccupancyFilter('LOW')}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded font-bold transition cursor-pointer text-[11px] ${
                    occupancyFilter === 'LOW'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>&lt; %50 ({lowCount})</span>
                </button>
              </div>
            </div>

            {/* Color Legend Inline Bar */}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3.5 py-1.5 bg-slate-50/70 border-b border-slate-200 text-[11px]">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span className="font-bold text-slate-700">%80+ Yüksek</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                  <span className="font-bold text-slate-700">%50-%79 Dengeli</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  <span className="font-bold text-slate-700">&lt;%50 Düşük</span>
                </div>
              </div>
              <span className="text-slate-400 italic text-[10px]">
                Her kartın altındaki renkli etiketler o salona yerleşen şube dağılımını gösterir.
              </span>
            </div>

            {/* Room Heatmap Cards Grid (Internally Scrollable in 4-column compact grid) */}
            <div className="overflow-y-auto flex-1 p-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {displayedRoomItems.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-400 italic">
              Seçilen doluluk filtresine uygun salon bulunamadı.
            </div>
          ) : (
            displayedRoomItems.map(room => {
              const isHigh = room.category === 'HIGH';
              const isLow = room.category === 'LOW';

              const borderClass = isHigh
                ? 'border-emerald-300 ring-1 ring-emerald-200 bg-gradient-to-b from-emerald-50/30 via-white to-white'
                : isLow
                ? 'border-rose-300 ring-1 ring-rose-200 bg-gradient-to-b from-rose-50/30 via-white to-white'
                : 'border-blue-200 bg-gradient-to-b from-blue-50/20 via-white to-white';

              const barColor = isHigh
                ? 'bg-emerald-500'
                : isLow
                ? 'bg-rose-500'
                : 'bg-blue-500';

              const badgeClass = isHigh
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : isLow
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-blue-100 text-blue-800 border-blue-300';

              const badgeLabel = isHigh
                ? '%80+ Yüksek'
                : isLow
                ? '<%50 Düşük'
                : '%50-%79 Dengeli';

              return (
                <div
                  key={room.id}
                  className={`rounded-xl p-3 shadow-2xs border transition hover:shadow-xs ${borderClass} flex flex-col justify-between space-y-2`}
                >
                  {/* Top Bar of Room Card */}
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                          <DoorClosed className="w-3.5 h-3.5 text-slate-600" />
                          <span>{room.name}</span>
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {room.doorPosition === 'right' ? 'Kapı Sağda' : 'Kapı Solda'}
                        </p>
                      </div>

                      <span className={`border text-[9.5px] font-black px-1.5 py-0.2 rounded shrink-0 ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                    </div>

                    {/* Occupancy Rate & Progress Meter */}
                    <div className="my-1.5">
                      <div className="flex items-baseline justify-between mb-1">
                        <div className="flex items-baseline gap-1">
                          <span
                            className={`text-lg font-black ${
                              isHigh
                                ? 'text-emerald-700'
                                : isLow
                                ? 'text-rose-700'
                                : 'text-blue-700'
                            }`}
                          >
                            %{room.occupancyRate}
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold">
                            Doluluk
                          </span>
                        </div>
                        <div className="text-right text-[11px] text-slate-600">
                          <strong className="text-slate-900">{room.totalAssigned}</strong> / {room.capacity}
                          <span className="text-slate-400 ml-1">({room.emptySeats} Boş)</span>
                        </div>
                      </div>

                      {/* Progress Bar with 50% & 80% Threshold Markers */}
                      <div className="relative w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${Math.min(100, room.occupancyRate)}%` }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-400/70"
                          style={{ left: '50%' }}
                          title="%50 Eşik Çizgisi"
                        />
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-500"
                          style={{ left: '80%' }}
                          title="%80 Eşik Çizgisi"
                        />
                      </div>
                    </div>

                    {/* Mini Visual Seat Matrix (Compact Kroki Preview) */}
                    <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-200/80 my-1.5">
                      <div className="flex flex-wrap gap-1 justify-start">
                        {room.seats.slice(0, 24).map((seat, sIdx) => {
                          if (seat.student) {
                            const col = getClassColor(seat.student.classLevel);
                            return (
                              <div
                                key={sIdx}
                                className={`w-4.5 h-4.5 rounded text-[8px] font-black flex items-center justify-center cursor-default ${col.badge}`}
                                title={`#${seat.seatNumber}: ${seat.student.name} ${seat.student.surname} (${seat.student.classLevel})`}
                              >
                                {seat.seatNumber}
                              </div>
                            );
                          } else {
                            return (
                              <div
                                key={sIdx}
                                className="w-4.5 h-4.5 rounded border border-dashed border-slate-300 bg-white flex items-center justify-center text-[7.5px] font-mono text-slate-400 cursor-default"
                                title={`#${seat.seatNumber}: Boş`}
                              >
                                {seat.seatNumber}
                              </div>
                            );
                          }
                        })}
                        {room.seats.length > 24 && (
                          <div className="text-[9px] text-slate-400 flex items-center px-1 font-mono font-bold">
                            +{room.seats.length - 24}
                          </div>
                        )}
                      </div>

                      {/* Class Distribution chips */}
                      <div className="mt-1.5 pt-1 border-t border-slate-200/60 flex flex-wrap items-center gap-1 text-[9.5px]">
                        {Object.entries(room.classDistribution || {}).map(([cls, cnt]) => {
                          const c = getClassColor(cls);
                          return (
                            <span
                              key={cls}
                              className={`px-1 py-0.2 rounded font-bold ${c.bg} ${c.text} border ${c.border}`}
                            >
                              {cls}: {cnt}
                            </span>
                          );
                        })}
                        {room.emptySeats > 0 && (
                          <span className="px-1 py-0.2 rounded font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            {room.emptySeats} Boş
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Supervisor */}
                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-500">Gözetmen:</span>
                    <strong className="text-slate-900 truncate max-w-[130px]" title={room.supervisor}>
                      {room.supervisor}
                    </strong>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Insight & Recommendation Callout */}
        <div className="shrink-0 px-3.5 py-1.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[11px]">
              <strong>Analiz:</strong> Toplam <strong>{totalRooms}</strong> salonun{' '}
              <strong className="text-emerald-700">{highCount} tanesi %80+</strong>,{' '}
              <strong className="text-blue-700">{mediumCount} tanesi %50-%79</strong>,{' '}
              <strong className={lowCount > 0 ? 'text-rose-700' : 'text-slate-700'}>
                {lowCount} tanesi &lt;%50
              </strong>{' '}
              doludur.
            </span>
          </div>
          {lowCount > 0 && (
            <span className="text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">
              İpucu: Düşük salonlar birleştirilebilir.
            </span>
          )}
        </div>
      </div>
      )}

      {/* Tab 2: Dağılım ve Karışım Grafikleri */}
      {analysisTab === 'CHARTS' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub-view switcher for charts */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3.5 py-1.5 border-b border-slate-200 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Grafik Görünümü:</span>
            </div>

            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setChartSubView('ALL')}
                className={`px-2.5 py-0.5 rounded font-bold transition cursor-pointer text-[11px] ${
                  chartSubView === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tüm Grafikler
              </button>
              <button
                onClick={() => setChartSubView('GRADES')}
                className={`px-2.5 py-0.5 rounded font-bold transition cursor-pointer text-[11px] ${
                  chartSubView === 'GRADES'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sınıf & Kademe
              </button>
              <button
                onClick={() => setChartSubView('ROOMS')}
                className={`px-2.5 py-0.5 rounded font-bold transition cursor-pointer text-[11px] ${
                  chartSubView === 'ROOMS'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Salon Kapasite & Karışım
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-3 space-y-3">
          {(chartSubView === 'ALL' || chartSubView === 'GRADES') && (
            /* Main Charts Row 1: Sınıf Düzeylerine Göre Dağılım */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Bar Chart: Sınıf Düzeylerine Göre Öğrenci Dağılımı (2 cols) */}
              <div className="lg:col-span-2 bg-white rounded-xl p-3.5 shadow-2xs border border-slate-200 flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-600" />
                      <span>Sınıf Düzeylerine Göre Öğrenci Dağılımı</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Sınava katılan öğrencilerin kademe ve şube bazındaki mevcudu
                    </p>
                  </div>

                  {/* Segmented button toggle */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                    <button
                      onClick={() => setClassViewMode('GRADE')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-xs ${
                        classViewMode === 'GRADE'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Kademe (9-12)
                    </button>
                    <button
                      onClick={() => setClassViewMode('BRANCH')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-xs ${
                        classViewMode === 'BRANCH'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Şube Bazında
                    </button>
                  </div>
                </div>

                {/* Recharts BarChart */}
                <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activeDistributionData}
                margin={{ top: 10, right: 15, left: -10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700">
                          <p className="font-bold">{item.name}</p>
                          <p className="text-slate-300 mt-1">
                            Öğrenci Sayısı: <span className="font-bold text-white">{item.ogrenciSayisi}</span>
                          </p>
                          <p className="text-slate-400">
                            Genel Pay: <span className="font-semibold text-indigo-300">%{item.yuzde}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="ogrenciSayisi"
                  name="Öğrenci Sayısı"
                  radius={[8, 8, 0, 0]}
                  barSize={classViewMode === 'GRADE' ? 44 : 26}
                >
                  {activeDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Unboxed inline metadata summary */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <span>
              Toplam <strong>{totalSeated}</strong> öğrenci {activeDistributionData.length} farklı grupta
            </span>
            <span>
              Ortalama grup mevcudu:{' '}
              <strong>
                {Math.round(totalSeated / (activeDistributionData.length || 1))} öğrenci
              </strong>
            </span>
          </div>
        </div>

        {/* Donut / Pie Chart: Kademelerin Sınavdaki Yüzdelik Payı (1 col) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-600" />
              <span>Kademe Oransal Dağılımı</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sınıf düzeylerinin sınav mevcudundaki yüzdeleri
            </p>
          </div>

          <div className="w-full h-56 relative my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gradeChartData}
                  dataKey="ogrenciSayisi"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {gradeChartData.map((entry, index) => (
                    <Cell key={`donut-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700">
                          <p className="font-bold">{item.name}</p>
                          <p className="text-slate-300">
                            {item.ogrenciSayisi} Öğrenci ({item.yuzde}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label inside donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-slate-800">{totalSeated}</span>
              <span className="text-[10px] font-medium text-slate-400 uppercase">Öğrenci</span>
            </div>
          </div>

          {/* Custom legend list */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {gradeChartData.map(item => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="font-medium text-slate-700">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {item.ogrenciSayisi} <span className="text-slate-400 font-normal">({item.yuzde}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
          )}

          {(chartSubView === 'ALL' || chartSubView === 'ROOMS') && (
            /* Main Charts Row 2: Salon Bazlı Kapasite ve Kelebek Karışım Dağılımı */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Salon Bazında Öğrenci ve Kapasite Kullanımı */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <DoorClosed className="w-4 h-4 text-emerald-600" />
              <span>Salon Bazında Öğrenci ve Kapasite Kullanımı</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Her salonda sınava giren öğrenci sayısı ile salonun toplam kapasitesi karşılaştırması
            </p>
          </div>

          <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={roomOccupancyData}
                margin={{ top: 10, right: 15, left: -10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700">
                          <p className="font-bold">{item.fullName}</p>
                          <p className="text-slate-300 mt-1">
                            Yerleşen Öğrenci: <strong className="text-emerald-400">{item.yerlesen}</strong>
                          </p>
                          <p className="text-slate-300">
                            Toplam Kapasite: <strong>{item.kapasite}</strong>
                          </p>
                          <p className="text-slate-400">
                            Doluluk: <strong className="text-amber-300">%{item.dolulukYuzdesi}</strong>
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Gözetmen: {item.supervisor}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
                />
                <Bar
                  dataKey="yerlesen"
                  name="Yerleşen Öğrenci"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  barSize={18}
                />
                <Bar
                  dataKey="kapasite"
                  name="Maksimum Kapasite"
                  fill="#cbd5e1"
                  radius={[6, 6, 0, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Kelebek Çapraz Karışım Dağılımı (Stacked BarChart) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Salon Başına Kelebek Karışım Dağılımı</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Her salonda farklı sınıf kademelerinden öğrencilerin dengeli karma dağılımı
            </p>
          </div>

          <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={roomMixData}
                margin={{ top: 10, right: 15, left: -10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700 space-y-1">
                          <p className="font-bold border-b border-slate-800 pb-1">{item.fullName}</p>
                          {allGradeKeys.map(k => (
                            <p key={k} className="flex justify-between gap-4 text-slate-300">
                              <span>{k}:</span>
                              <strong className="text-white">{item[k] || 0}</strong>
                            </p>
                          ))}
                          <p className="border-t border-slate-800 pt-1 text-slate-400 flex justify-between">
                            <span>Toplam:</span>
                            <strong className="text-indigo-300">{item.toplam}</strong>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
                />
                {allGradeKeys.map(grade => (
                  <Bar
                    key={grade}
                    dataKey={grade}
                    name={grade}
                    stackId="a"
                    fill={LEVEL_COLORS[grade] || '#6366f1'}
                    barSize={24}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    )}
  </div>
</div>
)}

      {/* Tab 3: Salon Dağıtım Özeti ve Gözetmen Tablosu */}
      {analysisTab === 'TABLE' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0 px-3.5 py-2 border-b border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Salon Dağıtım ve Gözetmen Listesi Tablosu</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Her sınav salonundaki kontenjan, doluluk yüzdesi, sınıf dağılımı ve görevli gözetmen
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAnalysisTab('SUPERVISORS')}
                className="flex items-center gap-1 bg-white hover:bg-slate-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg text-xs transition cursor-pointer border border-indigo-200 shadow-2xs"
              >
                <Users className="w-3 h-3" />
                <span>Gözetmen Tablosu ➔</span>
              </button>
              <span className="text-[11px] font-semibold text-slate-500">
                {plan.rooms.length} Salon Listelendi
              </span>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-300 text-[11px] uppercase tracking-wider text-slate-700 font-extrabold shadow-2xs">
                <tr>
                  <th className="p-2">Salon Adı</th>
                  <th className="p-2 text-center w-20">Kapasite</th>
                  <th className="p-2 text-center w-20">Yerleşen</th>
                  <th className="p-2 text-center w-20">Doluluk</th>
                  <th className="p-2">Sınıf Dağılımı (Kelebek)</th>
                  <th className="p-2">Görevli Gözetmen</th>
                  <th className="p-2">Gözetmen Durumu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plan.rooms.map(room => {
                  const occ = room.capacity > 0 ? Math.round((room.totalAssigned / room.capacity) * 100) : 0;
                  const distributionText = Object.entries(room.classDistribution || {})
                    .map(([cls, count]) => `${cls}: ${count}`)
                    .join(' · ');

                  return (
                    <tr key={room.classroomId} className="hover:bg-slate-50 transition">
                      <td className="p-2 font-bold text-slate-900">{room.classroomName}</td>
                      <td className="p-2 text-center font-mono text-slate-600">{room.capacity}</td>
                      <td className="p-2 text-center font-mono font-bold text-emerald-700">
                        {room.totalAssigned}
                      </td>
                      <td className="p-2 text-center">
                        <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">
                          %{occ}
                        </span>
                      </td>
                      <td className="p-2 text-slate-600 font-medium text-[11px]">
                        {distributionText || '-'}
                      </td>
                      <td className="p-2 font-semibold text-slate-900">
                        {room.supervisorName}
                        {room.supervisorBranch && (
                          <span className="text-slate-400 font-normal ml-1 text-[11px]">
                            ({room.supervisorBranch})
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-slate-500 text-[11px]">
                        {room.supervisorReason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sınav Komisyonu ve Güvence Bilgisi */}
          {plan.commissionMembers && plan.commissionMembers.length > 0 && (
            <div className="shrink-0 bg-slate-50 px-3.5 py-1.5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-700">Sınav Komisyonu (Ders Öğretmenleri): </span>
                  <span className="text-slate-600">
                    {plan.commissionMembers.join(', ')}
                  </span>
                </div>
              </div>
              <span className="text-slate-500 italic text-[10px]">
                Sınav ilkeleri gereği ders öğretmenleri bu sınavda gözetmen olamaz.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Gözetmen Dağılım ve Yük Analizi Tablosu */}
      {analysisTab === 'SUPERVISORS' && supervisorAnalysis && (
        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Header, Quick Actions & Filters Bar */}
          <div className="shrink-0 px-3.5 py-2 border-b border-slate-200 bg-slate-50 flex flex-col gap-2">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Gözetmen Dağılım ve Görev Yükü Tablosu ({supervisorAnalysis.totalSupervisors} Görevli)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenPrintModal('SUPERVISOR')}
                  className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1 rounded-lg text-xs shadow-2xs transition cursor-pointer"
                >
                  <Printer className="w-3 h-3 text-slate-300" />
                  <span>Gözetmen Listesi (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAnalysisTab('TABLE')}
                  className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-lg text-xs transition cursor-pointer border border-slate-200"
                >
                  <DoorClosed className="w-3 h-3 text-slate-500" />
                  <span>Salon Tablosu</span>
                </button>
              </div>
            </div>

            {/* Compact Search & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-xs">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search */}
                <div className="relative w-44 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={supervisorSearch}
                    onChange={e => setSupervisorSearch(e.target.value)}
                    placeholder="Öğretmen adı veya branş..."
                    className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-8 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {supervisorSearch && (
                    <button
                      type="button"
                      onClick={() => setSupervisorSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Branch Filter */}
                <select
                  value={supervisorBranchFilter}
                  onChange={e => setSupervisorBranchFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">Tüm Branşlar ({supervisorAnalysis.supervisors.length})</option>
                  {supervisorAnalysis.uniqueBranches.map(br => (
                    <option key={br} value={br}>
                      {br} ({supervisorAnalysis.branchStats[br]?.count || 0})
                    </option>
                  ))}
                </select>

                {/* Reason Filter */}
                <select
                  value={supervisorReasonFilter}
                  onChange={e => setSupervisorReasonFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 hidden sm:block"
                >
                  <option value="ALL">Tüm Atama Türleri</option>
                  {supervisorAnalysis.uniqueReasons.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <span>Sırala:</span>
                <select
                  value={supervisorSortBy}
                  onChange={e => setSupervisorSortBy(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="LOAD_DESC">Öğrenci Yükü (Çoktan Aza)</option>
                  <option value="LOAD_ASC">Öğrenci Yükü (Azdan Çoka)</option>
                  <option value="NAME_ASC">Öğretmen Adı (A-Z)</option>
                  <option value="ROOM_ASC">Salon Adı</option>
                </select>
              </div>
            </div>
          </div>

          {/* Gözetmen Dağılım Tablosu (Internally Scrollable) */}
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Gözetmen Öğretmen</th>
                    <th className="p-3">Branş</th>
                    <th className="p-3">Görevli Salon(lar)</th>
                    <th className="p-3 text-center">Öğrenci Yükü</th>
                    <th className="p-3 text-center">Salon Kapasitesi & Doluluk</th>
                    <th className="p-3">Atama / Görev Türü</th>
                    <th className="p-3 text-center w-28">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedSupervisors.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">Filtre kriterlerine uygun gözetmen bulunamadı.</p>
                        <p className="text-[11px] mt-1 text-slate-400">Lütfen arama kelimesini veya branş filtresini temizleyin.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedSupervisors.map((sup, idx) => {
                      const totalCap = sup.totalCapacity || 1;
                      const occRatio = Math.min(100, Math.round((sup.totalStudents / totalCap) * 100));

                      return (
                        <tr key={sup.name} className="hover:bg-indigo-50/30 transition">
                          {/* Row Index */}
                          <td className="p-3 text-center font-mono text-slate-400 font-bold text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Teacher Name */}
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-[11px] shrink-0">
                                {sup.name.substring(0, 1)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{sup.name}</span>
                                </div>
                                <div className="text-[10.5px] text-slate-400 font-medium">
                                  {sup.dutyDay !== 'Yok' && sup.dutyDay !== 'Belirtilmedi'
                                    ? `${sup.dutyDay} Nöbetçisi`
                                    : 'Görevli Öğretmen'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Branch */}
                          <td className="p-3">
                            <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[11px] border border-slate-200">
                              {sup.branch}
                            </span>
                          </td>

                          {/* Assigned Rooms */}
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1.5">
                              {sup.assignedRooms.map(r => (
                                <span
                                  key={r.id}
                                  className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 font-bold px-2 py-0.5 rounded-lg border border-indigo-200 text-[11px]"
                                >
                                  <DoorClosed className="w-3 h-3 text-indigo-500" />
                                  <span>{r.name}</span>
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Student Load */}
                          <td className="p-3 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="font-mono font-black text-sm text-emerald-700">
                                {sup.totalStudents}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400">öğrenci</span>
                            </div>
                          </td>

                          {/* Capacity & Occupancy Bar */}
                          <td className="p-3 text-center">
                            <div className="max-w-[130px] mx-auto space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className="font-bold text-slate-700">%{occRatio}</span>
                                <span className="text-slate-400 text-[10.5px]">
                                  {sup.totalStudents}/{sup.totalCapacity}
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    occRatio >= 80
                                      ? 'bg-emerald-500'
                                      : occRatio >= 50
                                      ? 'bg-indigo-500'
                                      : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${occRatio}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Reason */}
                          <td className="p-3">
                            <span className="text-slate-600 font-medium text-[11.5px]">
                              {sup.assignedRooms[0]?.reason || 'Derslik Öğretmeni'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10.5px] border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Görevli</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 font-medium">
              <div>
                Gösterilen: <strong className="text-slate-900">{filteredAndSortedSupervisors.length}</strong> / Toplam:{' '}
                <strong className="text-slate-900">{supervisorAnalysis.totalSupervisors}</strong> Gözetmen
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span>
                  Sorumlu Olunan Toplam Öğrenci:{' '}
                  <strong className="text-slate-800 font-mono">
                    {filteredAndSortedSupervisors.reduce((sum, s) => sum + s.totalStudents, 0)}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Ortalama Yük:{' '}
                  <strong className="text-slate-800 font-mono">
                    {filteredAndSortedSupervisors.length > 0
                      ? Math.round(
                          filteredAndSortedSupervisors.reduce((sum, s) => sum + s.totalStudents, 0) /
                            filteredAndSortedSupervisors.length
                        )
                      : 0}{' '}
                    öğr/salon
                  </strong>
                </span>
              </div>
            </div>

            {/* Branş Bazlı Gözetmen Sayıları (Kompakt Dağılım Çipleri) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Branş Bazında Gözetmen Dağılımı ve Toplam Yük:
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(supervisorAnalysis.branchStats).map(([branch, stats]) => (
                  <div
                    key={branch}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1 text-xs flex items-center gap-2 transition"
                  >
                    <span className="font-bold text-slate-800">{branch}:</span>
                    <span className="bg-indigo-100 text-indigo-700 font-extrabold px-1.5 py-0.2 rounded text-[10.5px]">
                      {stats.count} Gözetmen
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({stats.totalStudents} öğrenci)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Yedek / Boşta Nöbetçi Öğretmenler Bilgisi (Eğer varsa) */}
            {supervisorAnalysis.idleTeachers.length > 0 && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">Yedek / Boşta Nöbetçi Öğretmenler ({supervisorAnalysis.idleTeachers.length} Kişi): </span>
                    <span className="text-amber-800">
                      {supervisorAnalysis.idleTeachers.map(t => `${t.name} (${t.branch})`).join(', ')}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-amber-700 font-medium italic shrink-0">
                  Acil durumlarda salon yedekliği için kullanılabilir.
                </span>
              </div>
            )}

            {/* Sınav Komisyonu ve Dağıtım Notu */}
            {plan.commissionMembers && plan.commissionMembers.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <strong className="text-slate-800">Sınav Komisyonu (Ders Öğretmenleri): </strong>
                    <span>{plan.commissionMembers.join(', ')}</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 italic">
                  * Sınav güvenliği esasları gereğince sınav dersinin branş öğretmenleri gözetmen olarak görevlendirilmemiştir.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
