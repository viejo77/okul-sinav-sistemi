import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  Printer,
  School,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Info,
  CheckCircle2,
  Users,
  ChevronRight,
  ArrowRight,
  BookOpen,
  Send,
  Save,
  RotateCcw,
  X,
  Download,
  Loader2,
  Check,
  Layers,
  Filter,
  FileText,
  Columns,
} from 'lucide-react';
import {
  Exam,
  Subject,
  BoardExamItem,
  ExamClassAssignment,
  GradeSubjectConfig,
  Classroom,
  Student,
  Teacher,
} from '../../types';
import { exportToPdf, printElementDirectly } from '../../utils/pdfExport';
import { formatPeriodWithTimes } from '../../services/periodTimes';
import { sampleScreenshotWeeklySchedule } from '../../services/excelService';

interface ExamScheduleSectionProps {
  exams: Exam[];
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  availableClasses: string[];
  classrooms?: Classroom[];
  students?: Student[];
  teachers?: Teacher[];
  activeExamId: string;
  setActiveExamId: (id: string) => void;
  onNavigateToExamTab: () => void;
  onNavigateToSeatingPlan?: () => void;
  onRegisterPrintHandler?: (handler: () => void) => void;
}

/**
 * Intelligently extracts Turkish high school class/branch tokens (9-A, 10-B, 11-A, 11-C, 12-B, etc.)
 * from classroom/hall names, student classLevels, or exam assignedClasses strings.
 */
export const extractClassesFromClassroomName = (roomName: string): string[] => {
  if (!roomName || typeof roomName !== 'string') return [];
  const results = new Set<string>();
  const text = roomName.trim();

  // Pattern 1: Standard grade + separator (-, /, ., _) + branch
  const pat1 = /(?:^|[^\d])(9|10|11|12)\s*[-/._]\s*([A-Za-zÇĞİÖŞÜçğıöşü0-9]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = pat1.exec(text)) !== null) {
    const grade = m[1];
    let branch = m[2].toUpperCase().trim();
    const banned = ['KAT', 'SINIF', 'SINIFA', 'SUBE', 'SUBESI', 'BLOK', 'SALON', 'NO', 'DERSLIK', 'DERS', 'ODA'];
    if (!banned.includes(branch)) {
      branch = branch.replace(/(SINIFI?|SUBESI?)$/i, '').trim();
      if (branch) {
        results.add(`${grade}-${branch}`);
      }
    }
  }

  // Pattern 2: Grade + space + single letter branch (e.g. "11 A", "Salon 5 11 B")
  const pat2 = /(?:^|[^\d])(9|10|11|12)\s+([A-Za-zÇĞİÖŞÜçğıöşü])(?=[^\w]|$)/gi;
  while ((m = pat2.exec(text)) !== null) {
    const grade = m[1];
    const branch = m[2].toUpperCase();
    results.add(`${grade}-${branch}`);
  }

  // Pattern 3: Direct fusion without separator (e.g. "11A", "10B", "Salon 1 (9A)", "12C")
  const pat3 = /(?:^|[^\d])(9|10|11|12)([A-Za-zÇĞİÖŞÜçğıöşü])(?=[^\w]|$)/gi;
  while ((m = pat3.exec(text)) !== null) {
    const grade = m[1];
    const branch = m[2].toUpperCase();
    results.add(`${grade}-${branch}`);
  }

  // Pattern 4: "11. Sınıf A Şubesi" or "10. Sınıf / B"
  const pat4 = /(?:^|[^\d])(9|10|11|12)\.?\s*sınıf[^\w\n]*([A-Za-zÇĞİÖŞÜçğıöşü])/gi;
  while ((m = pat4.exec(text)) !== null) {
    const grade = m[1];
    const branch = m[2].toUpperCase();
    results.add(`${grade}-${branch}`);
  }

  return Array.from(results);
};

// Extract grade number (9, 10, 11, 12) from any class name format:
// "AMP 9-A", "ATP 10-A", "MES11", "MES 12", "11-A", "11/A", "Salon 5 (11-A)"
export const extractGradeFromClass = (cls: string): '9' | '10' | '11' | '12' | null => {
  if (!cls) return null;
  const clean = cls.trim().toUpperCase();
  const match = clean.match(/(?:^|[^0-9])(9|10|11|12)(?:[^0-9]|$)/);
  if (match) {
    return match[1] as '9' | '10' | '11' | '12';
  }
  return null;
};

// Normalize class name for strict or fuzzy comparison, PRESERVING program branch prefixes (AMP, ATP, MES)
export const normalizeClassName = (cls: string): string => {
  if (!cls) return '';
  return cls
    .toUpperCase()
    .trim()
    .replace(/^(DERSLİK|SALON\s*\d*\s*\(?)/i, '')
    .replace(/\)$/, '')
    .replace(/SINIFI?$/i, '')
    .replace(/ŞUBES[İI]?$/i, '')
    .replace(/[\s\-_/.]+/g, '');
};

// Clean display label for badges / chips while PRESERVING AMP, ATP, MES, Dal, etc.:
export const formatSectionDisplayLabel = (secName: string): string => {
  if (!secName) return '';
  let cleaned = secName.trim();
  const salonMatch = cleaned.match(/^(?:Salon\s*\d*\s*\(|Derslik\s+)(.*?)\)?$/i);
  if (salonMatch && salonMatch[1]) {
    cleaned = salonMatch[1].trim();
  }
  return cleaned || secName;
};

// Check if two class names match (handles e.g. "AMP 9-A" vs "AMP 9/A" or "11-A" vs "11/A")
export const isClassMatching = (cls1: string, cls2: string): boolean => {
  if (!cls1 || !cls2) return false;
  if (cls1.toUpperCase().trim() === cls2.toUpperCase().trim()) return true;
  const norm1 = normalizeClassName(cls1);
  const norm2 = normalizeClassName(cls2);
  return norm1 === norm2 && norm1.length > 0;
};

// Collect all distinct class/branch names from Gözetmen Programı (Öğretmen Haftalık Ders Programı)
export const getSupervisorProgramClasses = (teachers: Teacher[] = []): string[] => {
  const set = new Set<string>();
  if (Array.isArray(teachers) && teachers.length > 0) {
    teachers.forEach(t => {
      (t.schedule || []).forEach(sc => {
        if (sc.classroomName && sc.classroomName.trim()) {
          const clean = formatSectionDisplayLabel(sc.classroomName.trim());
          if (extractGradeFromClass(clean)) {
            set.add(clean);
          }
        }
      });
    });
  }
  // Also include standard vocational branches from weekly schedule template (AMP, ATP, MES)
  sampleScreenshotWeeklySchedule.forEach(sc => {
    if (sc.classroomName && sc.classroomName.trim()) {
      const clean = formatSectionDisplayLabel(sc.classroomName.trim());
      if (extractGradeFromClass(clean)) {
        set.add(clean);
      }
    }
  });
  return Array.from(set);
};

// Collect all distinct class/branch names from Sınav Programı (Sınav Tanımları / Sınava Girecek Sınıf Ata)
export const getExamProgramClasses = (exams: Exam[] = []): string[] => {
  const set = new Set<string>();
  if (Array.isArray(exams)) {
    exams.forEach(e => {
      (e.assignedClasses || []).forEach(ac => {
        if (ac.classLevel && ac.classLevel.trim()) {
          const clean = formatSectionDisplayLabel(ac.classLevel.trim());
          if (extractGradeFromClass(clean)) {
            set.add(clean);
          }
        }
      });
    });
  }
  return Array.from(set);
};

// Extract available sections for a specific grade level (e.g. "11" -> ["AMP 11-A", "ATP 11-A", "MES11"])
// Aggregates directly from: Gözetmen Programı, Sınav Programı, availableClasses, classrooms, students, customClasses
export const getSectionsForGrade = (
  grade: '9' | '10' | '11' | '12',
  availableClasses: string[] = [],
  customClasses: string[] = [],
  classrooms: Classroom[] = [],
  students: Student[] = [],
  exams: Exam[] = [],
  teachers: Teacher[] = []
): string[] => {
  let savedLocal: string[] = [];
  try {
    const raw = localStorage.getItem('school_custom_classes');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) savedLocal = parsed;
    }
  } catch {
    // ignore
  }

  let deletedLocal: string[] = [];
  try {
    const rawDel = localStorage.getItem('school_deleted_classes');
    if (rawDel) {
      const parsed = JSON.parse(rawDel);
      if (Array.isArray(parsed)) {
        deletedLocal = parsed.map((c: string) => String(c).trim().toUpperCase()).filter(Boolean);
      }
    }
  } catch {
    // ignore
  }

  const isClassDeleted = (cName: string) => {
    if (!cName) return false;
    const up = cName.trim().toUpperCase();
    return deletedLocal.some(del => isClassMatching(del, up) || del === up);
  };

  const poolSet = new Set<string>();

  // 1. Primary Source: Gözetmen Programı (Öğretmen Ders Programı)
  getSupervisorProgramClasses(teachers).forEach(cls => {
    if (!isClassDeleted(cls)) poolSet.add(cls);
  });

  // 2. Primary Source: Sınav Programı (Sınava Girecek Sınıf Ata)
  getExamProgramClasses(exams).forEach(cls => {
    if (!isClassDeleted(cls)) poolSet.add(cls);
  });

  // 3. From classrooms (Sınav Salonları)
  if (Array.isArray(classrooms)) {
    classrooms.forEach(c => {
      if (c && c.name) {
        const clean = formatSectionDisplayLabel(c.name);
        if (extractGradeFromClass(clean) && !isClassDeleted(clean)) poolSet.add(clean);
        extractClassesFromClassroomName(c.name).forEach(cls => {
          if (!isClassDeleted(cls)) poolSet.add(cls);
        });
      }
    });
  }

  // 4. From students list
  if (Array.isArray(students)) {
    students.forEach(s => {
      if (s && s.classLevel) {
        const tr = s.classLevel.trim();
        if (!isClassDeleted(tr)) poolSet.add(tr);
      }
    });
  }

  // 5. From availableClasses
  if (Array.isArray(availableClasses)) {
    availableClasses.forEach(cls => {
      if (cls && cls.trim()) {
        const tr = cls.trim();
        if (!isClassDeleted(tr)) poolSet.add(tr);
      }
    });
  }

  // 6. From customClasses & savedLocal
  [...(customClasses || []), ...savedLocal].forEach(cls => {
    if (cls && typeof cls === 'string' && cls.trim()) {
      const tr = cls.trim();
      if (!isClassDeleted(tr)) poolSet.add(tr);
    }
  });

  const pool = Array.from(poolSet).map(c => c.trim()).filter(Boolean);

  const matched = pool.filter(cls => {
    return extractGradeFromClass(cls) === grade;
  });

  if (matched.length > 0) {
    const uniqueMap = new Map<string, string>();
    matched.forEach(cls => {
      const norm = normalizeClassName(cls);
      if (!uniqueMap.has(norm)) {
        uniqueMap.set(norm, cls);
      }
    });
    return Array.from(uniqueMap.values()).sort((a, b) =>
      a.localeCompare(b, 'tr', { numeric: true })
    );
  }

  const defaultFallbacks = [`AMP ${grade}-A`, `AMP ${grade}-B`, `ATP ${grade}-A`, `ATP ${grade}-B`, `${grade}-A`];
  return defaultFallbacks.filter(cls => !isClassDeleted(cls));
};

