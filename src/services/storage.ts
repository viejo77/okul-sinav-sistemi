import {
  Classroom,
  Exam,
  Student,
  Subject,
  Teacher,
  SeatingPlanResult,
  ResponsibilityExam,
  ResponsibilitySettings,
} from '../types';
import {
  initialSubjects,
  initialExams,
  initialClassrooms,
  initialTeachers,
  generateInitialStudents,
  initialResponsibilitySettings,
  generateInitialResponsibilityExams,
} from './mockData';

const STORAGE_KEY = 'kelebek_sinav_data_v1';

export interface AppStateData {
  subjects: Subject[];
  exams: Exam[];
  students: Student[];
  classrooms: Classroom[];
  teachers: Teacher[];
  activeExamId: string;
  lastPlan?: SeatingPlanResult;
  savedPlans?: Record<string, SeatingPlanResult>;
  responsibilityExams?: ResponsibilityExam[];
  responsibilitySettings?: ResponsibilitySettings;
}

export const getDefaultState = (): AppStateData => {
  const initialStudents = generateInitialStudents();
  return {
    subjects: initialSubjects,
    exams: initialExams,
    students: initialStudents,
    classrooms: initialClassrooms,
    teachers: initialTeachers,
    activeExamId: initialExams[0]?.id || '',
    savedPlans: {},
    responsibilitySettings: initialResponsibilitySettings,
    responsibilityExams: generateInitialResponsibilityExams(initialStudents),
  };
};

export const loadAppState = (): AppStateData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaultState = getDefaultState();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
      } catch (e) {
        console.error('Varsayılan durum yerel hafızaya kaydedilemedi:', e);
      }
      return defaultState;
    }
    const parsed = JSON.parse(raw);
    const students = parsed.students || [];
    return {
      subjects: parsed.subjects !== undefined ? parsed.subjects : initialSubjects,
      exams: parsed.exams || initialExams,
      students: students,
      classrooms: parsed.classrooms || initialClassrooms,
      teachers: parsed.teachers || initialTeachers,
      activeExamId: parsed.activeExamId || (parsed.exams?.[0]?.id ?? ''),
      lastPlan: parsed.lastPlan,
      savedPlans: parsed.savedPlans || {},
      responsibilitySettings: parsed.responsibilitySettings || initialResponsibilitySettings,
      responsibilityExams:
        parsed.responsibilityExams !== undefined
          ? parsed.responsibilityExams
          : generateInitialResponsibilityExams(students),
    };
  } catch (error) {
    console.error('Veri yüklenirken hata oluştu:', error);
    return getDefaultState();
  }
};

export const saveAppState = (state: Partial<AppStateData>): void => {
  try {
    let current: Partial<AppStateData> = {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        current = JSON.parse(raw);
      } catch {
        current = {};
      }
    }
    const merged = { ...current, ...state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error('Veri kaydedilirken hata oluştu:', error);
  }
};

export const clearAllData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Veri silinirken hata oluştu:', error);
  }
};

export const exportBackupFile = (state?: AppStateData): void => {
  const dataToExport = state || loadAppState();
  const dataStr =
    'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const now = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('download', `kelebek_sinav_yedek_${now}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

export const importBackupFile = (file: File): Promise<AppStateData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const parsed: AppStateData = JSON.parse(text);
        saveAppState(parsed);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = err => reject(err);
    reader.readAsText(file);
  });
};
