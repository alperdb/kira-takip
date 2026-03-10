import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock prisma before importing route
vi.mock('@/lib/db', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    },
    rentCharge: {
      findMany: vi.fn(),
    },
    contract: {
      findFirst: vi.fn(),
    },
  },
}));

import { GET } from '../route';
import { prisma } from '@/lib/db';

const mockPrisma = prisma as unknown as {
  tenant: { findUnique: ReturnType<typeof vi.fn> };
  rentCharge: { findMany: ReturnType<typeof vi.fn> };
  contract: { findFirst: ReturnType<typeof vi.fn> };
};

function makeRequest(tenantId: string, params?: Record<string, string>) {
  const url = new URL(`http://localhost/api/tenants/${tenantId}/summary`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url);
}

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.contract.findFirst.mockResolvedValue(null);
});

describe('GET /api/tenants/[id]/summary', () => {

  it('normal tenant: returns correct aggregate', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 1, name: 'Ali' });
    mockPrisma.rentCharge.findMany.mockResolvedValue([
      { chargeAmount: 3000, paidAmount: 3000, status: 'paid' },
      { chargeAmount: 3000, paidAmount: 1500, status: 'partial' },
      { chargeAmount: 3000, paidAmount: 0,    status: 'overdue' },
    ]);

    const res = await GET(makeRequest('1'), mockParams('1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.totalReceivables).toBe(9000);
    expect(body.totalPayments).toBe(4500);
    expect(body.balance).toBe(4500);
    expect(body.currency).toBe('TRY');
  });

  it('no charges: returns zero values', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 2, name: 'Ayşe' });
    mockPrisma.rentCharge.findMany.mockResolvedValue([]);

    const res = await GET(makeRequest('2'), mockParams('2'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.totalReceivables).toBe(0);
    expect(body.totalPayments).toBe(0);
    expect(body.balance).toBe(0);
  });

  it('excludes terminated contracts by default', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 3, name: 'Mehmet' });
    mockPrisma.rentCharge.findMany.mockResolvedValue([]);

    await GET(makeRequest('3'), mockParams('3'));

    const whereArg = mockPrisma.rentCharge.findMany.mock.calls[0][0].where;
    expect(whereArg.contract).toEqual({ status: { not: 'terminated' } });
  });

  it('includeArchived=true includes terminated contracts', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 4, name: 'Fatma' });
    mockPrisma.rentCharge.findMany.mockResolvedValue([]);

    await GET(makeRequest('4', { includeArchived: 'true' }), mockParams('4'));

    const whereArg = mockPrisma.rentCharge.findMany.mock.calls[0][0].where;
    expect(whereArg.contract).toBeUndefined();
  });

  it('invalid tenantId returns 400', async () => {
    const res = await GET(makeRequest('abc'), mockParams('abc'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('tenant not found returns 404', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null);

    const res = await GET(makeRequest('999'), mockParams('999'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('rounds to 2 decimals', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 5, name: 'Test' });
    mockPrisma.rentCharge.findMany.mockResolvedValue([
      { chargeAmount: 1000.005, paidAmount: 333.333, status: 'partial' },
    ]);

    const res = await GET(makeRequest('5'), mockParams('5'));
    const body = await res.json();

    expect(body.totalReceivables).toBe(1000.01);
    expect(body.totalPayments).toBe(333.33);
    expect(body.balance).toBe(666.68);
  });

});
