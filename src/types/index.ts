export interface Subject {
  id: string;
  name: string;
  code: string;
  teachers: string[]; // Bu derse giren öğretmenler (Sınavda komisyon üyesidir, gözetmen olamazlar)
}

export interface ExamClassAssignment {
  id: string;
  classLevel: string; // e.g. "9-A", "10-B"
  subjectId: string;
  subjectName: string;
}

export interface Exam {
  id: string;
  name: string; // e.g. "2024-2025 1. Dönem 1. Ortak Sınavı"
  date: string; // e.g. "2024-11-06"
  dayOfWeek: 'Pazartesi' | 'Salı' | 'Çarşamba' | 'Perşembe' | 'Cuma';
  period: number; // Kaçıncı ders saati (e.g. 3)
  periodLabel?: string; // e.g. "3. Ders (10:00 - 10:40)"
  subjectId: string;
  subjectName: string;
  assignedClasses: ExamClassAssignment[];
}

export interface Student {
  id: string;
  number: string; // Okul No
  name: string;
  surname: string;
  classLevel: string; // e.g. "9-A", "10-B", "11-A", "12-C"
  isBEP: boolean; // Kaynaştırma / Bireyselleştirilmiş Eğitim Programı öğrencisi
  notes?: string;
}

export interface Classroom {
  id: string;
  name: string; // e.g. "Salon 1 (9-A)", "Salon 2 (10-A)", "B-103"
  building?: string;
  floor?: string;
  capacity: number; // e.g. 32
  columnsCount?: number; // Sütun sayısı (Örn: 4 sütun sıra)
  rowsPerColumn?: number; // Her sütundaki sıra sayısı (Örn: 4 sıra)
  rowsCount: number; // Toplam sıra sayısı (columnsCount * rowsPerColumn veya rowsCount)
  seatsPerRow: number; // Genellikle 2 (çiftli sıra) veya 1 (tekli sıra)
  doorPosition: 'right' | 'left'; // Öğretmen masasına göre kapı sağda veya solda
  // Kural: Kapı sağda ise öğretmen masası solda, kapı solda ise masa sağda.
  isSelectedForExam: boolean; // Bu sınav için kullanılacak mı
}

export interface TeacherLessonSchedule {
  day: 'Pazartesi' | 'Salı' | 'Çarşamba' | 'Perşembe' | 'Cuma';
  period: number; // 1-8
  classroomName: string; // e.g. "Salon 1 (9-A)"
  subjectName: string; // e.g. "Matematik"
}

export interface Teacher {
  id: string;
  name: string;
  branch: string; // Branş e.g. "Matematik", "Edebiyat"
  dutyDay: 'Pazartesi' | 'Salı' | 'Çarşamba' | 'Perşembe' | 'Cuma' | 'Yok';
  schedule: TeacherLessonSchedule[];
}

export interface SeatedStudentInfo {
  seatNumber: number; // 1, 2, 3, ...
  rowIndex: number; // 0, 1, 2, ...
  colIndex: number; // 0 (Sol koltuk), 1 (Sağ koltuk)
  deskColumnIndex?: number; // 0, 1, 2, 3 (Hangi sütundaki sıra)
  deskRowIndex?: number; // 0, 1, 2, 3 (Sütundaki kaçıncı sıra)
  student?: Student;
}

export interface RoomSeatingPlan {
  classroomId: string;
  classroomName: string;
  doorPosition: 'right' | 'left';
  columnsCount?: number;
  rowsPerColumn?: number;
  seats: SeatedStudentInfo[];
  capacity: number;
  totalAssigned: number;
  supervisorName: string;
  supervisorBranch?: string;
  supervisorReason: string; // 'Derslik Öğretmeni' | 'Boşta Nöbetçi Öğretmen' | 'Sınav Salonu Olmayan Derslik Öğretmeni'
  classDistribution: Record<string, number>; // { "9-A": 5, "10-B": 6 }
}

export interface SeatingPlanResult {
  examId: string;
  examName: string;
  examDate: string;
  examPeriod: number;
  subjectName: string;
  generatedAt: string;
  rooms: RoomSeatingPlan[];
  unassignedStudents: Student[];
  commissionMembers: string[]; // Bu sınavın komisyon üyeleri
  warnings: string[];
}

export interface ResponsibilityStudent {
  id: string;
  studentId: string;
  number: string;
  name: string;
  surname: string;
  classLevel: string; // e.g. "10-A" (öğrencinin kayıtlı olduğu şube)
  responsibleGradeLevel?: string; // e.g. "9. Sınıf" (sorumlu olduğu sınıf seviyesi)
  isBEP?: boolean;
  score?: number | null;
  scoreText?: string;
  result?: 'GEÇTİ' | 'KALDI' | 'GİRMEDİ' | 'BEKLİYOR';
  notes?: string;
}

export interface ResponsibilityExam {
  id: string;
  subjectName: string; // Hangi dersten sınav yapılacak (örn: Türk Dili ve Edebiyatı)
  subjectCode?: string;
  gradeLevel: string; // e.g. "9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf"
  examDate: string; // e.g. "18.09.2024"
  examTime: string; // e.g. "10:00"
  classroomName: string; // Sınav hangi salonda yapılacak (örn: Salon 1, Kütüphane)
  commissionMembers: string[]; // Sınav komisyon üyeleri (Öğretmenler)
  supervisorName?: string; // Varsa ek gözetmen
  students: ResponsibilityStudent[]; // Sınava hangi öğrenciler girecek
  notes?: string;
}

export interface ResponsibilitySettings {
  schoolName: string; // Okul Adı e.g. "Türkiye Tekstil Sanayi İşverenleri Sendikası Mesleki ve Teknik Anadolu Lisesi"
  districtName?: string; // İlçe Kaymakamlığı e.g. "MELİKGAZİ KAYMAKAMLIĞI"
  principalName: string; // Komisyon Başkanı (Okul Müdürü) e.g. "Osman YÜCEL"
  academicYear: string; // e.g. "2026-2027"
  term: string; // e.g. "1.DÖNEM"
  docNumber?: string; // Evrak / Tebligat Sayı No e.g. "71646280.125.01-"
  docDate?: string; // Tebligat / Onay Tarihi e.g. "25.09.2026"
}
