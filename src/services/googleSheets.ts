import { getAccessToken, signInWithGoogle } from './googleAuth';
import { SeatingPlanResult, Student } from '../types';
import { WeeklyScheduleItem } from './excelService';

export interface ExportToSheetsResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export interface SheetMetadata {
  id: number;
  title: string;
  rowCount?: number;
  columnCount?: number;
}

/**
 * Extracts a Google Spreadsheet ID from either a full URL or a raw ID string.
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Match https://docs.google.com/spreadsheets/d/<ID>/edit...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Check if it's already an ID
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

/**
 * Ensures an active access token is available, or triggers sign in if needed.
 */
async function getOrRequestToken(): Promise<string> {
  let token = await getAccessToken();
  if (!token) {
    const res = await signInWithGoogle();
    if (!res || !res.accessToken) {
      throw new Error('Google E-Tablolar erişimi için Google hesabınız ile oturum açılmalıdır.');
    }
    token = res.accessToken;
  }
  return token;
}

/**
 * Fetches the list of tabs (sheets) from a Google Spreadsheet by ID or URL.
 */
export async function listSpreadsheetTabs(spreadsheetIdOrUrl: string): Promise<{
  title: string;
  sheets: SheetMetadata[];
}> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  if (!spreadsheetId) {
    throw new Error('Geçerli bir Google E-Tablo linki veya Tablo ID giriniz.');
  }

  const token = await getOrRequestToken();
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!resp.ok) {
    const errorText = await resp.text();
    let msg = errorText;
    try {
      const parsed = JSON.parse(errorText);
      msg = parsed.error?.message || errorText;
    } catch {
      // ignore
    }
    throw new Error(`Google E-Tabloya erişilemedi: ${msg}`);
  }

  const data = await resp.json();
  const title = data.properties?.title || 'Google E-Tablo';
  const sheets: SheetMetadata[] = (data.sheets || []).map((s: { properties: { sheetId: number; title: string; gridProperties?: { rowCount?: number; columnCount?: number } } }) => ({
    id: s.properties.sheetId,
    title: s.properties.title,
    rowCount: s.properties.gridProperties?.rowCount,
    columnCount: s.properties.gridProperties?.columnCount,
  }));

  return { title, sheets };
}

/**
 * Imports student records directly from a Google Sheet range.
 */
