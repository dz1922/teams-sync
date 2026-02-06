import { ScheduleResponse, parseAvailabilityView } from './calendar';

export interface PersonPrefs {
  personId: string;
  displayName: string;
  timezone: string;
  workingHours: Record<string, { start: string; end: string }[]>;
  flexibility: 'low' | 'medium' | 'high';
}

export interface SlotDetail {
  personId: string;
  displayName: string;
  localTime: string;
  status: 'core' | 'edge' | 'flexible' | 'outside';
  isBusy: boolean;
  // New: detailed schedule context
  busyUntil?: string; // When current meeting ends (if busy)
  nextBusy?: string;  // When next meeting starts (if free)
  scheduleContext?: string; // Human-readable context
}

export interface TimeSlot {
  start: string;
  end: string;
  score: number;
  allAvailable: boolean;
  details: SlotDetail[];
}

/**
 * Recommend meeting time slots based on availability and preferences
 */
export function recommendSlots(
  schedules: Map<string, ScheduleResponse>, // email -> schedule
  emailToPersonId: Map<string, string>, // email -> personId
  persons: PersonPrefs[],
  startRange: Date,
  endRange: Date,
  durationMinutes: number = 30
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const slotDuration = durationMinutes * 60 * 1000;

  // Generate all possible slots
  let current = new Date(startRange);
  while (current.getTime() + slotDuration <= endRange.getTime()) {
    const slotEnd = new Date(current.getTime() + slotDuration);

    // Check availability for each person
    const details: SlotDetail[] = [];
    let allAvailable = true;
    let totalScore = 100; // Base score

    for (const person of persons) {
      const localTime = formatLocalTime(current, person.timezone);
      const dayOfWeek = getDayOfWeek(current, person.timezone);
      const workingHoursForDay = person.workingHours[dayOfWeek] || [];

      // Check if person is busy (from any of their accounts)
      let isBusy = false;
      let busyUntil: string | undefined;
      let nextBusy: string | undefined;
      let scheduleContext: string | undefined;

      for (const [email, schedule] of schedules.entries()) {
        if (emailToPersonId.get(email) === person.personId) {
          // Get all busy items for context
          const busyItems = schedule.scheduleItems
            .filter(item => item.status === 'busy')
            .map(item => ({
              start: new Date(item.start),
              end: new Date(item.end),
            }))
            .sort((a, b) => a.start.getTime() - b.start.getTime());

          // Check if currently busy and find when it ends
          for (const item of busyItems) {
            if (item.start < slotEnd && item.end > current) {
              isBusy = true;
              busyUntil = formatLocalTime(item.end, person.timezone);
              const minsUntilFree = Math.round((item.end.getTime() - current.getTime()) / 60000);
              if (minsUntilFree > 0 && minsUntilFree <= 60) {
                scheduleContext = `Meeting ends in ${minsUntilFree} min`;
              } else {
                scheduleContext = `Busy until ${busyUntil}`;
              }
              break;
            }
          }

          // If not busy, find next meeting
          if (!isBusy) {
            for (const item of busyItems) {
              if (item.start > current) {
                nextBusy = formatLocalTime(item.start, person.timezone);
                const minsUntilBusy = Math.round((item.start.getTime() - slotEnd.getTime()) / 60000);
                if (minsUntilBusy >= 0 && minsUntilBusy <= 30) {
                  scheduleContext = `Next meeting in ${minsUntilBusy} min`;
                } else if (minsUntilBusy > 30 && minsUntilBusy <= 120) {
                  scheduleContext = `Free until ${nextBusy}`;
                }
                break;
              }
            }
          }

          if (isBusy) break;
        }
      }

      if (isBusy) {
        allAvailable = false;
      }

      // Calculate time status and score
      const status = getTimeStatus(localTime, workingHoursForDay, person.flexibility);
      const statusScore = getStatusScore(status);
      totalScore += statusScore;

      details.push({
        personId: person.personId,
        displayName: person.displayName,
        localTime: formatFullLocalTime(current, person.timezone),
        status,
        isBusy,
        busyUntil,
        nextBusy,
        scheduleContext,
      });
    }

    // Only include slots where everyone is available, or mark them appropriately
    slots.push({
      start: current.toISOString(),
      end: slotEnd.toISOString(),
      score: allAvailable ? totalScore : totalScore - 500, // Heavy penalty for conflicts
      allAvailable,
      details,
    });

    // Move to next slot (30 min increments)
    current = new Date(current.getTime() + 30 * 60 * 1000);
  }

  // Sort by score descending, then filter to top results
  return slots
    .sort((a, b) => b.score - a.score)
    .slice(0, 20); // Return top 20 slots
}

function formatLocalTime(date: Date, timezone: string): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatFullLocalTime(date: Date, timezone: string): string {
  return date.toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getDayOfWeek(date: Date, timezone: string): string {
  return date
    .toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long' })
    .toLowerCase();
}

function getTimeStatus(
  localTime: string,
  workingHours: { start: string; end: string }[],
  flexibility: string
): 'core' | 'edge' | 'flexible' | 'outside' {
  const [hours, minutes] = localTime.split(':').map(Number);
  const timeMinutes = hours * 60 + minutes;

  for (const period of workingHours) {
    const [startH, startM] = period.start.split(':').map(Number);
    const [endH, endM] = period.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (timeMinutes >= startMinutes && timeMinutes < endMinutes) {
      // Within working hours - check if core (10:00-16:00) or edge
      const coreStart = Math.max(startMinutes, 10 * 60);
      const coreEnd = Math.min(endMinutes, 16 * 60);

      if (timeMinutes >= coreStart && timeMinutes < coreEnd) {
        return 'core';
      }
      return 'edge';
    }
  }

  // Outside working hours
  if (flexibility === 'high') return 'flexible';
  return 'outside';
}

function getStatusScore(status: 'core' | 'edge' | 'flexible' | 'outside'): number {
  switch (status) {
    case 'core':
      return 20;
    case 'edge':
      return 10;
    case 'flexible':
      return 5;
    case 'outside':
      return -50;
  }
}

/**
 * Default working hours template (Mon-Fri 9-17)
 */
export function getDefaultWorkingHours(): Record<string, { start: string; end: string }[]> {
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const hours: Record<string, { start: string; end: string }[]> = {};

  for (const day of weekdays) {
    hours[day] = [{ start: '09:00', end: '17:00' }];
  }

  hours['saturday'] = [];
  hours['sunday'] = [];

  return hours;
}
