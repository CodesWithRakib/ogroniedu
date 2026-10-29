import type { DayActivity } from './WeeklyActivityChart';

interface SessionLike {
  startsAt?: string;
}

export function computeWeeklyActivity(sessionsList: SessionLike[] = []): DayActivity[] {
  const dayNames = [
    { day: 'S', shortBn: 'রবি', shortEn: 'Sun', fullDayBn: 'রবিবার', fullDayEn: 'Sunday' },
    { day: 'M', shortBn: 'সোম', shortEn: 'Mon', fullDayBn: 'সোমবার', fullDayEn: 'Monday' },
    { day: 'T', shortBn: 'মঙ্গল', shortEn: 'Tue', fullDayBn: 'মঙ্গলবার', fullDayEn: 'Tuesday' },
    { day: 'W', shortBn: 'বুধ', shortEn: 'Wed', fullDayBn: 'বুধবার', fullDayEn: 'Wednesday' },
    { day: 'T', shortBn: 'বৃহঃ', shortEn: 'Thu', fullDayBn: 'বৃহস্পতিবার', fullDayEn: 'Thursday' },
    { day: 'F', shortBn: 'শুক্র', shortEn: 'Fri', fullDayBn: 'শুক্রবার', fullDayEn: 'Friday' },
    { day: 'S', shortBn: 'শনি', shortEn: 'Sat', fullDayBn: 'শনিবার', fullDayEn: 'Saturday' },
  ];

  const counts = [0, 0, 0, 0, 0, 0, 0];
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  sessionsList.forEach((s) => {
    if (!s.startsAt) return;
    try {
      const d = new Date(s.startsAt);
      if (d >= startOfWeek && d < endOfWeek) {
        counts[d.getDay()]++;
      }
    } catch {
      // Ignore malformed dates
    }
  });

  const maxCount = Math.max(...counts, 0);

  return dayNames.map((item, idx) => ({
    ...item,
    count: counts[idx],
    percentage: maxCount > 0 ? Math.round((counts[idx] / maxCount) * 100) : 0,
    isPeak: maxCount > 0 && counts[idx] === maxCount,
  }));
}
