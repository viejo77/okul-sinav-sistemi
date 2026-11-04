import {
  Classroom,
  Exam,
  Student,
  Subject,
  Teacher,
  SeatingPlanResult,
  RoomSeatingPlan,
  SeatedStudentInfo,
} from '../types';

/**
 * Extracts grade level number from class level string (e.g. "9-A" -> "9", "ATP 9-A" -> "9", "AMP 9-B" -> "9", "MES9" -> "9", "10-C" -> "10", "11B" -> "11")
 */
export const getGradeLevel = (classLevel: string): string => {
  if (!classLevel) return '';
  const trimmed = classLevel.trim();
  // Check for 10, 11, 12, 9 bounded by non-digits or start/end (prioritize two-digit 10, 11, 12 before 9)
  const gradeMatch = trimmed.match(/(?:^|[^0-9])(10|11|12|9)(?:[^0-9]|$)/i);
  if (gradeMatch) {
    return gradeMatch[1];
  }
  // Secondary school fallback (5-8)
  const secMatch = trimmed.match(/(?:^|[^0-9])([5-8])(?:[^0-9]|$)/i);
  if (secMatch) {
    return secMatch[1];
  }
  // Primary school fallback (1-4)
  const primMatch = trimmed.match(/(?:^|[^0-9])([1-4])(?:[^0-9]|$)/i);
  if (primMatch) {
    return primMatch[1];
  }
  const digits = trimmed.match(/\d+/);
  return digits ? digits[0] : trimmed.toUpperCase();
};

/**
 * Shuffles an array randomly using Fisher-Yates
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface MultipleTeacherCandidate {
  id: string;
  name: string;
  branch: string;
  dutyCount: number;
  dutyDay: string;
}

export interface MultipleTeacherConflict {
  roomId: string;
  roomName: string;
  candidates: MultipleTeacherCandidate[];
  recommendedTeacherId: string;
}

export interface KelebekEngineInput {
  exam: Exam;
  subject: Subject;
  subjects?: Subject[]; // All registered school subjects for multi-subject commission lookup
  students: Student[];
  classrooms: Classroom[];
  teachers: Teacher[];
  savedPlans?: Record<string, SeatingPlanResult>;
  preferredSupervisors?: Record<string, string>; // roomId -> teacherId or teacherName
  allowMinimalRelaxation?: boolean; // Emergency minimal relaxation when physical seats exist but butterfly rules strand students
}

/**
 * Calculates how many times each teacher has served as supervisor across all saved exam plans.
 */
export function getTeacherSupervisorCounts(
  teachers: Teacher[],
  savedPlans?: Record<string, SeatingPlanResult>
): Map<string, number> {
  const counts = new Map<string, number>();
  teachers.forEach(t => {
    counts.set(t.name.toLowerCase().trim(), 0);
  });

  if (savedPlans) {
    Object.values(savedPlans).forEach(plan => {
      if (plan && plan.rooms) {
        plan.rooms.forEach(r => {
          if (r.supervisorName && r.supervisorName !== 'Atanmadı' && !r.supervisorName.includes('Yetersiz')) {
            const key = r.supervisorName.toLowerCase().trim();
            counts.set(key, (counts.get(key) || 0) + 1);
          }
        });
      }
    });
  }

  return counts;
}

/**
 * Detects exam rooms where multiple teachers are scheduled at the same day and period (team teaching / workshops).
 */
export function findMultipleTeacherConflicts(
  activeRooms: Classroom[],
  exam: Exam,
  teachers: Teacher[],
  commissionMembers: string[] = [],
  savedPlans?: Record<string, SeatingPlanResult>
): MultipleTeacherConflict[] {
  const commissionSet = new Set(commissionMembers.map(m => m.toLowerCase().trim()));
  const counts = getTeacherSupervisorCounts(teachers, savedPlans);
  const conflicts: MultipleTeacherConflict[] = [];

  for (const room of activeRooms) {
    // Teachers with a lesson in this room at this day/period who are NOT on leave and NOT commission members
    const matchingTeachers = teachers.filter(t => {
      if (t.isLeave) return false;
      if (commissionSet.has(t.name.toLowerCase().trim())) return false;
      return t.schedule.some(
        s =>
          s.day === exam.dayOfWeek &&
          s.period === exam.period &&
          s.classroomName.toLowerCase().trim() === room.name.toLowerCase().trim()
      );
    });

    if (matchingTeachers.length > 1) {
      // Sort candidates by total supervisor duty count ascending (balanced load)
      const candidates: MultipleTeacherCandidate[] = matchingTeachers
        .map(t => ({
          id: t.id,
          name: t.name,
          branch: t.branch,
          dutyCount: counts.get(t.name.toLowerCase().trim()) || 0,
          dutyDay: t.dutyDay || 'Yok',
        }))
        .sort((a, b) => a.dutyCount - b.dutyCount);

      conflicts.push({
        roomId: room.id,
        roomName: room.name,
        candidates,
        recommendedTeacherId: candidates[0].id,
      });
    }
  }

  return conflicts;
}

export interface TeacherAtSlotInfo {
  id: string;
  name: string;
  branch: string;
  dutyCount: number;
  dutyDay: string;
  isFreeAtSlot: boolean;
  statusText: string;
  teachingClassroom?: string;
}

export interface SupervisorExceptionData {
  unstaffedRooms: {
    roomId: string;
    roomName: string;
    capacity: number;
  }[];
  teachersAtSlot: TeacherAtSlotInfo[];
  allSchoolTeachers: {
    id: string;
    name: string;
    branch: string;
    dutyCount: number;
  }[];
}

/**
 * Detects exam rooms where no classroom teacher, no unassigned co-teacher, and no free duty teacher exists.
 * Returns information about unstaffed rooms and teachers present at school during that period for manual exception selection.
 */
