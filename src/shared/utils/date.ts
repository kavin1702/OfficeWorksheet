export function formatDateIso(dateObj: Date = new Date()): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayStr(): string {
  return formatDateIso(new Date());
}

export function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateIso(d);
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();

  if (dateStr === todayStr) {
    return 'Today, ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (dateStr === yesterdayStr) {
    return 'Yesterday';
  }

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return dateStr;
}

export function normalizeDate(d: any): string {
  if (!d) return getTodayStr();
  const str = String(d).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${String(ymdMatch[2]).padStart(2, '0')}-${String(ymdMatch[3]).padStart(2, '0')}`;
  }

  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${String(dmyMatch[2]).padStart(2, '0')}-${String(dmyMatch[1]).padStart(2, '0')}`;
  }

  try {
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) {
      let yr = dt.getFullYear();
      if (yr < 2020 || yr > 2030) yr = 2026;
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      const da = String(dt.getDate()).padStart(2, '0');
      return `${yr}-${mo}-${da}`;
    }
  } catch (e) {}

  return '2026-08-01';
}