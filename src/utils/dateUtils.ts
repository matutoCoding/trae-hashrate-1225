import { format, parseISO, differenceInDays, addDays, startOfDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function formatDate(date: string | Date, formatStr: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: zhCN });
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'yyyy-MM-dd HH:mm');
}

export function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} 至 ${formatDate(end)}`;
}

export function getDaysBetween(start: string, end: string): number {
  return differenceInDays(parseISO(end), parseISO(start)) + 1;
}

export function isDateInRange(date: string, start: string, end: string): boolean {
  const d = startOfDay(parseISO(date)).getTime();
  const s = startOfDay(parseISO(start)).getTime();
  const e = startOfDay(parseISO(end)).getTime();
  return d >= s && d <= e;
}

export function generateDateRange(start: string, end: string): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(parseISO(start));
  const last = startOfDay(parseISO(end));
  
  while (current <= last) {
    dates.push(current);
    current = addDays(current, 1);
  }
  
  return dates;
}

export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    matched: '已匹配',
    dispatched: '已派工',
    completed: '已完成',
    cancelled: '已取消',
    available: '可用',
    occupied: '已占用',
    maintenance: '维护中',
    in_progress: '进行中',
    high: '高',
    medium: '中',
    low: '低',
    economy: '经济',
    standard: '标准',
    premium: '高端'
  };
  return statusMap[status] || status;
}

export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-blue-100 text-blue-800',
    matched: 'bg-purple-100 text-purple-800',
    dispatched: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    available: 'bg-green-100 text-green-800',
    occupied: 'bg-red-100 text-red-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    high: 'bg-red-100 text-red-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-green-100 text-green-800'
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}
