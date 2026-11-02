import { SeatingPlanResult, Exam, RoomSeatingPlan } from '../types';
import { getGradeLevel } from '../services/kelebekEngine';

/**
 * Standard Turkish high school and secondary school subject abbreviation dictionary
 */
const KNOWN_SUBJECT_CODES: Record<string, string> = {
  'TÜRK DİLİ VE EDEBİYATI': 'TDE',
  'TÜRK DİLİ VE EDEBİYAT': 'TDE',
  'TÜRK DİLİ': 'TDL',
  'EDEBİYAT': 'TDE',
  'MATEMATİK': 'MAT',
  'SEÇMELİ MATEMATİK': 'S.MAT',
  'TEMEL MATEMATİK': 'T.MAT',
  'İLERİ MATEMATİK': 'İ.MAT',
  'GEOMETRİ': 'GEO',
  'FİZİK': 'FİZ',
  'SEÇMELİ FİZİK': 'S.FİZ',
  'KİMYA': 'KİM',
  'SEÇMELİ KİMYA': 'S.KİM',
  'BİYOLOJİ': 'BİY',
  'SEÇMELİ BİYOLOJİ': 'S.BİY',
  'TARİH': 'TAR',
  'SEÇMELİ TARİH': 'S.TAR',
  'T.C. İNKILAP TARİHİ VE ATATÜRKÇÜLÜK': 'İNK',
  'T.C. İNKILAP TARİHİ': 'İNK',
  'İNKILAP TARİHİ': 'İNK',
  'İNKILAP': 'İNK',
  'COĞRAFYA': 'COĞ',
  'SEÇMELİ COĞRAFYA': 'S.COĞ',
  'FELSEFE': 'FEL',
  'SEÇMELİ FELSEFE': 'S.FEL',
  'DİN KÜLTÜRÜ VE AHLAK BİLGİSİ': 'DİN',
  'DİN KÜLTÜRÜ': 'DİN',
  'İNGİLİZCE': 'İNG',
  'BİRİNCİ YABANCI DİL': 'İNG',
  'İKİNCİ YABANCI DİL': 'ALM',
  'ALMANCA': 'ALM',
  'FRANSIZCA': 'FRA',
  'YABANCI DİL': 'YDİL',
  'BEDEN EĞİTİMİ VE SPOR': 'BED',
  'BEDEN EĞİTİMİ': 'BED',
  'GÖRSEL SANATLAR': 'GÖR',
  'MÜZİK': 'MÜZ',
  'SAĞLIK BİLGİSİ VE TRAFİK KÜLTÜRÜ': 'SAĞ',
  'SAĞLIK BİLGİSİ': 'SAĞ',
  'TRAFİK VE İLKYARDIM': 'TRF',
  'BİLİŞİM TEKNOLOJİLERİ': 'BİL',
  'BİLGİSAYAR BİLİMİ': 'BİL',
  'MESLEKİ GELİŞİM ATÖLYESİ': 'MGA',
  'MESLEKİ GELİŞİM': 'MGA',
  'TEMEL DİNİ BİLGİLER': 'TDB',
  'PEYGAMBERİMİZİN HAYATI': 'SİY',
  'KUR\'AN-I KERİM': 'KRN',
  'MANTIK': 'MNT',
  'SOSYOLOJİ': 'SOS',
  'PSİKOLOJİ': 'PSK',
  'ASTRONOMİ VE UZAY BİLİMLERİ': 'AST',
  'DEMOKRASİ VE İNSAN HAKLARI': 'DEM',
  'DİKSİYON VE HİTABET': 'DİK',
  'PROJE HAZIRLAMA': 'PRJ',
  'ADAB-I MUAŞERET': 'ADB',
  'TÜRK SOSYAL HAYATINDA AİLE': 'AİLE',
  'TEMEL ELEKTRİK': 'ELK',
  'GRAFİK VE ANİMASYON': 'GRF',
  'WEB PROGRAMCILIĞI': 'WEB',
  'VERİ TABANI': 'VT',
};