// Parse a subject string like "Biyoloji (11-A, 11-B)" into GradeSubjectConfig[]
export const parseGradeSubjectToConfigs = (
  text: string,
  grade: '9' | '10' | '11' | '12',
  availableClasses: string[] = [],
  customClasses: string[] = [],
  classrooms: Classroom[] = [],
  students: Student[] = [],
  exams: Exam[] = [],
  teachers: Teacher[] = []
): GradeSubjectConfig[] => {
  if (!text || text.trim() === '' || text.trim() === '-' || text.includes('Ders İşlenecek')) {
    return [
      {
        subject: '— (Ders İşlenecek)',
        classes: getSectionsForGrade(grade, availableClasses, customClasses, classrooms, students, exams, teachers),
        isAllClasses: true,
      },
    ];
  }

  const sections = getSectionsForGrade(grade, availableClasses, customClasses, classrooms, students, exams, teachers);
  const parts = text.split(/[|\n]/).map(p => p.trim()).filter(Boolean);
  const result: GradeSubjectConfig[] = [];

  for (const part of parts) {
    const match = part.match(/^(.*?)\((.*?)\)$/);
    if (match) {
      const subjectName = match[1].trim();
      const rawClasses = match[2]
        .split(/[,;]/)
        .map(c => c.trim().toUpperCase())
        .filter(Boolean);
      const matchedClasses = sections.filter(sec =>
        rawClasses.some(rc => isClassMatching(sec, rc))
      );
      result.push({
        subject: subjectName,
        classes: matchedClasses.length > 0 ? matchedClasses : rawClasses,
        isAllClasses: false,
      });
    } else {
      result.push({
        subject: part.trim(),
        classes: sections,
        isAllClasses: true,
      });
    }
  }

  return result.length > 0
    ? result
    : [{ subject: text.trim(), classes: sections, isAllClasses: true }];
};

// Turn array of configs into a formatted display text
export const formatConfigsToSubjectText = (configs: GradeSubjectConfig[]): string => {
  if (!configs || configs.length === 0) return '— (Ders İşlenecek)';
  return configs
    .map(c => {
      if (!c.subject || c.subject === '— (Ders İşlenecek)' || c.subject === '-') {
        return '— (Ders İşlenecek)';
      }
      if (c.isAllClasses || !c.classes || c.classes.length === 0) {
        return c.subject;
      }
      const classLabels = c.classes.map(cls => formatSectionDisplayLabel(cls));
      return `${c.subject} (${classLabels.join(', ')})`;
    })
    .join(' | ');
};

// Get effective configs for a session and grade
export const getEffectiveConfigs = (
  session: BoardExamItem,
  grade: '9' | '10' | '11' | '12',
  availableClasses: string[] = [],
  customClasses: string[] = [],
  classrooms: Classroom[] = [],
  students: Student[] = [],
  exams: Exam[] = [],
  teachers: Teacher[] = []
): GradeSubjectConfig[] => {
  const configsKey = `grade${grade}Configs` as keyof BoardExamItem;
  const directConfigs = session[configsKey] as GradeSubjectConfig[] | undefined;
  if (directConfigs && Array.isArray(directConfigs) && directConfigs.length > 0) {
    return directConfigs;
  }

  const subjectKey = `grade${grade}Subject` as keyof BoardExamItem;
  const subjectText = (session[subjectKey] as string) || '';
  return parseGradeSubjectToConfigs(
    subjectText,
    grade,
    availableClasses,
    customClasses,
    classrooms,
    students,
    exams,
    teachers
  );
};

// Initial realistic default board exam sessions
const initialBoardSessions: BoardExamItem[] = [
  {
    id: 'bs-1',
    date: '2024-11-04',
    dayOfWeek: 'Pazartesi',
    period: 2,
    periodLabel: '2. Ders (09:30 - 10:10)',
    grade9Subject: 'Türk Dili ve Edebiyatı',
    grade10Subject: 'Türk Dili ve Edebiyatı',
    grade11Subject: 'Türk Dili ve Edebiyatı',
    grade12Subject: 'Türk Dili ve Edebiyatı',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-2',
    date: '2024-11-04',
    dayOfWeek: 'Pazartesi',
    period: 5,
    periodLabel: '5. Ders (11:50 - 12:30)',
    grade9Subject: 'Din Kültürü ve Ahlak Bilgisi',
    grade10Subject: 'Din Kültürü ve Ahlak Bilgisi',
    grade11Subject: 'Din Kültürü ve Ahlak Bilgisi',
    grade12Subject: 'Din Kültürü ve Ahlak Bilgisi',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-3',
    date: '2024-11-05',
    dayOfWeek: 'Salı',
    period: 3,
    periodLabel: '3. Ders (10:20 - 11:00)',
    grade9Subject: 'Tarih',
    grade10Subject: 'Tarih',
    grade11Subject: 'Tarih',
    grade12Subject: 'T.C. İnkılap Tarihi',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-4',
    date: '2024-11-05',
    dayOfWeek: 'Salı',
    period: 6,
    periodLabel: '6. Ders (13:10 - 13:50)',
    grade9Subject: 'Coğrafya',
    grade10Subject: 'Coğrafya',
    grade11Subject: '— (Ders İşlenecek)',
    grade12Subject: '— (Ders İşlenecek)',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-5',
    date: '2024-11-06',
    dayOfWeek: 'Çarşamba',
    period: 3,
    periodLabel: '3. Ders (10:20 - 11:00)',
    grade9Subject: 'Matematik',
    grade10Subject: 'Matematik',
    grade11Subject: 'Matematik',
    grade12Subject: 'Matematik',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-6',
    date: '2024-11-07',
    dayOfWeek: 'Perşembe',
    period: 2,
    periodLabel: '2. Ders (09:30 - 10:10)',
    grade9Subject: 'Fizik',
    grade10Subject: 'Fizik',
    grade11Subject: 'Fizik',
    grade12Subject: 'Felsefe',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-7',
    date: '2024-11-07',
    dayOfWeek: 'Perşembe',
    period: 5,
    periodLabel: '5. Ders (11:50 - 12:30)',
    grade9Subject: 'Kimya',
    grade10Subject: 'Kimya',
    grade11Subject: 'Kimya',
    grade12Subject: '— (Ders İşlenecek)',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-8',
    date: '2024-11-08',
    dayOfWeek: 'Cuma',
    period: 3,
    periodLabel: '3. Ders (10:20 - 11:00)',
    grade9Subject: 'İngilizce',
    grade10Subject: 'İngilizce',
    grade11Subject: 'İngilizce',
    grade12Subject: 'İngilizce',
    examType: 'Kelebek Sistemi',
  },
  {
    id: 'bs-9',
    date: '2024-11-08',
    dayOfWeek: 'Cuma',
    period: 5,
    periodLabel: '5. Ders (11:50 - 12:30)',
    grade9Subject: 'Biyoloji',
    grade10Subject: 'Biyoloji',
    grade11Subject: 'Biyoloji (11-A, 11-B)',
    grade11Configs: [{ subject: 'Biyoloji', classes: ['11-A', '11-B'], isAllClasses: false }],
    grade12Subject: '— (Ders İşlenecek)',
    examType: 'Kelebek Sistemi',
  },
];

