import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  Download,
  Trash2,
  Plus,
  FileSpreadsheet,
  CheckCircle,
  Search,
  Filter,
  Check,
  Edit2,
  X,
  Sparkles,
  GraduationCap,
  ChevronsUp,
  RotateCcw,
  AlertCircle,
  ArrowRight,
  History,
} from 'lucide-react';
import { Student, Exam } from '../../types';
import {
  downloadStudentTemplate,
  parseStudentFile,
  exportStudentsToCSV,
} from '../../services/excelService';
import { GoogleSheetsImportModal } from '../modals/GoogleSheetsImportModal';

interface Props {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  availableClasses: string[];
  activeExam?: Exam;
}

// Helper to sort students naturally by class and then by number numerically
const sortStudentsByClassAndNumber = (studentList: Student[]): Student[] => {
  return [...studentList].sort((a, b) => {
    // 1. Sınıf adına göre doğal sıralama (Örn: AMP 9-A, AMP 10-A, AMP 10-B)
    const classDiff = a.classLevel.localeCompare(b.classLevel, 'tr', {
      numeric: true,
      sensitivity: 'base',
    });
    if (classDiff !== 0) return classDiff;

    // 2. Numaraya göre sayısal sıralama (Örn: 10, 16, 54, 160, 2052)
    const numA = parseInt(a.number.replace(/\D/g, ''), 10);
    const numB = parseInt(b.number.replace(/\D/g, ''), 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      if (numA !== numB) return numA - numB;
    }
    return a.number.localeCompare(b.number, 'tr', { numeric: true, sensitivity: 'base' });
  });
};

