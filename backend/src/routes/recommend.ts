import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createGraphClient } from '../services/graph';
import { getSchedule, ScheduleResponse } from '../services/calendar';
import { recommendSlots, PersonPrefs } from '../services/recommend';

const router = Router();
const prisma = new PrismaClient();

// Get recommended meeting times
router.post('/', async (req: Request, res: Response) => {
  try {
    const { personIds, startTime, endTime, durationMinutes = 30, timezone } = req.body;

    if (!personIds || !Array.isArray(personIds) || personIds.length === 0) {
      return res.status(400).json({ error: 'personIds array is required' });
    }

    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime and endTime are required' });
    }

    // Get persons with their accounts
    const persons = await prisma.person.findMany({
      where: { id: { in: personIds } },
      include: { accounts: { include: { tenant: true } } },
    });

    if (persons.length === 0) {
      return res.status(404).json({ error: 'No persons found' });
    }

    if (persons.length !== personIds.length) {
      const foundIds = persons.map((p) => p.id);
      const missingIds = personIds.filter((id: string) => !foundIds.includes(id));
      return res.status(404).json({ error: `Persons not found: ${missingIds.join(', ')}` });
    }

    // Collect all accounts grouped by tenant
    const tenantMap = new Map<
      string,
      { tenant: typeof persons[0]['accounts'][0]['tenant']; emails: string[] }
    >();
    const emailToPersonId = new Map<string, string>();

    for (const person of persons) {
      for (const account of person.accounts) {
        if (!tenantMap.has(account.tenantId)) {
          tenantMap.set(account.tenantId, {
            tenant: account.tenant,
            emails: [],
          });
        }
        tenantMap.get(account.tenantId)!.emails.push(account.email);
        emailToPersonId.set(account.email, person.id);
      }
    }

    // Fetch schedules from all tenants
    const allSchedules = new Map<string, ScheduleResponse>();
    const errors: Array<{ tenantId: string; error: string }> = [];

    for (const { tenant, emails } of tenantMap.values()) {
      try {
        const client = createGraphClient(
          tenant.azureTenantId,
          tenant.azureAppId,
          tenant.azureAppSecret
        );
        const schedules = await getSchedule(
          client,
          emails,
          startTime,
          endTime,
          timezone || 'UTC'
        );
        for (const schedule of schedules) {
          allSchedules.set(schedule.email, schedule);
        }
      } catch (error: any) {
        errors.push({ tenantId: tenant.id, error: error.message });
      }
    }

    // Build person preferences
    const personPrefs: PersonPrefs[] = persons.map((p) => ({
      personId: p.id,
      displayName: p.displayName,
      timezone: p.timezone,
      workingHours: p.workingHours as Record<string, { start: string; end: string }[]>,
      flexibility: p.flexibility as 'low' | 'medium' | 'high',
    }));

    // Get recommendations
    const recommendations = recommendSlots(
      allSchedules,
      emailToPersonId,
      personPrefs,
      new Date(startTime),
      new Date(endTime),
      durationMinutes
    );

    // Separate available and unavailable slots
    const availableSlots = recommendations.filter((s) => s.allAvailable);
    const conflictSlots = recommendations.filter((s) => !s.allAvailable).slice(0, 5);

    res.json({
      recommendations: availableSlots,
      alternativesWithConflicts: conflictSlots,
      errors: errors.length > 0 ? errors : undefined,
      meta: {
        personsCount: persons.length,
        tenantsCount: tenantMap.size,
        timeRange: { start: startTime, end: endTime },
        durationMinutes,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
