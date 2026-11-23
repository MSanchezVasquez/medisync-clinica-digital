import { useEffect, useLayoutEffect, useState } from 'react';
import { signosInicialesMonitor, type CapturaMonitor } from '../services/flujoTriajeUci';
import type { LecturaIoT } from './useTelemetriaIoT';

export const dispositivoPractica = 'DISP-UCI-05';

const intervaloLecturas = 3000;
const muestras = [
  signosInicialesMonitor,
  { frecuenciaCardiaca: 84, temperatura: 36.9, spo2: 97 },
  { frecuenciaCardiaca: 80, temperatura: 36.8, spo2: 98 },
];

export type EstadoSenal = 'activa' | 'interrumpida' | 'reconectando';

type SimulacionSenal = {
  indice: number;
  timestamp: string;
  valores: (typeof muestras)[number];
} & (
  | { fase: 'activa' | 'interrumpida' | 'recuperada' }
  | { fase: 'reconectando'; reconectarEn: number }
);

function claveAlmacenamiento(caso: string) {
  return `medisync:uci-senal:v1:${caso}`;
}

function restaurarSimulacion(caso: string): SimulacionSenal | null {
  try {
    const guardado = window.sessionStorage.getItem(claveAlmacenamiento(caso));
    if (!guardado) return null;

    const datos: SimulacionSenal | null = JSON.parse(guardado);
    if (
      !datos ||
      !Number.isInteger(datos.indice) ||
      datos.indice < 0 ||
      datos.indice >= muestras.length ||
      typeof datos.timestamp !== 'string' ||
      !Number.isFinite(Date.parse(datos.timestamp)) ||
      !Number.isFinite(datos.valores?.frecuenciaCardiaca) ||
      !Number.isFinite(datos.valores?.temperatura) ||
      !Number.isFinite(datos.valores?.spo2)
    ) {
      return null;
    }

    if (datos.fase === 'activa' || datos.fase === 'interrumpida' || datos.fase === 'recuperada') {
      return datos;
    }

    return datos.fase === 'reconectando' && Number.isFinite(datos.reconectarEn) ? datos : null;
  } catch {
    return null;
  }
}

export function haySimulacionGuardada(caso: string) {
  return restaurarSimulacion(caso) !== null;
}

export function useSimulacionSenal(caso: string, habilitada: boolean, inicial?: CapturaMonitor) {
  const [simulacion, setSimulacion] = useState<SimulacionSenal>(
    () =>
      restaurarSimulacion(caso) ?? {
        fase: 'activa',
        indice: 0,
        timestamp: inicial?.timestamp ?? new Date().toISOString(),
        valores: inicial
          ? {
              frecuenciaCardiaca: inicial.frecuenciaCardiaca,
              temperatura: inicial.temperatura,
              spo2: inicial.spo2,
            }
          : muestras[0],
      }
  );

  useLayoutEffect(() => {
    if (!habilitada) return;

    try {
      window.sessionStorage.setItem(claveAlmacenamiento(caso), JSON.stringify(simulacion));
    } catch {
      // El monitor puede seguir funcionando si el navegador bloquea el almacenamiento.
    }
  }, [caso, habilitada, simulacion]);

  useEffect(() => {
    if (!habilitada || simulacion.fase === 'interrumpida') return;

    const pausa =
      simulacion.fase === 'reconectando'
        ? Math.max(0, simulacion.reconectarEn - Date.now())
        : intervaloLecturas;
    const temporizador = window.setTimeout(() => {
      const timestamp = new Date().toISOString();
      setSimulacion((actual) => {
        if (actual !== simulacion) return actual;

        const indice = (actual.indice + 1) % muestras.length;
        return {
          fase: actual.fase === 'reconectando' ? 'recuperada' : actual.fase,
          indice,
          timestamp,
          valores: muestras[indice],
        };
      });
    }, pausa);

    return () => window.clearTimeout(temporizador);
  }, [habilitada, simulacion]);

  function alternarSenal() {
    const reconectarEn = Date.now() + intervaloLecturas;
    setSimulacion((actual) => {
      if (actual.fase === 'reconectando') return actual;

      return actual.fase === 'interrumpida'
        ? { ...actual, fase: 'reconectando', reconectarEn }
        : { ...actual, fase: 'interrumpida' };
    });
  }

  const lectura: LecturaIoT = {
    ...simulacion.valores,
    dispositivoId: dispositivoPractica,
    paciente: 'Paciente simulado',
    timestamp: simulacion.timestamp,
  };

  return { fase: simulacion.fase, lectura, alternarSenal };
}
