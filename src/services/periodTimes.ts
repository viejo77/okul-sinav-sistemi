import { PeriodTimeSlot } from '../types';
export type { PeriodTimeSlot };

export const DEFAULT_PERIOD_TIME_SLOTS: PeriodTimeSlot[] = [
  { period: 1, startTime: '08:30', endTime: '09:10', label: '1. Ders (08:30 - 09:10)' },
  { period: 2, startTime: '09:25', endTime: '10:05', label: '2. Ders (09:25 - 10:05)' },
  { period: 3, startTime: '10:20', endTime: '11:00', label: '3. Ders (10:20 - 11:00)' },
  { period: 4, startTime: '11:15', endTime: '11:55', label: '4. Ders (11:15 - 11:55)' },
  { period: 5, startTime: '12:40', endTime: '13:20', label: '5. Ders (12:40 - 13:20)' },
  { period: 6, startTime: '13:35', endTime: '14:15', label: '6. Ders (13:35 - 14:15)' },
  { period: 7, startTime: '14:30', endTime: '15:10', label: '7. Ders (14:30 - 15:10)' },
  { period: 8, startTime: '15:25', endTime: '16:05', label: '8. Ders (15:25 - 16:05)' },
  { period: 9, startTime: '16:20', endTime: '17:00', label: '9. Ders (16:20 - 17:00)' },
  { period: 10, startTime: '17:15', endTime: '17:55', label: '10. Ders (17:15 - 17:55)' },
];

const STORAGE_KEY = 'school_period_time_slots';

export const getSavedPeriodTimeSlots = (): PeriodTimeSlot[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Zil saatleri yüklenemedi:', e);
  }
  return DEFAULT_PERIOD_TIME_SLOTS;
};

export const savePeriodTimeSlots = (slots: PeriodTimeSlot[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  } catch (e) {
    console.error('Zil saatleri kaydedilemedi:', e);
  }
};

/**
 * Given a period number (e.g. 2), returns the full formatted label (e.g. "2. Ders (09:25 - 10:05)")
 */
export const formatPeriodWithTimes = (period: number, customSlots?: PeriodTimeSlot[]): string => {
  const slots = customSlots || getSavedPeriodTimeSlots();
  const slot = slots.find(s => s.period === Number(period));
  if (slot) {
    return `${slot.period}. Ders (${slot.startTime} - ${slot.endTime})`;
  }
  return `${period}. Ders`;
};

/**
 * Extracts the integer period from any string (e.g. "2. Ders", "2", "2. Ders (09:25 - 10:05)")
 */
export const extractPeriodNumber = (val: string | number): number => {
  if (typeof val === 'number') return val;
  const match = String(val).match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
};
