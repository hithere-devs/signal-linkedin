import type { DailyStats } from '../types';
import { emptyStats, mergeStats } from './stats';

export function summarizeStats(history: DailyStats[]): DailyStats {
  return history.reduce((total, day) => mergeStats(total, day), emptyStats(''));
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0 min';
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const total = Math.round(minutes);
  return `${Math.floor(total / 60)}h ${total % 60}m`;
}

const CATEGORY_NAMES: Record<string, string> = {
  technical: 'Engineering',
  ai: 'Artificial intelligence',
  startup: 'Startups',
  'data-insight': 'Data and research',
  'interview-prep': 'Interview prep',
  'career-advice': 'Career advice',
  'career-milestone': 'Career updates',
  motivation: 'Motivation',
  personal: 'Personal stories',
  promotional: 'Promotion',
  'engagement-bait': 'Engagement bait',
  job: 'Job opportunities',
  repost: 'Reposts',
  general: 'Other topics',
  ad: 'Sponsored',
};

export function categoryLabel(value: string): string {
  return CATEGORY_NAMES[value] ?? value.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

export function formatDay(value: string, weekday = false): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(
    undefined,
    weekday ? { weekday: 'short' } : { month: 'short', day: 'numeric' }
  ).format(date);
}

export function historyToCsv(history: DailyStats[]): string {
  const header =
    'Date,Posts reviewed,Posts kept,Posts filtered,Ads filtered,Average kept score,Average filtered score';
  const rows = [...history]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) =>
      [
        day.date,
        day.analyzed,
        day.shown,
        day.hidden,
        day.adsHidden,
        day.shown ? Math.round(day.scoreShownSum / day.shown) : '',
        day.hidden ? Math.round(day.scoreHiddenSum / day.hidden) : '',
      ].join(',')
    );
  return [header, ...rows].join('\r\n');
}

export function downloadFile(contents: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
