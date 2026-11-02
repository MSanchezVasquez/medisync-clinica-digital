import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

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

  const simulados = [
    {
      codigo: 'MT-100-001', nombre: 'MicroTriaje 01', tipo: 'MONITOR_MULTIPARAMETRO' as const,
      ubicacion: 'Emergencia · Triaje', sensores: ['FC', 'SPO2', 'TEMP', 'PA', 'FR'],
      clave: 'CAMBIAR-clave-sim-mt100-001',
    },
    {
      codigo: 'MT-300-001', nombre: 'MicroTriaje 02', tipo: 'MONITOR_MULTIPARAMETRO' as const,
      ubicacion: 'Emergencia · Box 2', sensores: ['FC', 'SPO2', 'TEMP', 'PA', 'FR'],
      clave: 'CAMBIAR-clave-sim-mt300-001',
    },
    {
      codigo: 'MT-100-002', nombre: 'MicroTriaje 03', tipo: 'MONITOR_MULTIPARAMETRO' as const,
      ubicacion: 'Emergencia · Box 3', sensores: ['FC', 'SPO2', 'TEMP', 'PA', 'FR'],
      clave: 'CAMBIAR-clave-sim-mt100-002',
    },
  ];

  for (const d of simulados) {
    await prisma.dispositivo.upsert({
      where: { codigo: d.codigo },
      update: { nombre: d.nombre, tipo: d.tipo, esSimulado: true, ubicacion: d.ubicacion, sensores: d.sensores },
      create: {
        codigo: d.codigo, nombre: d.nombre, tipo: d.tipo, esSimulado: true,
        ubicacion: d.ubicacion, sensores: d.sensores, claveHash: sha256(d.clave),
      },
    });
  }
  console.log('✅ Tres MicroTriajes simulados configurados.');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
