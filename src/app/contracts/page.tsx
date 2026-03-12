import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui';
import { ContractModal } from './ContractModal';
import { ContractsTable } from './ContractsTable';

export default async function ContractsPage() {
  const [contracts, vacantUnits, allUnits, tenants] = await Promise.all([
    prisma.contract.findMany({
      include: {
        unit:   { select: { unitNo: true, property: { select: { title: true } } } },
        tenant: { select: { name: true, phone: true } },
      },
      orderBy: { startDate: 'desc' },
    }),
    prisma.unit.findMany({
      where: { status: 'vacant' },
      select: { id: true, unitNo: true, property: { select: { title: true } } },
      orderBy: { unitNo: 'asc' },
    }),
    prisma.unit.findMany({
      select: { id: true, unitNo: true, property: { select: { title: true } } },
      orderBy: { unitNo: 'asc' },
    }),
    prisma.tenant.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  // Serialize Prisma types before passing to client component
  const serialized = contracts.map(c => ({
    ...c,
    startDate:       c.startDate.toISOString(),
    endDate:         c.endDate?.toISOString() ?? null,
    rentAmount:      Number(c.rentAmount),
    currentRent:     c.currentRent !== null ? Number(c.currentRent) : null,
    depositAmount:   Number(c.depositAmount),
    terminationDate: c.terminationDate?.toISOString() ?? null,
    depositDate:     c.depositDate?.toISOString() ?? null,
    createdAt:       c.createdAt.toISOString(),
    bankName:        c.bankName ?? null,
    iban:            c.iban ?? null,
    accountHolder:   c.accountHolder ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Sözleşmeler"
        action={<ContractModal units={vacantUnits} tenants={tenants} />}
      />
      <ContractsTable
        contracts={serialized}
        allUnits={allUnits}
        tenants={tenants}
      />
    </div>
  );
}