export async function importStudentsFromGoogleSheet(
  spreadsheetIdOrUrl: string,
  sheetTitle: string = 'Sheet1'
): Promise<Student[]> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  if (!spreadsheetId) {
    throw new Error('Geçerli bir Google E-Tablo linki veya Tablo ID giriniz.');
  }

  const token = await getOrRequestToken();
  const range = `'${sheetTitle}'!A1:Z5000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    let msg = errorText;
    try {
      const parsed = JSON.parse(errorText);
      msg = parsed.error?.message || errorText;
    } catch {
      // ignore
    }
    throw new Error(`Öğrenci verileri okunamadı: ${msg}`);
  }

  const data = await resp.json();
  const rows: (string | number | boolean)[][] = data.values || [];

  if (rows.length < 2) {
    throw new Error('E-Tabloda en az 1 başlık ve 1 veri satırı bulunmalıdır.');
  }

  const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
  
  // Find column indexes
  let noIdx = -1;
  let nameIdx = -1;
  let surnameIdx = -1;
  let classIdx = -1;
  let bepIdx = -1;

  headers.forEach((h, idx) => {
    if (h.includes('no') || h.includes('numara') || h.includes('okul no') || h === 'öğrenci no') {
      if (noIdx === -1) noIdx = idx;
    } else if (h === 'ad' || h === 'adı' || h === 'isim' || h.includes('ad soyad')) {
      if (nameIdx === -1) nameIdx = idx;
    } else if (h === 'soyad' || h === 'soyadı') {
      if (surnameIdx === -1) surnameIdx = idx;
    } else if (h.includes('sınıf') || h.includes('sube') || h.includes('şube')) {
      if (classIdx === -1) classIdx = idx;
    } else if (h.includes('bep') || h.includes('kaynaştırma')) {
      if (bepIdx === -1) bepIdx = idx;
    }
  });

  // Fallbacks if specific headers not found
  if (nameIdx === -1) nameIdx = 0;
  if (classIdx === -1 && rows[0].length > 1) classIdx = 1;
  if (noIdx === -1 && rows[0].length > 2) noIdx = 2;

  const students: Student[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    let rawName = nameIdx >= 0 && row[nameIdx] !== undefined ? String(row[nameIdx]).trim() : '';
    let rawSurname = surnameIdx >= 0 && row[surnameIdx] !== undefined ? String(row[surnameIdx]).trim() : '';
    const rawClass = classIdx >= 0 && row[classIdx] !== undefined ? String(row[classIdx]).trim() : '';
    const rawNo = noIdx >= 0 && row[noIdx] !== undefined ? String(row[noIdx]).trim() : '';
    const rawBep = bepIdx >= 0 && row[bepIdx] !== undefined ? String(row[bepIdx]).trim() : '';

    if (!rawName && !rawClass && !rawNo) continue;

    // Check if combined "Ad Soyad"
    if (rawName && (!rawSurname || surnameIdx === -1) && rawName.includes(' ')) {
      const parts = rawName.split(/\s+/);
      rawSurname = parts.pop() || '';
      rawName = parts.join(' ');
    }

    const isBEP =
      rawBep.toLowerCase().includes('evet') ||
      rawBep === '1' ||
      rawBep.toLowerCase().includes('bep') ||
      rawBep.toLowerCase().includes('true');

    if (rawName) {
      students.push({
        id: `stu-gs-${Date.now()}-${r}`,
        number: rawNo || `${100 + r}`,
        name: rawName.toUpperCase(),
        surname: (rawSurname || '-').toUpperCase(),
        classLevel: (rawClass || '9-A').toUpperCase(),
        isBEP,
      });
    }
  }

  return students;
}

/**
 * Imports weekly teacher lesson schedule from a Google Sheet range.
 */
export async function importWeeklyScheduleFromGoogleSheet(
  spreadsheetIdOrUrl: string,
  sheetTitle: string = 'Sheet1'
): Promise<WeeklyScheduleItem[]> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  if (!spreadsheetId) {
    throw new Error('Geçerli bir Google E-Tablo linki veya Tablo ID giriniz.');
  }

  const token = await getOrRequestToken();
  const range = `'${sheetTitle}'!A1:Z5000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    let msg = errorText;
    try {
      const parsed = JSON.parse(errorText);
      msg = parsed.error?.message || errorText;
    } catch {
      // ignore
    }
    throw new Error(`Ders programı okunamadı: ${msg}`);
  }

  const data = await resp.json();
  const rows: (string | number | boolean)[][] = data.values || [];

  if (rows.length < 2) {
    throw new Error('E-Tabloda en az 1 başlık ve 1 veri satırı bulunmalıdır.');
  }

  const headers = rows[0].map(h => String(h || '').trim().toLowerCase());

  let dayIdx = -1;
  let periodIdx = -1;
  let teacherIdx = -1;
  let roomIdx = -1;
  let branchIdx = -1;

  headers.forEach((h, idx) => {
    if (h.includes('gün') || h.includes('gun') || h === 'day') {
      dayIdx = idx;
    } else if (h.includes('saat') || h.includes('period') || h.includes('ders saati')) {
      periodIdx = idx;
    } else if (h.includes('öğretmen') || h.includes('ogretmen') || h.includes('hoca') || h === 'teacher') {
      teacherIdx = idx;
    } else if (h.includes('derslik') || h.includes('salon') || h.includes('sınıf') || h.includes('oda')) {
      roomIdx = idx;
    } else if (h.includes('branş') || h.includes('brans') || h.includes('ders adı') || h.includes('ders')) {
      branchIdx = idx;
    }
  });

  if (teacherIdx === -1) teacherIdx = 0;
  if (roomIdx === -1 && rows[0].length > 1) roomIdx = 1;

  const validDays: WeeklyScheduleItem['day'][] = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  const items: WeeklyScheduleItem[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawTeacher = teacherIdx >= 0 && row[teacherIdx] !== undefined ? String(row[teacherIdx]).trim() : '';
    const rawRoom = roomIdx >= 0 && row[roomIdx] !== undefined ? String(row[roomIdx]).trim() : '';
    const rawBranch = branchIdx >= 0 && row[branchIdx] !== undefined ? String(row[branchIdx]).trim() : '';
    const rawDay = dayIdx >= 0 && row[dayIdx] !== undefined ? String(row[dayIdx]).trim() : 'Pazartesi';
    const rawPeriod = periodIdx >= 0 && row[periodIdx] !== undefined ? String(row[periodIdx]).trim() : '1';

    if (!rawTeacher && !rawRoom) continue;

    // Normalize day
    let matchedDay: WeeklyScheduleItem['day'] = 'Pazartesi';
    for (const d of validDays) {
      if (rawDay.toLowerCase().includes(d.toLowerCase())) {
        matchedDay = d;
        break;
      }
    }

    const pNum = parseInt(rawPeriod.replace(/\D/g, ''), 10) || 1;

    items.push({
      id: `sched-gs-${Date.now()}-${r}`,
      day: matchedDay,
      period: pNum,
      periodLabel: `${pNum}. Ders`,
      classroomName: rawRoom || 'Genel Salon',
      teacherName: rawTeacher || 'Öğretmen',
      branch: rawBranch || undefined,
    });
  }

  return items;
}

