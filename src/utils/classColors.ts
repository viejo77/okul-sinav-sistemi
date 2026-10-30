import { getGradeLevel } from '../services/kelebekEngine';

export interface ClassColorDef {
  bg: string;
  border: string;
  text: string;
  badge: string;
  ring: string;
  accent: string;
  lightBadge: string;
  bgHex: string;
  borderHex: string;
  badgeHex: string;
}

/**
 * Generates distinct, accessible and visually appealing color classes for each school class/grade
 */
export const getClassColor = (classLevel: string): ClassColorDef => {
  const grade = getGradeLevel(classLevel);
  if (grade === '9') {
    return {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-800',
      badge: 'bg-blue-600 text-white',
      ring: 'focus:ring-blue-400',
      accent: 'border-l-blue-500',
      lightBadge: 'bg-blue-100 text-blue-800 border-blue-200',
      bgHex: '#eff6ff',
      borderHex: '#93c5fd',
      badgeHex: '#2563eb',
    };
  }
  if (grade === '10') {
    return {
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      text: 'text-emerald-800',
      badge: 'bg-emerald-600 text-white',
      ring: 'focus:ring-emerald-400',
      accent: 'border-l-emerald-500',
      lightBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      bgHex: '#ecfdf5',
      borderHex: '#6ee7b7',
      badgeHex: '#059669',
    };
  }
  if (grade === '11') {
    return {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-800',
      badge: 'bg-amber-600 text-white',
      ring: 'focus:ring-amber-400',
      accent: 'border-l-amber-500',
      lightBadge: 'bg-amber-100 text-amber-800 border-amber-200',
      bgHex: '#fffbeb',
      borderHex: '#fcd34d',
      badgeHex: '#d97706',
    };
  }
  if (grade === '12') {
    return {
      bg: 'bg-purple-50',
      border: 'border-purple-300',
      text: 'text-purple-800',
      badge: 'bg-purple-600 text-white',
      ring: 'focus:ring-purple-400',
      accent: 'border-l-purple-500',
      lightBadge: 'bg-purple-100 text-purple-800 border-purple-200',
      bgHex: '#faf5ff',
      borderHex: '#d8b4fe',
      badgeHex: '#9333ea',
    };
  }
  if (['5', '6', '7', '8'].includes(grade)) {
    return {
      bg: 'bg-cyan-50',
      border: 'border-cyan-300',
      text: 'text-cyan-800',
      badge: 'bg-cyan-600 text-white',
      ring: 'focus:ring-cyan-400',
      accent: 'border-l-cyan-500',
      lightBadge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      bgHex: '#ecfeff',
      borderHex: '#67e8f9',
      badgeHex: '#0891b2',
    };
  }
  // Default / other classes
  return {
    bg: 'bg-teal-50',
    border: 'border-teal-300',
    text: 'text-teal-800',
    badge: 'bg-teal-600 text-white',
    ring: 'focus:ring-teal-400',
    accent: 'border-l-teal-500',
    lightBadge: 'bg-teal-100 text-teal-800 border-teal-200',
    bgHex: '#f0fdfa',
    borderHex: '#5eead4',
    badgeHex: '#0d9488',
  };
};