export function detectSupervisorExceptions(
  activeRooms: Classroom[],
  exam: Exam,
  teachers: Teacher[],
  commissionMembers: string[] = [],
  savedPlans?: Record<string, SeatingPlanResult>,
  preferredSupervisors?: Record<string, string>
): SupervisorExceptionData | null {
  const commissionSet = new Set(commissionMembers.map(m => m.toLowerCase().trim()));
  const teacherDutyCounts = getTeacherSupervisorCounts(teachers, savedPlans);
  const assignedTeacherIds = new Set<string>();
  const roomSupervisorMap = new Map<string, string>();

  const doesScheduleMatchRoom = (scheduleClassroom: string, roomName: string): boolean => {
    const sNorm = scheduleClassroom.toLowerCase().trim();
    const rNorm = roomName.toLowerCase().trim();
    if (sNorm === rNorm) return true;
    if (rNorm.includes(`(${sNorm})`) || sNorm.includes(`(${rNorm})`)) return true;
    return false;
  };

  const isScheduleInAnyActiveRoom = (scheduleClassroom: string): boolean => {
    return activeRooms.some(r => doesScheduleMatchRoom(scheduleClassroom, r.name));
  };

  const isTeacherAtSchoolOnDay = (t: Teacher): boolean => {
    if (t.isLeave) return false;
    if (t.dutyDay === exam.dayOfWeek) return true;
    return (t.schedule || []).some(s => s.day === exam.dayOfWeek);
  };

  const isTeachingInNonExamClassAtSlot = (t: Teacher): boolean => {
    return (t.schedule || []).some(
      s =>
        s.day === exam.dayOfWeek &&
        s.period === exam.period &&
        !isScheduleInAnyActiveRoom(s.classroomName)
    );
  };

  const isEligibleAuto = (t: Teacher): boolean => {
    if (t.isLeave) return false;
    if (commissionSet.has(t.name.toLowerCase().trim())) return false;
    if (assignedTeacherIds.has(t.id)) return false;
    if (!isTeacherAtSchoolOnDay(t)) return false;
    if (isTeachingInNonExamClassAtSlot(t)) return false;
    return true;
  };

  // 0. Pre-assign preferred supervisors if specified
  if (preferredSupervisors) {
    for (const room of activeRooms) {
      if (preferredSupervisors[room.id]) {
        const pref = preferredSupervisors[room.id].trim();
        const matched = teachers.find(
          t => t.id === pref || t.name.toLowerCase().trim() === pref.toLowerCase()
        );
        if (matched) {
          assignedTeacherIds.add(matched.id);
          roomSupervisorMap.set(room.id, matched.name);
        } else if (pref) {
          roomSupervisorMap.set(room.id, pref);
        }
      }
    }
  }

  // 1. Stage 1: Room classroom teacher
  for (const room of activeRooms) {
    if (roomSupervisorMap.has(room.id)) continue;
    const roomTeachers = teachers.filter(t => {
      if (!isEligibleAuto(t)) return false;
      return (t.schedule || []).some(
        s =>
          s.day === exam.dayOfWeek &&
          s.period === exam.period &&
          doesScheduleMatchRoom(s.classroomName, room.name)
      );
    });

    if (roomTeachers.length > 0) {
      roomTeachers.sort((a, b) => {
        const countA = teacherDutyCounts.get(a.name.toLowerCase().trim()) || 0;
        const countB = teacherDutyCounts.get(b.name.toLowerCase().trim()) || 0;
        if (countA !== countB) return countA - countB;
        return a.name.localeCompare(b.name, 'tr');
      });
      const selected = roomTeachers[0];
      assignedTeacherIds.add(selected.id);
      roomSupervisorMap.set(room.id, selected.name);
    }
  }

  // 2. Stage 2: Co-teachers from active exam rooms
  const unassignedCoTeachers = teachers
    .filter(t => {
      if (!isEligibleAuto(t)) return false;
      return (t.schedule || []).some(
        s =>
          s.day === exam.dayOfWeek &&
          s.period === exam.period &&
          isScheduleInAnyActiveRoom(s.classroomName)
      );
    })
    .sort((a, b) => {
      const countA = teacherDutyCounts.get(a.name.toLowerCase().trim()) || 0;
      const countB = teacherDutyCounts.get(b.name.toLowerCase().trim()) || 0;
      if (countA !== countB) return countA - countB;
      return a.name.localeCompare(b.name, 'tr');
    });

  let coIdx = 0;
  for (const room of activeRooms) {
    if (!roomSupervisorMap.has(room.id)) {
      if (coIdx < unassignedCoTeachers.length) {
        const t = unassignedCoTeachers[coIdx++];
        assignedTeacherIds.add(t.id);
        roomSupervisorMap.set(room.id, t.name);
      }
    }
  }

  // 3. Stage 3: Duty teachers with NO lesson in this period
  const availableDutyTeachers = teachers
    .filter(t => {
      if (!isEligibleAuto(t)) return false;
      if (t.dutyDay !== exam.dayOfWeek) return false;
      const hasAnyLessonInPeriod = (t.schedule || []).some(
        s => s.day === exam.dayOfWeek && s.period === exam.period
      );
      return !hasAnyLessonInPeriod;
    })
    .sort((a, b) => {
      const countA = teacherDutyCounts.get(a.name.toLowerCase().trim()) || 0;
      const countB = teacherDutyCounts.get(b.name.toLowerCase().trim()) || 0;
      if (countA !== countB) return countA - countB;
      return a.name.localeCompare(b.name, 'tr');
    });

  let dutyIdx = 0;
  for (const room of activeRooms) {
    if (!roomSupervisorMap.has(room.id)) {
      if (dutyIdx < availableDutyTeachers.length) {
        const t = availableDutyTeachers[dutyIdx++];
        assignedTeacherIds.add(t.id);
        roomSupervisorMap.set(room.id, t.name);
      }
    }
  }

  // 4. Find unstaffed rooms
  const unstaffedRooms: { roomId: string; roomName: string; capacity: number }[] = [];
  for (const room of activeRooms) {
    if (!roomSupervisorMap.has(room.id)) {
      unstaffedRooms.push({
        roomId: room.id,
        roomName: room.name,
        capacity: room.capacity,
      });
    }
  }

  if (unstaffedRooms.length === 0) {
    return null;
  }

  // 5. Gather teachers present at school during this slot for exception selection
  const teachersAtSlot: TeacherAtSlotInfo[] = [];
  teachers.forEach(t => {
    if (t.isLeave) return;
    if (commissionSet.has(t.name.toLowerCase().trim())) return;
    if (assignedTeacherIds.has(t.id)) return;
    if (!isTeacherAtSchoolOnDay(t)) return;

    const slotLesson = (t.schedule || []).find(
      s => s.day === exam.dayOfWeek && s.period === exam.period
    );

    const isFree = !slotLesson;
    const dutyCount = teacherDutyCounts.get(t.name.toLowerCase().trim()) || 0;

    teachersAtSlot.push({
      id: t.id,
      name: t.name,
      branch: t.branch,
      dutyCount,
      dutyDay: t.dutyDay || 'Yok',
      isFreeAtSlot: isFree,
      statusText: isFree
        ? 'O Saatte Boş Dersi Var'
        : `Normal Sınıfında Dersi Var (${slotLesson.classroomName})`,
      teachingClassroom: slotLesson ? slotLesson.classroomName : undefined,
    });
  });

  teachersAtSlot.sort((a, b) => {
    if (a.isFreeAtSlot !== b.isFreeAtSlot) {
      return a.isFreeAtSlot ? -1 : 1;
    }
    if (a.dutyCount !== b.dutyCount) {
      return a.dutyCount - b.dutyCount;
    }
    return a.name.localeCompare(b.name, 'tr');
  });

  const allSchoolTeachers = teachers
    .filter(t => !t.isLeave && !commissionSet.has(t.name.toLowerCase().trim()))
    .map(t => ({
      id: t.id,
      name: t.name,
      branch: t.branch,
      dutyCount: teacherDutyCounts.get(t.name.toLowerCase().trim()) || 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  return {
    unstaffedRooms,
    teachersAtSlot,
    allSchoolTeachers,
  };
}

export function generateKelebekPlan(input: KelebekEngineInput): SeatingPlanResult {
  const { exam, subject, students, classrooms, teachers, savedPlans, preferredSupervisors } = input;
  const warnings: string[] = [];

  // 1. Multi-Subject Commission Identification & Class-Subject Mapping
  const classSubjectMap: Record<string, string> = {};
  const subjectMap = new Map<string, Subject>();
  if (input.subjects) {
    input.subjects.forEach(s => {
      subjectMap.set(s.id, s);
      subjectMap.set(s.name.toLowerCase().trim(), s);
    });
  }
  if (subject) {
    subjectMap.set(subject.id, subject);
    subjectMap.set(subject.name.toLowerCase().trim(), subject);
  }

  // Group classes by subject
  const subjectClassGroup = new Map<string, { subjectName: string; subjectId: string; classes: string[] }>();

  exam.assignedClasses.forEach(ac => {
    const sName = ac.subjectName || exam.subjectName || subject.name;
    const sId = ac.subjectId || subject.id;
    classSubjectMap[ac.classLevel] = sName;
    classSubjectMap[ac.classLevel.toUpperCase().trim()] = sName;

    const groupKey = sId || sName;
    if (!subjectClassGroup.has(groupKey)) {
      subjectClassGroup.set(groupKey, { subjectName: sName, subjectId: sId, classes: [] });
    }
    subjectClassGroup.get(groupKey)!.classes.push(ac.classLevel);
  });

  const subjectCommissions: {
    subjectName: string;
    subjectCode?: string;
    teachers: string[];
    classes: string[];
  }[] = [];

  const allCommissionTeachers = new Set<string>();

  if (subjectClassGroup.size === 0) {
    const defaultTeachers = subject.teachers || [];
    defaultTeachers.forEach(t => allCommissionTeachers.add(t.trim()));
    subjectCommissions.push({
      subjectName: subject.name || exam.subjectName,
      subjectCode: subject.code,
      teachers: defaultTeachers,
      classes: exam.assignedClasses.map(ac => ac.classLevel),
    });
  } else {
    subjectClassGroup.forEach(grp => {
      const matchedSubject = subjectMap.get(grp.subjectId) || subjectMap.get(grp.subjectName.toLowerCase().trim());
      const teachersList = matchedSubject?.teachers && matchedSubject.teachers.length > 0
        ? matchedSubject.teachers
        : (grp.subjectName.toLowerCase().trim() === subject.name.toLowerCase().trim() ? (subject.teachers || []) : []);

      teachersList.forEach(t => allCommissionTeachers.add(t.trim()));

      subjectCommissions.push({
        subjectName: grp.subjectName,
        subjectCode: matchedSubject?.code,
        teachers: teachersList,
        classes: grp.classes,
      });
    });
  }

  const commissionMembers = Array.from(allCommissionTeachers);
  const commissionSet = new Set(commissionMembers.map(m => m.toLowerCase().trim()));

  // 2. Filter students who belong to the exam's assigned classes
  const assignedClassSet = new Set(
    exam.assignedClasses.map(ac => ac.classLevel.toUpperCase().trim())
  );
  const eligibleStudents = students.filter(s =>
    assignedClassSet.has(s.classLevel.toUpperCase().trim())
  );

  if (eligibleStudents.length === 0) {
    throw new Error(
      'Sınava atanmış sınıflarda kayıtlı öğrenci bulunamadı. Lütfen Öğrenci Listesi bölümünden öğrenci ekleyiniz.'
    );
  }

  // 3. Filter active exam rooms
  const activeRooms = classrooms.filter(c => c.isSelectedForExam);
  if (activeRooms.length === 0) {
    throw new Error(
      'Sınav için hiç sınav salonu seçilmedi. Lütfen Salon Yönetimi bölümünden en az bir salon seçiniz.'
    );
  }

  // Check total capacity
  const totalCapacity = activeRooms.reduce((sum, r) => sum + r.capacity, 0);
  if (totalCapacity < eligibleStudents.length) {
    warnings.push(
      `DİKKAT: Seçilen salonların toplam kapasitesi (${totalCapacity}) sınava girecek öğrenci sayısından (${eligibleStudents.length}) az! ${eligibleStudents.length - totalCapacity} öğrenci yerleştirilemeyebilir.`
    );
  }

  // 4. Assign Supervisors (Gözetmen Dağıtım Hiyerarşisi)
  //
  // KULLANICI KESİN KURALLARI:
  // 1. Aşama (Derslik Öğretmeni): O gün o saatte o salonda dersi olan öğretmen.
  // 2. Aşama (Boşta Kalan Eş Öğretmenler): Derslik öğretmeni bulunmayan salona, ÖNCELİKLE bir derse birden
  //    fazla öğretmen giriyorsa (atölye/grup/eş dersler) o öğretmenlerden boşta olan atanır.
  //    Bunu aldığı sınav sayısına bakarak (en az gözetmenlik görevi almış öğretmen ilk) ata.
  // 3. Aşama (Nöbetçi Öğretmenler): Eğer böyle bir durum söz konusu değilse veya yetersizse, o gün nöbetçi
  //    olan öğretmenlerden birini yine aldığı gözetmenlik sayısına (en az görev alan ilk) göre ata.
  // 4. Aşama (Okulda Olup O Saatte Dersi Olmayan Boş Öğretmenler): Nöbetçi de kalmadıysa, o gün okulda olan
  //    ancak sınav saatinde hiçbir dersi bulunmayan boş öğretmen atanır.
  //
  // KESİN KISITLAMALAR (ASLA ATANMAYACAKLAR):
  // - Sınav yapılan saatte sınavı olmayan bir sınıfta görevli (normal dersi olan) öğretmene ASLA görev atanmaz!
  // - O gün okulda olmayan (o gün hiç dersi veya nöbeti bulunmayan) öğretmene ASLA görev atanmaz!
  // - Komisyon üyelerine ve İzinli/Raporlu öğretmenlere ASLA görev atanmaz!

  const roomSupervisorMap = new Map<string, { teacherName: string; branch: string; reason: string }>();
  const assignedTeacherIds = new Set<string>();
  const teacherDutyCounts = getTeacherSupervisorCounts(teachers, savedPlans);

  // Set of active exam room names (case-insensitive) for fast lookup
  const activeRoomNameSet = new Set(
    activeRooms.map(r => r.name.toLowerCase().trim())
  );

  // Helper: Room name matching (e.g. "Salon 1 (9-A)" vs "9-A" or exact match)
  const doesScheduleMatchRoom = (scheduleClassroom: string, roomName: string): boolean => {
    const sNorm = scheduleClassroom.toLowerCase().trim();
    const rNorm = roomName.toLowerCase().trim();
    if (sNorm === rNorm) return true;
    if (rNorm.includes(`(${sNorm})`) || sNorm.includes(`(${rNorm})`)) return true;
    return false;
  };

  const isScheduleInAnyActiveRoom = (scheduleClassroom: string): boolean => {
    return activeRooms.some(r => doesScheduleMatchRoom(scheduleClassroom, r.name));
  };

  // Kural: Öğretmen o gün okulda mı? (O gün nöbeti varsa veya en az 1 dersi varsa okulda kabul edilir)
  const isTeacherAtSchoolOnDay = (t: Teacher): boolean => {
    if (t.isLeave) return false;
    if (t.dutyDay === exam.dayOfWeek) return true;
    return (t.schedule || []).some(s => s.day === exam.dayOfWeek);
  };

  // Kural: Sınav yapılan saatte sınavı olmayan normal bir sınıfta dersi var mı?
  // Varsa bu öğretmen dersteki öğrencilerini bırakıp gözetmen olamaz!
  const isTeachingInNonExamClassAtSlot = (t: Teacher): boolean => {
    return (t.schedule || []).some(
      s =>
        s.day === exam.dayOfWeek &&
        s.period === exam.period &&
        !isScheduleInAnyActiveRoom(s.classroomName)
    );
  };

  // Temel Uygunluk Kontrolü
  const isTeacherEligibleForSupervisor = (t: Teacher): boolean => {
    if (t.isLeave) return false; // İzinli/Raporlu
    if (commissionSet.has(t.name.toLowerCase().trim())) return false; // Sınav Komisyon Üyesi
    if (assignedTeacherIds.has(t.id)) return false; // Bu sınav oturumunda zaten bir salona atandı
    if (!isTeacherAtSchoolOnDay(t)) return false; // O gün okulda değil
    if (isTeachingInNonExamClassAtSlot(t)) return false; // Sınav saatinde sınavı olmayan bir sınıfta dersi var
    return true;
  };

  // -------------------------------------------------------------
  // A. AŞAMA 1: Her Salonun Kendi Derslik Öğretmeni
  // -------------------------------------------------------------
  for (const room of activeRooms) {
    // 1. Kullanıcının manuel bir gözetmen tercihi veya istisnai seçimi varsa
    if (preferredSupervisors && preferredSupervisors[room.id]) {
      const prefIdentifier = preferredSupervisors[room.id].trim();
      const prefLower = prefIdentifier.toLowerCase();
      const prefTeacher = teachers.find(
        t => t.id === prefIdentifier || t.name.toLowerCase().trim() === prefLower
      );
      if (prefTeacher) {
        roomSupervisorMap.set(room.id, {
          teacherName: prefTeacher.name,
          branch: prefTeacher.branch,
          reason: 'İstisnai Gözetmen Ataması (Seçilen Öğretmen)',
        });
        assignedTeacherIds.add(prefTeacher.id);
        continue;
      } else if (prefIdentifier) {
        roomSupervisorMap.set(room.id, {
          teacherName: prefIdentifier,
          branch: 'Özel / Harici',
          reason: 'İstisnai Gözetmen Ataması (Elle Atandı)',
        });
        continue;
      }
    }

    // 2. Bu salonda o gün ve o saatte dersi olan uygun öğretmenler
    const roomTeachers = teachers.filter(t => {
      if (!isTeacherEligibleForSupervisor(t)) return false;
      return (t.schedule || []).some(
        s =>
          s.day === exam.dayOfWeek &&
          s.period === exam.period &&
          doesScheduleMatchRoom(s.classroomName, room.name)
      );
    });

    if (roomTeachers.length > 0) {
      // Aldığı sınav görev sayısına göre (en az görev alan en önde) sırala
      const sortedCandidates = [...roomTeachers].sort((a, b) => {
        const countA = teacherDutyCounts.get(a.name.toLowerCase().trim()) || 0;
        const countB = teacherDutyCounts.get(b.name.toLowerCase().trim()) || 0;
        if (countA !== countB) return countA - countB;
        return a.name.localeCompare(b.name, 'tr');
      });

      const selectedTeacher = sortedCandidates[0];
      const hasMultiple = roomTeachers.length > 1;

      roomSupervisorMap.set(room.id, {
        teacherName: selectedTeacher.name,
        branch: selectedTeacher.branch,
        reason: hasMultiple
          ? `Derslik Öğretmeni (Eş Öğretmenler Arasından En Az Görevli Seçildi - Toplam ${roomTeachers.length})`
          : 'Derslik Öğretmeni',
      });
      assignedTeacherIds.add(selectedTeacher.id);
    }
  }

  // -------------------------------------------------------------
  // B. AŞAMA 2: Bir derse birden fazla öğretmen giriyorsa boşta kalan eş öğretmenler
  // KURAL: Derslik öğretmeni bulunmayan salona, ÖNCELİKLE bir derse birden fazla öğretmen
  // giriyorsa o öğretmenlerden boşta olanı, aldığı sınav sayısına bakarak (en az görev alan) ata!
  // -------------------------------------------------------------
  const unassignedCoTeachers = teachers
    .filter(t => {
      if (!isTeacherEligibleForSupervisor(t)) return false;
      // Sınav yapılan aktif bir salonda dersi olan ancak henüz bir salona atanmamış öğretmenler
      const hasLessonInExamRoom = (t.schedule || []).some(
        s =>
          s.day === exam.dayOfWeek &&
          s.period === exam.period &&
          isScheduleInAnyActiveRoom(s.classroomName)
      );
      return hasLessonInExamRoom;
    })
    .sort((a, b) => {
      const countA = teacherDutyCounts.get(a.name.toLowerCase().trim()) || 0;
      const countB = teacherDutyCounts.get(b.name.toLowerCase().trim()) || 0;
      if (countA !== countB) return countA - countB;
      return a.name.localeCompare(b.name, 'tr');
    });

  let coTeacherIdx = 0;
  for (const room of activeRooms) {
    if (!roomSupervisorMap.has(room.id)) {
      if (coTeacherIdx < unassignedCoTeachers.length) {
        const t = unassignedCoTeachers[coTeacherIdx++];
        roomSupervisorMap.set(room.id, {
          teacherName: t.name,
          branch: t.branch,
          reason: 'Boşta Kalan Eş Öğretmen (En Az Görev Alan)',
        });
        assignedTeacherIds.add(t.id);
      }
    }
  }

  // -------------------------------------------------------------
  // C. AŞAMA 3: O gün nöbetçi olan öğretmenler
  // KURAL: Eğer eş öğretmen durumu söz konusu değilse (veya yetersizse), o gün nöbetçi olan
  // öğretmenlerden birini yine aldığı gözetmenlik sayısına göre ata.
  // Sınav saatinde sınavı olmayan bir sınıfta dersi olan veya o gün okulda olmayan atanmaz!
  // -------------------------------------------------------------
  const availableDutyTeachers = teachers
    .filter(t => {
      if (!isTeacherEligibleForSupervisor(t)) return false;
      if (t.dutyDay !== exam.dayOfWeek) return false;
      // Sınav saatinde sınav yapılan veya yapılmayan herhangi bir dersi OLMAMALIDIR (tamamen boş olmalı)
      const hasAnyLessonInPeriod = (t.schedule || []).some(
        s => s.day === exam.dayOfWeek && s.period === exam.period
      );
      return !hasAnyLessonInPeriod;
    })
    .sort((a, b) => {
      const countA = teacherDutyCounts.get(a.name.toLowerCase().trim()) || 0;
      const countB = teacherDutyCounts.get(b.name.toLowerCase().trim()) || 0;
      if (countA !== countB) return countA - countB;
      return a.name.localeCompare(b.name, 'tr');
    });

  let dutyIdx = 0;
  for (const room of activeRooms) {
    if (!roomSupervisorMap.has(room.id)) {
      if (dutyIdx < availableDutyTeachers.length) {
        const t = availableDutyTeachers[dutyIdx++];
        roomSupervisorMap.set(room.id, {
          teacherName: t.name,
          branch: t.branch,
          reason: 'Boşta Nöbetçi Öğretmen (En Az Görev Alan)',
        });
        assignedTeacherIds.add(t.id);
      }
    }
  }

  // -------------------------------------------------------------
  // D. AŞAMA 4: Gözetmen Bulunamayan Salonlar (İstisnai Durum)
  // Derslik öğretmeni, eş öğretmen veya boşta nöbetçi öğretmen bulunamayan salonlar
  // kullanıcı istisnai pencerede bir tercih yaptıysa yukarıda preferredSupervisors
  // üzerinden atanmıştır. Tercih yapılmayan veya boşta kalan salonlar:
  // -------------------------------------------------------------
  for (const room of activeRooms) {
    if (!roomSupervisorMap.has(room.id)) {
      roomSupervisorMap.set(room.id, {
        teacherName: 'Gözetmen Atanmadı (Öğretmen Yetersiz)',
        branch: '-',
        reason: 'Atanmadı (Derslik & Boş Nöbetçi Öğretmen Yok)',
      });
      warnings.push(
        `${room.name} salonu için derslik veya boşta nöbetçi öğretmen bulunamadı! Lütfen oturma planından bu salona elle gözetmen atayınız.`
      );
    }
  }

  // 5. 2D Grid Setup for each Room
  // Build RoomSeatingPlan with exact 2D coordinates: (deskColumnIndex, deskRowIndex, colIndex)
  interface RoomGridContext {
    plan: RoomSeatingPlan;
    cols: number;
    rows: number;
    seatsPerRow: number;
    // 3D Matrix: grid[col][row][seatSide] -> SeatedStudentInfo
    matrix: (SeatedStudentInfo | null)[][][];
    roomClassCount: Record<string, number>;
    roomGradeCount: Record<string, number>;
  }

  const roomContexts: RoomGridContext[] = activeRooms.map(room => {
    const sup = roomSupervisorMap.get(room.id) || {
      teacherName: 'Belirtilmedi',
      branch: '-',
      reason: 'Atanmadı',
    };

    const cols = Math.max(1, room.columnsCount || 4);
    const rows = Math.max(1, room.rowsPerColumn || 4);
    const seatsPerRow = Math.max(1, room.seatsPerRow || 2);
    const capacity = room.capacity || cols * rows * seatsPerRow;

    const seats: SeatedStudentInfo[] = [];
    const matrix: (SeatedStudentInfo | null)[][][] = Array.from({ length: cols }, () =>
      Array.from({ length: rows }, () => Array.from({ length: seatsPerRow }, () => null))
    );

    let seatNum = 1;
    // Desks are organized column by column, front row to back row:
    // Column 0: Row 0 (Seats 1,2), Row 1 (Seats 3,4)...
    // Column 1: Row 0, Row 1...
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        for (let s = 0; s < seatsPerRow; s++) {
          if (seatNum <= capacity) {
            const seatInfo: SeatedStudentInfo = {
              seatNumber: seatNum++,
              rowIndex: r,
              colIndex: s, // 0: Left seat, 1: Right seat
              deskColumnIndex: c,
              deskRowIndex: r,
              student: undefined,
            };
            seats.push(seatInfo);
            matrix[c][r][s] = seatInfo;
          }
        }
      }
    }

    const plan: RoomSeatingPlan = {
      classroomId: room.id,
      classroomName: room.name,
      doorPosition: room.doorPosition,
      columnsCount: cols,
      rowsPerColumn: rows,
      capacity,
      seats,
      totalAssigned: 0,
      supervisorName: sup.teacherName,
      supervisorBranch: sup.branch,
      supervisorReason: sup.reason,
      classDistribution: {},
    };

    return {
      plan,
      cols,
      rows,
      seatsPerRow,
      matrix,
      roomClassCount: {},
      roomGradeCount: {},
    };
  });

  // 6. Student Grouping and Prioritization
  // Separate BEP (Kaynaştırma) students from regular students
  // BEP students must be seated in the front rows (r = 0 or 1)
  const bepStudentsByClass: Record<string, Student[]> = {};
  const regularStudentsByClass: Record<string, Student[]> = {};

  for (const s of eligibleStudents) {
    const key = s.classLevel;
    if (s.isBEP) {
      if (!bepStudentsByClass[key]) bepStudentsByClass[key] = [];
      bepStudentsByClass[key].push(s);
    } else {
      if (!regularStudentsByClass[key]) regularStudentsByClass[key] = [];
      regularStudentsByClass[key].push(s);
    }
  }

  // Shuffle within classes
  for (const key in bepStudentsByClass) {
    bepStudentsByClass[key] = shuffleArray(bepStudentsByClass[key]);
  }
  for (const key in regularStudentsByClass) {
    regularStudentsByClass[key] = shuffleArray(regularStudentsByClass[key]);
  }

  // Distinct classes and grades
  const allClassKeys = Array.from(
    new Set([...Object.keys(bepStudentsByClass), ...Object.keys(regularStudentsByClass)])
  ).sort((a, b) => {
    const gA = Number(getGradeLevel(a)) || 0;
    const gB = Number(getGradeLevel(b)) || 0;
    if (gA !== gB) return gA - gB;
    return a.localeCompare(b, 'tr-TR');
  });

  const uniqueGrades = Array.from(new Set(allClassKeys.map(k => getGradeLevel(k)))).sort(
    (a, b) => (Number(a) || 0) - (Number(b) || 0) || a.localeCompare(b, 'tr-TR')
  );

  // Create grade buckets for interleaved round-robin selection
  const gradeBuckets: Record<string, string[]> = {};
  for (const ck of allClassKeys) {
    const g = getGradeLevel(ck);
    if (!gradeBuckets[g]) gradeBuckets[g] = [];
    gradeBuckets[g].push(ck);
  }

  const interleavedClassKeys: string[] = [];
  let hasMore = true;
  let keyIdx = 0;
  while (hasMore) {
    hasMore = false;
    for (const g of uniqueGrades) {
      if (keyIdx < gradeBuckets[g].length) {
        interleavedClassKeys.push(gradeBuckets[g][keyIdx]);
        hasMore = true;
      }
    }
    keyIdx++;
  }

  // Helper to count remaining unassigned students
  const getRemainingClassCount = (classKey: string) => {
    return (
      (bepStudentsByClass[classKey]?.length || 0) + (regularStudentsByClass[classKey]?.length || 0)
    );
  };

  const hasRemainingStudents = () => {
    return interleavedClassKeys.some(k => getRemainingClassCount(k) > 0);
  };

  // Helper to get total remaining BEP students
  const getTotalRemainingBEP = () => {
    return Object.values(bepStudentsByClass).reduce((sum, list) => sum + list.length, 0);
  };

  // 7. COMPUTE BALANCED TARGET QUOTAS ACROSS ACTIVE ROOMS
  // Sınava katılan öğrenci sayısını salonlara dengeli ve eşit paylaştırır.
  // Bir salon ful doluyken diğer salonun yarısı boş kalmaz.
  const totalEligible = eligibleStudents.length;
  const quotaMap = new Map<string, number>();

  if (totalCapacity <= totalEligible) {
    // Toplam kapasite öğrenci sayısından az veya eşitse tüm salonlar tam kapasiteye ayarlanır
    for (const room of activeRooms) {
      quotaMap.set(room.id, room.capacity);
    }
  } else {
    // Öğrenci sayısını salonların kapasitelerine orantılı (ve eşit) dağıt
    interface RoomShare {
      id: string;
      capacity: number;
      share: number;
      base: number;
      remainder: number;
    }
    const shares: RoomShare[] = activeRooms.map(r => {
      const share = (totalEligible * r.capacity) / totalCapacity;
      const base = Math.floor(share);
      return {
        id: r.id,
        capacity: r.capacity,
        share,
        base: Math.min(base, r.capacity),
        remainder: share - base,
      };
    });

    let assignedCount = shares.reduce((sum, s) => sum + s.base, 0);
    let rem = totalEligible - assignedCount;

    // Kalan öğrencileri en yüksek ondalık paya sahip salonlara 1'er 1'er dağıt
    shares.sort((a, b) => b.remainder - a.remainder);
    for (const s of shares) {
      if (rem <= 0) break;
      if (s.base < s.capacity) {
        s.base++;
        rem--;
      }
    }

    for (const s of shares) {
      quotaMap.set(s.id, s.base);
    }
  }

  // 8. 2D GRID SPATIAL ASSIGNMENT ALGORITHM
  // Helper to assign a candidate student to a given seat using Kelebek spatial score
  function attemptAssignSeat(
    ctx: RoomGridContext,
    c: number,
    r: number,
    s: number,
    maxPerClass: number,
    isRelaxed = false,
    allowAdjacentRelaxation = false
  ): boolean {
    const seatInfo = ctx.matrix[c][r][s];
    if (!seatInfo || seatInfo.student) return false;

    let bestScore = -999999;
    let bestClassKey: string | null = null;
    let bestIsBEP = false;

    // İdeal kademe hedefi
    const idealGradeIndex = (c * 2 + r + s) % (uniqueGrades.length || 1);
    const idealGrade = uniqueGrades[idealGradeIndex];

    for (const classKey of interleavedClassKeys) {
      const hasBEP = (bepStudentsByClass[classKey]?.length || 0) > 0;
      const hasReg = (regularStudentsByClass[classKey]?.length || 0) > 0;
      if (!hasBEP && !hasReg) continue;

      const countInRoom = ctx.roomClassCount[classKey] || 0;
      if (!isRelaxed && countInRoom >= maxPerClass) continue;

      const candidateGrade = getGradeLevel(classKey);
      const gradeInRoom = ctx.roomGradeCount[candidateGrade] || 0;

      // BEP öğrencileri ön sıralara öncelikli
      const candidateIsBEP = hasBEP && (r <= 1 || !hasReg);

      let score = 200 - countInRoom * 20 - gradeInRoom * 5;

      if (candidateGrade === idealGrade) {
        score += 120;
      }

      if (candidateIsBEP) {
        if (r === 0) score += 1500;
        else if (r === 1) score += 800;
        else score -= 1000;
      } else if (r === 0 && getTotalRemainingBEP() > 0) {
        score -= 300;
      }

      // --- 2D SPATIAL NEIGHBOR CHECKS ---
      // 1. Aynı Sıradaki Yan Yana Partner Kontrolü (İkili / Çoklu Sıra)
      // KESİN KURAL: Önünde hangi ek olursa olsun (ATP 9-A, AMP 9-B vb.),
      // aynı kademedeki (9, 10, 11, 12) öğrenciler normalde ASLA yan yana oturamaz!
      let hasDeskPartnerConflict = false;
      let isSameGradePartner = false;
      let isSameClassPartner = false;
      let hasDifferentGradePartner = false;

      for (let os = 0; os < ctx.seatsPerRow; os++) {
        if (os === s) continue;
        const otherSeat = ctx.matrix[c][r][os];
        if (otherSeat?.student) {
          const otherStudent = otherSeat.student;
          const otherGrade = getGradeLevel(otherStudent.classLevel);

          // Kural 1: Aynı şube (örn: 9-A ile 9-A, ATP 9-A ile ATP 9-A)
          if (otherStudent.classLevel.trim().toUpperCase() === classKey.trim().toUpperCase()) {
            isSameClassPartner = true;
            hasDeskPartnerConflict = true;
            break;
          }

          // Kural 2: Önünde hangi ek olursa olsun (örn: ATP 9-A ile AMP 9-B veya 9-A ile 9-B)
          // Aynı kademedeki öğrenciler
          if (candidateGrade && otherGrade && candidateGrade === otherGrade) {
            isSameGradePartner = true;
            hasDeskPartnerConflict = true;
            break;
          }

          if (candidateGrade && otherGrade && candidateGrade !== otherGrade) {
            hasDifferentGradePartner = true;
          }
        }
      }

      if (hasDeskPartnerConflict) {
        if (!allowAdjacentRelaxation) {
          // Kesin kural ihlali: Yan yana aynı kademe veya şube oturamaz!
          // Bu aday sınıf bu koltuk için kesin olarak elenir.
          continue;
        } else {
          // Minimum esnetme: Açıkta kalan son 3-5 veya 8-10 öğrenci için
          // Aynı kademe ama farklı şube oturabilsin (-6000 ceza)
          // Aynı şube ise ancak mecbur kalınırsa (-50000 ceza)
          if (isSameClassPartner) {
            score -= 50000;
          } else if (isSameGradePartner) {
            score -= 6000;
          }
        }
      }

      if (hasDifferentGradePartner) {
        // Farklı kademe: İdeal kelebek eşleşmesi bonusu
        score += 450;
      }

      // 2. Ön Sıra Komşusu (Aynı Sütun)
      if (r > 0) {
        const frontSeatDirect = ctx.matrix[c][r - 1][s];
        if (frontSeatDirect?.student) {
          if (frontSeatDirect.student.classLevel === classKey) score -= 4000;
          else if (getGradeLevel(frontSeatDirect.student.classLevel) === candidateGrade) score -= 600;
          else score += 100;
        }

        if (ctx.seatsPerRow === 2) {
          const frontSeatDiag = ctx.matrix[c][r - 1][1 - s];
          if (frontSeatDiag?.student) {
            if (frontSeatDiag.student.classLevel === classKey) score -= 1500;
            else if (getGradeLevel(frontSeatDiag.student.classLevel) === candidateGrade) score -= 300;
          }
        }
      }

      // 3. Arka Sıra Komşusu (Aynı Sütun)
      if (r < ctx.rows - 1) {
        const backSeatDirect = ctx.matrix[c][r + 1][s];
        if (backSeatDirect?.student) {
          if (backSeatDirect.student.classLevel === classKey) score -= 4000;
          else if (getGradeLevel(backSeatDirect.student.classLevel) === candidateGrade) score -= 600;
        }
      }

      // 4. Sol Koridor Komşusu
      if (c > 0) {
        const leftSeatAcross = ctx.matrix[c - 1][r][ctx.seatsPerRow - 1];
        if (leftSeatAcross?.student) {
          if (leftSeatAcross.student.classLevel === classKey) score -= 1800;
          else if (getGradeLevel(leftSeatAcross.student.classLevel) === candidateGrade) score -= 400;
          else score += 80;
        }
      }

      // 5. Sağ Koridor Komşusu
      if (c < ctx.cols - 1) {
        const rightSeatAcross = ctx.matrix[c + 1][r][0];
        if (rightSeatAcross?.student) {
          if (rightSeatAcross.student.classLevel === classKey) score -= 1800;
          else if (getGradeLevel(rightSeatAcross.student.classLevel) === candidateGrade) score -= 400;
          else score += 80;
        }
      }

      // 6. Çapraz Sıralar
      const diagonalCoords = [
        [c - 1, r - 1],
        [c + 1, r - 1],
        [c - 1, r + 1],
        [c + 1, r + 1],
      ];
      for (const [dc, dr] of diagonalCoords) {
        if (dc >= 0 && dc < ctx.cols && dr >= 0 && dr < ctx.rows) {
          for (let ds = 0; ds < ctx.seatsPerRow; ds++) {
            const diagSeat = ctx.matrix[dc][dr][ds];
            if (diagSeat?.student && diagSeat.student.classLevel === classKey) {
              score -= 300;
            }
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestClassKey = classKey;
        bestIsBEP = candidateIsBEP;
      }
    }

    if (bestClassKey) {
      let assignedStudent: Student | undefined;
      if (bestIsBEP && bepStudentsByClass[bestClassKey]?.length > 0) {
        assignedStudent = bepStudentsByClass[bestClassKey].shift();
      } else if (regularStudentsByClass[bestClassKey]?.length > 0) {
        assignedStudent = regularStudentsByClass[bestClassKey].shift();
      } else if (bepStudentsByClass[bestClassKey]?.length > 0) {
        assignedStudent = bepStudentsByClass[bestClassKey].shift();
      }

      if (assignedStudent) {
        seatInfo.student = assignedStudent;
        ctx.roomClassCount[bestClassKey] = (ctx.roomClassCount[bestClassKey] || 0) + 1;
        const g = getGradeLevel(bestClassKey);
        ctx.roomGradeCount[g] = (ctx.roomGradeCount[g] || 0) + 1;
        ctx.plan.totalAssigned++;
        return true;
      }
    }

    return false;
  }

  const maxRowsAcrossRooms = Math.max(...roomContexts.map(rc => rc.rows));
  const maxColsAcrossRooms = Math.max(...roomContexts.map(rc => rc.cols));

  // FAZ 1: TEKLİ OTURMA & TÜM SIRALARA YAYMA
  // Salonda boş yer varsa bir sıra tamamen boş kalmasın; her sıraya önce en az 1 öğrenci verilir.
  // Öğrenciler sıralara tekli (tek başına) otururlar.
  for (let r = 0; r < maxRowsAcrossRooms; r++) {
    for (let c = 0; c < maxColsAcrossRooms; c++) {
      for (const ctx of roomContexts) {
        if (!hasRemainingStudents()) break;
        const targetQuota = quotaMap.get(ctx.plan.classroomId) || ctx.plan.capacity;
        if (ctx.plan.totalAssigned >= targetQuota) continue;
        if (c >= ctx.cols || r >= ctx.rows) continue;

        // Bu sırada zaten oturan öğrenci var mı?
        const hasStudentAtDesk = ctx.matrix[c][r].some(st => st?.student !== undefined);
        if (hasStudentAtDesk) continue;

        // Tercih edilen tekli koltuk: Çapraz Zigzag desen (s = (c + r) % ctx.seatsPerRow)
        const preferredSide = (c + r) % ctx.seatsPerRow;
        const maxPerClass = Math.max(2, Math.ceil(targetQuota * 0.55));

        const success = attemptAssignSeat(ctx, c, r, preferredSide, maxPerClass);
        if (!success && ctx.seatsPerRow > 1) {
          attemptAssignSeat(ctx, c, r, 1 - preferredSide, maxPerClass);
        }
      }
    }
  }

  // FAZ 2: İKİLİ TAMAMLAMA (YAN YANA OTURMA)
  // Eğer salona ayrılan hedef öğrenci sayısı sıradan fazlaysa, boş kalan 2. koltuklara
  // farklı sınıflardan öğrenciler yan yana oturacak şekilde yerleştirilir.
  if (hasRemainingStudents()) {
    for (let r = 0; r < maxRowsAcrossRooms; r++) {
      for (let c = 0; c < maxColsAcrossRooms; c++) {
        for (const ctx of roomContexts) {
          if (!hasRemainingStudents()) break;
          const targetQuota = quotaMap.get(ctx.plan.classroomId) || ctx.plan.capacity;
          if (ctx.plan.totalAssigned >= targetQuota) continue;
          if (c >= ctx.cols || r >= ctx.rows) continue;

          for (let s = 0; s < ctx.seatsPerRow; s++) {
            const seatInfo = ctx.matrix[c][r][s];
            if (!seatInfo || seatInfo.student) continue;

            const maxPerClass = Math.max(2, Math.ceil(targetQuota * 0.55));
            attemptAssignSeat(ctx, c, r, s, maxPerClass);
          }
        }
      }
    }
  }

  // FAZ 3: YEDEK / ESNEK YERLEŞTİRME
  // Eğer hedef kotalar veya sınıf kısıtları nedeniyle açıkta kalan öğrenci varsa,
  // salon kapasiteleri sonuna kadar doldurularak hiçbir öğrencinin açıkta kalmaması sağlanır.
  if (hasRemainingStudents()) {
    for (let r = 0; r < maxRowsAcrossRooms; r++) {
      for (let c = 0; c < maxColsAcrossRooms; c++) {
        for (const ctx of roomContexts) {
          if (!hasRemainingStudents()) break;
          if (ctx.plan.totalAssigned >= ctx.plan.capacity) continue;
          if (c >= ctx.cols || r >= ctx.rows) continue;

          for (let s = 0; s < ctx.seatsPerRow; s++) {
            const seatInfo = ctx.matrix[c][r][s];
            if (!seatInfo || seatInfo.student) continue;

            const maxPerClass = Math.max(1, Math.floor(ctx.plan.capacity / 2) + 2);
            attemptAssignSeat(ctx, c, r, s, maxPerClass, true);
          }
        }
      }
    }
  }

  // FAZ 4: MİNİMUM ESNETME (ACİL TAMAMLAMA)
  // Kullanıcı "Kısıtlamalara Rağmen Yine de Dağıt (Minimum Esnetme)" seçtiğinde devreye girer.
  // Faz 1-3'ün ardından hala yerleşememiş öğrenci varsa, salonlardaki boş kalan koltuklara
  // yan yana aynı kademedeki öğrencilerin (öncelikle farklı şubeler olmak üzere) oturmasına izin verilir.
  if (input.allowMinimalRelaxation && hasRemainingStudents()) {
    for (let r = 0; r < maxRowsAcrossRooms; r++) {
      for (let c = 0; c < maxColsAcrossRooms; c++) {
        for (const ctx of roomContexts) {
          if (!hasRemainingStudents()) break;
          if (ctx.plan.totalAssigned >= ctx.plan.capacity) continue;
          if (c >= ctx.cols || r >= ctx.rows) continue;

          for (let s = 0; s < ctx.seatsPerRow; s++) {
            const seatInfo = ctx.matrix[c][r][s];
            if (!seatInfo || seatInfo.student) continue;

            const maxPerClass = Math.max(1, Math.floor(ctx.plan.capacity / 2) + 5);
            // allowAdjacentRelaxation = true, isRelaxed = true
            attemptAssignSeat(ctx, c, r, s, maxPerClass, true, true);
          }
        }
      }
    }

    if (!hasRemainingStudents()) {
      warnings.push(
        'Açıkta kalan öğrenciler, kullanıcı onayıyla minimum esnetme uygulanarak (aynı kademeden farklı şubeler yan yana oturacak şekilde) mevcut salonlara yerleştirilmiştir.'
      );
    }
  }

  // 8. Update distributions on room plans
  for (const ctx of roomContexts) {
    ctx.plan.classDistribution = ctx.roomClassCount;
  }

  // 9. Collect any unassigned students
  const unassignedStudents: Student[] = [];
  for (const ck of allClassKeys) {
    if (bepStudentsByClass[ck]?.length > 0) {
      unassignedStudents.push(...bepStudentsByClass[ck]);
    }
    if (regularStudentsByClass[ck]?.length > 0) {
      unassignedStudents.push(...regularStudentsByClass[ck]);
    }
  }

  if (unassignedStudents.length > 0) {
    warnings.push(
      `Toplam ${unassignedStudents.length} öğrenci salon kapasitesi veya oturma kısıtları nedeniyle yerleştirilemedi. Lütfen daha fazla sınav salonu seçiniz veya salon kapasitelerini artırınız.`
    );
  }

  return {
    examId: exam.id,
    examName: exam.name,
    examDate: exam.date,
    examPeriod: exam.period,
    subjectName: exam.subjectName,
    generatedAt: new Date().toLocaleString('tr-TR'),
    rooms: roomContexts.map(rc => rc.plan),
    unassignedStudents,
    commissionMembers,
    subjectCommissions,
    classSubjectMap,
    warnings,
  };
}
