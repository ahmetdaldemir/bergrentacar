import { differenceInCalendarDays, parseISO } from 'date-fns';

/** Normalize "9:00" / "09:00:00" → "09:00" for HH:mm comparison. */
function normalizeTime(time?: string | null): string {
  if (!time) return '10:00';
  const [h = '10', m = '00'] = time.trim().split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

function dateOnly(value?: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

/** Calendar overnight count (min 1). Times ignored. */
export function calculateCalendarRentalDays(
  pickupDate?: string | null,
  dropoffDate?: string | null,
): number {
  const start = dateOnly(pickupDate);
  const end = dateOnly(dropoffDate);
  if (!start || !end) return 1;
  try {
    const pickup = parseISO(`${start}T00:00:00`);
    const dropoff = parseISO(`${end}T00:00:00`);
    if (Number.isNaN(pickup.getTime()) || Number.isNaN(dropoff.getTime())) return 1;
    return Math.max(1, differenceInCalendarDays(dropoff, pickup));
  } catch {
    return 1;
  }
}

function minutesOfDay(time: string): number {
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) * 60 + Number(m);
}

/**
 * Calendar days, plus 1 only when the return time is more than 2 hours after the pickup time.
 * 25 Sep 10:00 → 1 Oct 10:00 = 6 days. 25 Sep 10:00 → 1 Oct 13:00 = 7 days.
 */
export function calculateRentalDays(
  pickupDate?: string | null,
  dropoffDate?: string | null,
  pickupTime?: string | null,
  dropoffTime?: string | null,
): number {
  const start = dateOnly(pickupDate);
  const end = dateOnly(dropoffDate);
  if (!start || !end) return 1;

  const pTime = normalizeTime(pickupTime);
  const dTime = normalizeTime(dropoffTime);

  try {
    const pickup = parseISO(`${start}T00:00:00`);
    const dropoff = parseISO(`${end}T00:00:00`);
    if (Number.isNaN(pickup.getTime()) || Number.isNaN(dropoff.getTime())) return 1;
    if (dropoff.getTime() < pickup.getTime()) return 1;
    if (dropoff.getTime() === pickup.getTime()) return 1;

    const calendarDays = differenceInCalendarDays(dropoff, pickup);
    const extraDay = minutesOfDay(dTime) - minutesOfDay(pTime) > 120 ? 1 : 0;
    return Math.max(1, calendarDays + extraDay);
  } catch {
    return 1;
  }
}
