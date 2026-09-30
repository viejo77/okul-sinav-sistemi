import { Classroom, Exam, Student, Subject, Teacher } from '../types';

export const initialSubjects: Subject[] = [
  {
    id: 'sub-1',
    name: 'Türk Dili ve Edebiyatı',
    code: 'TDE-101',
    teachers: ['Mehmet Akif Yıldız', 'Zeynep Kaya'],
  },
  {
    id: 'sub-2',
    name: 'Matematik',
    code: 'MAT-101',
    teachers: ['Ali Demir', 'Fatma Çelik'],
  },
  {
    id: 'sub-3',
    name: 'Fizik',
    code: 'FIZ-101',
    teachers: ['Ahmet Şahin', 'Elif Yılmaz'],
  },
  {
    id: 'sub-4',
    name: 'Kimya',
    code: 'KIM-101',
    teachers: ['Mustafa Öztürk'],
  },
  {
    id: 'sub-5',
    name: 'Biyoloji',
    code: 'BIY-101',
    teachers: ['Ayşe Arslan'],
  },
  {
    id: 'sub-6',
    name: 'Tarih',
    code: 'TAR-101',
    teachers: ['Hüseyin Koç'],
  },
];

export const initialExams: Exam[] = [
  {
    id: 'exam-1',
    name: '2024-2025 1. Dönem 1. Ortak Matematik Sınavı',
    date: '2024-11-06',
    dayOfWeek: 'Çarşamba',
    period: 3,
    periodLabel: '3. Ders (10:00 - 10:40)',
    subjectId: 'sub-2',
    subjectName: 'Matematik',
    assignedClasses: [
      { id: 'ac-1', classLevel: '9-A', subjectId: 'sub-2', subjectName: 'Matematik' },
      { id: 'ac-2', classLevel: '9-B', subjectId: 'sub-2', subjectName: 'Matematik' },
      { id: 'ac-3', classLevel: '10-A', subjectId: 'sub-2', subjectName: 'Matematik' },
      { id: 'ac-4', classLevel: '10-B', subjectId: 'sub-2', subjectName: 'Matematik' },
      { id: 'ac-5', classLevel: '11-A', subjectId: 'sub-2', subjectName: 'Matematik' },
      { id: 'ac-6', classLevel: '11-B', subjectId: 'sub-2', subjectName: 'Matematik' },
      { id: 'ac-7', classLevel: '12-A', subjectId: 'sub-2', subjectName: 'Matematik' },
    ],
  },
];

export const initialClassrooms: Classroom[] = [
  {
    id: 'room-1',
    name: 'Salon 1 (Derslik 9-A)',
    building: 'A Blok',
    floor: '1. Kat',
    capacity: 32,
    columnsCount: 4,
    rowsPerColumn: 4,
    rowsCount: 16,
    seatsPerRow: 2,
    doorPosition: 'right', // Kapı sağda -> Masa solda
    isSelectedForExam: true,
  },
  {
    id: 'room-2',
    name: 'Salon 2 (Derslik 9-B)',
    building: 'A Blok',
    floor: '1. Kat',
    capacity: 32,
    columnsCount: 4,
    rowsPerColumn: 4,
    rowsCount: 16,
    seatsPerRow: 2,
    doorPosition: 'left', // Kapı solda -> Masa sağda
    isSelectedForExam: true,
  },
  {
    id: 'room-3',
    name: 'Salon 3 (Derslik 10-A)',
    building: 'A Blok',
    floor: '2. Kat',
    capacity: 32,
    columnsCount: 4,
    rowsPerColumn: 4,
    rowsCount: 16,
    seatsPerRow: 2,
    doorPosition: 'right',
    isSelectedForExam: true,
  },
  {
    id: 'room-4',
    name: 'Salon 4 (Derslik 10-B)',
    building: 'A Blok',
    floor: '2. Kat',
    capacity: 32,
    columnsCount: 4,
    rowsPerColumn: 4,
    rowsCount: 16,
    seatsPerRow: 2,
    doorPosition: 'left',
    isSelectedForExam: true,
  },
  {
    id: 'room-5',
    name: 'Salon 5 (Derslik 11-A)',
    building: 'B Blok',
    floor: '1. Kat',
    capacity: 32,
    columnsCount: 4,
    rowsPerColumn: 4,
    rowsCount: 16,
    seatsPerRow: 2,
    doorPosition: 'right',
    isSelectedForExam: true,
  },
  {
    id: 'room-6',
    name: 'Salon 6 (Derslik 11-B)',
    building: 'B Blok',
    floor: '1. Kat',
    capacity: 32,
    columnsCount: 4,
    rowsPerColumn: 4,
    rowsCount: 16,
    seatsPerRow: 2,
    doorPosition: 'left',
    isSelectedForExam: true,
  },
  {
    id: 'room-7',
    name: 'Salon 7 (Derslik 12-A)',
    building: 'B Blok',
    floor: '2. Kat',
    capacity: 32,
    columnsCount: 4,
    rowsPerColumn: 4,
    rowsCount: 16,
    seatsPerRow: 2,
    doorPosition: 'right',
    isSelectedForExam: false,
  },
];

