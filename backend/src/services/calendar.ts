import { Client } from '@microsoft/microsoft-graph-client';

export interface FreeBusySlot {
  start: string;
  end: string;
  status: 'free' | 'busy' | 'tentative' | 'oof' | 'unknown';
}

export interface ScheduleResponse {
  email: string;
  availabilityView: string;
  scheduleItems: FreeBusySlot[];
  error?: string;
}

/**
 * Get free/busy schedule for multiple users
 * Uses Calendars.Read.Shared permission - only returns free/busy status, not meeting details
 */
export async function getSchedule(
  client: Client,
  emails: string[],
  startTime: string,
  endTime: string,
  timezone: string = 'UTC'
): Promise<ScheduleResponse[]> {
  try {
    const response = await client.api('/me/calendar/getSchedule').post({
      schedules: emails,
      startTime: { dateTime: startTime, timeZone: timezone },
      endTime: { dateTime: endTime, timeZone: timezone },
      availabilityViewInterval: 30, // 30 minute slots
    });

    return response.value.map((item: any) => ({
      email: item.scheduleId,
      availabilityView: item.availabilityView, // String like "0000222200002222" (0=free, 2=busy)
      scheduleItems: item.scheduleItems?.map((slot: any) => ({
        start: slot.start.dateTime,
        end: slot.end.dateTime,
        status: slot.status?.toLowerCase() || 'unknown',
      })) || [],
      error: item.error?.message,
    }));
  } catch (error: any) {
    console.error('Error fetching schedule:', error);
    throw new Error(`Failed to fetch schedule: ${error.message}`);
  }
}

/**
 * Parse availability view string to time slots
 * 0 = free, 1 = tentative, 2 = busy, 3 = out of office, 4 = working elsewhere
 */
export function parseAvailabilityView(
  view: string,
  startTime: Date,
  intervalMinutes: number = 30
): FreeBusySlot[] {
  const slots: FreeBusySlot[] = [];
  const statusMap: Record<string, FreeBusySlot['status']> = {
    '0': 'free',
    '1': 'tentative',
    '2': 'busy',
    '3': 'oof',
    '4': 'busy',
  };

  for (let i = 0; i < view.length; i++) {
    const slotStart = new Date(startTime.getTime() + i * intervalMinutes * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + intervalMinutes * 60 * 1000);
    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      status: statusMap[view[i]] || 'unknown',
    });
  }

  return slots;
}
