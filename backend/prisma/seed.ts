import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin', 10);
  await prisma.admin.upsert({
    where: { username: 'admin' },
    create: { username: 'admin', passwordHash },
    update: {},
  });
  console.log('Seed: admin user ensured.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
