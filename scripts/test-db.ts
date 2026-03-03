import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ownerCount = await prisma.owner.count();
  console.log('✓ DB bağlantısı başarılı — owners tablosu:', ownerCount, 'kayıt');
}

main()
  .catch((e) => { console.error('✗ Hata:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