export const initialTeachers: Teacher[] = [
  {
    id: 't-1',
    name: 'Ali Demir',
    branch: 'Matematik',
    dutyDay: 'Pazartesi',
    schedule: [
      { day: 'Çarşamba', period: 3, classroomName: 'Salon 1 (Derslik 9-A)', subjectName: 'Matematik' },
    ],
  },
  {
    id: 't-2',
    name: 'Fatma Çelik',
    branch: 'Matematik',
    dutyDay: 'Salı',
    schedule: [
      { day: 'Çarşamba', period: 3, classroomName: 'Salon 2 (Derslik 9-B)', subjectName: 'Matematik' },
    ],
  },
  {
    id: 't-3',
    name: 'Mehmet Akif Yıldız',
    branch: 'Türk Dili ve Edebiyatı',
    dutyDay: 'Çarşamba', // Sınav günü nöbetçi!
    schedule: [], // 3. derste dersi yok (boşta nöbetçi)
  },
  {
    id: 't-4',
    name: 'Zeynep Kaya',
    branch: 'Türk Dili ve Edebiyatı',
    dutyDay: 'Perşembe',
    schedule: [
      { day: 'Çarşamba', period: 3, classroomName: 'Salon 3 (Derslik 10-A)', subjectName: 'Edebiyat' },
    ],
  },
  {
    id: 't-5',
    name: 'Ahmet Şahin',
    branch: 'Fizik',
    dutyDay: 'Çarşamba', // Sınav günü nöbetçi!
    schedule: [], // 3. derste dersi yok (boşta nöbetçi)
  },
  {
    id: 't-6',
    name: 'Elif Yılmaz',
    branch: 'Fizik',
    dutyDay: 'Cuma',
    schedule: [
      { day: 'Çarşamba', period: 3, classroomName: 'Salon 4 (Derslik 10-B)', subjectName: 'Fizik' },
    ],
  },
  {
    id: 't-7',
    name: 'Mustafa Öztürk',
    branch: 'Kimya',
    dutyDay: 'Çarşamba', // Sınav günü nöbetçi!
    schedule: [
      { day: 'Çarşamba', period: 3, classroomName: 'Salon 5 (Derslik 11-A)', subjectName: 'Kimya' },
    ],
  },
  {
    id: 't-8',
    name: 'Ayşe Arslan',
    branch: 'Biyoloji',
    dutyDay: 'Salı',
    schedule: [
      { day: 'Çarşamba', period: 3, classroomName: 'Salon 6 (Derslik 11-B)', subjectName: 'Biyoloji' },
    ],
  },
  {
    id: 't-9',
    name: 'Hüseyin Koç',
    branch: 'Tarih',
    dutyDay: 'Çarşamba', // Sınav günü nöbetçi!
    schedule: [],
  },
  {
    id: 't-10',
    name: 'Selin Aydın',
    branch: 'İngilizce',
    dutyDay: 'Perşembe',
    schedule: [
      { day: 'Çarşamba', period: 3, classroomName: 'Salon 7 (Derslik 12-A)', subjectName: 'İngilizce' },
    ],
  },
];

// Helper to generate realistic student list
export const generateInitialStudents = (): Student[] => {
  const firstNamesM = [
    'Emir', 'Yusuf', 'Eymen', 'Kerem', 'Mustafa', 'Burak', 'Can', 'Arda', 'Deniz', 'Barış',
    'Oğuzhan', 'Serkan', 'Mert', 'Tolga', 'Kaan', 'Berk', 'Ege', 'Doruk', 'Alp', 'Yiğit',
  ];
  const firstNamesF = [
    'Zeynep', 'Elif', 'Defne', 'Asya', 'Eylül', 'Nehir', 'Duru', 'Yağmur', 'Ada', 'Mina',
    'Melis', 'Selin', 'Ceren', 'Buse', 'Gamze', 'İrem', 'Beyza', 'Sıla', 'Cansu', 'Ece',
  ];
  const lastNames = [
    'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın',
    'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek',
  ];

  const classes = ['9-A', '9-B', '10-A', '10-B', '11-A', '11-B', '12-A'];
  const students: Student[] = [];
  let numCounter = 101;

  classes.forEach(c => {
    // 20 students per class = 140 total students
    for (let i = 0; i < 20; i++) {
      const isMale = (i % 2 === 0);
      const name = isMale
        ? firstNamesM[(i * 3 + numCounter) % firstNamesM.length]
        : firstNamesF[(i * 3 + numCounter) % firstNamesF.length];
      const surname = lastNames[(i * 2 + numCounter) % lastNames.length];
      const isBEP = (i === 4 && (c === '9-A' || c === '10-B' || c === '11-A')); // A few BEP students

      students.push({
        id: `stu-${numCounter}`,
        number: numCounter.toString(),
        name,
        surname,
        classLevel: c,
        isBEP,
        notes: isBEP ? 'Bireyselleştirilmiş Eğitim Programı (BEP) öğrencisi' : undefined,
      });

      numCounter++;
    }
  });

  return students;
};

