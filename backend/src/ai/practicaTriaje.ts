import { ErrorIA, validarSintomas, type AiService } from "./aiService.js";
import { EJEMPLOS_TRIAJE } from "./promptLibrary.js";

const pacientes = [
  {
    dni: "00000001",
    nombreCompleto: "Paciente de práctica 01",
    edad: 35,
    sexo: "Femenino",
    peso: 72.4,
    altura: 174,
    frecuenciaCardiaca: 82,
    temperatura: 38,
    spo2: 98,
    ejemplo: EJEMPLOS_TRIAJE.consulta,
  },
  {
    dni: "00000002",
    nombreCompleto: "Paciente de práctica 02",
    edad: 28,
    sexo: "Masculino",
    peso: 65.8,
    altura: 168,
    frecuenciaCardiaca: 74,
    temperatura: 37,
    spo2: 99,
    ejemplo: EJEMPLOS_TRIAJE.sinMalestar,
  },
  {
    dni: "00000003",
    nombreCompleto: "Paciente de práctica 03",
    edad: 62,
    sexo: "Femenino",
    peso: 69.1,
    altura: 165,
    frecuenciaCardiaca: 89,
    temperatura: 36.8,
    spo2: 98,
    ejemplo: EJEMPLOS_TRIAJE.emergencia,
  },
];

function buscarPaciente(dni: unknown) {
  if (typeof dni !== "string" || !/^\d{8}$/.test(dni)) {
    throw new ErrorIA("ENTRADA", 400, "Ingresa un DNI ficticio de 8 dígitos.");
  }

  const paciente = pacientes.find((registro) => registro.dni === dni);
  if (!paciente)
    throw new ErrorIA(
      "ENTRADA",
      404,
      "No existe un paciente de práctica con ese DNI.",
    );
  return paciente;
}

export function consultarPacientePractica(dni: unknown) {
  const { ejemplo, ...paciente } = buscarPaciente(dni);
  return { ...paciente, sintomasEjemplo: ejemplo.sintomas };
}

function normalizarSintomas(sintomas: string) {
  return sintomas
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "")
    .trim();
}

export async function evaluarCasoPractica(
  servicio: Pick<AiService, "evaluar">,
  dni: unknown,
  entrada: unknown,
) {
  const paciente = buscarPaciente(dni);
  const sintomas = validarSintomas(entrada);
  const mediciones = [
    `Edad: ${paciente.edad} años`,
    `Sexo: ${paciente.sexo}`,
    `Peso: ${paciente.peso} kg`,
    `Talla: ${paciente.altura} cm`,
    `Pulso: ${paciente.frecuenciaCardiaca} bpm`,
    `Temperatura: ${paciente.temperatura} °C`,
    `SpO₂: ${paciente.spo2} %`,
  ].join("\n");

  try {
    const resultado = await servicio.evaluar(sintomas, "few-shot", mediciones);
    return { ...resultado, origen: "gemini" as const };
  } catch (error) {
    if (!(error instanceof ErrorIA) || error.codigo !== "CONFIGURACION")
      throw error;

    if (
      normalizarSintomas(sintomas) ===
      normalizarSintomas(paciente.ejemplo.sintomas)
    ) {
      return { ...paciente.ejemplo.resultado, origen: "ejemplo" as const };
    }

    throw new ErrorIA(
      "CONFIGURACION",
      503,
      "Para evaluar síntomas distintos al ejemplo, el servidor necesita tener Gemini configurado.",
    );
  }
}