export const exportPlanToGoogleSheets = async (
  plan: SeatingPlanResult
): Promise<ExportToSheetsResult> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google oturumu bulunamadı. Lütfen önce Google ile giriş yapınız.');
  }

  // 1. Create a new Spreadsheet
  const title = `Kelebek Sınav Oturma Planı - ${plan.examName} (${plan.examDate})`;
  const createResp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        { properties: { title: 'Salon Oturma Düzenleri' } },
        { properties: { title: 'Sınıf Bazlı Dağılım' } },
        { properties: { title: 'Gözetmen ve Komisyon' } },
        { properties: { title: 'BEP Kaynaştırma Listesi' } },
      ],
    }),
  });

  if (!createResp.ok) {
    const errorText = await createResp.text();
    throw new Error(`Google E-Tablo oluşturulamadı: ${errorText}`);
  }

  const sheetData = await createResp.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare data for each sheet tab
  // Tab 1: Salon Oturma Düzenleri
  const salonRows: (string | number)[][] = [
    ['SINAV OTURMA PLANI SALON LİSTESİ'],
    ['Sınav Adı:', plan.examName, 'Tarih:', plan.examDate, 'Ders Saati:', `${plan.examPeriod}. Ders`],
    ['Ders:', plan.subjectName],
    [],
    ['Salon Adı', 'Sıra No', 'Öğrenci No', 'Ad Soyad', 'Sınıfı', 'BEP Durumu', 'Gözetmen'],
  ];

  plan.rooms.forEach(room => {
    room.seats
      .filter(s => s.student)
      .forEach(seat => {
        salonRows.push([
          room.classroomName,
          seat.seatNumber,
          seat.student!.number,
          `${seat.student!.name} ${seat.student!.surname}`,
          seat.student!.classLevel,
          seat.student!.isBEP ? 'BEP' : 'Normal',
          room.supervisorName,
        ]);
      });
  });

  // Tab 2: Sınıf Bazlı Dağılım
  const classRows: (string | number)[][] = [
    ['SINIFLARA GÖRE SINAV SALONU DAĞILIMI (ÖĞRENCİ BİLGİ LİSTESİ)'],
    ['Sınav:', plan.examName, 'Tarih:', plan.examDate],
    [],
    ['Sınıf', 'Öğrenci No', 'Ad Soyad', 'Sınav Salonu', 'Sıra No', 'Gözetmen'],
  ];

  // Group by student's classLevel
  const allSeated: { student: Student; roomName: string; seatNo: number; supervisor: string }[] = [];
  plan.rooms.forEach(room => {
    room.seats
      .filter(s => s.student)
      .forEach(seat => {
        allSeated.push({
          student: seat.student!,
          roomName: room.classroomName,
          seatNo: seat.seatNumber,
          supervisor: room.supervisorName,
        });
      });
  });

  allSeated.sort((a, b) => {
    if (a.student.classLevel !== b.student.classLevel) {
      return a.student.classLevel.localeCompare(b.student.classLevel, 'tr');
    }
    return Number(a.student.number) - Number(b.student.number);
  });

  allSeated.forEach(item => {
    classRows.push([
      item.student.classLevel,
      item.student.number,
      `${item.student.name} ${item.student.surname}`,
      item.roomName,
      item.seatNo,
      item.supervisor,
    ]);
  });

  // Tab 3: Gözetmen ve Komisyon
  const supervisorRows: (string | number)[][] = [
    ['SINAV KOMİSYONU VE GÖZETMEN GÖREV LİSTESİ'],
    ['Sınav:', plan.examName, 'Tarih:', plan.examDate, 'Ders Saati:', `${plan.examPeriod}. Ders`],
    [],
    ['--- SINAV KOMİSYONU (SORU HAZIRLAYAN VE BRANŞ ÖĞRETMENLERİ - GÖZETMEN OLAMAZ) ---'],
    ['Sıra', 'Öğretmen Adı Soyadı', 'Görevi'],
  ];

  plan.commissionMembers.forEach((member, idx) => {
    supervisorRows.push([idx + 1, member, 'Sınav Komisyon Üyesi']);
  });

  supervisorRows.push(
    [],
    ['--- SALON GÖZETMENLERİ ---'],
    ['Salon Adı', 'Gözetmen Adı', 'Branş', 'Atama Gerekçesi', 'Öğrenci Sayısı']
  );

  plan.rooms.forEach(room => {
    supervisorRows.push([
      room.classroomName,
      room.supervisorName,
      room.supervisorBranch || '-',
      room.supervisorReason,
      room.totalAssigned,
    ]);
  });

  // Tab 4: BEP Kaynaştırma Listesi
  const bepRows: (string | number)[][] = [
    ['KAYNAŞTIRMA (BEP) ÖĞRENCİLERİ SINAV YERLEŞİM LİSTESİ'],
    ['Sınav:', plan.examName, 'Tarih:', plan.examDate],
    [],
    ['Öğrenci No', 'Adı Soyadı', 'Sınıfı', 'Sınav Salonu', 'Sıra No', 'Gözetmen Öğretmen'],
  ];

  allSeated
    .filter(item => item.student.isBEP)
    .forEach(item => {
      bepRows.push([
        item.student.number,
        `${item.student.name} ${item.student.surname}`,
        item.student.classLevel,
        item.roomName,
        item.seatNo,
        item.supervisor,
      ]);
    });

  // 3. Batch Update values to the Google Sheet
  const updateData = [
    { range: 'Salon Oturma Düzenleri!A1', values: salonRows },
    { range: 'Sınıf Bazlı Dağılım!A1', values: classRows },
    { range: 'Gözetmen ve Komisyon!A1', values: supervisorRows },
    { range: 'BEP Kaynaştırma Listesi!A1', values: bepRows },
  ];

  const updateResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updateData,
      }),
    }
  );

  if (!updateResp.ok) {
    const errorText = await updateResp.text();
    console.error('Veri aktarım hatası:', errorText);
  }

  return { spreadsheetId, spreadsheetUrl };
};
