BEGIN;

ALTER TABLE "Triaje"
    ADD COLUMN IF NOT EXISTS "altura" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "dni" TEXT,
    ADD COLUMN IF NOT EXISTS "edad" INTEGER,
    ADD COLUMN IF NOT EXISTS "medicoId" TEXT,
    ADD COLUMN IF NOT EXISTS "nombreCompleto" TEXT,
    ADD COLUMN IF NOT EXISTS "peso" DOUBLE PRECISION,
    ALTER COLUMN "telefono" DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = '"Triaje"'::regclass AND conname = 'Triaje_medicoId_fkey'
    ) THEN
        ALTER TABLE "Triaje"
            ADD CONSTRAINT "Triaje_medicoId_fkey"
            FOREIGN KEY ("medicoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

COMMIT;
