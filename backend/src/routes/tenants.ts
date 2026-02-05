import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// List all tenants (without secrets)
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        azureTenantId: true,
        createdAt: true,
        _count: { select: { accounts: true } },
      },
    });
    res.json(tenants);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create tenant
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, domain, azureTenantId, azureAppId, azureAppSecret } = req.body;

    if (!name || !domain || !azureTenantId || !azureAppId || !azureAppSecret) {
      return res.status(400).json({
        error: 'Missing required fields: name, domain, azureTenantId, azureAppId, azureAppSecret',
      });
    }

    const tenant = await prisma.tenant.create({
      data: { name, domain, azureTenantId, azureAppId, azureAppSecret },
    });

    res.json({
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
      azureTenantId: tenant.azureTenantId,
      createdAt: tenant.createdAt,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Tenant with this domain already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get tenant by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        domain: true,
        azureTenantId: true,
        createdAt: true,
        accounts: {
          select: {
            id: true,
            email: true,
            person: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(tenant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update tenant
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, azureTenantId, azureAppId, azureAppSecret } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(azureTenantId && { azureTenantId }),
        ...(azureAppId && { azureAppId }),
        ...(azureAppSecret && { azureAppSecret }),
      },
    });

    res.json({
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
      azureTenantId: tenant.azureTenantId,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete tenant
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.tenant.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
