import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Ejecutando seed en PostgreSQL...');

  const emailAdmin = 'admin@medisync.pe';
  const passwordPlana = 'Admin@2026!';

  const password = await bcrypt.hash(passwordPlana, 10);

  const admin = await prisma.user.upsert({
    where: { email: emailAdmin },
    update: {},
    create: {
      email: emailAdmin,
      password,
      nombre: 'Administrador General',
      cmp: 'ADMIN-001',
      rol: "ADMIN",
      activo: true,
    },
  });

console.log(`✅ Usuario administrador creado/actualizado: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
