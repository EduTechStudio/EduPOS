export type DateRangePreset = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'last_month' | 'custom';

export function getDateBounds(preset: DateRangePreset, customStart?: string, customEnd?: string): { startDate?: string; endDate?: string } {
  const now = new Date();
  
  if (preset === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  if (preset === 'yesterday') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  if (preset === 'week') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    return { startDate: start.toISOString(), endDate: now.toISOString() };
  }

  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { startDate: start.toISOString(), endDate: now.toISOString() };
  }


  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  if (preset === 'custom') {
    return { startDate: customStart, endDate: customEnd };
  }

  return {}; // 'all'
}