/**
 * Returns a standardized, concise 2-4 letter subject code (e.g. "TDE", "MAT", "FİZ")
 */
export const getSubjectShortCode = (subjectName: string): string => {
  if (!subjectName) return 'SNV';
  const clean = subjectName.trim();
  const upper = clean.toUpperCase();

  // 1. Direct match in dictionary
  if (KNOWN_SUBJECT_CODES[upper]) {
    return KNOWN_SUBJECT_CODES[upper];
  }

  // 2. Partial match in dictionary
  for (const [key, code] of Object.entries(KNOWN_SUBJECT_CODES)) {
    if (upper === key || upper.startsWith(key) || key.startsWith(upper)) {
      return code;
    }
  }

  // 3. Fallback: single word -> first 3 letters uppercase
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return clean.substring(0, Math.min(4, clean.length)).toUpperCase();
  }

  // 4. Multiple words -> first letters of words (skipping conjunctions)
  const initials = words
    .filter(w => !['ve', 'ile', 'veya', 'de', 'da'].includes(w.toLowerCase()))
    .map(w => w[0].toUpperCase())
    .join('');

  return initials.substring(0, 4) || clean.substring(0, 3).toUpperCase();
};

/**
 * Resolves which subject a student of a specific class is taking in the exam plan
 */
export const getStudentSubject = (
  classLevel: string,
  plan?: SeatingPlanResult,
  exam?: Exam
): string => {
  if (!classLevel) return plan?.subjectName || exam?.subjectName || 'Sınav';
  const clean = classLevel.trim().toUpperCase();

  // 1. Check plan.classSubjectMap
  if (plan?.classSubjectMap) {
    if (plan.classSubjectMap[classLevel]) return plan.classSubjectMap[classLevel];
    if (plan.classSubjectMap[clean]) return plan.classSubjectMap[clean];
  }

  // 2. Check exam.assignedClasses
  if (exam?.assignedClasses) {
    const match = exam.assignedClasses.find(
      ac => ac.classLevel.trim().toUpperCase() === clean
    );
    if (match?.subjectName) return match.subjectName;
  }

  // 3. Check plan.subjectCommissions
  if (plan?.subjectCommissions) {
    const match = plan.subjectCommissions.find(sc =>
      sc.classes.some(c => c.trim().toUpperCase() === clean)
    );
    if (match?.subjectName) return match.subjectName;
  }

  return plan?.subjectName || exam?.subjectName || 'Ortak Sınav';
};

export interface SubjectGradeDistribution {
  subjectName: string;
  subjectCode: string;
  gradeCounts: Record<string, number>; // { '9': 14, '10': 10 }
  totalStudents: number;
}

/**
 * Aggregates room students by Subject and Grade Level (9, 10, 11, 12).
 * Strictly groups by Grade Level, NOT by branch (9-A, 9-B are combined into 9. Sınıf).
 */
export const getRoomSubjectGradeDistributions = (
  room: RoomSeatingPlan,
  plan?: SeatingPlanResult,
  exam?: Exam
): SubjectGradeDistribution[] => {
  const map: Record<
    string,
    {
      subjectName: string;
      subjectCode: string;
      gradeCounts: Record<string, number>;
      total: number;
    }
  > = {};

  room.seats.forEach(seat => {
    if (!seat.student) return;
    const cls = seat.student.classLevel;
    const grade = getGradeLevel(cls) || 'Diğer';
    const subjName = getStudentSubject(cls, plan, exam);
    const subjCode = getSubjectShortCode(subjName);

    if (!map[subjName]) {
      map[subjName] = {
        subjectName: subjName,
        subjectCode: subjCode,
        gradeCounts: {},
        total: 0,
      };
    }

    map[subjName].gradeCounts[grade] = (map[subjName].gradeCounts[grade] || 0) + 1;
    map[subjName].total++;
  });

  return Object.values(map)
    .map(item => ({
      subjectName: item.subjectName,
      subjectCode: item.subjectCode,
      gradeCounts: item.gradeCounts,
      totalStudents: item.total,
    }))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'tr'));
};