export const initialResponsibilitySettings: import('../types').ResponsibilitySettings = {
  schoolName: 'Türkiye Tekstil Sanayi İşverenleri Sendikası Mesleki ve Teknik Anadolu Lisesi',
  districtName: 'MELİKGAZİ KAYMAKAMLIĞI',
  principalName: 'Osman YÜCEL',
  academicYear: '2026-2027',
  term: '1.DÖNEM',
  docNumber: '71646280.125.01-',
  docDate: '25.09.2026',
};

export const generateInitialResponsibilityExams = (
  studentsList: Student[] = generateInitialStudents()
): import('../types').ResponsibilityExam[] => {
  // Pick some students from 10th, 11th and 12th grades who have responsibilities
  const students10 = studentsList.filter(s => s.classLevel.startsWith('10-'));
  const students11 = studentsList.filter(s => s.classLevel.startsWith('11-'));
  const students12 = studentsList.filter(s => s.classLevel.startsWith('12-'));

  const makeRespStudents = (list: Student[], count: number, gradeLevel: string) => {
    return list.slice(0, count).map(s => ({
      id: `resp-st-${s.id}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: s.id,
      number: s.number,
      name: s.name,
      surname: s.surname,
      classLevel: s.classLevel,
      responsibleGradeLevel: gradeLevel,
      isBEP: s.isBEP,
      result: 'BEKLİYOR' as const,
    }));
  };

  return [
    {
      id: 'resp-exam-1',
      subjectName: 'Türk Dili ve Edebiyatı',
      subjectCode: 'TDE-9',
      gradeLevel: '9. Sınıf',
      examDate: '18.09.2024',
      examTime: '10:00',
      classroomName: 'Salon 1 (9-A)',
      commissionMembers: ['Mehmet Akif Yıldız', 'Zeynep Kaya'],
      supervisorName: 'Ali Demir',
      students: makeRespStudents(students10, 6, '9. Sınıf'),
      notes: 'Yazılı sınavdır. Süre 40 dakikadır.',
    },
    {
      id: 'resp-exam-2',
      subjectName: 'Matematik',
      subjectCode: 'MAT-9',
      gradeLevel: '9. Sınıf',
      examDate: '18.09.2024',
      examTime: '13:30',
      classroomName: 'Salon 2 (10-A)',
      commissionMembers: ['Ali Demir', 'Fatma Çelik'],
      supervisorName: 'Ahmet Şahin',
      students: makeRespStudents(students10.slice(6), 5, '9. Sınıf'),
      notes: 'Yazılı sınavdır. 10 adet açık uçlu soru sorulacaktır.',
    },
    {
      id: 'resp-exam-3',
      subjectName: 'Fizik',
      subjectCode: 'FIZ-10',
      gradeLevel: '10. Sınıf',
      examDate: '19.09.2024',
      examTime: '10:00',
      classroomName: 'Salon 3 (11-A)',
      commissionMembers: ['Ahmet Şahin', 'Elif Yılmaz'],
      supervisorName: 'Mustafa Öztürk',
      students: makeRespStudents(students11, 5, '10. Sınıf'),
      notes: 'Yazılı sınavdır.',
    },
    {
      id: 'resp-exam-4',
      subjectName: 'Tarih',
      subjectCode: 'TAR-10',
      gradeLevel: '10. Sınıf',
      examDate: '19.09.2024',
      examTime: '13:30',
      classroomName: 'Salon 1 (9-A)',
      commissionMembers: ['Hüseyin Koç', 'Zeynep Kaya'],
      supervisorName: 'Ayşe Arslan',
      students: makeRespStudents(students11.slice(5), 4, '10. Sınıf'),
      notes: 'Yazılı sınavdır.',
    },
    {
      id: 'resp-exam-5',
      subjectName: 'Kimya',
      subjectCode: 'KIM-11',
      gradeLevel: '11. Sınıf',
      examDate: '20.09.2024',
      examTime: '10:00',
      classroomName: 'Salon 2 (10-A)',
      commissionMembers: ['Mustafa Öztürk', 'Ayşe Arslan'],
      supervisorName: 'Hüseyin Koç',
      students: makeRespStudents(students12, 4, '11. Sınıf'),
      notes: 'Yazılı sınavdır.',
    },
  ];
};

export const getInitialMockData = () => {
  const subjects = initialSubjects;
  const exams = initialExams;
  const classrooms = initialClassrooms;
  const teachers = initialTeachers;
  const students = generateInitialStudents();
  const responsibilitySettings = initialResponsibilitySettings;
  const responsibilityExams = generateInitialResponsibilityExams(students);

  return {
    subjects,
    exams,
    classrooms,
    teachers,
    students,
    samplePlan: undefined,
    responsibilitySettings,
    responsibilityExams,
  };
};


