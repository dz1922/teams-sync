import { Person, Tenant, RecommendationResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Tenants
export const tenantsApi = {
  list: () => fetchJson<Tenant[]>('/api/tenants'),
  get: (id: string) => fetchJson<Tenant>(`/api/tenants/${id}`),
  create: (data: { name: string; domain: string; azureTenantId: string; azureAppId: string; azureAppSecret: string }) =>
    fetchJson<Tenant>('/api/tenants', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Tenant>) =>
    fetchJson<Tenant>(`/api/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/tenants/${id}`, { method: 'DELETE' }),
};

// Persons
export const personsApi = {
  list: () => fetchJson<Person[]>('/api/persons'),
  get: (id: string) => fetchJson<Person>(`/api/persons/${id}`),
  create: (data: { displayName: string; timezone?: string; flexibility?: string; workingHours?: Record<string, { start: string; end: string }[]> }) =>
    fetchJson<Person>('/api/persons', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Person>) =>
    fetchJson<Person>(`/api/persons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateWorkingHours: (id: string, workingHours: Record<string, { start: string; end: string }[]>) =>
    fetchJson<Person>(`/api/persons/${id}/working-hours`, { method: 'PATCH', body: JSON.stringify({ workingHours }) }),
  linkAccount: (personId: string, data: { email: string; tenantId: string; isPrimary?: boolean }) =>
    fetchJson<{ id: string }>(`/api/persons/${personId}/accounts`, { method: 'POST', body: JSON.stringify(data) }),
  unlinkAccount: (personId: string, accountId: string) =>
    fetchJson<{ success: boolean }>(`/api/persons/${personId}/accounts/${accountId}`, { method: 'DELETE' }),
  delete: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/persons/${id}`, { method: 'DELETE' }),
};

// Recommendations
export const recommendApi = {
  getSlots: (data: { personIds: string[]; startTime: string; endTime: string; durationMinutes?: number; timezone?: string }) =>
    fetchJson<RecommendationResponse>('/api/recommend', { method: 'POST', body: JSON.stringify(data) }),
};
