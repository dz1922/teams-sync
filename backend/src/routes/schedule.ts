import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createGraphClient } from '../services/graph';
import { getSchedule, ScheduleResponse } from '../services/calendar';

const router = Router();
const prisma = new PrismaClient();

// Get free/busy for multiple people
router.post('/availability', async (req: Request, res: Response) => {
  try {
    const { personIds, startTime, endTime, timezone } = req.body;

    if (!personIds || !Array.isArray(personIds) || personIds.length === 0) {
      return res.status(400).json({ error: 'personIds array is required' });
    }

    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime and endTime are required' });
    }

    // Get all accounts for these persons
    const accounts = await prisma.account.findMany({
      where: { personId: { in: personIds } },
      include: { tenant: true, person: true },
    });

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'No accounts found for given persons' });
    }

    // Group by tenant
    const byTenant = accounts.reduce((acc, account) => {
      if (!acc[account.tenantId]) {
        acc[account.tenantId] = { tenant: account.tenant, accounts: [] };
      }
      acc[account.tenantId].accounts.push(account);
      return acc;
    }, {} as Record<string, { tenant: typeof accounts[0]['tenant']; accounts: typeof accounts }>);

    // Fetch schedules from each tenant
    const results: Array<ScheduleResponse & { personId: string; personName: string }> = [];
    const errors: Array<{ tenantId: string; error: string }> = [];

    for (const { tenant, accounts: tenantAccounts } of Object.values(byTenant)) {
      try {
        const client = createGraphClient(
          tenant.azureTenantId,
          tenant.azureAppId,
          tenant.azureAppSecret
        );
        const emails = tenantAccounts.map((a) => a.email);
        const schedules = await getSchedule(client, emails, startTime, endTime, timezone);

        for (const schedule of schedules) {
          const account = tenantAccounts.find((a) => a.email === schedule.email);
          results.push({
            ...schedule,
            personId: account?.personId || '',
            personName: account?.person.displayName || '',
          });
        }
      } catch (error: any) {
        errors.push({
          tenantId: tenant.id,
          error: error.message,
        });
      }
    }

    res.json({
      schedules: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get free/busy for a single person
router.get('/availability/:personId', async (req: Request, res: Response) => {
  try {
    const { startTime, endTime, timezone } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime and endTime query params are required' });
    }

    const accounts = await prisma.account.findMany({
      where: { personId: req.params.personId },
      include: { tenant: true },
    });

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'No accounts found for this person' });
    }

    const results: ScheduleResponse[] = [];

    for (const account of accounts) {
      try {
        const client = createGraphClient(
          account.tenant.azureTenantId,
          account.tenant.azureAppId,
          account.tenant.azureAppSecret
        );
        const schedules = await getSchedule(
          client,
          [account.email],
          startTime as string,
          endTime as string,
          (timezone as string) || 'UTC'
        );
        results.push(...schedules);
      } catch (error: any) {
        results.push({
          email: account.email,
          availabilityView: '',
          scheduleItems: [],
          error: error.message,
        });
      }
    }

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
