import React, { useState } from 'react';
import {
  DoorClosed,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Check,
  Building,
  Layers,
  Sparkles,
  Sliders,
  LayoutGrid,
  List,
  Columns,
  Eye,
  X,
  ChevronDown,
  Rows,
} from 'lucide-react';
import { Classroom, Exam, Student } from '../../types';

interface Props {
  classrooms: Classroom[];
  setClassrooms: React.Dispatch<React.SetStateAction<Classroom[]>>;
  activeExam: Exam | undefined;
  students: Student[];
}

export const ClassroomManagementSection: React.FC<Props> = ({
  classrooms,
  setClassrooms,
  activeExam,
  students,
}) => {
  // View mode: Compact Cards vs Dense Table
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Classroom | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Classroom | null>(null);

  // Form State for Single Classroom
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [columnsCount, setColumnsCount] = useState<number>(4);
  const [rowsPerColumn, setRowsPerColumn] = useState<number>(4);
  const [seatsPerRow, setSeatsPerRow] = useState<number>(2);
  const [capacityMode, setCapacityMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [manualCapacity, setManualCapacity] = useState<number>(32);
  const [doorPosition, setDoorPosition] = useState<'right' | 'left'>('right');

  // Batch Config Modal (Toplu Sıra & Kapasite Belirleme)
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchColumns, setBatchColumns] = useState<number>(4);
  const [batchRows, setBatchRows] = useState<number>(4);
  const [batchSeatsPerRow, setBatchSeatsPerRow] = useState<number>(2);
  const [batchManualCapacity, setBatchManualCapacity] = useState<number>(32);
  const [batchMode, setBatchMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [batchSuccessMsg, setBatchSuccessMsg] = useState<string | null>(null);

  // Computed capacity for single room form
  const computedCapacity = columnsCount * rowsPerColumn * seatsPerRow;
  const effectiveCapacity = capacityMode === 'AUTO' ? computedCapacity : manualCapacity;

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingRoom(null);
    setName(`Salon ${classrooms.length + 1}`);
    setBuilding('');
    setFloor('');
    setColumnsCount(4);
    setRowsPerColumn(4);
    setSeatsPerRow(2);
    setCapacityMode('AUTO');
    setManualCapacity(32);
    setDoorPosition('right');
    setShowModal(true);
  };

  // Open modal for edit
  const handleOpenEdit = (room: Classroom) => {
    setEditingRoom(room);
    setName(room.name);
    setBuilding(room.building || '');
    setFloor(room.floor || '');
    const cols = room.columnsCount || 4;
    const rpc = room.rowsPerColumn || 4;
    const spr = room.seatsPerRow || 2;
    setColumnsCount(cols);
    setRowsPerColumn(rpc);
    setSeatsPerRow(spr);
    const autoCap = cols * rpc * spr;
    if (room.capacity !== autoCap) {
      setCapacityMode('MANUAL');
      setManualCapacity(room.capacity);
    } else {
      setCapacityMode('AUTO');
      setManualCapacity(room.capacity);
    }
    setDoorPosition(room.doorPosition);
    setShowModal(true);
  };

  // Save Room
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Lütfen salon adı giriniz.');
      return;
    }

    const finalCols = Math.max(1, Number(columnsCount) || 4);
    const finalRowsPerCol = Math.max(1, Number(rowsPerColumn) || 4);
    const finalSeatsPerRow = Math.max(1, Number(seatsPerRow) || 2);
    const finalTotalDesks = finalCols * finalRowsPerCol;
    const finalCap =
      capacityMode === 'AUTO'
        ? finalCols * finalRowsPerCol * finalSeatsPerRow
        : Math.max(1, Number(manualCapacity) || finalCols * finalRowsPerCol * finalSeatsPerRow);

    if (editingRoom) {
      setClassrooms(prev =>
        prev.map(r =>
          r.id === editingRoom.id
            ? {
                ...r,
                name: name.trim(),
                building: building.trim(),
                floor: floor.trim(),
                capacity: finalCap,
                columnsCount: finalCols,
                rowsPerColumn: finalRowsPerCol,
                rowsCount: finalTotalDesks,
                seatsPerRow: finalSeatsPerRow,
                doorPosition,
              }
            : r
        )
      );
    } else {
      const newRoom: Classroom = {
        id: `room-${Date.now()}`,
        name: name.trim(),
        building: building.trim(),
        floor: floor.trim(),
        capacity: finalCap,
        columnsCount: finalCols,
        rowsPerColumn: finalRowsPerCol,
        rowsCount: finalTotalDesks,
        seatsPerRow: finalSeatsPerRow,
        doorPosition,
        isSelectedForExam: true,
      };
      setClassrooms(prev => [...prev, newRoom]);
    }
    setShowModal(false);
  };

  // Quick Inline Column Adjust (+/- 1 column)
  const handleQuickAdjustColumns = (roomId: string, delta: number) => {
    setClassrooms(prev =>
      prev.map(r => {
        if (r.id !== roomId) return r;
        const curCols = r.columnsCount || 4;
        const curRows = r.rowsPerColumn || 4;
        const spr = r.seatsPerRow || 2;
        const newCols = Math.max(1, Math.min(10, curCols + delta));
        const newTotalDesks = newCols * curRows;
        const newCap = newTotalDesks * spr;
        return {
          ...r,
          columnsCount: newCols,
          rowsPerColumn: curRows,
          rowsCount: newTotalDesks,
          capacity: newCap,
        };
      })
    );
  };

  // Quick Inline Row Adjust (+/- 1 row per column)
  const handleQuickAdjustRows = (roomId: string, delta: number) => {
    setClassrooms(prev =>
      prev.map(r => {
        if (r.id !== roomId) return r;
        const curCols = r.columnsCount || 4;
        const curRows = r.rowsPerColumn || 4;
        const spr = r.seatsPerRow || 2;
        const newRows = Math.max(1, Math.min(15, curRows + delta));
        const newTotalDesks = curCols * newRows;
        const newCap = newTotalDesks * spr;
        return {
          ...r,
          columnsCount: curCols,
          rowsPerColumn: newRows,
          rowsCount: newTotalDesks,
          capacity: newCap,
        };
      })
    );
  };

  // Quick Inline Capacity Adjustment (+/- 2 students)
  const handleQuickAdjustCapacity = (roomId: string, delta: number) => {
    setClassrooms(prev =>
      prev.map(r => {
        if (r.id !== roomId) return r;
        const newCap = Math.max(2, r.capacity + delta);
        return {
          ...r,
          capacity: newCap,
        };
      })
    );
  };

  // Apply Batch Configuration to ALL rooms
  const handleApplyBatchConfig = () => {
    const finalCols = Math.max(1, batchColumns);
    const finalRows = Math.max(1, batchRows);
    const finalSpr = Math.max(1, batchSeatsPerRow);
    const totalDesks = finalCols * finalRows;
    const finalCap = batchMode === 'AUTO' ? totalDesks * finalSpr : batchManualCapacity;

    setClassrooms(prev =>
      prev.map(room => ({
        ...room,
        columnsCount: finalCols,
        rowsPerColumn: finalRows,
        seatsPerRow: finalSpr,
        rowsCount: totalDesks,
        capacity: finalCap,
      }))
    );

    setBatchSuccessMsg(
      `Tüm salonlara başarıyla uygulandı: ${finalCols} Sütun × ${finalRows} Satır = ${totalDesks} Sıra (${finalCap} Öğrenci Kapasitesi)`
    );
    setTimeout(() => {
      setBatchSuccessMsg(null);
      setShowBatchModal(false);
    }, 1800);
  };

  // Delete Room Modal triggers (Replaces window.confirm which is blocked in iframes)
  const handleDelete = (room: Classroom) => {
    setDeletingRoom(room);
  };

  const confirmDelete = () => {
    if (!deletingRoom) return;
    setClassrooms(prev => prev.filter(r => r.id !== deletingRoom.id));
    setDeletingRoom(null);
  };

  // Toggle selection for exam
  const handleToggleExamSelection = (id: string) => {
    setClassrooms(prev =>
      prev.map(r => (r.id === id ? { ...r, isSelectedForExam: !r.isSelectedForExam } : r))
    );
  };

  // Select all / Deselect all
  const handleSelectAll = (select: boolean) => {
    setClassrooms(prev => prev.map(r => ({ ...r, isSelectedForExam: select })));
  };

  // Calculations for exam readiness
  const assignedClassSet = new Set(
    activeExam?.assignedClasses.map(ac => ac.classLevel.toUpperCase()) || []
  );
  const eligibleStudents = students.filter(s => assignedClassSet.has(s.classLevel.toUpperCase()));
  const totalEligibleCount = eligibleStudents.length;

  const selectedRooms = classrooms.filter(r => r.isSelectedForExam);
  const totalSelectedCapacity = selectedRooms.reduce((sum, r) => sum + r.capacity, 0);

  // Minimum required rooms calculation
  const sortedByCap = [...classrooms].sort((a, b) => b.capacity - a.capacity);
  let accumulatedCap = 0;
  let minRoomsNeeded = 0;
  for (const r of sortedByCap) {
    accumulatedCap += r.capacity;
    minRoomsNeeded++;
    if (accumulatedCap >= totalEligibleCount) break;
  }
  if (totalEligibleCount === 0) minRoomsNeeded = 0;

  const isCapacitySufficient = totalSelectedCapacity >= totalEligibleCount;

  return (
    <div className="space-y-3.5">
      {/* Header - Compact Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full text-[11px]">
                3. BÖLÜM
              </span>
              <h2 className="text-lg font-bold text-slate-800">Sınav Salonu Yönetimi</h2>
              <span className="text-xs text-slate-400 font-medium">
                ({classrooms.length} Salon Tanımlı)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Her salonun <strong>Sütun</strong> ve <strong>Satır</strong> sıra dizilimini manuel belirleyin; kelebek dağıtımı bu 2D grid düzenine göre yapılır.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Batch Config Button */}
            <button
              onClick={() => setShowBatchModal(true)}
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-2xs"
              title="Okul genelinde sütun ve sıra sayısını tüm salonlara tek tıkla uygula"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Toplu Sıra & Kapasite Ayarı</span>
            </button>

            {/* Add Room Button */}
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni Salon Ekle</span>
            </button>
          </div>
        </div>

        {/* Compact Capacity KPI Ribbon */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {activeExam?.name ? `Sınav: ${activeExam.name}` : 'Aktif Sınav İhtiyacı'}:
            </span>
            <div className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="text-slate-500">Öğrenci: </span>
              <strong className="text-slate-900 font-mono">{totalEligibleCount}</strong>
            </div>
            <div className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="text-slate-500">Seçili Salon: </span>
              <strong className="text-slate-900 font-mono">
                {selectedRooms.length} / {classrooms.length}
              </strong>
            </div>
            <div
              className={`px-2.5 py-1 rounded-lg border font-mono font-bold ${
                isCapacitySufficient
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-red-50 text-red-800 border-red-300'
              }`}
            >
              <span>Seçili Kapasite: </span>
              <strong>{totalSelectedCapacity} Koltuk</strong>
            </div>
            <div className="text-[11px] text-slate-500 hidden sm:inline-block">
              En Az Gereken: <strong className="text-slate-800">{minRoomsNeeded} Salon</strong>
            </div>
          </div>

          <div>
            {isCapacitySufficient ? (
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kapasite Yeterli</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-red-300 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>{totalEligibleCount - totalSelectedCapacity} Koltuk Eksik!</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Control Strip & View Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-2 rounded-xl shadow-2xs border border-slate-200 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">Salon Seçimi:</span>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => handleSelectAll(true)}
              className="font-bold text-indigo-600 hover:text-indigo-800 px-2 py-0.5 rounded hover:bg-indigo-50 transition cursor-pointer"
            >
              Tümünü Seç ({classrooms.length})
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => handleSelectAll(false)}
              className="font-semibold text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded hover:bg-slate-100 transition cursor-pointer"
            >
              Seçimi Temizle
            </button>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('CARDS')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
              viewMode === 'CARDS'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            <span>Kompakt Kartlar</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('TABLE')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
              viewMode === 'TABLE'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3 h-3" />
            <span>Tablo Görünümü</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: COMPACT HIGH-DENSITY 2D GRID CARDS (No unwanted scrollbars!) */}
      {viewMode === 'CARDS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {classrooms.map(room => {
            const isSelected = room.isSelectedForExam;
            const cols = room.columnsCount || 4;
            const rows = room.rowsPerColumn || 4;
            const seatsPerDesk = room.seatsPerRow || 2;
            const totalDesks = room.rowsCount || cols * rows;

            return (
              <div
                key={room.id}
                className={`rounded-xl border transition-all duration-150 bg-white p-3 flex flex-col justify-between shadow-2xs hover:shadow-xs relative ${
                  isSelected
                    ? 'border-indigo-400 ring-1 ring-indigo-500/30 bg-indigo-50/15'
                    : 'border-slate-200 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  {/* Top Bar: Name, Floor, Actions */}
                  <div className="flex justify-between items-start gap-1.5 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-slate-900 truncate">
                          {room.name}
                        </span>
                      </div>
                      {[room.building, room.floor].filter(Boolean).length > 0 && (
                        <div className="text-[10px] text-slate-400 font-medium truncate">
                          {[room.building, room.floor].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(room)}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition rounded hover:bg-slate-100"
                        title="Sıra Düzeni ve Kapasiteyi Düzenle"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(room)}
                        className="p-1 text-slate-400 hover:text-red-500 transition rounded hover:bg-slate-100 cursor-pointer"
                        title="Salonu Sil"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* 2D Grid Setup Box: Sütun & Satır Ayarı */}
                  <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 space-y-1.5 mb-2">
                    {/* Columns & Rows Controls */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Column Stepper */}
                      <div className="bg-white rounded border border-slate-200 px-1.5 py-1">
                        <div className="text-[9.5px] font-semibold text-slate-500 flex items-center justify-between">
                          <span>Sütun:</span>
                          <span className="font-bold text-indigo-700 font-mono text-[11px]">{cols}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustColumns(room.id, -1)}
                            className="w-4 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center justify-center font-bold text-[10px]"
                            title="Sütun sayısını 1 azalt"
                          >
                            -
                          </button>
                          <span className="text-[9px] text-slate-400">kolon</span>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustColumns(room.id, 1)}
                            className="w-4 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center justify-center font-bold text-[10px]"
                            title="Sütun sayısını 1 artır"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Row Stepper */}
                      <div className="bg-white rounded border border-slate-200 px-1.5 py-1">
                        <div className="text-[9.5px] font-semibold text-slate-500 flex items-center justify-between">
                          <span>Satır:</span>
                          <span className="font-bold text-indigo-700 font-mono text-[11px]">{rows}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustRows(room.id, -1)}
                            className="w-4 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center justify-center font-bold text-[10px]"
                            title="Satır sayısını 1 azalt"
                          >
                            -
                          </button>
                          <span className="text-[9px] text-slate-400">derinlik</span>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustRows(room.id, 1)}
                            className="w-4 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center justify-center font-bold text-[10px]"
                            title="Satır sayısını 1 artır"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Summary: Total Desks and Capacity */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                      <span className="text-slate-500 font-medium">
                        {cols}×{rows} = <strong className="text-slate-800">{totalDesks} Sıra</strong>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickAdjustCapacity(room.id, -2)}
                          className="w-4 h-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded flex items-center justify-center font-bold text-[10px] leading-none transition"
                          title="Kapasiteyi 2 azalt"
                        >
                          -
                        </button>
                        <strong className="text-indigo-700 font-mono font-bold text-xs px-1">
                          {room.capacity} Kişi
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleQuickAdjustCapacity(room.id, 2)}
                          className="w-4 h-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded flex items-center justify-center font-bold text-[10px] leading-none transition"
                          title="Kapasiteyi 2 artır"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>{seatsPerDesk === 1 ? 'Tekli Oturma' : 'Çiftli Oturma (2 Kişi)'}</span>
                      <span className="italic">
                        Kapı: {room.doorPosition === 'right' ? 'Sağ' : 'Sol'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Selection Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleToggleExamSelection(room.id)}
                  className={`w-full py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-3 h-3 text-white" />
                      <span>Sınavda Kullanılıyor</span>
                    </>
                  ) : (
                    <span>+ Sınava Ekle</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: DENSE COMPACT TABLE VIEW */}
      {viewMode === 'TABLE' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                <th className="p-2.5 w-12 text-center">Durum</th>
                <th className="p-2.5">Salon Adı</th>
                <th className="p-2.5">Bina & Kat</th>
                <th className="p-2.5 text-center">Sütun Sayısı</th>
                <th className="p-2.5 text-center">Satır Sayısı</th>
                <th className="p-2.5 text-center">Toplam Sıra</th>
                <th className="p-2.5 text-center">Kapasite</th>
                <th className="p-2.5 text-center">Kapı / Masa</th>
                <th className="p-2.5 text-right w-24">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classrooms.map(room => {
                const isSelected = room.isSelectedForExam;
                const cols = room.columnsCount || 4;
                const rows = room.rowsPerColumn || 4;
                const totalDesks = room.rowsCount || cols * rows;

                return (
                  <tr
                    key={room.id}
                    className={`hover:bg-indigo-50/20 transition ${
                      isSelected ? 'bg-indigo-50/10 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    <td className="p-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleExamSelection(room.id)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900">{room.name}</div>
                    </td>
                    <td className="p-2.5 text-slate-600 text-[11px]">
                      {[room.building, room.floor].filter(Boolean).join(' / ') || (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center font-mono">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickAdjustColumns(room.id, -1)}
                          className="w-4 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                        >
                          -
                        </button>
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-800">
                          {cols} Sütun
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickAdjustColumns(room.id, 1)}
                          className="w-4 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-2.5 text-center font-mono">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickAdjustRows(room.id, -1)}
                          className="w-4 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                        >
                          -
                        </button>
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-800">
                          {rows} Satır
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickAdjustRows(room.id, 1)}
                          className="w-4 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-slate-700">
                      {totalDesks} Sıra
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="inline-flex items-center gap-1 font-mono">
                        <button
                          type="button"
                          onClick={() => handleQuickAdjustCapacity(room.id, -2)}
                          className="w-4 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                        >
                          -
                        </button>
                        <span className="font-black text-indigo-700 px-1 text-xs">
                          {room.capacity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickAdjustCapacity(room.id, 2)}
                          className="w-4 h-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-2.5 text-center text-[11px]">
                      {room.doorPosition === 'right' ? 'Kapı Sağ / Masa Sol' : 'Kapı Sol / Masa Sağ'}
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(room)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100"
                          title="Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(room)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TOPLU SIRA DÜZENİ VE KAPASİTE SİHİRBAZI MODALI */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Toplu 2D Sıra Düzeni ve Kapasite Belirleme
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Okulunuzun sütun ve satır sayısını tüm salonlara tek tıkla uygulayın
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 py-3">
              {/* Ready Preset Shortcuts */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Hazır Okul Sıra Şablonları:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBatchColumns(4);
                      setBatchRows(4);
                      setBatchSeatsPerRow(2);
                      setBatchMode('AUTO');
                    }}
                    className={`p-2 rounded-xl text-left border text-xs transition cursor-pointer ${
                      batchColumns === 4 && batchRows === 4 && batchSeatsPerRow === 2
                        ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>4 Sütun × 4 Satır</span>
                      <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-black">
                        Standart
                      </span>
                    </div>
                    <div className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                      16 Sıra • 32 Öğrenci
                    </div>
                    <div className="text-[10px] text-slate-400">Çiftli oturma düzeni</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBatchColumns(3);
                      setBatchRows(5);
                      setBatchSeatsPerRow(2);
                      setBatchMode('AUTO');
                    }}
                    className={`p-2 rounded-xl text-left border text-xs transition cursor-pointer ${
                      batchColumns === 3 && batchRows === 5 && batchSeatsPerRow === 2
                        ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-800">3 Sütun × 5 Satır</div>
                    <div className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                      15 Sıra • 30 Öğrenci
                    </div>
                    <div className="text-[10px] text-slate-400">Klasik 3'lü blok düzeni</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBatchColumns(3);
                      setBatchRows(6);
                      setBatchSeatsPerRow(2);
                      setBatchMode('AUTO');
                    }}
                    className={`p-2 rounded-xl text-left border text-xs transition cursor-pointer ${
                      batchColumns === 3 && batchRows === 6 && batchSeatsPerRow === 2
                        ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-800">3 Sütun × 6 Satır</div>
                    <div className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                      18 Sıra • 36 Öğrenci
                    </div>
                    <div className="text-[10px] text-slate-400">Geniş salonlar için</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBatchColumns(2);
                      setBatchRows(8);
                      setBatchSeatsPerRow(2);
                      setBatchMode('AUTO');
                    }}
                    className={`p-2 rounded-xl text-left border text-xs transition cursor-pointer ${
                      batchColumns === 2 && batchRows === 8 && batchSeatsPerRow === 2
                        ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-800">2 Sütun × 8 Satır</div>
                    <div className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                      16 Sıra • 32 Öğrenci
                    </div>
                    <div className="text-[10px] text-slate-400">Çift sıra koridor düzeni</div>
                  </button>
                </div>
              </div>

              {/* Sütun & Satır Manuel İnce Ayarı */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Sütun Sayısı:
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={batchColumns}
                        onChange={e => setBatchColumns(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                        className="w-16 text-center font-mono font-bold text-xs rounded-lg border border-slate-300 py-1"
                      />
                      <div className="flex gap-0.5">
                        {[2, 3, 4, 5].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setBatchColumns(c)}
                            className={`px-1.5 py-1 rounded text-[11px] font-bold transition ${
                              batchColumns === c
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Satır Sayısı (Sütun Başına):
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={batchRows}
                        onChange={e => setBatchRows(Math.max(1, Math.min(15, Number(e.target.value) || 1)))}
                        className="w-16 text-center font-mono font-bold text-xs rounded-lg border border-slate-300 py-1"
                      />
                      <div className="flex gap-0.5">
                        {[3, 4, 5, 6].map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setBatchRows(r)}
                            className={`px-1.5 py-1 rounded text-[11px] font-bold transition ${
                              batchRows === r
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-600">Sıra Başı Öğrenci:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setBatchSeatsPerRow(2)}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition ${
                        batchSeatsPerRow === 2
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-300'
                      }`}
                    >
                      2 Kişi (Çiftli)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchSeatsPerRow(1)}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition ${
                        batchSeatsPerRow === 1
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-300'
                      }`}
                    >
                      1 Kişi (Tekli)
                    </button>
                  </div>
                </div>

                {/* Formül Özeti */}
                <div className="bg-indigo-50/80 rounded-xl p-2.5 border border-indigo-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Hesaplanan Salon Kapasitesi:</span>
                    <div className="font-mono text-slate-800 text-[11px] mt-0.5">
                      {batchColumns} Sütun × {batchRows} Satır ={' '}
                      <strong>{batchColumns * batchRows} Sıra</strong> × {batchSeatsPerRow} Öğrenci
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-indigo-700 font-mono">
                      {batchColumns * batchRows * batchSeatsPerRow}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-bold block">Kişi / Salon</span>
                  </div>
                </div>
              </div>

              {batchSuccessMsg && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{batchSuccessMsg}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleApplyBatchConfig}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Tüm ({classrooms.length}) Salona Uygula</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE ROOM ADD / EDIT MODAL - EXPLICIT MANUAL ROW & COLUMN FIELDS */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {editingRoom ? 'Salon Bilgilerini ve Sıra Düzenini Düzenle' : 'Yeni Sınav Salonu / Derslik Ekle'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Salonun sütun, satır sayısı ve kapı yönünü manuel olarak belirleyin.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 py-3">
              {/* Salon Adı, Bina, Kat */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Salon Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Örn: Salon 1 (Derslik 9-A)"
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Blok / Bina</label>
                    <span className="text-[10px] text-slate-400">İsteğe bağlı</span>
                  </div>
                  <input
                    type="text"
                    value={building}
                    onChange={e => setBuilding(e.target.value)}
                    placeholder="İsteğe bağlı (Örn: A Blok)"
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Kat</label>
                    <span className="text-[10px] text-slate-400">İsteğe bağlı</span>
                  </div>
                  <input
                    type="text"
                    value={floor}
                    onChange={e => setFloor(e.target.value)}
                    placeholder="İsteğe bağlı (Örn: 1. Kat)"
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 2D GRİD SIRA DÜZENİ MANUEL ALANLARI */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Columns className="w-3.5 h-3.5 text-indigo-600" />
                    <span>2D Sıra Düzeni (Sütun ve Satır Sayısı)</span>
                  </span>
                  <span className="text-[10px] text-indigo-700 bg-indigo-100 font-bold px-2 py-0.5 rounded-full font-mono">
                    {columnsCount * rowsPerColumn} Sıra
                  </span>
                </div>

                {/* SÜTUN SAYISI & SATIR SAYISI MANUEL GİRİŞLERİ */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Sütun Sayısı Manuel Alanı */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Columns className="w-3 h-3 text-indigo-500" />
                        <span>Sütun Sayısı:</span>
                      </label>
                      <span className="text-[10px] text-slate-400">(Yan Yana)</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.max(1, columnsCount - 1);
                          setColumnsCount(val);
                          if (capacityMode === 'AUTO') setManualCapacity(val * rowsPerColumn * seatsPerRow);
                        }}
                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={columnsCount}
                        onChange={e => {
                          const val = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                          setColumnsCount(val);
                          if (capacityMode === 'AUTO') setManualCapacity(val * rowsPerColumn * seatsPerRow);
                        }}
                        className="w-full text-center font-mono font-bold text-sm rounded-lg border border-slate-300 py-1 focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.min(10, columnsCount + 1);
                          setColumnsCount(val);
                          if (capacityMode === 'AUTO') setManualCapacity(val * rowsPerColumn * seatsPerRow);
                        }}
                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex gap-1 mt-1.5 justify-center">
                      {[2, 3, 4, 5].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setColumnsCount(c);
                            if (capacityMode === 'AUTO') setManualCapacity(c * rowsPerColumn * seatsPerRow);
                          }}
                          className={`flex-1 py-0.5 rounded text-[10px] font-bold transition ${
                            columnsCount === c
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Satır Sayısı Manuel Alanı */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Rows className="w-3 h-3 text-indigo-500" />
                        <span>Satır Sayısı:</span>
                      </label>
                      <span className="text-[10px] text-slate-400">(Derinlik)</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.max(1, rowsPerColumn - 1);
                          setRowsPerColumn(val);
                          if (capacityMode === 'AUTO') setManualCapacity(columnsCount * val * seatsPerRow);
                        }}
                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={rowsPerColumn}
                        onChange={e => {
                          const val = Math.max(1, Math.min(15, Number(e.target.value) || 1));
                          setRowsPerColumn(val);
                          if (capacityMode === 'AUTO') setManualCapacity(columnsCount * val * seatsPerRow);
                        }}
                        className="w-full text-center font-mono font-bold text-sm rounded-lg border border-slate-300 py-1 focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.min(15, rowsPerColumn + 1);
                          setRowsPerColumn(val);
                          if (capacityMode === 'AUTO') setManualCapacity(columnsCount * val * seatsPerRow);
                        }}
                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex gap-1 mt-1.5 justify-center">
                      {[3, 4, 5, 6].map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setRowsPerColumn(r);
                            if (capacityMode === 'AUTO') setManualCapacity(columnsCount * r * seatsPerRow);
                          }}
                          className={`flex-1 py-0.5 rounded text-[10px] font-bold transition ${
                            rowsPerColumn === r
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sıra Başına Oturan Öğrenci */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-600">Her Sırada Kaç Öğrenci Oturur?</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSeatsPerRow(2);
                        if (capacityMode === 'AUTO') setManualCapacity(columnsCount * rowsPerColumn * 2);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        seatsPerRow === 2
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-300'
                      }`}
                    >
                      2 Öğrenci (Çiftli Sıra)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSeatsPerRow(1);
                        if (capacityMode === 'AUTO') setManualCapacity(columnsCount * rowsPerColumn * 1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        seatsPerRow === 1
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-300'
                      }`}
                    >
                      1 Öğrenci (Tekli Sıra)
                    </button>
                  </div>
                </div>

                {/* Kapasite Seçimi: Otomatik Formül vs Manuel Giriş */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">Salon Kapasitesi:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCapacityMode('AUTO')}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                          capacityMode === 'AUTO'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Formülle Hesapla
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCapacityMode('MANUAL');
                          setManualCapacity(effectiveCapacity);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                          capacityMode === 'MANUAL'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Manuel Elle Gir
                      </button>
                    </div>
                  </div>

                  {capacityMode === 'AUTO' ? (
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-xs font-mono">
                      <span className="text-slate-600">
                        {columnsCount} Sütun × {rowsPerColumn} Satır × {seatsPerRow} Öğr =
                      </span>
                      <strong className="text-base text-indigo-700 font-bold">
                        {computedCapacity} Öğrenci
                      </strong>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={manualCapacity}
                        onChange={e => setManualCapacity(Number(e.target.value))}
                        className="w-24 text-xs font-bold font-mono rounded-lg border border-slate-300 px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                      <span className="text-xs text-slate-500 font-medium">
                        Öğrenci (Özel kapasite elle tanımlandı)
                      </span>
                    </div>
                  )}
                </div>

                {/* CANLI 2D GRID SIRA DÜZENİ ÖNİZLEMESİ (Öğretmen Masası Bakışı: Tahta & Kürsü Altta, Sıra 1 Öğretmenin Hemen Önünde) */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-100/80 shadow-2xs space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-wider flex items-center justify-between px-1">
                    <span className="text-[8.5px] text-slate-400 font-semibold">
                      {doorPosition === 'right' ? '← DUVAR KENARI' : '← KAPI GİRİŞİ'}
                    </span>
                    <span className="font-extrabold text-slate-600">[ SINIFIN ARKA TARAFI (ARKA DUVAR) ]</span>
                    <span className="text-[8.5px] text-slate-400 font-semibold">
                      {doorPosition === 'right' ? 'KAPI GİRİŞİ →' : 'DUVAR KENARI →'}
                    </span>
                  </div>

                  {/* 2D Sütunlar Izgarası: Sıralar arkadan öne sıralanır; 1. Sıra ve 1 Numara DAİMA duvar tarafında ve öğretmen masasının hemen önündedir */}
                  <div
                    className="grid gap-2 py-1"
                    style={{ gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))` }}
                  >
                    {(() => {
                      const isDoorRight = doorPosition === 'right';
                      // Kapı sağdaysa duvar soldadır (0..n). Kapı soldaysa duvar sağdadır (n..0).
                      const visualColIndices = isDoorRight
                        ? Array.from({ length: columnsCount }, (_, i) => i)
                        : Array.from({ length: columnsCount }, (_, i) => columnsCount - 1 - i);

                      return visualColIndices.map(cIdx => {
                        const isWallCol = cIdx === 0;
                        const isDoorCol = cIdx === columnsCount - 1;
                        const colHeader = isWallCol
                          ? `1. Sütun (${isDoorRight ? 'Sol Duvar' : 'Sağ Duvar'} / Masa Önü)`
                          : isDoorCol
                          ? `${columnsCount}. Sütun (Kapı Kenarı)`
                          : `${cIdx + 1}. Sütun`;

                        return (
                          <div
                            key={cIdx}
                            className={`border rounded-lg p-1.5 text-center shadow-2xs flex flex-col justify-between ${
                              isWallCol
                                ? 'bg-indigo-50/40 border-indigo-300 ring-1 ring-indigo-200'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div
                              className={`text-[9px] font-black uppercase py-0.5 rounded-t mb-1.5 border-b ${
                                isWallCol
                                  ? 'bg-indigo-100 text-indigo-950 border-indigo-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-100'
                              }`}
                            >
                              {colHeader}
                            </div>
                            <div className="space-y-1.5 flex-1 flex flex-col justify-end">
                              {Array.from({ length: rowsPerColumn })
                                .map((_, idx) => rowsPerColumn - 1 - idx) // Arkadan öne (En ön sıra en altta kürsünün dibinde)
                                .map(rIdx => {
                                  const deskNumber = cIdx * rowsPerColumn + rIdx + 1;
                                  const seat1Num = (cIdx * rowsPerColumn + rIdx) * seatsPerRow + 1;
                                  const seat2Num = seat1Num + 1;
                                  const isFrontRow = rIdx === 0;

                                  // Duvar tarafı koltuk belirleme:
                                  // Kapı sağdaysa: Sol taraf duvardır -> Sol koltuk 1 No (Duvar), Sağ koltuk 2 No (İç)
                                  // Kapı soldaysa: Sağ taraf duvardır -> Sağ koltuk 1 No (Duvar), Sol koltuk 2 No (İç)
                                  const leftSeatNum = isDoorRight ? seat1Num : seat2Num;
                                  const rightSeatNum = isDoorRight ? seat2Num : seat1Num;
                                  const leftIsWall = isDoorRight;
                                  const rightIsWall = !isDoorRight;

                                  return (
                                    <div
                                      key={rIdx}
                                      className={`rounded-lg border p-1 shadow-2xs transition bg-white ${
                                        isFrontRow && isWallCol
                                          ? 'border-amber-500 ring-2 ring-amber-400/50 bg-amber-50/40'
                                          : isFrontRow
                                          ? 'border-indigo-400 ring-1 ring-indigo-300 bg-indigo-50/20'
                                          : 'border-slate-200 hover:border-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between text-[7.5px] font-bold text-slate-500 mb-0.5 px-0.5">
                                        <span>{rIdx + 1}. Sıra</span>
                                        {isFrontRow ? (
                                          <span
                                            className={`text-[7px] px-1 py-0.2 rounded font-black border ${
                                              isWallCol
                                                ? 'text-amber-900 bg-amber-200 border-amber-400'
                                                : 'text-indigo-800 bg-indigo-100 border-indigo-300'
                                            }`}
                                          >
                                            {isWallCol ? '★ 1 No Başlangıç (Ön Sıra)' : 'Ön Sıra'}
                                          </span>
                                        ) : (
                                          <span className="text-[7px] text-slate-400 font-mono">
                                            Sıra {deskNumber}
                                          </span>
                                        )}
                                      </div>

                                      {seatsPerRow === 2 ? (
                                        <div className="grid grid-cols-2 gap-1">
                                          {/* Sol Koltuk */}
                                          <div
                                            className={`border rounded py-1 px-0.5 text-center transition ${
                                              isFrontRow && leftIsWall && isWallCol
                                                ? 'bg-amber-100 border-amber-400 text-amber-950 font-black'
                                                : 'bg-indigo-50/80 border-indigo-200/90 text-indigo-900'
                                            }`}
                                          >
                                            <span className="block text-[8.5px] font-mono leading-none font-extrabold">
                                              {leftSeatNum}
                                            </span>
                                            <span
                                              className={`block text-[6.5px] font-bold mt-0.5 ${
                                                leftIsWall ? 'text-amber-800' : 'text-slate-600'
                                              }`}
                                            >
                                              {leftIsWall ? 'Duvar (1 No)' : 'İç Taraf'}
                                            </span>
                                          </div>

                                          {/* Sağ Koltuk */}
                                          <div
                                            className={`border rounded py-1 px-0.5 text-center transition ${
                                              isFrontRow && rightIsWall && isWallCol
                                                ? 'bg-amber-100 border-amber-400 text-amber-950 font-black'
                                                : 'bg-indigo-50/80 border-indigo-200/90 text-indigo-900'
                                            }`}
                                          >
                                            <span className="block text-[8.5px] font-mono leading-none font-extrabold">
                                              {rightSeatNum}
                                            </span>
                                            <span
                                              className={`block text-[6.5px] font-bold mt-0.5 ${
                                                rightIsWall ? 'text-amber-800' : 'text-slate-600'
                                              }`}
                                            >
                                              {rightIsWall ? 'Duvar (1 No)' : 'İç Taraf'}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          className={`border rounded py-1 px-1 text-center ${
                                            isFrontRow && isWallCol
                                              ? 'bg-amber-100 border-amber-400 text-amber-950'
                                              : 'bg-indigo-50/80 border-indigo-200/90 text-indigo-900'
                                          }`}
                                        >
                                          <span className="block text-[8.5px] font-black font-mono leading-none">
                                            {seat1Num} Numara
                                          </span>
                                          <span className="block text-[6.5px] font-bold mt-0.5">
                                            Tekli Sıra ({isWallCol ? 'Duvar Tarafı' : 'Sıra'})
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* ÖĞRETMENİN MASASI, YAZI TAHTASI VE KAPI (ALTTA - ÖĞRETMENİN HEMEN ÖNÜNDE) */}
                  <div className="mt-2 bg-slate-800 text-white rounded-lg px-3 py-2 flex items-center justify-between text-[10px] font-bold shadow-xs">
                    <div
                      className={`flex items-center gap-1.5 ${
                        doorPosition === 'right' ? 'order-1 text-emerald-300' : 'order-1 text-amber-300'
                      }`}
                    >
                      {doorPosition === 'right' ? (
                        <div className="flex items-center gap-1">
                          <span className="text-base">👨‍🏫</span>
                          <div>
                            <div className="text-emerald-300 font-extrabold">ÖĞRETMEN MASASI (Sol Duvar)</div>
                            <div className="text-[7.5px] text-slate-300 font-medium">
                              1 No'lu sıra masanın önünde duvar kenarında başlar
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-base">🚪</span>
                          <span className="text-amber-300 font-bold">KAPI GİRİŞİ (Sol)</span>
                        </div>
                      )}
                    </div>

                    <div className="order-2 text-center flex flex-col items-center">
                      <span className="text-[9.5px] font-black tracking-widest text-slate-200 uppercase">
                        ─── YAZI TAHTASI (ÖN CEPHE) ───
                      </span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        doorPosition === 'right' ? 'order-3 text-amber-300' : 'order-3 text-emerald-300'
                      }`}
                    >
                      {doorPosition === 'right' ? (
                        <div className="flex items-center gap-1">
                          <span className="text-amber-300 font-bold">KAPI GİRİŞİ (Sağ)</span>
                          <span className="text-base">🚪</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <div className="text-right">
                            <div className="text-emerald-300 font-extrabold">ÖĞRETMEN MASASI (Sağ Duvar)</div>
                            <div className="text-[7.5px] text-slate-300 font-medium">
                              1 No'lu sıra masanın önünde duvar kenarında başlar
                            </div>
                          </div>
                          <span className="text-base">👨‍🏫</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Kapı ve Öğretmen Masası Konumu */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sınıf Kapısı ve Öğretmen Masası Konumu:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDoorPosition('right')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      doorPosition === 'right'
                        ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-800">Kapı Sağda / Masa Solda</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      1 No'lu Koltuk sol ön duvarda başlar
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDoorPosition('left')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      doorPosition === 'left'
                        ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-800">Kapı Solda / Masa Sağda</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      1 No'lu Koltuk sağ ön duvarda başlar
                    </div>
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingRoom ? 'Değişiklikleri Kaydet' : 'Salonu Ekle'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION MODAL (Replaces browser window.confirm to work seamlessly in iframes) */}
      {deletingRoom && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Salonu Sil</h3>
                <p className="text-xs text-slate-500 font-medium">Bu işlem salonu listeden kaldırır</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              <strong className="text-slate-900 font-bold">{deletingRoom.name}</strong> adlı sınav salonunu silmek istediğinize emin misiniz?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingRoom(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Evet, Salonu Sil</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
