import * as XLSX from 'xlsx';
import { Student, Teacher, SeatingPlanResult } from '../types';

/**
 * Downloads a sample Excel template for student list import
 */
export const downloadStudentTemplate = () => {
  const sampleData = [
    {
      'Okul No': '101',
      'Adı': 'Ahmet',
      'Soyadı': 'Yılmaz',
      'Sınıfı': '9-A',
      'BEP Durumu': 'HAYIR',
    },
    {
      'Okul No': '102',
      'Adı': 'Ayşe',
      'Soyadı': 'Kaya',
      'Sınıfı': '9-A',
      'BEP Durumu': 'EVET',
    },
    {
      'Okul No': '201',
      'Adı': 'Mehmet',
      'Soyadı': 'Demir',
      'Sınıfı': '10-B',
      'BEP Durumu': 'HAYIR',
    },
    {
      'Okul No': '301',
      'Adı': 'Zeynep',
      'Soyadı': 'Çelik',
      'Sınıfı': '11-C',
      'BEP Durumu': 'HAYIR',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Öğrenci Listesi');
  XLSX.writeFile(wb, 'ornek_ogrenci_sablonu.xlsx');
};

/**
 * Parses an Excel or CSV file into Student objects
 */
export const parseStudentFile = async (file: File): Promise<Student[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

  const students: Student[] = [];

  jsonRows.forEach((row, index) => {
    // Look up columns flexibly
    let num = '';
    let name = '';
    let surname = '';
    let classLevel = '';
    let isBEP = false;

    for (const key of Object.keys(row)) {
      const lower = key.toLowerCase().trim();
      const val = String(row[key] ?? '').trim();

      if (lower.includes('no') || lower.includes('numara')) {
        num = val;
      } else if (lower === 'ad' || lower === 'adı' || lower === 'isim') {
        name = val;
      } else if (lower === 'soyad' || lower === 'soyadı') {
        surname = val;
      } else if (lower.includes('sınıf') || lower.includes('sube') || lower.includes('şube')) {
        classLevel = val;
      } else if (lower.includes('bep') || lower.includes('kaynaştırma')) {
        isBEP = val.toLowerCase().includes('evet') || val === '1' || val.toLowerCase().includes('bep');
      }
    }

    // Fallback if full name in single column
    if (name && !surname && name.includes(' ')) {
      const parts = name.split(' ');
      surname = parts.pop() || '';
      name = parts.join(' ');
    }

    if (name && classLevel) {
      students.push({
        id: `stu-imp-${Date.now()}-${index}`,
        number: num || `${100 + index}`,
        name,
        surname: surname || '-',
        classLevel: classLevel.toUpperCase(),
        isBEP,
      });
    }
  });

  return students;
};

/**
 * Downloads a sample Excel template for weekly teacher & schedule import
 */
export const downloadTeacherScheduleTemplate = () => {
  const sampleData = [
    {
      'Öğretmen Adı': 'Ali Demir',
      'Branş': 'Matematik',
      'Nöbet Günü': 'Pazartesi',
      'Ders Günü': 'Çarşamba',
      'Ders Saati': 3,
      'Derslik': 'Salon 1 (Derslik 9-A)',
      'Ders Adı': 'Matematik',
    },
    {
      'Öğretmen Adı': 'Mehmet Akif Yıldız',
      'Branş': 'Türk Dili ve Edebiyatı',
      'Nöbet Günü': 'Çarşamba',
      'Ders Günü': '',
      'Ders Saati': '',
      'Derslik': '',
      'Ders Adı': '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Öğretmen Ders Programı');
  XLSX.writeFile(wb, 'ornek_ogretmen_ders_programi.xlsx');
};

/**
 * Exports seating plan to Excel locally
 */
export const exportPlanToExcelFile = (plan: SeatingPlanResult) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Salon Dağılımları
  const salonRows: Record<string, string | number>[] = [];
  plan.rooms.forEach(room => {
    room.seats
      .filter(s => s.student)
      .forEach(seat => {
        salonRows.push({
          'Salon Adı': room.classroomName,
          'Sıra No': seat.seatNumber,
          'Öğrenci No': seat.student!.number,
          'Adı Soyadı': `${seat.student!.name} ${seat.student!.surname}`,
          'Sınıfı': seat.student!.classLevel,
          'BEP': seat.student!.isBEP ? 'BEP' : 'Normal',
          'Salon Gözetmeni': room.supervisorName,
          'Gözetmen Branş': room.supervisorBranch || '-',
        });
      });
  });
  const wsSalon = XLSX.utils.json_to_sheet(salonRows);
  XLSX.utils.book_append_sheet(wb, wsSalon, 'Salon Dağılımları');

  // Sheet 2: Sınıflara Göre Dağılım
  const classRows: Record<string, string | number>[] = [];
  plan.rooms.forEach(room => {
    room.seats
      .filter(s => s.student)
      .forEach(seat => {
        classRows.push({
          'Sınıfı': seat.student!.classLevel,
          'Öğrenci No': seat.student!.number,
          'Adı Soyadı': `${seat.student!.name} ${seat.student!.surname}`,
          'Sınav Salonu': room.classroomName,
          'Sıra No': seat.seatNumber,
          'Gözetmen': room.supervisorName,
        });
      });
  });
  classRows.sort((a, b) => {
    const classA = String(a['Sınıfı']);
    const classB = String(b['Sınıfı']);
    if (classA !== classB) return classA.localeCompare(classB, 'tr');
    return Number(a['Öğrenci No']) - Number(b['Öğrenci No']);
  });
  const wsClass = XLSX.utils.json_to_sheet(classRows);
  XLSX.utils.book_append_sheet(wb, wsClass, 'Sınıf Dağılımları');

  // Sheet 3: Gözetmen Listesi
  const supRows = plan.rooms.map(r => ({
    'Salon Adı': r.classroomName,
    'Gözetmen Öğretmen': r.supervisorName,
    'Branş': r.supervisorBranch || '-',
    'Atama Gerekçesi': r.supervisorReason,
    'Öğrenci Sayısı': r.totalAssigned,
  }));
  const wsSup = XLSX.utils.json_to_sheet(supRows);
  XLSX.utils.book_append_sheet(wb, wsSup, 'Gözetmen Listesi');

  // Sheet 4: BEP Listesi
  const bepStudents = salonRows.filter(r => r['BEP'] === 'BEP');
  const wsBEP = XLSX.utils.json_to_sheet(bepStudents);
  XLSX.utils.book_append_sheet(wb, wsBEP, 'BEP Öğrenci Listesi');

  XLSX.writeFile(wb, `Kelebek_Sinav_Plani_${plan.examName.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`);
};

/**
 * Exports students list to CSV format with UTF-8 BOM
 */
export const exportStudentsToCSV = (students: Student[]) => {
  const rows = students.map(s => ({
    'Adı Soyadı': `${s.name} ${s.surname}`.trim(),
    'Sınıfı': s.classLevel,
    'Numara': s.number,
    'BEP Durumu': s.isBEP ? 'BEP' : '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const csvOutput = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ogrenci_listesi_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export interface WeeklyScheduleItem {
  id: string;
  day: 'Pazartesi' | 'Salı' | 'Çarşamba' | 'Perşembe' | 'Cuma';
  period: number;
  periodLabel: string;
  classroomName: string;
  teacherName: string;
  branch?: string;
}

export const sampleScreenshotWeeklySchedule: WeeklyScheduleItem[] = [
  { id: 'ws-1', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'MES11', teacherName: 'A.SALDIR' },
  { id: 'ws-2', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'ATP 11-AB', teacherName: 'B.ÖZTAŞ' },
  { id: 'ws-3', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'MES9', teacherName: 'Ç.FIRTINA' },
  { id: 'ws-4', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'MES12', teacherName: 'F.KARABÖRKLÜ' },
  { id: 'ws-5', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'ATP 9-A', teacherName: 'G.ÖZEN' },
  { id: 'ws-6', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'ATP 12-AB', teacherName: 'G.TEKE' },
  { id: 'ws-7', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'ATP 9-B', teacherName: 'G.KARAHAN' },
  { id: 'ws-8', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'ATP 10-B', teacherName: 'H.GENÇOĞLU' },
  { id: 'ws-9', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'AMP 9-A', teacherName: 'H.AKÇAKAYA' },
  { id: 'ws-10', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'AMP 11-AB', teacherName: 'İ.AKINCI' },
  { id: 'ws-11', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'MES10', teacherName: 'İ.TERCAN' },
  { id: 'ws-12', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'AMP 9-B', teacherName: 'M.YILDIZ' },
  { id: 'ws-13', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'AMP 9-B', teacherName: 'M.ÇELİK' },
  { id: 'ws-14', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'AMP 9-A', teacherName: 'M.AYDINLIK' },
  { id: 'ws-15', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'AMP 10-AB', teacherName: 'M.SALTAN' },
  { id: 'ws-16', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'AMP 9-A', teacherName: 'O.GÜRBÜZ' },
  { id: 'ws-17', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'AMP 9-C', teacherName: 'S.DEMİRTAŞ' },
  { id: 'ws-18', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'AMP 9-B', teacherName: 'S.BÜÇGÜN' },
  { id: 'ws-19', day: 'Cuma', period: 1, periodLabel: '1. Ders', classroomName: 'ATP 10-A', teacherName: 'Ş.ÇAKIR' },
  { id: 'ws-20', day: 'Cuma', period: 10, periodLabel: '10. Ders', classroomName: 'MES11', teacherName: 'D.KORKMAZ' },
  { id: 'ws-21', day: 'Cuma', period: 10, periodLabel: '10. Ders', classroomName: 'MES12', teacherName: 'G.GEYİK GÜNGÖR' },
  { id: 'ws-22', day: 'Cuma', period: 10, periodLabel: '10. Ders', classroomName: 'MES11', teacherName: 'M.AYDINLIK' },
  { id: 'ws-23', day: 'Cuma', period: 10, periodLabel: '10. Ders', classroomName: 'MES12', teacherName: 'O.GÜRBÜZ' },
  { id: 'ws-24', day: 'Cuma', period: 2, periodLabel: '2. Ders', classroomName: 'MES11', teacherName: 'A.SALDIR' },
  { id: 'ws-25', day: 'Cuma', period: 2, periodLabel: '2. Ders', classroomName: 'ATP 11-AB', teacherName: 'B.ÖZTAŞ' },
  { id: 'ws-26', day: 'Cuma', period: 2, periodLabel: '2. Ders', classroomName: 'MES9', teacherName: 'Ç.FIRTINA' },
  { id: 'ws-27', day: 'Cuma', period: 2, periodLabel: '2. Ders', classroomName: 'MES12', teacherName: 'F.KARABÖRKLÜ' },
  { id: 'ws-28', day: 'Cuma', period: 2, periodLabel: '2. Ders', classroomName: 'ATP 9-A', teacherName: 'G.ÖZEN' },
  { id: 'ws-29', day: 'Cuma', period: 2, periodLabel: '2. Ders', classroomName: 'ATP 12-AB', teacherName: 'G.TEKE' },
  { id: 'ws-30', day: 'Cuma', period: 2, periodLabel: '2. Ders', classroomName: 'ATP 9-B', teacherName: 'G.KARAHAN' },
  { id: 'ws-31', day: 'Cuma', period: 2, periodLabel: '2. Ders', classroomName: 'ATP 10-B', teacherName: 'H.GENÇOĞLU' },
  { id: 'ws-32', day: 'Cuma', period: 2, periodLabel: '2. Ders', classroomName: 'AMP 9-A', teacherName: 'H.AKÇAKAYA' },
  { id: 'ws-33', day: 'Cuma', period: 2, periodLabel: '2. Ders', classroomName: 'AMP 11-AB', teacherName: 'İ.AKINCI' },
  { id: 'ws-34', day: 'Cuma', period: 2, periodLabel: '2. Ders', classroomName: 'MES10', teacherName: 'İ.TERCAN' },
  { id: 'ws-35', day: 'Cuma', period: 2, periodLabel: '2. Ders', classroomName: 'AMP 9-B', teacherName: 'M.YILDIZ' },
  { id: 'ws-36', day: 'Cuma', period: 2, periodLabel: '2. Ders', classroomName: 'AMP 9-B', teacherName: 'M.ÇELİK' },
];

/**
 * Downloads weekly lesson schedule template as CSV with UTF-8 BOM
 */
export const downloadWeeklyScheduleCSV = (items?: WeeklyScheduleItem[]) => {
  const data = (items && items.length > 0 ? items : sampleScreenshotWeeklySchedule).map(i => ({
    'Gün': i.day,
    'Saat': i.periodLabel,
    'Salon': i.classroomName,
    'Öğretmen': i.teacherName,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'haftalik_ders_programi_sablon.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Parses an uploaded CSV or Excel file containing weekly schedule
 */
export const parseWeeklyScheduleFile = async (file: File): Promise<WeeklyScheduleItem[]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });

  const result: WeeklyScheduleItem[] = [];

  rows.forEach((row, idx) => {
    let dayStr = '';
    let hourStr = '';
    let salonStr = '';
    let teacherStr = '';

    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key.trim().toLowerCase();
      const cleanVal = String(val).trim();

      if (cleanKey.includes('gün') || cleanKey.includes('gun') || cleanKey === 'day') {
        dayStr = cleanVal;
      } else if (
        cleanKey.includes('saat') ||
        cleanKey.includes('ders saati') ||
        cleanKey.includes('ders') ||
        cleanKey.includes('period') ||
        cleanKey.includes('hour')
      ) {
        hourStr = cleanVal;
      } else if (
        cleanKey.includes('salon') ||
        cleanKey.includes('sınıf') ||
        cleanKey.includes('sinif') ||
        cleanKey.includes('derslik') ||
        cleanKey.includes('room')
      ) {
        salonStr = cleanVal;
      } else if (
        cleanKey.includes('öğretmen') ||
        cleanKey.includes('ogretmen') ||
        cleanKey.includes('hoca') ||
        cleanKey.includes('teacher') ||
        cleanKey.includes('adı')
      ) {
        teacherStr = cleanVal;
      }
    }

    if (!teacherStr && !salonStr) return;

    // Normalize day
    let normalizedDay: WeeklyScheduleItem['day'] = 'Cuma';
    const lowerDay = dayStr.toLowerCase();
    if (lowerDay.includes('pazar') && !lowerDay.includes('pazar gün')) normalizedDay = 'Pazartesi';
    else if (lowerDay.includes('salı') || lowerDay.includes('sali')) normalizedDay = 'Salı';
    else if (lowerDay.includes('çarş') || lowerDay.includes('cars')) normalizedDay = 'Çarşamba';
    else if (lowerDay.includes('perş') || lowerDay.includes('pers')) normalizedDay = 'Perşembe';
    else if (lowerDay.includes('cum')) normalizedDay = 'Cuma';

    // Parse period number
    let periodNum = 1;
    const match = hourStr.match(/\d+/);
    if (match) {
      periodNum = parseInt(match[0], 10);
    }
    const periodLabel = hourStr.includes('Ders') ? hourStr : `${periodNum}. Ders`;

    result.push({
      id: `sched-${Date.now()}-${idx}`,
      day: normalizedDay,
      period: periodNum,
      periodLabel: periodLabel || '1. Ders',
      classroomName: salonStr || 'Derslik',
      teacherName: teacherStr || 'Öğretmen',
    });
  });

  return result;
};