export const StudentListSection: React.FC<Props> = ({
  students,
  setStudents,
  availableClasses,
  activeExam,
}) => {
  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Manual Add Form State
  const [manualFullName, setManualFullName] = useState('');
  const [manualClass, setManualClass] = useState(availableClasses[0] || 'AMP 10-A');
  const [manualNumber, setManualNumber] = useState('');
  const [manualIsBep, setManualIsBep] = useState(false);

  // Selected student id in table (for gray highlight like in screenshot)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Search & Filter (Compact search for ease of finding students)
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [bepOnlyFilter, setBepOnlyFilter] = useState(false);

  // Sınıf Atlatma (Class Promotion) State
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [promoteTargetLevel, setPromoteTargetLevel] = useState<'ALL' | '9' | '10' | '11' | '12'>('ALL');
  const [twelfthGradeAction, setTwelfthGradeAction] = useState<'DELETE' | 'MARK_GRADUATED'>('DELETE');
  const [lastPromotionBackup, setLastPromotionBackup] = useState<Student[] | null>(null);

  // Editing state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Exam Subject lookup per class
  const classSubjectMap = useMemo(() => {
    const map = new Map<string, string>();
    if (activeExam && activeExam.assignedClasses) {
      activeExam.assignedClasses.forEach(ac => {
        map.set(ac.classLevel.toUpperCase().trim(), ac.subjectName);
      });
    }
    return map;
  }, [activeExam]);

  // Unique classes in students list
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.classLevel) set.add(s.classLevel.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [students]);

  // Exam header summary
  const examSubjectsSummary = useMemo(() => {
    if (!activeExam) return '';
    const subs = Array.from(
      new Set(activeExam.assignedClasses?.map(ac => ac.subjectName.toUpperCase()) || [])
    );
    const dateFormatted = activeExam.date
      ? activeExam.date.includes('-')
        ? activeExam.date.split('-').reverse().join('.')
        : activeExam.date
      : '';
    return `${subs.join('-') || activeExam.name} - ${dateFormatted}`;
  }, [activeExam]);

  // 1. File Upload (Excel or CSV)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const parsed = await parseStudentFile(file);
      if (parsed.length === 0) {
        showToast('Dosyada geçerli öğrenci verisi bulunamadı.');
        return;
      }

      setStudents(prev => {
        const existingKeys = new Set(prev.map(p => `${p.classLevel.trim()}-${p.number.trim()}`));
        const newToAdd = parsed.filter(
          p => !existingKeys.has(`${p.classLevel.trim()}-${p.number.trim()}`)
        );
        return sortStudentsByClassAndNumber([...prev, ...newToAdd]);
      });

      showToast(`${parsed.length} öğrenci başarıyla yüklendi!`);
    } catch (err: unknown) {
      console.error(err);
      showToast('Dosya yüklenirken hata oluştu. Şablona uygun CSV/Excel seçiniz.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 2. Export CSV
  const handleExportCSV = () => {
    if (students.length === 0) {
      showToast('Dışa aktarılacak öğrenci bulunmuyor.');
      return;
    }
    exportStudentsToCSV(students);
    showToast(`${students.length} öğrenci CSV olarak indirildi.`);
  };

  // 3. Delete All Students
  const handleDeleteAll = () => {
    if (students.length === 0) return;
    const count = students.length;
    setStudents([]);
    setSelectedStudentId(null);
    showToast(`Tüm öğrenci listesi (${count} öğrenci) silindi.`);
  };

  // 4. Delete Single Student
  const handleDeleteStudent = (id: string) => {
    const student = students.find(s => s.id === id);
    const name = student ? `${student.name} ${student.surname}` : 'Öğrenci';
    setStudents(prev => prev.filter(s => s.id !== id));
    if (selectedStudentId === id) setSelectedStudentId(null);
    showToast(`${name} silindi.`);
  };

  // 5. Manual Add Student (Sınıfına ve numarasına göre sıraya koyar)
  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFullName.trim()) {
      showToast('Lütfen Ad Soyad giriniz.');
      return;
    }
    if (!manualClass.trim()) {
      showToast('Lütfen Sınıf giriniz.');
      return;
    }
    if (!manualNumber.trim()) {
      showToast('Lütfen Numara giriniz.');
      return;
    }

    // Split name and surname
    const parts = manualFullName.trim().split(/\s+/);
    let name = '';
    let surname = '';
    if (parts.length === 1) {
      name = parts[0];
      surname = '';
    } else {
      surname = parts.pop() || '';
      name = parts.join(' ');
    }

    const newStudent: Student = {
      id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.toUpperCase(),
      surname: surname.toUpperCase(),
      classLevel: manualClass.trim().toUpperCase(),
      number: manualNumber.trim(),
      isBEP: manualIsBep,
    };

    // Öğrenci listesine ekleyip sınıfına ve numarasına göre sırala
    setStudents(prev => sortStudentsByClassAndNumber([...prev, newStudent]));
    setSelectedStudentId(newStudent.id);
    showToast(`${newStudent.name} ${newStudent.surname} (${newStudent.classLevel} - No: ${newStudent.number}) sıraya eklendi.`);

    // Reset inputs
    setManualFullName('');
    setManualNumber('');
    setManualIsBep(false);
  };

  // 6. Toggle BEP Status
  const handleToggleBEP = (id: string) => {
    setStudents(prev =>
      prev.map(s => (s.id === id ? { ...s, isBEP: !s.isBEP } : s))
    );
    showToast('Öğrenci BEP durumu güncellendi.');
  };

  // Kademelere göre öğrenci sayıları (9, 10, 11, 12)
  const gradeCounts = useMemo(() => {
    let g9 = 0;
    let g10 = 0;
    let g11 = 0;
    let g12 = 0;
    let other = 0;

    students.forEach(s => {
      const match = s.classLevel.match(/\b(9|10|11|12)\b/) || s.classLevel.match(/(^|[^\d])(9|10|11|12)([^\d]|$)/);
      const lvl = match ? (match[1] || match[2]) : null;
      if (lvl === '9') g9++;
      else if (lvl === '10') g10++;
      else if (lvl === '11') g11++;
      else if (lvl === '12') g12++;
      else other++;
    });

    return { g9, g10, g11, g12, other, total: students.length };
  }, [students]);

  // Sınıf Atlatma İşlemi (9->10, 10->11, 11->12, 12->Mezun)
  const handlePromoteStudents = () => {
    if (students.length === 0) return;
    setLastPromotionBackup([...students]); // Geri alma için yedek

    let promotedCount = 0;
    let graduatedCount = 0;
    const updatedStudents: Student[] = [];

    students.forEach(student => {
      const rawClass = student.classLevel.trim();
      const match = rawClass.match(/\b(9|10|11|12)\b/) || rawClass.match(/(^|[^\d])(9|10|11|12)([^\d]|$)/);
      const levelStr = match ? (match[1] || match[2]) : null;

      if (!levelStr) {
        // Kademe tespit edilemediyse olduğu gibi tut
        updatedStudents.push(student);
        return;
      }

      if (promoteTargetLevel !== 'ALL' && promoteTargetLevel !== levelStr) {
        // Seçili kademe dışında ise dokunma
        updatedStudents.push(student);
        return;
      }

      const currentLevel = parseInt(levelStr, 10);

      if (currentLevel === 12) {
        graduatedCount++;
        if (twelfthGradeAction === 'MARK_GRADUATED') {
          const newClass = rawClass.replace(/\b12\b/, 'MEZUN').replace(/(^|[^\d])12([^\d]|$)/, '$1MEZUN$2');
          updatedStudents.push({
            ...student,
            classLevel: newClass.includes('MEZUN') ? newClass : 'MEZUN',
          });
        }
        // Eğer DELETE seçiliyse listeye eklenmeyerek mezun/silinmiş olur
      } else {
        promotedCount++;
        const nextLevel = (currentLevel + 1).toString();
        let newClass = rawClass;
        if (rawClass.match(/\b(9|10|11)\b/)) {
          newClass = rawClass.replace(/\b(9|10|11)\b/, nextLevel);
        } else {
          newClass = rawClass.replace(/(^|[^\d])(9|10|11)([^\d]|$)/, `$1${nextLevel}$3`);
        }
        updatedStudents.push({
          ...student,
          classLevel: newClass,
        });
      }
    });

    const sorted = sortStudentsByClassAndNumber(updatedStudents);
    setStudents(sorted);
    setIsPromoteModalOpen(false);
    setSelectedStudentId(null);

    const gradInfo =
      graduatedCount > 0
        ? `, ${graduatedCount} öğrenci ${
            twelfthGradeAction === 'DELETE'
              ? 'mezun edilerek listeden çıkarıldı'
              : 'MEZUN şubesine aktarıldı'
          }`
        : '';
    showToast(`${promotedCount} öğrenci bir üst sınıfa aktarıldı${gradInfo}.`);
  };

  // Sınıf atlatmayı geri al
  const handleUndoPromotion = () => {
    if (!lastPromotionBackup) return;
    setStudents(lastPromotionBackup);
    setLastPromotionBackup(null);
    showToast('Sınıf atlatma işlemi geri alındı, önceki öğrenci listesine dönüldü.');
  };

  // 7. Filtered and Sorted Students List
  const filteredStudents = useMemo(() => {
    const matched = students.filter(s => {
      const fullName = `${s.name} ${s.surname}`.toLowerCase();
      const matchesSearch =
        !searchTerm.trim() ||
        fullName.includes(searchTerm.toLowerCase()) ||
        s.number.includes(searchTerm) ||
        s.classLevel.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesClass = classFilter === 'ALL' || s.classLevel === classFilter;
      const matchesBEP = !bepOnlyFilter || s.isBEP;

      return matchesSearch && matchesClass && matchesBEP;
    });

    return sortStudentsByClassAndNumber(matched);
  }, [students, searchTerm, classFilter, bepOnlyFilter]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="w-full space-y-3">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden file input for CSV/Excel upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* TOP HEADER BAR (Matching user application header) */}
      <div className="bg-white rounded-xl px-3 sm:px-4 py-2 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs w-full min-w-0">
        <div className="flex items-center gap-2 min-w-0 py-0.5">
          <span className="text-xs sm:text-sm md:text-base font-black text-blue-600 tracking-wide uppercase flex items-center gap-1.5 leading-normal">
            <span>🎓</span>
            <span className="truncate">SINAV OTURMA DÜZENİ PLANLAYICI</span>
          </span>
          <span className="text-slate-300 hidden md:inline">|</span>
          <span className="font-bold text-slate-600 hidden md:inline truncate">Öğrenci Listesi</span>
        </div>

        {examSubjectsSummary && (
          <div className="flex items-center gap-1.5 text-cyan-700 font-bold italic text-[11px] truncate max-w-xs sm:max-w-md shrink-0">
            <span className="shrink-0">📝</span>
            <span className="truncate" title={examSubjectsSummary}>
              {examSubjectsSummary}
            </span>
          </div>
        )}
      </div>

      {/* MAIN TWO-COLUMN CONTENT GRID (Matching user interface) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* LEFT COLUMN: Liste İşlemleri & Manuel Ekleme (col-span-3) */}
        <div className="lg:col-span-3 space-y-3">
          {/* BOX 1: Liste İşlemleri */}
          <fieldset className="border-2 border-blue-400/90 rounded-xl p-3 bg-white shadow-2xs space-y-2">
            <legend className="px-2 text-xs font-black text-blue-600 bg-white">
              Liste İşlemleri
            </legend>

            {/* CSV Yükle */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs border border-blue-700"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Yükleniyor...' : 'CSV Yükle'}</span>
            </button>

            {/* Google Sheets'ten İçeri Aktar */}
            <button
              type="button"
              onClick={() => setIsGoogleSheetsModalOpen(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs border border-emerald-700"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              <span>Google Sheets'ten İçeri Aktar</span>
            </button>

            {/* CSV Olarak Kaydet */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-700 border-2 border-emerald-500 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV Olarak Kaydet</span>
            </button>

            {/* Örnek Şablon */}
            <button
              type="button"
              onClick={downloadStudentTemplate}
              className="w-full bg-white hover:bg-cyan-50 active:bg-cyan-100 text-cyan-700 border-2 border-cyan-500 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-cyan-600" />
              <span>Örnek Şablon</span>
            </button>

            {/* Sınıf Atlatma (Yeni Yıl Geçişi) */}
            <button
              type="button"
              onClick={() => setIsPromoteModalOpen(true)}
              disabled={students.length === 0}
              className={`w-full font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs ${
                students.length > 0
                  ? 'bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border-2 border-amber-500'
                  : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
              }`}
              title="Öğrencileri bir üst sınıfa aktar (9→10, 10→11, 11→12, 12→Mezun)"
            >
              <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
              <span>Sınıf Atlatma (Yeni Yıl)</span>
            </button>

            {/* Son Sınıf Atlatmayı Geri Al (Eğer varsa) */}
            {lastPromotionBackup && (
              <button
                type="button"
                onClick={handleUndoPromotion}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold py-1 px-2.5 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Son sınıf atlatma işlemini geri al"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Atlatmayı Geri Al</span>
              </button>
            )}

            {/* Tüm Listeyi Sil */}
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={students.length === 0}
              className={`w-full font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition shadow-xs ${
                students.length > 0
                  ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white cursor-pointer border border-rose-700'
                  : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tüm Listeyi Sil</span>
            </button>
          </fieldset>

          {/* BOX 2: Manuel Ekleme */}
          <fieldset className="border-2 border-blue-400/90 rounded-xl p-3 bg-white shadow-2xs space-y-2">
            <legend className="px-2 text-xs font-black text-blue-600 bg-white">
              Manuel Ekleme
            </legend>

            <form onSubmit={handleManualAdd} className="space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Ad Soyad:
                </label>
                <input
                  type="text"
                  value={manualFullName}
                  onChange={e => setManualFullName(e.target.value)}
                  placeholder="Örn: AHMET YILMAZ"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-400 focus:outline-none bg-slate-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Sınıf:
                </label>
                <input
                  type="text"
                  list="classes-datalist"
                  value={manualClass}
                  onChange={e => setManualClass(e.target.value)}
                  placeholder="Örn: AMP 10-A"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-400 focus:outline-none bg-slate-50/50"
                  required
                />
                <datalist id="classes-datalist">
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls} />
                  ))}
                  {uniqueClasses.map(cls => (
                    <option key={cls} value={cls} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Numara:
                </label>
                <input
                  type="text"
                  value={manualNumber}
                  onChange={e => setManualNumber(e.target.value)}
                  placeholder="Örn: 105"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-400 focus:outline-none bg-slate-50/50"
                  required
                />
              </div>

              {/* BEP Toggle */}
              <div className="pt-0.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={manualIsBep}
                    onChange={e => setManualIsBep(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                  />
                  <span>BEP (Kaynaştırma) Öğrencisi</span>
                </label>
              </div>

              {/* + Ekle Button */}
              <button
                type="submit"
                className="w-full bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-700 border-2 border-emerald-500 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ekle</span>
              </button>
            </form>
          </fieldset>

          {/* SUMMARY STATISTICS (Matching user screenshot) */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-1 text-xs text-slate-700">
            <div className="font-bold text-slate-800 text-[13px]">
              Toplam: <span className="text-blue-700">{students.length}</span> öğrenci
            </div>
            <div className="font-semibold text-slate-600 text-xs">
              {uniqueClasses.length} farklı şube bulundu.
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
              <span>BEP Mevcudu:</span>
              <span className="font-bold text-indigo-700">
                {students.filter(s => s.isBEP).length} Öğrenci
              </span>
            </div>
          </div>

          {/* ACTIONS ON SELECTED STUDENT */}
          {selectedStudent && (
            <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-3 space-y-2 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 truncate">
                  Seçili: {selectedStudent.name} {selectedStudent.surname}
                </span>
                <button
                  onClick={() => setSelectedStudentId(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  title="Seçimi kaldır"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleBEP(selectedStudent.id)}
                  className={`flex-1 py-1 px-2 rounded-lg font-bold text-[11px] border transition cursor-pointer ${
                    selectedStudent.isBEP
                      ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {selectedStudent.isBEP ? 'BEP İşaretini Kaldır' : 'BEP Olarak İşaretle'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteStudent(selectedStudent.id)}
                  className="py-1 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] cursor-pointer shadow-2xs transition"
                  title="Öğrenciyi sil"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: MAIN STUDENTS TABLE (col-span-9) */}
        <div className="lg:col-span-9 bg-white border border-slate-300 rounded-xl shadow-2xs overflow-hidden flex flex-col">
          {/* COMPACT TABLE FILTER & SEARCH BAR */}
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="İsim, numara veya sınıf ara..."
                  className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-800 focus:outline-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold text-[11px]">Şube:</span>
                <select
                  value={classFilter}
                  onChange={e => setClassFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-blue-500 cursor-pointer"
                >
                  <option value="ALL">Tüm Şubeler ({students.length})</option>
                  {uniqueClasses.map(cls => {
                    const count = students.filter(s => s.classLevel === cls).length;
                    return (
                      <option key={cls} value={cls}>
                        {cls} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setBepOnlyFilter(prev => !prev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  bepOnlyFilter
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
                title="Sadece BEP öğrencilerini filtrele"
              >
                {bepOnlyFilter ? 'Tümünü Göster' : 'Sadece BEP'}
              </button>
            </div>
          </div>

          {/* MAIN DENSE STUDENTS TABLE */}
          <div className="overflow-x-auto max-h-[calc(100vh-210px)] min-h-[420px] overflow-y-auto">
            <table className="w-full border-collapse text-left text-xs select-none">
              <thead className="sticky top-0 z-10 bg-blue-600 text-white font-bold text-[11.5px] shadow-xs">
                <tr>
                  <th className="py-2.5 px-3.5 tracking-wider w-[32%]">Ad Soyad</th>
                  <th className="py-2.5 px-3 tracking-wider w-[16%]">Sınıf</th>
                  <th className="py-2.5 px-3 tracking-wider text-center w-[12%]">Numara</th>
                  <th className="py-2.5 px-3.5 tracking-wider w-[30%]">Sınav Dersi</th>
                  <th className="py-2.5 px-3 tracking-wider text-center w-[10%]">BEP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                      {searchTerm || classFilter !== 'ALL' || bepOnlyFilter
                        ? 'Filtreye uygun öğrenci bulunamadı.'
                        : 'Henüz öğrenci eklenmedi. Sol panelden "CSV Yükle" veya "Manuel Ekleme" yapabilirsiniz.'}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => {
                    const isSelected = selectedStudentId === student.id;
                    const examSubject =
                      classSubjectMap.get(student.classLevel.toUpperCase().trim()) || '-';

                    return (
                      <tr
                        key={student.id}
                        onClick={() => setSelectedStudentId(student.id)}
                        onDoubleClick={() => handleToggleBEP(student.id)}
                        className={`cursor-pointer transition-colors duration-75 text-xs ${
                          isSelected
                            ? 'bg-slate-400 text-white font-bold'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                        title="Seçmek için tek tıklayın, BEP durumunu değiştirmek için çift tıklayın"
                      >
                        {/* Ad Soyad (Uppercase exactly as in screenshot) */}
                        <td className="py-1.5 px-3.5 font-bold tracking-wide uppercase truncate">
                          {`${student.name} ${student.surname}`.trim()}
                        </td>

                        {/* Sınıf */}
                        <td className="py-1.5 px-3 font-semibold tracking-wide truncate">
                          {student.classLevel}
                        </td>

                        {/* Numara */}
                        <td className="py-1.5 px-3 text-center font-mono">
                          {student.number}
                        </td>

                        {/* Sınav Dersi */}
                        <td className="py-1.5 px-3.5 font-medium truncate text-slate-700">
                          <span
                            className={
                              isSelected
                                ? 'text-white'
                                : examSubject !== '-'
                                ? 'text-slate-800 font-semibold'
                                : 'text-slate-400'
                            }
                          >
                            {examSubject}
                          </span>
                        </td>

                        {/* BEP */}
                        <td className="py-1.5 px-3 text-center font-bold">
                          {student.isBEP ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                isSelected
                                  ? 'bg-white text-slate-900'
                                  : 'text-indigo-800 bg-indigo-50 border border-indigo-200'
                              }`}
                            >
                              BEP
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* BOTTOM TABLE STATUS FOOTER */}
          <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Gösterilen: <strong className="text-slate-800">{filteredStudents.length}</strong> / Toplam: <strong className="text-slate-800">{students.length}</strong>
            </span>
            <span className="italic">
              * İpucu: Satıra çift tıklayarak BEP durumunu doğrudan değiştirebilirsiniz.
            </span>
          </div>
        </div>
      </div>

      {/* SINIF ATLATMA (YENİ YIL GEÇİŞİ) MODALI */}
      {isPromoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide">
                    Sınıf Atlatma (Yeni Yıl Geçişi)
                  </h3>
                  <p className="text-[11px] text-amber-100 font-medium">
                    Öğrencileri otomatik olarak bir üst kademeye aktarır
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPromoteModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-slate-700">
              {/* Bilgilendirme Kutusu */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-[11.5px] text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Bu işlem okuldaki mevcut öğrencilerin sınıf kademelerini bir üst sınıfa yükseltir (Örn: 9-A → 10-A, 10-A → 11-A, 11-A → 12-A).
                  İşlem sonrasında gerekirse sol menüdeki <strong>"Atlatmayı Geri Al"</strong> butonuyla eski listeye dönebilirsiniz.
                </div>
              </div>

              {/* Geçiş Tablosu / Özeti */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Öğrenci Kademeleri ve Geçiş Dağılımı:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] font-bold text-slate-500">9 → 10. SINIF</div>
                    <div className="text-base font-black text-blue-700 mt-0.5">
                      {gradeCounts.g9} <span className="text-[10px] font-normal text-slate-500">öğr.</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] font-bold text-slate-500">10 → 11. SINIF</div>
                    <div className="text-base font-black text-cyan-700 mt-0.5">
                      {gradeCounts.g10} <span className="text-[10px] font-normal text-slate-500">öğr.</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] font-bold text-slate-500">11 → 12. SINIF</div>
                    <div className="text-base font-black text-indigo-700 mt-0.5">
                      {gradeCounts.g11} <span className="text-[10px] font-normal text-slate-500">öğr.</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] font-bold text-slate-500">12 → MEZUN</div>
                    <div className="text-base font-black text-rose-700 mt-0.5">
                      {gradeCounts.g12} <span className="text-[10px] font-normal text-slate-500">öğr.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seçenek 1: Hangi Kademeler Atlatılsın? */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-800">
                  Uygulanacak Kademeler:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition ${
                      promoteTargetLevel === 'ALL'
                        ? 'border-amber-500 bg-amber-50/60 text-amber-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="promoteTarget"
                      checked={promoteTargetLevel === 'ALL'}
                      onChange={() => setPromoteTargetLevel('ALL')}
                      className="text-amber-600 cursor-pointer"
                    />
                    <span>Tüm Kademeler (9, 10, 11, 12)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition ${
                      promoteTargetLevel === '9'
                        ? 'border-amber-500 bg-amber-50/60 text-amber-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="promoteTarget"
                      checked={promoteTargetLevel === '9'}
                      onChange={() => setPromoteTargetLevel('9')}
                      className="text-amber-600 cursor-pointer"
                    />
                    <span>Sadece 9'lar (9 → 10)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition ${
                      promoteTargetLevel === '10'
                        ? 'border-amber-500 bg-amber-50/60 text-amber-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="promoteTarget"
                      checked={promoteTargetLevel === '10'}
                      onChange={() => setPromoteTargetLevel('10')}
                      className="text-amber-600 cursor-pointer"
                    />
                    <span>Sadece 10'lar (10 → 11)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition ${
                      promoteTargetLevel === '11'
                        ? 'border-amber-500 bg-amber-50/60 text-amber-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="promoteTarget"
                      checked={promoteTargetLevel === '11'}
                      onChange={() => setPromoteTargetLevel('11')}
                      className="text-amber-600 cursor-pointer"
                    />
                    <span>Sadece 11'ler (11 → 12)</span>
                  </label>
                </div>
              </div>

              {/* Seçenek 2: 12. Sınıflar İçin İşlem */}
              {(promoteTargetLevel === 'ALL' || promoteTargetLevel === '12') && gradeCounts.g12 > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-800">
                    12. Sınıf Öğrencileri İçin Mezuniyet Ayarı ({gradeCounts.g12} Öğrenci):
                  </label>
                  <div className="space-y-1.5">
                    <label
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition ${
                        twelfthGradeAction === 'DELETE'
                          ? 'border-rose-400 bg-rose-50/50 text-rose-900 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="twelfthAction"
                        checked={twelfthGradeAction === 'DELETE'}
                        onChange={() => setTwelfthGradeAction('DELETE')}
                        className="text-rose-600 cursor-pointer"
                      />
                      <span>Listeden tamamen sil (Önerilen - Mezun oldular)</span>
                    </label>

                    <label
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition ${
                        twelfthGradeAction === 'MARK_GRADUATED'
                          ? 'border-indigo-400 bg-indigo-50/50 text-indigo-900 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="twelfthAction"
                        checked={twelfthGradeAction === 'MARK_GRADUATED'}
                        onChange={() => setTwelfthGradeAction('MARK_GRADUATED')}
                        className="text-indigo-600 cursor-pointer"
                      />
                      <span>Şubesini "MEZUN" olarak güncelle ve listede tut</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsPromoteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handlePromoteStudents}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                <ChevronsUp className="w-4 h-4" />
                <span>Sınıfları Atlat</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Google Sheets İçe Aktarma Modal */}
      <GoogleSheetsImportModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        mode="STUDENTS"
        onStudentsImported={importedStudents => {
          setStudents(prev => {
            // Append or replace according to user context; sorting naturally by class & number
            const combined = sortStudentsByClassAndNumber([...prev, ...importedStudents]);
            return combined;
          });
          showToast(`${importedStudents.length} öğrenci Google E-Tablodan başarıyla yüklendi!`);
        }}
      />
    </div>
  );
};
