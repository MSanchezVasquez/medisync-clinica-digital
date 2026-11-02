CREATE TYPE "EstadoDispositivo" AS ENUM ('OFFLINE', 'LIBRE', 'RESERVADO', 'MIDIENDO', 'COMPLETADO', 'ERROR', 'MANTENIMIENTO');
CREATE TYPE "TipoDispositivo" AS ENUM ('ESTACION_BASICA', 'MONITOR_MULTIPARAMETRO');
CREATE TYPE "EstadoSesion" AS ENUM ('ESPERANDO_PACIENTE', 'MIDIENDO', 'COMPLETADA', 'CANCELADA', 'ERROR', 'EXPIRADA');

CREATE TABLE "Dispositivo" (
  "id" TEXT NOT NULL,
  "codigo" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "tipo" "TipoDispositivo" NOT NULL,
  "esSimulado" BOOLEAN NOT NULL DEFAULT false,
  "ubicacion" TEXT,
  "firmware" TEXT,
  "sensores" TEXT[] NOT NULL,
  "claveHash" TEXT NOT NULL,
  "estado" "EstadoDispositivo" NOT NULL DEFAULT 'OFFLINE',
  "bateria" INTEGER,
  "senalWifi" INTEGER,
  "ultimoLatido" TIMESTAMP(3),
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Dispositivo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Dispositivo_codigo_key" ON "Dispositivo"("codigo");

CREATE TABLE "SesionMedicion" (
  "id" TEXT NOT NULL,
  "dispositivoId" TEXT NOT NULL,
  "iniciadaPorId" TEXT,
  "estado" "EstadoSesion" NOT NULL DEFAULT 'ESPERANDO_PACIENTE',
  "fase" TEXT,
  "progreso" INTEGER NOT NULL DEFAULT 0,
  "mensajeError" TEXT,
  "edadPaciente" INTEGER,
  "sintomasHint" TEXT,
  "escenario" TEXT,
  "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "iniciadaEn" TIMESTAMP(3),
  "finalizadaEn" TIMESTAMP(3),
  "duracionSeg" INTEGER,
  "calidad" INTEGER,
  "frecuenciaCardiaca" INTEGER,
  "spo2" INTEGER,
  "temperatura" DOUBLE PRECISION,
  "presionSistolica" INTEGER,
  "presionDiastolica" INTEGER,
  "frecuenciaRespiratoria" INTEGER,
  "news2" INTEGER,
  "alertas" JSONB,
  "muestras" JSONB,
  CONSTRAINT "SesionMedicion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SesionMedicion_dispositivoId_estado_idx" ON "SesionMedicion"("dispositivoId", "estado");
ALTER TABLE "SesionMedicion" ADD CONSTRAINT "SesionMedicion_dispositivoId_fkey"
  FOREIGN KEY ("dispositivoId") REFERENCES "Dispositivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SesionMedicion" ADD CONSTRAINT "SesionMedicion_iniciadaPorId_fkey"
  FOREIGN KEY ("iniciadaPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Triaje"
  ADD COLUMN "frecuenciaCardiaca" INTEGER,
  ADD COLUMN "spo2" INTEGER,
  ADD COLUMN "temperatura" DOUBLE PRECISION,
  ADD COLUMN "presionSistolica" INTEGER,
  ADD COLUMN "presionDiastolica" INTEGER,
  ADD COLUMN "frecuenciaRespiratoria" INTEGER,
  ADD COLUMN "news2" INTEGER,
  ADD COLUMN "news2Riesgo" TEXT,
  ADD COLUMN "news2Parcial" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "urgenciaIA" TEXT,
  ADD COLUMN "signosManuales" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sesionMedicionId" TEXT;
CREATE UNIQUE INDEX "Triaje_sesionMedicionId_key" ON "Triaje"("sesionMedicionId");
ALTER TABLE "Triaje" ADD CONSTRAINT "Triaje_sesionMedicionId_fkey"
  FOREIGN KEY ("sesionMedicionId") REFERENCES "SesionMedicion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
