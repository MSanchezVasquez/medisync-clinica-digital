CREATE TYPE "Urgencia" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

CREATE TABLE "triajes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre_completo" VARCHAR(200) NOT NULL,
    "dni" VARCHAR(8) NOT NULL,
    "edad" INTEGER NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "altura" DOUBLE PRECISION NOT NULL,
    "sintomas" TEXT NOT NULL,
    "urgencia" "Urgencia" NOT NULL,
    "especialidad" VARCHAR(150) NOT NULL,
    "recomendacion" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triajes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "triajes_dni_formato_check" CHECK ("dni" ~ '^[0-9]{8}$'),
    CONSTRAINT "triajes_edad_rango_check" CHECK ("edad" BETWEEN 0 AND 120),
    CONSTRAINT "triajes_peso_positivo_check" CHECK ("peso" > 0),
    CONSTRAINT "triajes_altura_positiva_check" CHECK ("altura" > 0)
);

CREATE INDEX "triajes_dni_idx" ON "triajes"("dni");
CREATE INDEX "triajes_creado_en_idx" ON "triajes"("creado_en");
CREATE INDEX "triajes_urgencia_creado_en_idx" ON "triajes"("urgencia", "creado_en");

CREATE FUNCTION "actualizar_fecha_triaje"()
RETURNS TRIGGER AS $$
BEGIN
    NEW."actualizado_en" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "triajes_actualizado_en_trigger"
BEFORE UPDATE ON "triajes"
FOR EACH ROW
EXECUTE FUNCTION "actualizar_fecha_triaje"();

ALTER TABLE "triajes" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "triajes" FROM anon, authenticated;
GRANT ALL ON TABLE "triajes" TO service_role;
