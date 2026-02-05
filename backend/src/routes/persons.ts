import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getDefaultWorkingHours } from '../services/recommend';

const router = Router();
const prisma = new PrismaClient();

// List all persons
router.get('/', async (req: Request, res: Response) => {
  try {
    const persons = await prisma.person.findMany({
      include: {
        accounts: {
          select: {
            id: true,
            email: true,
            isPrimary: true,
            tenant: { select: { id: true, name: true, domain: true } },
          },
        },
      },
    });
    res.json(persons);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create person
router.post('/', async (req: Request, res: Response) => {
  try {
    const { displayName, timezone, flexibility, workingHours } = req.body;

    if (!displayName) {
      return res.status(400).json({ error: 'displayName is required' });
    }

    const person = await prisma.person.create({
      data: {
        displayName,
        timezone: timezone || 'UTC',
        flexibility: flexibility || 'medium',
        workingHours: workingHours || getDefaultWorkingHours(),
      },
    });

    res.json(person);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get person by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const person = await prisma.person.findUnique({
      where: { id: req.params.id },
      include: {
        accounts: {
          select: {
            id: true,
            email: true,
            isPrimary: true,
            tenant: { select: { id: true, name: true, domain: true } },
          },
        },
      },
    });

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    res.json(person);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update person
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { displayName, timezone, flexibility, workingHours, overrides } = req.body;

    const person = await prisma.person.update({
      where: { id: req.params.id },
      data: {
        ...(displayName && { displayName }),
        ...(timezone && { timezone }),
        ...(flexibility && { flexibility }),
        ...(workingHours && { workingHours }),
        ...(overrides !== undefined && { overrides }),
      },
    });

    res.json(person);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update person's working hours
router.patch('/:id/working-hours', async (req: Request, res: Response) => {
  try {
    const { workingHours } = req.body;

    if (!workingHours) {
      return res.status(400).json({ error: 'workingHours is required' });
    }

    const person = await prisma.person.update({
      where: { id: req.params.id },
      data: { workingHours },
    });

    res.json(person);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Link account to person
router.post('/:id/accounts', async (req: Request, res: Response) => {
  try {
    const { email, tenantId, isPrimary } = req.body;

    if (!email || !tenantId) {
      return res.status(400).json({ error: 'email and tenantId are required' });
    }

    // If setting as primary, unset other primary accounts for this person
    if (isPrimary) {
      await prisma.account.updateMany({
        where: { personId: req.params.id },
        data: { isPrimary: false },
      });
    }

    const account = await prisma.account.create({
      data: {
        email,
        isPrimary: isPrimary || false,
        personId: req.params.id,
        tenantId,
      },
      include: {
        tenant: { select: { id: true, name: true, domain: true } },
      },
    });

    res.json(account);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Account with this email already exists' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Person or tenant not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Remove account from person
router.delete('/:id/accounts/:accountId', async (req: Request, res: Response) => {
  try {
    const account = await prisma.account.findFirst({
      where: {
        id: req.params.accountId,
        personId: req.params.id,
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await prisma.account.delete({
      where: { id: req.params.accountId },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete person
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.person.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
