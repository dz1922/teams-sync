import { Client } from '@microsoft/microsoft-graph-client';

// Check if mock mode is enabled
const MOCK_MODE = process.env.MOCK_MODE === 'true';

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
 * Generate mock availability view string
 * Creates realistic meeting patterns: some morning meetings, lunch break, afternoon meetings
 */
function generateMockAvailabilityView(slots: number, seed: number): string {
  let view = '';
  const random = (i: number) => Math.sin(seed * 1000 + i * 123.456) * 0.5 + 0.5;
  
  for (let i = 0; i < slots; i++) {
    // Simulate typical work patterns
    const hourOfDay = Math.floor((i * 30) / 60) % 24;
    
    // Outside work hours (before 9am or after 6pm) - mostly free
    if (hourOfDay < 9 || hourOfDay >= 18) {
      view += '0';
    }
    // Lunch time (12-1pm) - usually free
    else if (hourOfDay >= 12 && hourOfDay < 13) {
      view += random(i) > 0.8 ? '2' : '0';
    }
    // Work hours - mix of busy and free
    else {
      // ~40% chance of being busy during work hours
      view += random(i) > 0.6 ? '2' : '0';
    }
  }
  return view;
}

/**
 * Get free/busy schedule for multiple users
 * Uses Calendars.Read.Shared permission - only returns free/busy status, not meeting details
 * In MOCK_MODE, returns simulated calendar data
 */
export async function getSchedule(
  client: Client | null,
  emails: string[],
  startTime: string,
  endTime: string,
  timezone: string = 'UTC'
): Promise<ScheduleResponse[]> {
  // Calculate number of 30-minute slots
  const start = new Date(startTime);
  const end = new Date(endTime);
  const slots = Math.ceil((end.getTime() - start.getTime()) / (30 * 60 * 1000));

  // Mock mode - generate fake schedules
  if (MOCK_MODE || !client) {
    console.log(`[MOCK] Generating mock schedules for ${emails.length} users, ${slots} slots`);
    return emails.map((email, index) => {
      const seed = email.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + index;
      const availabilityView = generateMockAvailabilityView(slots, seed);
      return {
        email,
        availabilityView,
        scheduleItems: parseAvailabilityView(availabilityView, start, 30),
      };
    });
  }

  // Real Graph API call
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
