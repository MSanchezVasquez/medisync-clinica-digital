-- Reconciles the schema that was previously added directly to PostgreSQL.
-- Existing installations with these objects should mark this migration applied
-- with `prisma migrate resolve --applied ...`; fresh databases execute it normally.
ALTER TABLE "Triaje"
  ADD COLUMN "altura" DOUBLE PRECISION,
  ADD COLUMN "dni" TEXT,
  ADD COLUMN "edad" INTEGER,
  ADD COLUMN "medicoId" TEXT,
  ADD COLUMN "nombreCompleto" TEXT,
  ADD COLUMN "peso" DOUBLE PRECISION;

ALTER TABLE "Triaje" ALTER COLUMN "telefono" DROP NOT NULL;
ALTER TABLE "Triaje" ADD CONSTRAINT "Triaje_medicoId_fkey"
  FOREIGN KEY ("medicoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SignoVital" (
  "id" TEXT NOT NULL,
  "dispositivoId" TEXT NOT NULL,
  "frecuenciaCardiaca" INTEGER NOT NULL,
  "presionSistolica" INTEGER NOT NULL,
  "presionDiastolica" INTEGER NOT NULL,
  "temperatura" DOUBLE PRECISION NOT NULL,
  "saturacionOxigeno" INTEGER NOT NULL,
  "frecuenciaRespiratoria" INTEGER NOT NULL,
  "estado" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "triajeId" TEXT,
  CONSTRAINT "SignoVital_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SignoVital_creadoEn_idx" ON "SignoVital"("creadoEn");
ALTER TABLE "SignoVital" ADD CONSTRAINT "SignoVital_triajeId_fkey"
  FOREIGN KEY ("triajeId") REFERENCES "Triaje"("id") ON DELETE SET NULL ON UPDATE CASCADE;
