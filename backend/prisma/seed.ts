import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
      rol: Role.ADMIN,
      activo: true,
    },
  });

  console.log(
    `✅ Administrador creado/verificado: ${admin.email} (Rol: ${admin.rol})`,
  );
  console.log(`🔑 Contraseña asignada: ${passwordPlana}`);
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
