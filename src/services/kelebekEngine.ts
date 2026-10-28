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
  // Check for 9, 10, 11, 12 bounded by non-digits or start/end
  const gradeMatch = trimmed.match(/(?:^|[^0-9])(9|10|11|12)(?:[^0-9]|$)/i);
  if (gradeMatch) {
    return gradeMatch[1];
  }
  // Secondary school fallback (5-8)
  const secMatch = trimmed.match(/(?:^|[^0-9])([5-8])(?:[^0-9]|$)/i);
  if (secMatch) {
    return secMatch[1];
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
  // Kural 1: O gün o saatte o salonda dersi olan öğretmen (Komisyon olmamak ve İzinli/Raporlu olmamak şartıyla)
  //          - Aynı salonda birden fazla öğretmen varsa, görev sayıları eşitlenecek şekilde en az görev alanı seç veya kullanıcı tercihini uygula
  // Kural 2: Salondaki öğretmen komisyon veya izinli/raporlu ise boşta olan nöbetçi öğretmen (en az görev alan)
  // Kural 3: Boşta nöbetçi yoksa, sınav olmayan salonlardaki veya dersi olmayan boş öğretmenlerden biri (en az görev alan)

  const roomSupervisorMap = new Map<string, { teacherName: string; branch: string; reason: string }>();
  const assignedTeacherIds = new Set<string>();
  const teacherDutyCounts = getTeacherSupervisorCounts(teachers, savedPlans);

  // Helper to check if teacher is available (not on leave, not commission, not already assigned)
  const isTeacherAvailable = (t: Teacher): boolean => {
    if (t.isLeave) return false;
    if (commissionSet.has(t.name.toLowerCase().trim())) return false;
    if (assignedTeacherIds.has(t.id)) return false;
    return true;
  };

  // A. Room's current lesson teacher(s)
  for (const room of activeRooms) {
    // Check if user manually selected a preferred supervisor for this room
    if (preferredSupervisors && preferredSupervisors[room.id]) {
      const prefIdentifier = preferredSupervisors[room.id].toLowerCase().trim();
      const prefTeacher = teachers.find(
        t => (t.id === prefIdentifier || t.name.toLowerCase().trim() === prefIdentifier) && isTeacherAvailable(t)
      );
      if (prefTeacher) {
        roomSupervisorMap.set(room.id, {
          teacherName: prefTeacher.name,
          branch: prefTeacher.branch,
          reason: 'Derslik Öğretmeni (Kullanıcı Seçimi)',
        });
        assignedTeacherIds.add(prefTeacher.id);
        continue;
      }
    }

    // Find all teachers who have class in this room at this day & period
    const roomTeachers = teachers.filter(t => {
      if (!isTeacherAvailable(t)) return false;
      return t.schedule.some(
        s =>
          s.day === exam.dayOfWeek &&
          s.period === exam.period &&
          s.classroomName.toLowerCase().trim() === room.name.toLowerCase().trim()
      );
    });

    if (roomTeachers.length > 0) {
      // Sort by past supervisor duty count ascending for equal load distribution, then shuffle ties
      const sortedCandidates = [...roomTeachers].sort((a, b) => {
        const countA = teacherDutyCounts.get(a.name.toLowerCase().trim()) || 0;
        const countB = teacherDutyCounts.get(b.name.toLowerCase().trim()) || 0;
        if (countA !== countB) return countA - countB;
        return Math.random() - 0.5;
      });

      const selectedTeacher = sortedCandidates[0];
      const hasMultiple = roomTeachers.length > 1;

      roomSupervisorMap.set(room.id, {
        teacherName: selectedTeacher.name,
        branch: selectedTeacher.branch,
        reason: hasMultiple
          ? `Derslik Öğretmeni (Birden fazla öğretmenden dengeli seçildi - ${roomTeachers.length} öğretmen)`
          : 'Derslik Öğretmeni',
      });
      assignedTeacherIds.add(selectedTeacher.id);
    }
  }

  // B. Duty teachers without lesson in this period (Boşta Nöbetçi Öğretmenler)
  // Teachers who are on duty today, have NO lesson in this period, not on leave, not commission, not yet assigned
  const availableDutyTeachers = teachers
    .filter(t => {
      if (!isTeacherAvailable(t)) return false;
      if (t.dutyDay !== exam.dayOfWeek) return false;
      const hasLessonInPeriod = t.schedule.some(
        s => s.day === exam.dayOfWeek && s.period === exam.period
      );
      return !hasLessonInPeriod;
    })
    .sort((a, b) => {
      const countA = teacherDutyCounts.get(a.name.toLowerCase().trim()) || 0;
      const countB = teacherDutyCounts.get(b.name.toLowerCase().trim()) || 0;
      if (countA !== countB) return countA - countB;
      return Math.random() - 0.5;
    });

  let dutyIdx = 0;
  for (const room of activeRooms) {
    if (!roomSupervisorMap.has(room.id)) {
      if (dutyIdx < availableDutyTeachers.length) {
        const t = availableDutyTeachers[dutyIdx++];
        roomSupervisorMap.set(room.id, {
          teacherName: t.name,
          branch: t.branch,
          reason: 'Boşta Nöbetçi Öğretmen',
        });
        assignedTeacherIds.add(t.id);
      }
    }
  }

  // C. Fallback: Teachers with lessons in non-exam classrooms or free teachers
  const nonExamRoomNames = new Set(
    classrooms.filter(c => !c.isSelectedForExam).map(c => c.name.toLowerCase().trim())
  );

  const fallbackTeachers = teachers
    .filter(t => {
      if (!isTeacherAvailable(t)) return false;
      // Teacher either has no lesson at all in this period OR lesson is in a non-exam room
      const lessonInExamRoom = t.schedule.some(
        s =>
          s.day === exam.dayOfWeek &&
          s.period === exam.period &&
          !nonExamRoomNames.has(s.classroomName.toLowerCase().trim())
      );
      return !lessonInExamRoom;
    })
    .sort((a, b) => {
      const countA = teacherDutyCounts.get(a.name.toLowerCase().trim()) || 0;
      const countB = teacherDutyCounts.get(b.name.toLowerCase().trim()) || 0;
      if (countA !== countB) return countA - countB;
      return Math.random() - 0.5;
    });

  let fallbackIdx = 0;
  for (const room of activeRooms) {
    if (!roomSupervisorMap.has(room.id)) {
      if (fallbackIdx < fallbackTeachers.length) {
        const t = fallbackTeachers[fallbackIdx++];
        roomSupervisorMap.set(room.id, {
          teacherName: t.name,
          branch: t.branch,
          reason: 'Sınav Salonu Olmayan Derslik Öğretmeni',
        });
        assignedTeacherIds.add(t.id);
        warnings.push(
          `${room.name} salonuna derslik/nöbetçi öğretmen bulunamadığı için sınav salonu olmayan dersten ${t.name} (${t.branch}) gözetmen olarak atanmıştır.`
        );
      } else {
        roomSupervisorMap.set(room.id, {
          teacherName: 'Gözetmen Atanmadı (Öğretmen Yetersiz)',
          branch: '-',
          reason: 'Atanmadı',
        });
        warnings.push(`${room.name} salonu için uygun gözetmen bulunamadı!`);
      }
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
    const gA = getGradeLevel(a);
    const gB = getGradeLevel(b);
    return gA.localeCompare(gB);
  });

  const uniqueGrades = Array.from(new Set(allClassKeys.map(k => getGradeLevel(k)))).sort();

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
    isRelaxed = false
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
      // 1. Aynı Sıradaki Yan Yana Partner Kontrolü
      if (ctx.seatsPerRow === 2) {
        const partnerSeat = ctx.matrix[c][r][1 - s];
        if (partnerSeat?.student) {
          const partnerStudent = partnerSeat.student;
          const partnerGrade = getGradeLevel(partnerStudent.classLevel);
          if (partnerStudent.classLevel === classKey) {
            // KESİN KURAL: Aynı sırada asla aynı sınıftan öğrenci yan yana oturamaz!
            score -= 10000;
          } else if (partnerGrade === candidateGrade) {
            // KESİN KURAL: Önünde hangi ek olursa olsun (örn: ATP 9 ile AMP 9) aynı kademe asla yan yana oturamaz!
            if (uniqueGrades.length > 1) {
              score -= 10000;
            } else {
              score -= 2500;
            }
          } else {
            // Farklı kademe: İdeal kelebek eşleşmesi
            score += 450;
          }
        }
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
