-- CreateTable
CREATE TABLE "Triaje" (
    "id" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "sintomas" TEXT NOT NULL,
    "urgencia" TEXT NOT NULL,
    "especialidad" TEXT NOT NULL,
    "recomendacion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Triaje_pkey" PRIMARY KEY ("id")
);
