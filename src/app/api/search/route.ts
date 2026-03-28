import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  const db = getUserDb(session.id);

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ tenants: [], properties: [], contracts: [] });

  const [tenants, properties, contracts] = await Promise.all([
    db.tenant.findMany({
      where: {
        isArchived: false,
        OR: [
          { name:  { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
        ],
      },
      take: 5,
      select: { id: true, name: true, phone: true },
    }),
    db.property.findMany({
      where: {
        isArchived: false,
        OR: [
          { title:    { contains: q } },
          { city:     { contains: q } },
          { district: { contains: q } },
        ],
      },
      take: 5,
      select: { id: true, title: true, city: true, district: true },
    }),
    db.contract.findMany({
      where: {
        status: { in: ['active', 'renewed'] },
        OR: [
          { tenant: { name: { contains: q } } },
          { unit:   { unitNo: { contains: q } } },
          { unit:   { property: { title: { contains: q } } } },
        ],
      },
      take: 5,
      select: {
        id: true,
        tenant: { select: { name: true } },
        unit:   { select: { unitNo: true, property: { select: { title: true } } } },
      },
    }),
  ]);

  return NextResponse.json({
    tenants:    tenants.map(t => ({ id: t.id, name: t.name, sub: t.phone ?? '' })),
    properties: properties.map(p => ({
      id:   p.id,
      name: p.title,
      sub:  [p.district, p.city].filter(Boolean).join(', '),
    })),
    contracts: contracts.map(c => ({
      id:   c.id,
      name: c.tenant.name,
      sub:  `${c.unit.property.title} · ${c.unit.unitNo}`,
    })),
  });
}
