import { DateString, WeekBoundary, Weekday } from '../types';

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function padTwo(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

export function formatLocalDate(year: number, month: number, day: number): DateString {
  return `${year}-${padTwo(month)}-${padTwo(day)}`;
}

export function getTodayDateString(): DateString {
  const now = new Date();
  return formatLocalDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function getNowIsoLocal(): string {
  const now = new Date();
  const datePart = formatLocalDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const timePart = `${padTwo(now.getHours())}:${padTwo(now.getMinutes())}:${padTwo(now.getSeconds())}`;
  return `${datePart}T${timePart}`;
}

export function parseLocalDate(dateStr: DateString): Date {
  const parts = dateStr.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
}

export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export function addDays(dateStr: DateString, days: number): DateString {
  const base = parseLocalDate(dateStr);
  const shifted = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + days,
    12,
    0,
    0,
    0
  );
  return formatLocalDate(shifted.getFullYear(), shifted.getMonth() + 1, shifted.getDate());
}

export function diffDays(startStr: DateString, endStr: DateString): number {
  const start = parseLocalDate(startStr).getTime();
  const end = parseLocalDate(endStr).getTime();
  return Math.round((end - start) / 86400000);
}

export function getWeekday(dateStr: DateString): Weekday {
  return parseLocalDate(dateStr).getDay() as Weekday;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0, 12, 0, 0, 0).getDate();
}

export function getFirstDayOfMonthWeekday(year: number, month: number): Weekday {
  return new Date(year, month - 1, 1, 12, 0, 0, 0).getDay() as Weekday;
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS_FULL[month - 1]} ${year}`;
}

export function generateTwelveWeeks(startDate: DateString): WeekBoundary[] {
  const weeks: WeekBoundary[] = [];
  for (let index = 0; index < 12; index += 1) {
    const weekStart = addDays(startDate, index * 7);
    const weekEnd = addDays(weekStart, 6);
    weeks.push({
      weekNumber: index + 1,
      startDate: weekStart,
      endDate: weekEnd,
    });
  }
  return weeks;
}

export function getChallengeEndDate(startDate: DateString): DateString {
  return addDays(startDate, 83);
}

export function getActiveWeekNumber(
  startDate: DateString,
  todayStr: DateString
): number | null {
  const elapsed = diffDays(startDate, todayStr);
  if (elapsed < 0 || elapsed > 83) {
    return null;
  }
  return Math.floor(elapsed / 7) + 1;
}

export function getWeekNumberForDate(
  startDate: DateString,
  targetDate: DateString
): number | null {
  return getActiveWeekNumber(startDate, targetDate);
}

export function isDateWithinRange(
  dateStr: DateString,
  startDate: DateString,
  endDate: DateString
): boolean {
  return dateStr >= startDate && dateStr <= endDate;
}

export function minDate(a: DateString, b: DateString): DateString {
  return a <= b ? a : b;
}

export function maxDate(a: DateString, b: DateString): DateString {
  return a >= b ? a : b;
}

export function clampDate(
  dateStr: DateString,
  minStr: DateString,
  maxStr: DateString
): DateString {
  if (dateStr < minStr) {
    return minStr;
  }
  if (dateStr > maxStr) {
    return maxStr;
  }
  return dateStr;
}

export function formatDisplayDate(dateStr: DateString): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day} ${MONTHS_SHORT[month - 1]} ${year}`;
}

export function formatShortDate(dateStr: DateString): string {
  const [, month, day] = dateStr.split('-').map(Number);
  return `${day} ${MONTHS_SHORT[month - 1]}`;
}

export function formatDateWithWeekday(dateStr: DateString): string {
  const weekday = WEEKDAYS_SHORT[getWeekday(dateStr)];
  return `${weekday}, ${formatShortDate(dateStr)}`;
}

export function formatScheduleSummary(daysOfWeek: Weekday[]): string {
  if (daysOfWeek.length === 7) {
    return 'Every day';
  }
  const sorted = [...daysOfWeek].sort((a, b) => a - b);
  if (sorted.length === 5 && sorted.join(',') === '1,2,3,4,5') {
    return 'Mon - Fri';
  }
  if (sorted.length === 6 && sorted.join(',') === '1,2,3,4,5,6') {
    return 'Mon - Sat';
  }
  if (sorted.length === 2 && sorted.join(',') === '0,6') {
    return 'Weekends';
  }
  return sorted.map((day) => WEEKDAYS_SHORT[day]).join(', ');
}