export const ExamScheduleSection: React.FC<ExamScheduleSectionProps> = ({
  exams,
  setExams,
  subjects,
  setSubjects,
  availableClasses,
  classrooms = [],
  students = [],
  teachers = [],
  activeExamId,
  setActiveExamId,
  onNavigateToExamTab,
  onNavigateToSeatingPlan,
  onRegisterPrintHandler,
}) => {
  const scheduleDocRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);

  // Check if embedded in an iframe (e.g. AI Studio preview)
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Pano Sınav Oturumları (Kullanıcının 10 gün önceden bağımsız hazırladığı takvim)
  const [boardSessions, setBoardSessions] = useState<BoardExamItem[]>(() => {
    try {
      const saved = localStorage.getItem('school_board_exam_schedule');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return initialBoardSessions;
  });

  // Save board sessions to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem('school_board_exam_schedule', JSON.stringify(boardSessions));
    } catch (e) {
      console.error(e);
    }
  }, [boardSessions]);

  // User's custom school sections (stored in localStorage)
  const [customClasses, setCustomClasses] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('school_custom_classes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  const [newSectionInput, setNewSectionInput] = useState('');

  // Helper to extract all sections for a grade incorporating all program sources (Gözetmen Programı, Sınav Programı, etc.)
  const getGradeSections = (grade: '9' | '10' | '11' | '12') => {
    return getSectionsForGrade(grade, availableClasses, customClasses, classrooms, students, exams, teachers);
  };

  // Specifically identify which branches were detected from Gözetmen Programı (Öğretmen Ders Programı)
  const supervisorClassesByGrade = useMemo(() => {
    const map: Record<'9' | '10' | '11' | '12', string[]> = { '9': [], '10': [], '11': [], '12': [] };
    const classes = getSupervisorProgramClasses(teachers);
    classes.forEach(cls => {
      const gr = extractGradeFromClass(cls);
      if (gr && !map[gr].some(existing => isClassMatching(existing, cls))) {
        map[gr].push(cls);
      }
    });
    (['9', '10', '11', '12'] as const).forEach(gr => {
      map[gr].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
    });
    return map;
  }, [teachers]);

  // Specifically identify which branches were detected from Sınav Programı (Sınava Girecek Sınıf Ata)
  const examProgramClassesByGrade = useMemo(() => {
    const map: Record<'9' | '10' | '11' | '12', string[]> = { '9': [], '10': [], '11': [], '12': [] };
    const classes = getExamProgramClasses(exams);
    classes.forEach(cls => {
      const gr = extractGradeFromClass(cls);
      if (gr && !map[gr].some(existing => isClassMatching(existing, cls))) {
        map[gr].push(cls);
      }
    });
    (['9', '10', '11', '12'] as const).forEach(gr => {
      map[gr].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
    });
    return map;
  }, [exams]);

  // Specifically identify which branches were detected from the exam classrooms/halls
  const classroomSectionsByGrade = useMemo(() => {
    const map: Record<'9' | '10' | '11' | '12', string[]> = { '9': [], '10': [], '11': [], '12': [] };
    (classrooms || []).forEach(c => {
      if (c && c.name) {
        const clean = formatSectionDisplayLabel(c.name);
        const gr = extractGradeFromClass(clean);
        if (gr && !map[gr].some(existing => isClassMatching(existing, clean))) {
          map[gr].push(clean);
        }
        const classes = extractClassesFromClassroomName(c.name);
        classes.forEach(cls => {
          const g = extractGradeFromClass(cls);
          if (g && !map[g].some(existing => isClassMatching(existing, cls))) {
            map[g].push(cls);
          }
        });
      }
    });
    (['9', '10', '11', '12'] as const).forEach(gr => {
      map[gr].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
    });
    return map;
  }, [classrooms]);

  const handleAddCustomSection = (grade: string, sectionLetterOrName: string) => {
    const raw = sectionLetterOrName.trim();
    if (!raw) return;

    // Support multiple comma-separated entries, e.g. "11-C, 11-D, 11-E" or "C, D, E"
    const parts = raw.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);
    const toAdd: string[] = [];

    parts.forEach(part => {
      let finalName = part.toUpperCase();
      // If user typed just "C" or "E" while on grade "11", turn into "11-C"
      if (!finalName.includes(grade) && /^[A-ZÇĞİÖŞÜ0-9]+$/i.test(finalName)) {
        finalName = `${grade}-${finalName}`;
      }
      toAdd.push(finalName);
    });

    const updated = Array.from(new Set([...customClasses, ...toAdd]));
    setCustomClasses(updated);
    try {
      localStorage.setItem('school_custom_classes', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
    showToast(`✓ ${toAdd.join(', ')} şubesi eklendi.`);
  };

  const handleRemoveCustomSection = (sectionToRemove: string) => {
    const updated = customClasses.filter(c => !isClassMatching(c, sectionToRemove));
    setCustomClasses(updated);
    try {
      localStorage.setItem('school_custom_classes', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
    showToast(`${sectionToRemove} şubesi kaldırıldı.`);
  };

  // Pano Resmi Başlık & İdare Bilgileri
  const [schoolName, setSchoolName] = useState<string>(() => {
    return localStorage.getItem('school_name_schedule') || 'ŞEHİT MEHMET ŞENGÜL ANADOLU LİSESİ';
  });
  const [academicYearTerm, setAcademicYearTerm] = useState<string>(() => {
    return (
      localStorage.getItem('term_name_schedule') ||
      '2024-2025 EĞİTİM ÖĞRETİM YILI 1. DÖNEM 1. ORTAK SINAV TAKVİMİ'
    );
  });
  const [principalName, setPrincipalName] = useState<string>(() => {
    return localStorage.getItem('principal_name_schedule') || 'Ahmet YILMAZ';
  });
  const [vicePrincipalName, setVicePrincipalName] = useState<string>(() => {
    return localStorage.getItem('vp_name_schedule') || 'Mehmet KAYA';
  });
  // İmzaların altındaki tarih (Yıl değiştirilebilir)
  const [approvalDate, setApprovalDate] = useState<string>(() => {
    return localStorage.getItem('approval_date_schedule') || '24.10.2024';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL'); // ALL, 9, 10, 11, 12
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Page orientation for export and print: 'portrait' (Dikey) or 'landscape' (Yatay)
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape'>(() => {
    return (localStorage.getItem('board_schedule_orientation') as 'portrait' | 'landscape') || 'portrait';
  });

  const handleSetOrientation = (orient: 'portrait' | 'landscape') => {
    setPageOrientation(orient);
    try {
      localStorage.setItem('board_schedule_orientation', orient);
    } catch {
      // ignore
    }
    showToast(`✓ Çıktı ve PDF sayfa yönü "${orient === 'landscape' ? 'Yatay (A4 Landscape)' : 'Dikey (A4 Portrait)'}" olarak ayarlandı.`);
  };

  // Dynamically configure native browser @page rule for print dialog
  useEffect(() => {
    let styleTag = document.getElementById('board-schedule-page-orientation-style') as HTMLStyleElement | null;
    if (pageOrientation === 'landscape') {
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'board-schedule-page-orientation-style';
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = `
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 4mm !important;
          }
        }
      `;
    } else {
      if (styleTag) {
        styleTag.textContent = `
          @media print {
            @page {
              size: A4 portrait !important;
              margin: 4mm !important;
            }
          }
        `;
      }
    }
  }, [pageOrientation]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. High-resolution A4 PDF Export (Works in both Portrait and Landscape)
  const handleDownloadPdf = async () => {
    if (!scheduleDocRef.current) return;
    const isLandscape = pageOrientation === 'landscape';
    try {
      setIsExportingPdf(true);
      showToast(`Pano sınav takvimi ${isLandscape ? 'Yatay (Landscape)' : 'Dikey (Portrait)'} resmi A4 PDF olarak hazırlanıyor...`);
      await exportToPdf(scheduleDocRef.current, {
        filename: `Okul_Pano_Ortak_Sinav_Takvimi_${isLandscape ? 'Yatay' : 'Dikey'}.pdf`,
        orientation: pageOrientation,
        onProgress: (current, total) => setPdfProgress({ current, total }),
      });
      showToast(`✓ Pano Sınav Takvimi (${isLandscape ? 'Yatay' : 'Dikey'}) PDF olarak başarıyla indirildi!`);
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('PDF oluşturulurken bir hata oluştu.');
    } finally {
      setIsExportingPdf(false);
      setPdfProgress(null);
    }
  };

  // 2. Isolated print mode for Noticeboard Exam Schedule ONLY (Hides everything else in #root)
  const handlePrintBoardSchedule = async () => {
    if (!scheduleDocRef.current) return;
    const isLandscape = pageOrientation === 'landscape';
    if (isInIframe) {
      // In an iframe (AI Studio preview environment), browser security blocks window.print() modal dialogs.
      // Automatically generate and download the high-resolution print PDF directly!
      showToast(`Önizleme ortamında doğrudan yazdırma yerine ${isLandscape ? 'yatay' : 'dikey'} resmi A4 PDF hazırlanıyor...`);
      await handleDownloadPdf();
      return;
    }

    try {
      document.body.classList.add('is-printing-board-schedule');
      if (isLandscape) {
        document.body.classList.add('is-landscape-print');
      }
      const cleanUp = () => {
        document.body.classList.remove('is-printing-board-schedule');
        document.body.classList.remove('is-landscape-print');
        window.removeEventListener('afterprint', cleanUp);
      };
      window.addEventListener('afterprint', cleanUp, { once: true });
      setTimeout(cleanUp, 4000);

      printElementDirectly(scheduleDocRef.current, {
        title: 'Okul_Pano_Ortak_Sinav_Takvimi',
        landscape: isLandscape,
      });
    } catch (err) {
      console.warn('Native print failed, falling back to PDF download:', err);
      document.body.classList.remove('is-printing-board-schedule');
      document.body.classList.remove('is-landscape-print');
      await handleDownloadPdf();
    }
  };

  // Register print handler so the Navbar "Yazdır" button can invoke it when activeTab === 10
  const printHandlerRef = useRef(handlePrintBoardSchedule);
  printHandlerRef.current = handlePrintBoardSchedule;

  useEffect(() => {
    if (onRegisterPrintHandler) {
      onRegisterPrintHandler(() => {
        printHandlerRef.current?.();
      });
    }
    return () => {
      onRegisterPrintHandler?.(null as any);
    };
  }, [onRegisterPrintHandler]);

  // Modal State for Adding/Editing a Session
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Form State
  const [formDate, setFormDate] = useState('2024-11-04');
  const [formDayOfWeek, setFormDayOfWeek] = useState('Pazartesi');
  const [formPeriod, setFormPeriod] = useState(2);
  const [formPeriodLabel, setFormPeriodLabel] = useState('2. Ders (09:30 - 10:10)');
  const [formG9, setFormG9] = useState('Türk Dili ve Edebiyatı');
  const [formG10, setFormG10] = useState('Türk Dili ve Edebiyatı');
  const [formG11, setFormG11] = useState('Türk Dili ve Edebiyatı');
  const [formG12, setFormG12] = useState('Türk Dili ve Edebiyatı');
  const [formConfigs9, setFormConfigs9] = useState<GradeSubjectConfig[]>([]);
  const [formConfigs10, setFormConfigs10] = useState<GradeSubjectConfig[]>([]);
  const [formConfigs11, setFormConfigs11] = useState<GradeSubjectConfig[]>([]);
  const [formConfigs12, setFormConfigs12] = useState<GradeSubjectConfig[]>([]);
  const [activeModalGrade, setActiveModalGrade] = useState<'9' | '10' | '11' | '12'>('11');
  const [formExamType, setFormExamType] = useState('Kelebek Sistemi');

  // Helper: Automatically set day of week from date
  const handleDateChange = (val: string) => {
    setFormDate(val);
    try {
      const d = new Date(val);
      const dayIndex = d.getDay();
      const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      if (days[dayIndex]) {
        setFormDayOfWeek(days[dayIndex]);
      }
    } catch {
      // ignore
    }
  };

  // Open modal for new session
  const handleOpenNewSession = () => {
    setEditingSessionId(null);
    const today = new Date().toISOString().split('T')[0];
    setFormDate(today);
    handleDateChange(today);
    setFormPeriod(3);
    setFormPeriodLabel(formatPeriodWithTimes(3));

    const g9Secs = getGradeSections('9');
    const g10Secs = getGradeSections('10');
    const g11Secs = getGradeSections('11');
    const g12Secs = getGradeSections('12');

    const c9 = [{ subject: 'Matematik', classes: g9Secs, isAllClasses: true }];
    const c10 = [{ subject: 'Matematik', classes: g10Secs, isAllClasses: true }];
    const c11 = [{ subject: 'Matematik', classes: g11Secs, isAllClasses: true }];
    const c12 = [{ subject: 'Matematik', classes: g12Secs, isAllClasses: true }];

    setFormConfigs9(c9);
    setFormConfigs10(c10);
    setFormConfigs11(c11);
    setFormConfigs12(c12);

    setFormG9('Matematik');
    setFormG10('Matematik');
    setFormG11('Matematik');
    setFormG12('Matematik');
    setFormExamType('Kelebek Sistemi');
    setActiveModalGrade('11');
    setSessionModalOpen(true);
  };

  // Open modal for editing existing session
  const handleOpenEditSession = (session: BoardExamItem) => {
    setEditingSessionId(session.id);
    setFormDate(session.date);
    setFormDayOfWeek(session.dayOfWeek);
    setFormPeriod(session.period);
    setFormPeriodLabel(session.periodLabel);

    const c9 = getEffectiveConfigs(session, '9', availableClasses, customClasses, classrooms, students, exams, teachers);
    const c10 = getEffectiveConfigs(session, '10', availableClasses, customClasses, classrooms, students, exams, teachers);
    const c11 = getEffectiveConfigs(session, '11', availableClasses, customClasses, classrooms, students, exams, teachers);
    const c12 = getEffectiveConfigs(session, '12', availableClasses, customClasses, classrooms, students, exams, teachers);

    setFormConfigs9(c9);
    setFormConfigs10(c10);
    setFormConfigs11(c11);
    setFormConfigs12(c12);

    setFormG9(session.grade9Subject || formatConfigsToSubjectText(c9));
    setFormG10(session.grade10Subject || formatConfigsToSubjectText(c10));
    setFormG11(session.grade11Subject || formatConfigsToSubjectText(c11));
    setFormG12(session.grade12Subject || formatConfigsToSubjectText(c12));
    setFormExamType(session.examType || 'Kelebek Sistemi');
    setActiveModalGrade('11');
    setSessionModalOpen(true);
  };

  // Find any exams in Sınav Programı that match the current modal session's date/period
  const matchingExamForSession = useMemo(() => {
    return (
      (exams || []).find(e => {
        const dateMatch = e.date === formDate;
        const periodMatch = e.period === formPeriod || (e.periodLabel && e.periodLabel === formPeriodLabel);
        return dateMatch && periodMatch;
      }) ||
      (exams || []).find(e => e.date === formDate) ||
      null
    );
  }, [exams, formDate, formPeriod, formPeriodLabel]);

  // Handler: 1-click auto-assign classes from Gözetmen Programı for the active grade or all grades
  const handleAssignFromSupervisorProgram = (targetGrade?: '9' | '10' | '11' | '12') => {
    const gradesToAssign: ('9' | '10' | '11' | '12')[] = targetGrade ? [targetGrade] : ['9', '10', '11', '12'];
    let assignedCount = 0;

    gradesToAssign.forEach(gr => {
      const supClasses = supervisorClassesByGrade[gr];
      if (supClasses && supClasses.length > 0) {
        const currentCfgs = getModalGradeConfigs(gr);
        const existingSub =
          currentCfgs[0]?.subject &&
          currentCfgs[0].subject !== '— (Ders İşlenecek)' &&
          currentCfgs[0].subject !== '-'
            ? currentCfgs[0].subject
            : (matchingExamForSession ? matchingExamForSession.name : 'Matematik');

        updateModalGradeConfigs(gr, [
          {
            subject: existingSub,
            classes: supClasses,
            isAllClasses: false,
          },
        ]);
        assignedCount += supClasses.length;
      }
    });

    if (assignedCount > 0) {
      showToast(`✓ Gözetmen programından ${assignedCount} şube başarıyla atandı.`);
    } else {
      showToast('Gözetmen programında bu kademe için kayıtlı şube bulunamadı.');
    }
  };

  // Handler: 1-click auto-assign classes from Sınav Programı for the active grade or all grades
  const handleAssignFromExamProgram = (targetGrade?: '9' | '10' | '11' | '12') => {
    const gradesToAssign: ('9' | '10' | '11' | '12')[] = targetGrade ? [targetGrade] : ['9', '10', '11', '12'];
    let assignedCount = 0;

    gradesToAssign.forEach(gr => {
      let examClasses = examProgramClassesByGrade[gr];
      let subName = '';

      if (matchingExamForSession) {
        const matchingForGrade = (matchingExamForSession.assignedClasses || [])
          .map(ac => ac.classLevel.trim())
          .filter(cls => extractGradeFromClass(cls) === gr);
        if (matchingForGrade.length > 0) {
          examClasses = matchingForGrade;
          const subObj = subjects.find(s => s.id === matchingExamForSession.subjectId);
          subName = subObj ? subObj.name : matchingExamForSession.name;
        }
      }

      if (examClasses && examClasses.length > 0) {
        const currentCfgs = getModalGradeConfigs(gr);
        const existingSub =
          subName ||
          (currentCfgs[0]?.subject &&
          currentCfgs[0].subject !== '— (Ders İşlenecek)' &&
          currentCfgs[0].subject !== '-'
            ? currentCfgs[0].subject
            : 'Türk Dili ve Edebiyatı');

        updateModalGradeConfigs(gr, [
          {
            subject: existingSub,
            classes: examClasses,
            isAllClasses: false,
          },
        ]);
        assignedCount += examClasses.length;
      }
    });

    if (assignedCount > 0) {
      showToast(`✓ Sınav programından ${assignedCount} şube başarıyla atandı.`);
    } else {
      showToast('Sınav programında bu kademe için atanmış şube bulunamadı.');
    }
  };

  // Save session from modal
  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate) {
      showToast('Lütfen bir sınav tarihi giriniz.');
      return;
    }

    const g9Text = formatConfigsToSubjectText(formConfigs9);
    const g10Text = formatConfigsToSubjectText(formConfigs10);
    const g11Text = formatConfigsToSubjectText(formConfigs11);
    const g12Text = formatConfigsToSubjectText(formConfigs12);

    if (editingSessionId) {
      setBoardSessions(prev =>
        prev.map(s =>
          s.id === editingSessionId
            ? {
                ...s,
                date: formDate,
                dayOfWeek: formDayOfWeek,
                period: formPeriod,
                periodLabel: formPeriodLabel.trim() || `${formPeriod}. Ders`,
                grade9Subject: g9Text,
                grade10Subject: g10Text,
                grade11Subject: g11Text,
                grade12Subject: g12Text,
                grade9Configs: formConfigs9,
                grade10Configs: formConfigs10,
                grade11Configs: formConfigs11,
                grade12Configs: formConfigs12,
                examType: formExamType,
              }
            : s
        )
      );
      showToast('Sınav oturumu güncellendi.');
    } else {
      const newSession: BoardExamItem = {
        id: `bs-${Date.now()}`,
        date: formDate,
        dayOfWeek: formDayOfWeek,
        period: formPeriod,
        periodLabel: formPeriodLabel.trim() || `${formPeriod}. Ders`,
        grade9Subject: g9Text,
        grade10Subject: g10Text,
        grade11Subject: g11Text,
        grade12Subject: g12Text,
        grade9Configs: formConfigs9,
        grade10Configs: formConfigs10,
        grade11Configs: formConfigs11,
        grade12Configs: formConfigs12,
        examType: formExamType,
      };
      setBoardSessions(prev => [...prev, newSession]);
      showToast('Yeni sınav oturumu takvime eklendi.');
    }
    setSessionModalOpen(false);
  };

  // Delete session
  const handleDeleteSession = (id: string) => {
    setBoardSessions(prev => prev.filter(s => s.id !== id));
    showToast('Sınav oturumu takvimden silindi.');
  };

  // Save board settings
  const handleSaveSettings = () => {
    localStorage.setItem('school_name_schedule', schoolName);
    localStorage.setItem('term_name_schedule', academicYearTerm);
    localStorage.setItem('principal_name_schedule', principalName);
    localStorage.setItem('vp_name_schedule', vicePrincipalName);
    localStorage.setItem('approval_date_schedule', approvalDate);
    setIsSettingsOpen(false);
    showToast('Pano başlık ve onay bilgileri kaydedildi.');
  };

  // Reset to default sample board schedule
  const handleResetToSampleBoard = () => {
    setBoardSessions(initialBoardSessions);
    showToast('Pano takvimi zengin örnek okul sınav haftasıyla yenilendi.');
  };

  // Sort sessions chronologically
  const sortedSessions = useMemo(() => {
    return [...boardSessions].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (a.period || 0) - (b.period || 0);
    });
  }, [boardSessions]);

  // Format Date TR
  const formatTRDate = (isoDate: string): string => {
    if (!isoDate) return '';
    if (isoDate.includes('.')) return isoDate;
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return isoDate;
  };

  // --- 🚀 TRANSFER BOARD SCHEDULE TO EXAM PROGRAM (CRITICAL USER REQUEST) ---
  const handleTransferToExamProgram = () => {
    if (boardSessions.length === 0) {
      showToast('Aktarılacak sınav oturumu bulunamadı. Lütfen önce takvime sınav ekleyiniz.');
      return;
    }

    // Combine availableClasses and customClasses
    const classesToUse = Array.from(new Set([...availableClasses, ...customClasses]));

    // 1. Collect all distinct subjects from board sessions and ensure they exist in subjects state
    const distinctSubjectNames = new Set<string>();
    boardSessions.forEach(s => {
      (['9', '10', '11', '12'] as const).forEach(grade => {
        const configs = getEffectiveConfigs(s, grade, classesToUse, customClasses, classrooms, students, exams, teachers);
        configs.forEach(cfg => {
          if (
            cfg.subject &&
            cfg.subject !== '— (Ders İşlenecek)' &&
            cfg.subject !== '-' &&
            cfg.subject.trim().length > 0
          ) {
            distinctSubjectNames.add(cfg.subject.trim());
          }
        });
      });
    });

    // Create missing subjects
    const updatedSubjects = [...subjects];
    distinctSubjectNames.forEach(subName => {
      const exists = updatedSubjects.some(
        s => s.name.trim().toLowerCase() === subName.toLowerCase()
      );
      if (!exists) {
        updatedSubjects.push({
          id: `sub-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: subName,
          code: subName.substring(0, 3).toUpperCase(),
          teachers: [],
        });
      }
    });
    setSubjects(updatedSubjects);

    // 2. Generate Exam objects for each board session with exact section targeting
    const newExams: Exam[] = sortedSessions.map((session, idx) => {
      const assignedClasses: ExamClassAssignment[] = [];
      const sessionSubjects: string[] = [];

      (['9', '10', '11', '12'] as const).forEach(grade => {
        const configs = getEffectiveConfigs(session, grade, classesToUse, customClasses, classrooms, students, exams, teachers);
        const gradeSections = getSectionsForGrade(grade, classesToUse, customClasses, classrooms, students, exams, teachers);

        configs.forEach(cfg => {
          if (
            !cfg.subject ||
            cfg.subject === '— (Ders İşlenecek)' ||
            cfg.subject === '-' ||
            cfg.subject.trim().length === 0
          ) {
            return;
          }

          sessionSubjects.push(cfg.subject);
          const subObj = updatedSubjects.find(
            s => s.name.trim().toLowerCase() === cfg.subject.toLowerCase()
          );
          const subjectId = subObj ? subObj.id : `sub-auto-${session.id}`;

          if (cfg.isAllClasses) {
            gradeSections.forEach(cls => {
              if (!assignedClasses.some(ac => ac.classLevel === cls)) {
                assignedClasses.push({
                  id: `ac-${session.id}-${cls}`,
                  classLevel: cls,
                  subjectId,
                  subjectName: cfg.subject,
                });
              }
            });
          } else {
            const targetSections = gradeSections.filter(sec =>
              cfg.classes?.some(c => isClassMatching(sec, c))
            );
            targetSections.forEach(cls => {
              if (!assignedClasses.some(ac => ac.classLevel === cls)) {
                assignedClasses.push({
                  id: `ac-${session.id}-${cls}`,
                  classLevel: cls,
                  subjectId,
                  subjectName: cfg.subject,
                });
              }
            });
          }
        });
      });

      const primarySubjectName = sessionSubjects[0] || 'Ortak Sınav';
      const foundSubject = updatedSubjects.find(
        s => s.name.trim().toLowerCase() === primarySubjectName.toLowerCase()
      );
      const subjectId = foundSubject ? foundSubject.id : updatedSubjects[0]?.id || `sub-gen-${idx}`;

      return {
        id: `exam-board-${session.id}`,
        name: `${formatTRDate(session.date)} ${session.dayOfWeek} ${session.periodLabel} - ${primarySubjectName}`,
        date: session.date,
        dayOfWeek: session.dayOfWeek as any,
        period: session.period,
        periodLabel: session.periodLabel,
        subjectId,
        subjectName: primarySubjectName,
        assignedClasses,
      };
    });

    setExams(newExams);
    if (newExams.length > 0) {
      setActiveExamId(newExams[0].id);
    }

    showToast(
      `🎉 Pano takvimindeki ${newExams.length} sınav başarıyla Sınav Programına aktarıldı!`
    );
  };

  // Helper to get configs for given grade in the modal
  const getModalGradeConfigs = (grade: '9' | '10' | '11' | '12'): GradeSubjectConfig[] => {
    switch (grade) {
      case '9':
        return formConfigs9;
      case '10':
        return formConfigs10;
      case '11':
        return formConfigs11;
      case '12':
        return formConfigs12;
    }
  };

  const updateModalGradeConfigs = (grade: '9' | '10' | '11' | '12', newConfigs: GradeSubjectConfig[]) => {
    switch (grade) {
      case '9':
        setFormConfigs9(newConfigs);
        setFormG9(formatConfigsToSubjectText(newConfigs));
        break;
      case '10':
        setFormConfigs10(newConfigs);
        setFormG10(formatConfigsToSubjectText(newConfigs));
        break;
      case '11':
        setFormConfigs11(newConfigs);
        setFormG11(formatConfigsToSubjectText(newConfigs));
        break;
      case '12':
        setFormConfigs12(newConfigs);
        setFormG12(formatConfigsToSubjectText(newConfigs));
        break;
    }
  };

  // Render a cell for the noticeboard table
  const renderGradeSubjectCell = (session: BoardExamItem, grade: '9' | '10' | '11' | '12') => {
    const configs = getEffectiveConfigs(session, grade, availableClasses, customClasses, classrooms, students, exams, teachers);
    const activeConfigs = configs.filter(
      c => c.subject && c.subject !== '— (Ders İşlenecek)' && c.subject !== '-' && c.subject.trim().length > 0
    );

    if (activeConfigs.length === 0) {
      return (
        <span className="text-slate-400 italic font-medium text-[11px]">
          — (Ders İşlenecek)
        </span>
      );
    }

    const allSections = getSectionsForGrade(grade, availableClasses, customClasses, classrooms, students, exams, teachers);

    return (
      <div className="flex flex-col items-center gap-1 py-0.5">
        {activeConfigs.map((cfg, idx) => {
          const isFullGrade =
            cfg.isAllClasses || (cfg.classes && cfg.classes.length >= allSections.length);
          return (
            <div key={idx} className="w-full flex flex-col items-center">
              <span className="font-black text-slate-900 text-[11.5px] leading-tight">
                {cfg.subject}
              </span>
              {/* Only show the branches that ARE taking the exam. Non-exam branches are NEVER listed. */}
              {!isFullGrade && cfg.classes && cfg.classes.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
                  {cfg.classes.map(cls => (
                    <span
                      key={cls}
                      className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200 print:border-slate-500 print:bg-slate-100 print:text-black"
                    >
                      {formatSectionDisplayLabel(cls)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-3 pb-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER & ACTION TOOLBAR (Hidden in Print) */}
      <div className="no-print bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-100 text-purple-800 font-black px-2 py-0.5 rounded text-[11px] shrink-0">
                PANO İLAN MERKEZİ
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Okul Ortak Sınav Takvimi & Pano İlanı
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sınavlardan 10 gün önce hazırlanarak öğrenci ve öğretmen panolarına asılacak resmi sınav ilanı çizelgesi.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Session */}
          <button
            onClick={handleOpenNewSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
            title="Takvime yeni gün ve sınav saati ekle"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Sınav Saati Ekle</span>
          </button>

          {/* Transfer to Exam Program Button */}
          <button
            onClick={handleTransferToExamProgram}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs shadow-md transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Takvime girdiğiniz tüm sınavları tek tıkla kelebek oturma düzeni programına aktarır"
          >
            <Send className="w-3.5 h-3.5 text-amber-300" />
            <span>Sınav Programına Aktar</span>
          </button>

          {/* School & Signature Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition cursor-pointer"
            title="Okul adı, onay tarihi, yıl ve müdür imza bilgilerini özelleştir"
          >
            <School className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pano Başlığı & İdare Onayı</span>
          </button>

          {/* Orientation Toggle: Dikey vs Yatay Çıktı */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => handleSetOrientation('portrait')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition cursor-pointer font-bold ${
                pageOrientation === 'portrait'
                  ? 'bg-purple-700 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Dikey A4 sayfa formatı (standart okul panosu)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📄 Dikey</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetOrientation('landscape')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition cursor-pointer font-bold ${
                pageOrientation === 'landscape'
                  ? 'bg-purple-700 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Yatay A4 sayfa formatı (geniş tablo ve ferah sütunlar)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>📐 Yatay Çıktı</span>
            </button>
          </div>

          {/* Download Official A4 PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-300 text-white font-extrabold px-3.5 py-1.5 rounded-lg text-xs shadow-md transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title={`Sadece bu sınav takvimini ${pageOrientation === 'landscape' ? 'yatay' : 'dikey'} yüksek çözünürlüklü MEB standartlarında A4 PDF dosyası olarak indirir`}
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
            ) : (
              <Download className="w-4 h-4 text-purple-200" />
            )}
            <span>
              {isExportingPdf
                ? pdfProgress
                  ? `Hazırlanıyor (${pdfProgress.current}/${pdfProgress.total})...`
                  : 'PDF Hazırlanıyor...'
                : pageOrientation === 'landscape'
                ? '📥 Yatay A4 PDF İndir'
                : '📥 Dikey A4 PDF İndir'}
            </span>
          </button>

          {/* Primary Print Button (Prints ONLY Noticeboard Schedule) */}
          <button
            onClick={handlePrintBoardSchedule}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold px-3.5 py-1.5 rounded-lg text-xs shadow-md transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title={`Sadece bu takvimi ${pageOrientation === 'landscape' ? 'yatay' : 'dikey'} yazdırır`}
          >
            <Printer className="w-4 h-4" />
            <span>{pageOrientation === 'landscape' ? '🖨️ Yatay Panoya Yazdır' : '🖨️ Panoya Asmak İçin Yazdır'}</span>
          </button>
        </div>
      </div>

      {/* 2. CUSTOMIZABLE SCHOOL HEADER SETTINGS ACCORDION (No Print) */}
      {isSettingsOpen && (
        <div className="no-print bg-indigo-50/70 border-2 border-indigo-200 rounded-xl p-4 text-xs space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-indigo-950 flex items-center gap-2">
              <School className="w-4 h-4 text-indigo-600" />
              <span>Resmi Pano İlanı & İdare Onay Bilgileri</span>
            </h4>
            <span className="text-[11px] text-indigo-700 font-medium">
              İmza altındaki tarih ve yıl dahil tüm bilgiler değiştirilebilir.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">Okul Adı:</label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                placeholder="Örn: ŞEHİT MEHMET ŞENGÜL ANADOLU LİSESİ"
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-slate-700 font-bold mb-1">Dönem & Sınav Başlığı:</label>
              <input
                type="text"
                value={academicYearTerm}
                onChange={e => setAcademicYearTerm(e.target.value)}
                placeholder="Örn: 2024-2025 EĞİTİM ÖĞRETİM YILI 1. DÖNEM 1. ORTAK SINAV TAKVİMİ"
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">İnceleyen (Müdür Yrd.):</label>
              <input
                type="text"
                value={vicePrincipalName}
                onChange={e => setVicePrincipalName(e.target.value)}
                placeholder="Örn: Mehmet KAYA"
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Onaylayan (Okul Müdürü):</label>
              <input
                type="text"
                value={principalName}
                onChange={e => setPrincipalName(e.target.value)}
                placeholder="Örn: Ahmet YILMAZ"
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Editable Approval Date / Year */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                İmza & Onay Tarihi (Yıl/Tarih):
              </label>
              <input
                type="text"
                value={approvalDate}
                onChange={e => setApprovalDate(e.target.value)}
                placeholder="24.10.2024"
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="flex items-end gap-2 lg:col-span-2">
              <button
                onClick={handleResetToSampleBoard}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold transition"
                title="Varsayılan örnek sınav haftası oturumlarını yükler"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Örnek Sınav Haftasını Yükle</span>
              </button>

              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-2xs transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SYNC BANNER WITH EXAM PROGRAM */}
      <div className="no-print bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="font-extrabold text-slate-900">
              Pano Takvimindeki Sınavları Oturma Düzeni Programına Aktarın
            </div>
            <div className="text-slate-500 text-[11px]">
              Panoya asmak için belirlediğiniz bu dersleri <strong>&quot;Sınav Programına Aktar&quot;</strong> butonuna basarak tek tıkla kelebek oturma düzeni motoruna gönderebilirsiniz.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTransferToExamProgram}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Takvimi Sınav Programına Aktar</span>
          </button>

          {onNavigateToSeatingPlan && (
            <button
              onClick={onNavigateToSeatingPlan}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition cursor-pointer"
            >
              <span>5. Oturma Düzenine Git</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. OFFICIAL NOTICEBOARD PRINTABLE DOCUMENT (A4 Optimized) */}
      <div
        id="board-schedule-print-document"
        ref={scheduleDocRef}
        data-pdf-page="true"
        data-orientation={pageOrientation}
        className={`bg-white rounded-2xl border-2 border-slate-300 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 print:w-full transition-all ${
          pageOrientation === 'landscape'
            ? 'p-5 sm:p-7 w-full max-w-[1240px] mx-auto'
            : 'p-6 sm:p-8 w-full max-w-4xl mx-auto'
        }`}
      >
        {/* Printable Official School Header */}
        <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
          <div className="text-xs font-bold tracking-widest text-slate-700 uppercase">
            T.C. MİLLÎ EĞİTİM BAKANLIĞI
          </div>
          <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase mt-0.5">
            {schoolName} MÜDÜRLÜĞÜ
          </div>
          <div className="inline-block bg-slate-900 text-white font-black text-xs sm:text-sm px-4 py-1 rounded-full uppercase tracking-wide mt-2">
            {academicYearTerm}
          </div>
          <div className="text-[11px] font-bold text-purple-900 tracking-wider uppercase mt-1.5 flex items-center justify-center gap-2">
            <span>📢 ÖĞRENCİ VE ÖĞRETMEN DUYURU PANOSU SINAV İLAN ÇİZELGESİ</span>
            <span className="no-print text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-black">
              {pageOrientation === 'landscape' ? '📐 Yatay Format' : '📄 Dikey Format'}
            </span>
          </div>
        </div>

        {/* Master Noticeboard Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-slate-800 text-xs">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-800 text-slate-900 font-black text-center uppercase tracking-wider text-[11px]">
                <th className="border border-slate-800 p-2 w-10">S.No</th>
                <th className={`border border-slate-800 p-2 ${pageOrientation === 'landscape' ? 'w-40' : 'w-32'}`}>Sınav Tarihi & Gün</th>
                <th className={`border border-slate-800 p-2 ${pageOrientation === 'landscape' ? 'w-44' : 'w-36'}`}>Ders Saati</th>
                <th className="border border-slate-800 p-2 font-black">9. Sınıflar</th>
                <th className="border border-slate-800 p-2 font-black">10. Sınıflar</th>
                <th className="border border-slate-800 p-2 font-black">11. Sınıflar</th>
                <th className="border border-slate-800 p-2 font-black">12. Sınıflar</th>
                <th className={`border border-slate-800 p-2 ${pageOrientation === 'landscape' ? 'w-36' : 'w-28'}`}>Sınav Şekli</th>
                <th className="border border-slate-800 p-2 w-20 no-print">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sortedSessions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                    Henüz takvime sınav oturumu eklenmedi. Yukarıdaki <strong>&quot;+ Sınav Saati Ekle&quot;</strong> butonuna basarak ilk sınavınızı ekleyebilirsiniz.
                  </td>
                </tr>
              ) : (
                sortedSessions.map((session, idx) => {
                  return (
                    <tr
                      key={session.id}
                      className="hover:bg-purple-50/30 transition text-center font-medium"
                    >
                      <td className="border border-slate-800 p-2 font-mono font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-800 p-2 font-bold text-slate-900 bg-slate-50/60">
                        <div>{formatTRDate(session.date)}</div>
                        <div className="text-[11px] text-purple-700 font-extrabold">
                          {session.dayOfWeek}
                        </div>
                      </td>
                      <td className="border border-slate-800 p-2 font-black text-indigo-950">
                        <div className="bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md text-[11.5px]">
                          {session.periodLabel}
                        </div>
                      </td>

                      {/* 9. Sınıf */}
                      <td className="border border-slate-800 p-2 text-center bg-amber-50/20">
                        {renderGradeSubjectCell(session, '9')}
                      </td>

                      {/* 10. Sınıf */}
                      <td className="border border-slate-800 p-2 text-center bg-amber-50/20">
                        {renderGradeSubjectCell(session, '10')}
                      </td>

                      {/* 11. Sınıf */}
                      <td className="border border-slate-800 p-2 text-center bg-amber-50/20">
                        {renderGradeSubjectCell(session, '11')}
                      </td>

                      {/* 12. Sınıf */}
                      <td className="border border-slate-800 p-2 text-center bg-amber-50/20">
                        {renderGradeSubjectCell(session, '12')}
                      </td>

                      <td className="border border-slate-800 p-2 text-[11px] font-bold text-slate-700 bg-slate-50/50">
                        {session.examType || 'Kelebek Sistemi'}
                      </td>

                      {/* Row Actions (No Print) */}
                      <td className="border border-slate-800 p-2 no-print">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditSession(session)}
                            className="p-1 hover:bg-indigo-100 text-indigo-700 rounded transition"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-1 hover:bg-rose-100 text-rose-700 rounded transition"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Official MEB Noticeboard Rules Box */}
        <div className="mt-6 border-2 border-slate-800 rounded-xl p-4 bg-slate-50 text-[11px] leading-relaxed text-slate-800">
          <div className="font-black uppercase text-xs text-slate-900 mb-2 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-700" />
            <span>ÖĞRENCİ VE VELİLERİMİZ İÇİN ÖNEMLİ ORTAK SINAV UYGULAMA KURALLARI:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 font-medium text-slate-700 pl-1">
            <li>
              Ortak sınavlar okul genelinde <strong>Kelebek (Karma) Oturma Düzeni</strong> ile yapılmaktadır. Öğrenciler kendi sınıflarında değil, her sınav öncesinde okul panosuna ve kapılara asılan <strong>Salon Yerleşim Çizelgesinde</strong> ilan edilen salonda ve belirlenen sıra numarasında sınava gireceklerdir.
            </li>
            <li>
              Öğrencilerimizin sınav başlama saatinden en az <strong>10 dakika önce</strong> ilgili sınav salonunda hazır bulunmaları gerekmektedir.
            </li>
            <li>
              Sınav salonlarına cep telefonu, akıllı saat, kulaklık ve her türlü elektronik iletişim aracı sokulması kesinlikle yasaktır.
            </li>
            <li>
              Öğrencilerimiz yanlarında geçerli kimlik belgesi, kurşun kalem, silgi ve kalemtıraş bulundurmakla yükümlüdür. Sınav esnasında araç-gereç alışverişi yapılamaz.
            </li>
            <li>
              Sağlık raporu olan öğrencilerin mazeret sınavları, MEB Ortaöğretim Kurumları Yönetmeliği uyarınca okul idaresi ve zümre öğretmenlerince ilan edilecek tarihlerde yapılacaktır.
            </li>
          </ol>
        </div>

        {/* Official Signatures & Seal Area (With Editable Year and Date) */}
        <div className="mt-8 pt-4 border-t-2 border-slate-800 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="text-slate-600 font-semibold">İnceleyen / Düzenleyen</div>
            <div className="font-black text-slate-900 text-sm mt-1">{vicePrincipalName}</div>
            <div className="text-[11px] text-slate-500 font-medium">Müdür Yardımcısı</div>
            {/* Editable Date under signature */}
            <div className="mt-6 font-mono text-[11px] text-slate-800 font-bold">
              {approvalDate}
            </div>
            <div className="text-slate-400 text-[10px]">İmza</div>
          </div>

          <div>
            <div className="text-slate-600 font-semibold">UYGUNDUR / ONAY</div>
            <div className="font-black text-slate-900 text-sm mt-1">{principalName}</div>
            <div className="text-[11px] text-slate-500 font-medium">Okul Müdürü</div>
            {/* Editable Date under signature */}
            <div className="mt-6 font-mono text-[11px] text-slate-800 font-bold">
              {approvalDate}
            </div>
            <div className="text-slate-400 text-[10px]">İmza - Mühür</div>
          </div>
        </div>
      </div>

      {/* 5. ADD / EDIT SESSION MODAL */}
      {sessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-300" />
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  {editingSessionId ? 'Sınav Saati Oturumunu Düzenle' : 'Takvime Yeni Sınav Saati Ekle'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSessionModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date Input with picker */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Sınav Tarihi:
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => handleDateChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    required
                  />
                </div>

                {/* Day of Week */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Gün Adı:</label>
                  <select
                    value={formDayOfWeek}
                    onChange={e => setFormDayOfWeek(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
                  >
                    <option value="Pazartesi">Pazartesi</option>
                    <option value="Salı">Salı</option>
                    <option value="Çarşamba">Çarşamba</option>
                    <option value="Perşembe">Perşembe</option>
                    <option value="Cuma">Cuma</option>
                    <option value="Cumartesi">Cumartesi</option>
                    <option value="Pazar">Pazar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Period Number */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ders Saati No:</label>
                  <select
                    value={formPeriod}
                    onChange={e => {
                      const p = parseInt(e.target.value, 10);
                      setFormPeriod(p);
                      setFormPeriodLabel(formatPeriodWithTimes(p));
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>
                        {num}. Ders Saati
                      </option>
                    ))}
                  </select>
                </div>

                {/* Period Label */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Ders Saati Etiketi & Saat Aralığı:
                  </label>
                  <input
                    type="text"
                    value={formPeriodLabel}
                    onChange={e => setFormPeriodLabel(e.target.value)}
                    placeholder="2. Ders (09:30 - 10:10)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Datalist for fast subject selection */}
              <datalist id="common-subjects-datalist">
                {Array.from(
                  new Set([
                    'Türk Dili ve Edebiyatı',
                    'Matematik',
                    'Fizik',
                    'Kimya',
                    'Biyoloji',
                    'Tarih',
                    'Coğrafya',
                    'Felsefe',
                    'İngilizce',
                    'Din Kültürü ve Ahlak Bilgisi',
                    'Almanca',
                    'Beden Eğitimi ve Spor',
                    'Görsel Sanatlar',
                    'Müzik',
                    ...subjects.map(s => s.name),
                  ])
                ).map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>

              {/* ADVANCED GRADE & SECTION EXAM CONFIGURATOR */}
              <div className="border-2 border-purple-300 rounded-xl bg-purple-50/40 overflow-hidden shadow-xs">
                {/* Header info */}
                <div className="bg-purple-900 text-white p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-300" />
                    <span className="font-extrabold text-xs tracking-wide">
                      Kademe ve Şube Bazlı Sınav Seçimi (9, 10, 11, 12. Sınıflar)
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-200 bg-purple-800/80 px-2 py-0.5 rounded font-semibold">
                    Bazı şubeler sınava girerken diğerleri ders işleyebilir
                  </span>
                </div>

                {/* Quick Program Sync & Auto-Assignment Action Bar */}
                <div className="bg-purple-950 px-3 py-2 border-b border-purple-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-purple-200 font-extrabold text-[11px] flex items-center gap-1">
                      ⚡ Hızlı Sınıf/Şube Ata:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAssignFromSupervisorProgram()}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer transition active:scale-95"
                      title="Gözetmen programındaki tüm şubeleri (AMP, ATP, MES) oturuma otomatik atar"
                    >
                      <span>📋 Gözetmen Programı Sınıflarını Ata</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAssignFromExamProgram()}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer transition active:scale-95"
                      title="Sınav programında sınava girecek sınıf ata bölümündeki sınıfları oturuma atar"
                    >
                      <span>📝 Sınav Programı Sınıflarını Ata</span>
                    </button>
                  </div>
                  {matchingExamForSession && (
                    <div className="flex items-center gap-1 bg-amber-400 text-amber-950 px-2 py-0.5 rounded font-black text-[10.5px]">
                      <span>✓ Bu Saatte Sınav Programı Sınavı: {matchingExamForSession.name}</span>
                    </div>
                  )}
                </div>

                {/* 4 Grade Tabs */}
                <div className="grid grid-cols-4 border-b border-purple-200 bg-purple-100/70 p-1.5 gap-1.5">
                  {(['9', '10', '11', '12'] as const).map(g => {
                    const configs = getModalGradeConfigs(g);
                    const active = configs.filter(
                      c =>
                        c.subject &&
                        c.subject !== '— (Ders İşlenecek)' &&
                        c.subject !== '-' &&
                        c.subject.trim().length > 0
                    );
                    const hasExam = active.length > 0;
                    const isSelected = activeModalGrade === g;
                    const allSecs = getGradeSections(g);

                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setActiveModalGrade(g)}
                        className={`py-2 px-2 rounded-xl text-center transition cursor-pointer flex flex-col items-center justify-center border ${
                          isSelected
                            ? 'bg-purple-700 text-white border-purple-800 shadow-sm ring-2 ring-purple-300'
                            : 'bg-white hover:bg-purple-50 text-slate-700 border-purple-200'
                        }`}
                      >
                        <span className="font-black text-xs">{g}. Sınıflar</span>
                        <span
                          className={`text-[9.5px] truncate max-w-full font-bold mt-0.5 ${
                            isSelected
                              ? 'text-purple-200'
                              : hasExam
                              ? 'text-indigo-700'
                              : 'text-slate-400 italic'
                          }`}
                        >
                          {hasExam
                            ? active
                                .map(c =>
                                  c.isAllClasses || (c.classes && c.classes.length >= allSecs.length)
                                    ? c.subject
                                    : `${c.subject} (${c.classes?.length || 0} şb)`
                                )
                                .join(', ')
                            : '— (Ders)'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Grade Content */}
                {(() => {
                  const currentGrade = activeModalGrade;
                  const allGradeSections = getGradeSections(currentGrade);
                  const currentConfigs = getModalGradeConfigs(currentGrade);

                  // Calculate unassigned sections in this grade
                  const coveredSections = new Set<string>();
                  currentConfigs.forEach(cfg => {
                    if (cfg.subject && cfg.subject !== '— (Ders İşlenecek)' && cfg.subject !== '-') {
                      if (cfg.isAllClasses) {
                        allGradeSections.forEach(s => coveredSections.add(s));
                      } else {
                        cfg.classes?.forEach(c => {
                          const matched = allGradeSections.find(s => isClassMatching(s, c));
                          if (matched) coveredSections.add(matched);
                          else coveredSections.add(c);
                        });
                      }
                    }
                  });
                  const unassignedSections = allGradeSections.filter(s => !coveredSections.has(s));

                  // Mode helpers
                  const isNoExam =
                    currentConfigs.length === 1 &&
                    (!currentConfigs[0].subject ||
                      currentConfigs[0].subject === '— (Ders İşlenecek)' ||
                      currentConfigs[0].subject === '-');

                  const isAllClassExam =
                    !isNoExam &&
                    currentConfigs.length === 1 &&
                    currentConfigs[0].isAllClasses;

                  return (
                    <div className="p-4 space-y-3.5 bg-white">
                      {/* Sub-header with quick mode buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                        <div>
                          <span className="font-extrabold text-sm text-slate-900">
                            {currentGrade}. Sınıfların Sınav Durumu
                          </span>
                          <span className="text-[11px] text-slate-500 ml-2">
                            (Toplam {allGradeSections.length} Şube: {allGradeSections.map(s => formatSectionDisplayLabel(s)).join(', ')})
                          </span>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              updateModalGradeConfigs(currentGrade, [
                                {
                                  subject: '— (Ders İşlenecek)',
                                  classes: allGradeSections,
                                  isAllClasses: true,
                                },
                              ]);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition cursor-pointer ${
                              isNoExam
                                ? 'bg-slate-700 text-white border-slate-800'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                            }`}
                          >
                            Ders İşlenecek (Sınav Yok)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const existingSub =
                                currentConfigs[0]?.subject &&
                                currentConfigs[0].subject !== '— (Ders İşlenecek)'
                                  ? currentConfigs[0].subject
                                  : 'Türk Dili ve Edebiyatı';
                              updateModalGradeConfigs(currentGrade, [
                                {
                                  subject: existingSub,
                                  classes: allGradeSections,
                                  isAllClasses: true,
                                },
                              ]);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition cursor-pointer ${
                              isAllClassExam
                                ? 'bg-purple-700 text-white border-purple-800'
                                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'
                            }`}
                          >
                            Tüm Şubeler Sınavda
                          </button>

                          {supervisorClassesByGrade[currentGrade]?.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleAssignFromSupervisorProgram(currentGrade)}
                              className="px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold border transition cursor-pointer bg-blue-50 text-blue-900 hover:bg-blue-100 border-blue-300 flex items-center gap-1"
                              title="Gözetmen programındaki sınıfları bu kademeye atar"
                            >
                              <span>📋 Gözetmen Şubelerini Ata ({supervisorClassesByGrade[currentGrade].length})</span>
                            </button>
                          )}

                          {examProgramClassesByGrade[currentGrade]?.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleAssignFromExamProgram(currentGrade)}
                              className="px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold border transition cursor-pointer bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border-emerald-300 flex items-center gap-1"
                              title="Sınav programında sınava girecek sınıfları bu kademeye atar"
                            >
                              <span>📝 Sınav Programı Şubelerini Ata ({examProgramClassesByGrade[currentGrade].length})</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const existingSub =
                                currentConfigs[0]?.subject &&
                                currentConfigs[0].subject !== '— (Ders İşlenecek)'
                                  ? currentConfigs[0].subject
                                  : 'Biyoloji';
                              const initialClasses =
                                supervisorClassesByGrade[currentGrade]?.length > 0
                                  ? supervisorClassesByGrade[currentGrade]
                                  : allGradeSections.slice(0, 2);
                              updateModalGradeConfigs(currentGrade, [
                                {
                                  subject: existingSub,
                                  classes: initialClasses,
                                  isAllClasses: false,
                                },
                              ]);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition cursor-pointer ${
                              !isNoExam && !isAllClassExam
                                ? 'bg-indigo-700 text-white border-indigo-800'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
                            }`}
                          >
                            🎯 Şube Bazlı Seçim (Kısmi)
                          </button>
                        </div>
                      </div>

                      {/* Active Grade Sources Banner */}
                      <div className="w-full bg-slate-50/90 border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="font-extrabold text-slate-800 text-[11px] flex items-center gap-1">
                            📋 {currentGrade}. Sınıf Şube Listesi &amp; Kaynak Programlar ({allGradeSections.length} Şube):
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Gözetmen programı ve sınav programındaki şubeler tam isimleriyle (AMP, ATP, MES) korunmaktadır.
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {allGradeSections.map(sec => {
                            const isSup = supervisorClassesByGrade[currentGrade]?.some(sc => isClassMatching(sc, sec));
                            const isEx = examProgramClassesByGrade[currentGrade]?.some(ec => isClassMatching(ec, sec));
                            const isRoom = classroomSectionsByGrade[currentGrade]?.some(rc => isClassMatching(rc, sec));

                            return (
                              <div
                                key={sec}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold shadow-2xs ${
                                  isSup
                                    ? 'bg-blue-50 text-blue-900 border-blue-300'
                                    : isEx
                                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                    : isRoom
                                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                                    : 'bg-white text-slate-700 border-slate-200'
                                }`}
                              >
                                <span>{formatSectionDisplayLabel(sec)}</span>
                                <span className={`text-[8.5px] px-1 py-0.2 rounded font-black tracking-tight ${
                                  isSup
                                    ? 'bg-blue-200 text-blue-950'
                                    : isEx
                                    ? 'bg-emerald-200 text-emerald-950'
                                    : isRoom
                                    ? 'bg-amber-200 text-amber-950'
                                    : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {isSup ? 'Gözetmen' : isEx ? 'Sınav' : isRoom ? 'Salon' : 'Şube'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* If "No Exam / Regular Class" */}
                      {isNoExam ? (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1.5">
                          <div className="font-extrabold text-slate-700 text-xs">
                            Bu ders saatinde {currentGrade}. sınıfların tüm şubelerinde normal ders işlenecektir.
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Sınav eklemek için yukarıdaki <strong>&quot;Tüm Şubeler Sınavda&quot;</strong> veya <strong>&quot;Şube Bazlı Seçim&quot;</strong> butonlarına tıklayabilirsiniz.
                          </div>
                        </div>
                      ) : (
                        /* Config Cards List */
                        <div className="space-y-3">
                          {currentConfigs.map((cfg, cfgIdx) => {
                            const isSpecific = !cfg.isAllClasses;
                            const selectedClasses = cfg.classes || [];

                            return (
                              <div
                                key={cfgIdx}
                                className="border border-slate-300 rounded-xl p-3 bg-slate-50/70 space-y-2.5 relative"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-purple-700 text-white text-[10px] font-black flex items-center justify-center">
                                      {cfgIdx + 1}
                                    </span>
                                    <span className="font-bold text-slate-900 text-xs">
                                      {currentGrade}. Sınıf Sınav Dersi:
                                    </span>
                                  </div>

                                  {/* Delete config row button if more than 1 */}
                                  {currentConfigs.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = currentConfigs.filter(
                                          (_, i) => i !== cfgIdx
                                        );
                                        updateModalGradeConfigs(currentGrade, updated);
                                      }}
                                      className="text-rose-600 hover:text-rose-800 text-[10.5px] font-bold flex items-center gap-1 hover:bg-rose-50 px-2 py-0.5 rounded cursor-pointer transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Bu Dersi Kaldır</span>
                                    </button>
                                  )}
                                </div>

                                {/* Subject Name input with datalist */}
                                <div>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      list="common-subjects-datalist"
                                      value={cfg.subject === '— (Ders İşlenecek)' ? '' : cfg.subject}
                                      onChange={e => {
                                        const val = e.target.value;
                                        const updated = currentConfigs.map((c, i) =>
                                          i === cfgIdx ? { ...c, subject: val } : c
                                        );
                                        updateModalGradeConfigs(currentGrade, updated);
                                      }}
                                      placeholder="Örn: Biyoloji, Matematik, Türk Dili ve Edebiyatı..."
                                      className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                      required
                                    />
                                  </div>

                                  {/* Quick suggestion tags */}
                                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                    <span className="text-[10px] font-semibold text-slate-500">
                                      Hızlı Seçim:
                                    </span>
                                    {[
                                      'Türk Dili ve Edebiyatı',
                                      'Matematik',
                                      'Fizik',
                                      'Kimya',
                                      'Biyoloji',
                                      'Tarih',
                                      'Coğrafya',
                                      'Felsefe',
                                      'İngilizce',
                                      'Din Kültürü',
                                    ].map(sub => (
                                      <button
                                        key={sub}
                                        type="button"
                                        onClick={() => {
                                          const updated = currentConfigs.map((c, i) =>
                                            i === cfgIdx ? { ...c, subject: sub } : c
                                          );
                                          updateModalGradeConfigs(currentGrade, updated);
                                        }}
                                        className="bg-white hover:bg-purple-100 hover:text-purple-900 text-slate-600 border border-slate-200 text-[10px] font-semibold px-1.5 py-0.5 rounded transition cursor-pointer"
                                      >
                                        {sub}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Scope: All classes vs Selected classes */}
                                <div className="pt-2 border-t border-slate-200">
                                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800 text-[11px]">
                                        Hangi şubeler bu sınava girecek?
                                      </span>
                                      <div className="flex bg-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = currentConfigs.map((c, i) =>
                                              i === cfgIdx
                                                ? {
                                                    ...c,
                                                    isAllClasses: true,
                                                    classes: allGradeSections,
                                                  }
                                                : c
                                            );
                                            updateModalGradeConfigs(currentGrade, updated);
                                          }}
                                          className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                                            !isSpecific
                                              ? 'bg-purple-700 text-white shadow-xs'
                                              : 'text-slate-600 hover:text-slate-900'
                                          }`}
                                        >
                                          Tüm Şubeler ({allGradeSections.length})
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = currentConfigs.map((c, i) =>
                                              i === cfgIdx
                                                ? {
                                                    ...c,
                                                    isAllClasses: false,
                                                    classes:
                                                      c.classes && c.classes.length > 0
                                                        ? c.classes
                                                        : allGradeSections.slice(0, 2),
                                                  }
                                                : c
                                            );
                                            updateModalGradeConfigs(currentGrade, updated);
                                          }}
                                          className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                                            isSpecific
                                              ? 'bg-purple-700 text-white shadow-xs'
                                              : 'text-slate-600 hover:text-slate-900'
                                          }`}
                                        >
                                          Belirli Şubeler ({selectedClasses.length})
                                        </button>
                                      </div>
                                    </div>

                                    {isSpecific && (
                                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                        {supervisorClassesByGrade[currentGrade]?.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const supSecs = supervisorClassesByGrade[currentGrade];
                                              const updated = currentConfigs.map((c, i) =>
                                                i === cfgIdx
                                                  ? { ...c, classes: supSecs, isAllClasses: false }
                                                  : c
                                              );
                                              updateModalGradeConfigs(currentGrade, updated);
                                            }}
                                            className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-950 border border-blue-300 font-extrabold cursor-pointer flex items-center gap-1"
                                            title="Gözetmen / haftalık ders programındaki sınıfları bu sınava atar"
                                          >
                                            <span>📋 Gözetmen Programı Şubelerini Ata ({supervisorClassesByGrade[currentGrade].length})</span>
                                          </button>
                                        )}

                                        {examProgramClassesByGrade[currentGrade]?.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const exSecs = examProgramClassesByGrade[currentGrade];
                                              const updated = currentConfigs.map((c, i) =>
                                                i === cfgIdx
                                                  ? { ...c, classes: exSecs, isAllClasses: false }
                                                  : c
                                              );
                                              updateModalGradeConfigs(currentGrade, updated);
                                            }}
                                            className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 font-extrabold cursor-pointer flex items-center gap-1"
                                            title="Sınav programında sınava girecek sınıfları bu sınava atar"
                                          >
                                            <span>📝 Sınav Programı Şubelerini Ata ({examProgramClassesByGrade[currentGrade].length})</span>
                                          </button>
                                        )}

                                        {classroomSectionsByGrade[currentGrade]?.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const roomSecs = classroomSectionsByGrade[currentGrade];
                                              const updated = currentConfigs.map((c, i) =>
                                                i === cfgIdx
                                                  ? { ...c, classes: roomSecs, isAllClasses: false }
                                                  : c
                                              );
                                              updateModalGradeConfigs(currentGrade, updated);
                                            }}
                                            className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-extrabold cursor-pointer flex items-center gap-1"
                                            title="Sınav salonlarında kayıtlı olan şubeleri seçer"
                                          >
                                            <span>🏛️ Salon Şubeleri ({classroomSectionsByGrade[currentGrade].length})</span>
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = currentConfigs.map((c, i) =>
                                              i === cfgIdx
                                                ? { ...c, classes: allGradeSections, isAllClasses: false }
                                                : c
                                            );
                                            updateModalGradeConfigs(currentGrade, updated);
                                          }}
                                          className="text-purple-700 hover:underline font-bold cursor-pointer ml-1"
                                        >
                                          Tümünü Seç
                                        </button>
                                        <span className="text-slate-300">•</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = currentConfigs.map((c, i) =>
                                              i === cfgIdx ? { ...c, classes: [], isAllClasses: false } : c
                                            );
                                            updateModalGradeConfigs(currentGrade, updated);
                                          }}
                                          className="text-slate-500 hover:underline cursor-pointer"
                                        >
                                          Temizle
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Section Chips */}
                                  {isSpecific && (
                                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                                      <div className="flex flex-wrap gap-1.5">
                                        {allGradeSections.map(secName => {
                                          const isSelected = selectedClasses.some(c =>
                                            isClassMatching(c, secName)
                                          );
                                          const isFromSupervisor = supervisorClassesByGrade[currentGrade]?.some(sc =>
                                            isClassMatching(sc, secName)
                                          );
                                          const isFromExamProgram = examProgramClassesByGrade[currentGrade]?.some(ec =>
                                            isClassMatching(ec, secName)
                                          );
                                          const isFromClassroom = classroomSectionsByGrade[currentGrade]?.some(rs =>
                                            isClassMatching(rs, secName)
                                          );
                                          const cleanLabel = formatSectionDisplayLabel(secName);

                                          return (
                                            <button
                                              key={secName}
                                              type="button"
                                              onClick={() => {
                                                const updated = currentConfigs.map((c, i) => {
                                                  if (i !== cfgIdx) return c;
                                                  let nextClasses: string[];
                                                  if (isSelected) {
                                                    nextClasses = (c.classes || []).filter(
                                                      x => !isClassMatching(x, secName)
                                                    );
                                                  } else {
                                                    nextClasses = [...(c.classes || []), secName];
                                                  }
                                                  return {
                                                    ...c,
                                                    classes: nextClasses,
                                                    isAllClasses: false,
                                                  };
                                                });
                                                updateModalGradeConfigs(currentGrade, updated);
                                              }}
                                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer border ${
                                                isSelected
                                                  ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                                                  : isFromSupervisor
                                                  ? 'bg-blue-50/90 hover:bg-blue-100 text-blue-950 border-blue-300'
                                                  : isFromExamProgram
                                                  ? 'bg-emerald-50/90 hover:bg-emerald-100 text-emerald-950 border-emerald-300'
                                                  : isFromClassroom
                                                  ? 'bg-amber-50/80 hover:bg-amber-100 text-amber-950 border-amber-300'
                                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                                              }`}
                                            >
                                              <Check
                                                className={`w-3.5 h-3.5 ${
                                                  isSelected ? 'opacity-100 text-white' : 'opacity-0'
                                                }`}
                                              />
                                              <span>{cleanLabel}</span>
                                              {isFromSupervisor && (
                                                <span
                                                  className={`text-[8.5px] px-1 py-0.2 rounded font-black tracking-tight ${
                                                    isSelected
                                                      ? 'bg-blue-800 text-blue-100'
                                                      : 'bg-blue-200/90 text-blue-950 border border-blue-300'
                                                  }`}
                                                  title="Bu şube Gözetmen Programında (Öğretmen ders programı) mevcuttur"
                                                >
                                                  Gözetmen
                                                </span>
                                              )}
                                              {isFromExamProgram && (
                                                <span
                                                  className={`text-[8.5px] px-1 py-0.2 rounded font-black tracking-tight ${
                                                    isSelected
                                                      ? 'bg-emerald-800 text-emerald-100'
                                                      : 'bg-emerald-200/90 text-emerald-950 border border-emerald-300'
                                                  }`}
                                                  title="Bu şube Sınav Programında mevcuttur"
                                                >
                                                  Sınav
                                                </span>
                                              )}
                                              {isFromClassroom && !isFromSupervisor && !isFromExamProgram && (
                                                <span
                                                  className={`text-[8.5px] px-1 py-0.2 rounded font-black tracking-tight ${
                                                    isSelected
                                                      ? 'bg-amber-800 text-amber-100'
                                                      : 'bg-amber-200/90 text-amber-900 border border-amber-300'
                                                  }`}
                                                  title="Bu şube sınav salonlarında mevcuttur"
                                                >
                                                  Salon
                                                </span>
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {/* Quick Add missing section pills & manual section input */}
                                      <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-purple-50/70 p-2.5 rounded-lg text-xs">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="text-[11px] font-black text-purple-950 flex items-center gap-1">
                                            <Plus className="w-3.5 h-3.5 text-purple-700" />
                                            <span>{currentGrade}. Sınıfa Hızlı Şube Ekle:</span>
                                          </span>
                                          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M']
                                            .map(letter => `${currentGrade}-${letter}`)
                                            .filter(candidate => !allGradeSections.some(s => isClassMatching(s, candidate)))
                                            .slice(0, 6)
                                            .map(missingSection => (
                                              <button
                                                key={missingSection}
                                                type="button"
                                                onClick={() => handleAddCustomSection(currentGrade, missingSection)}
                                                className="px-2 py-0.5 rounded text-[11px] font-bold bg-white hover:bg-purple-200 text-purple-900 border border-purple-300 transition cursor-pointer flex items-center gap-0.5 shadow-2xs"
                                                title={`${missingSection} şubesini ekle`}
                                              >
                                                <span>+</span>
                                                <span>{missingSection}</span>
                                              </button>
                                            ))}
                                        </div>

                                        {/* Custom Section Manual Input */}
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="text"
                                            value={newSectionInput}
                                            onChange={e => setNewSectionInput(e.target.value)}
                                            placeholder={`Örn: ${currentGrade}-E veya C, D`}
                                            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 w-32 focus:outline-none focus:ring-1 focus:ring-purple-400"
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (newSectionInput.trim()) {
                                                  handleAddCustomSection(currentGrade, newSectionInput);
                                                  setNewSectionInput('');
                                                }
                                              }
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (newSectionInput.trim()) {
                                                handleAddCustomSection(currentGrade, newSectionInput);
                                                setNewSectionInput('');
                                              }
                                            }}
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white cursor-pointer transition shadow-2xs"
                                          >
                                            Şube Ekle
                                          </button>
                                        </div>
                                      </div>

                                      {selectedClasses.length === 0 && (
                                        <div className="text-[10px] text-amber-700 font-bold mt-1.5">
                                          ⚠️ Henüz bu sınav için şube seçmediniz. Lütfen en az bir şubeye tıklayınız.
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Remaining sections notification & action */}
                          {unassignedSections.length > 0 && (
                            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-[11px]">
                              <div>
                                <span className="font-extrabold text-amber-900 block">
                                  ℹ️ Kalan Şubeler ({unassignedSections.length}):{' '}
                                  <span className="font-mono text-amber-950 font-black">
                                    {unassignedSections
                                      .map(s => formatSectionDisplayLabel(s))
                                      .join(', ')}
                                  </span>
                                </span>
                                <span className="text-amber-700 text-[10.5px]">
                                  Bu şubeler bu saatte sınava girmeyecek, normal ders işleyeceklerdir.
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const newCfg: GradeSubjectConfig = {
                                    subject: 'Coğrafya',
                                    classes: unassignedSections,
                                    isAllClasses: false,
                                  };
                                  updateModalGradeConfigs(currentGrade, [
                                    ...currentConfigs,
                                    newCfg,
                                  ]);
                                }}
                                className="flex items-center gap-1 bg-amber-700 hover:bg-amber-800 text-white font-bold px-2.5 py-1 rounded-lg text-[10.5px] transition shadow-xs cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Kalan Şubelere Farklı Ders Sınavı Ata</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 4 Grade Overview Bar */}
                      <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px]">
                        {(['9', '10', '11', '12'] as const).map(g => {
                          const cfgs = getModalGradeConfigs(g);
                          const activeCfgs = cfgs.filter(
                            c =>
                              c.subject &&
                              c.subject !== '— (Ders İşlenecek)' &&
                              c.subject !== '-' &&
                              c.subject.trim().length > 0
                          );
                          const isCurrent = activeModalGrade === g;

                          return (
                            <div
                              key={g}
                              onClick={() => setActiveModalGrade(g)}
                              className={`p-1.5 rounded-lg border cursor-pointer transition ${
                                isCurrent
                                  ? 'bg-purple-50 border-purple-300'
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <div className="font-extrabold text-slate-800 flex items-center justify-between">
                                <span>{g}. Sınıflar</span>
                                {isCurrent && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-600 truncate mt-0.5">
                                {activeCfgs.length > 0
                                  ? activeCfgs
                                      .map(c =>
                                        c.isAllClasses
                                          ? c.subject
                                          : `${c.subject} (${c.classes?.length} şb)`
                                      )
                                      .join(' | ')
                                  : '— (Ders)'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Exam Type */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Sınav Şekli:</label>
                <select
                  value={formExamType}
                  onChange={e => setFormExamType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="Kelebek Sistemi">Kelebek Sistemi (Karma Salon Dağıtımı)</option>
                  <option value="Ortak Sınav">Ortak Sınav (Kendi Sınıfında)</option>
                  <option value="Ülke Geneli Ortak Sınav">MEB Ülke Geneli Ortak Sınav</option>
                  <option value="İl Geneli Ortak Sınav">İl Geneli Ortak Sınav</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSessionModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-2xs transition"
                >
                  {editingSessionId ? 'Güncelle' : 'Takvime Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
