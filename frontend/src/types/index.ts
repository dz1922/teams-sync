export interface Tenant {
  id: string;
  name: string;
  domain: string;
  azureTenantId: string;
  createdAt: string;
  _count?: { accounts: number };
}

export interface Account {
  id: string;
  email: string;
  isPrimary: boolean;
  tenant?: { id: string; name: string; domain: string };
}

export interface Person {
  id: string;
  displayName: string;
  timezone: string;
  flexibility: 'low' | 'medium' | 'high';
  workingHours: Record<string, { start: string; end: string }[]>;
  overrides?: Array<{ date: string; available: { start: string; end: string }[]; reason?: string }>;
  accounts: Account[];
  createdAt: string;
  updatedAt: string;
}

export interface SlotDetail {
  personId: string;
  displayName: string;
  localTime: string;
  status: 'core' | 'edge' | 'flexible' | 'outside';
  isBusy: boolean;
}

export interface TimeSlot {
  start: string;
  end: string;
  score: number;
  allAvailable: boolean;
  details: SlotDetail[];
}

export interface RecommendationResponse {
  recommendations: TimeSlot[];
  alternativesWithConflicts: TimeSlot[];
  errors?: Array<{ tenantId: string; error: string }>;
  meta: {
    personsCount: number;
    tenantsCount: number;
    timeRange: { start: string; end: string };
    durationMinutes: number;
  };
}
