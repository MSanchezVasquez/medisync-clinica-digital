import { useEffect, useState } from 'react';
import { API } from '../services/api';

export interface LecturaIoT {
  dispositivoId: string;
  paciente: string;
  frecuenciaCardiaca: number;
  temperatura: number;
  spo2: number;
  timestamp: string;
}

type Telemetria = {
  lecturas: LecturaIoT[];
  estado: 'cargando' | 'conectado' | 'sin-conexion';
  consultadoEn: number;
};

function esLecturaIoT(valor: unknown): valor is LecturaIoT {
  if (!valor || typeof valor !== 'object') return false;
  const lectura = valor as Partial<LecturaIoT>;
  return (
    typeof lectura.dispositivoId === 'string' &&
    typeof lectura.paciente === 'string' &&
    Number.isFinite(lectura.frecuenciaCardiaca) &&
    Number.isFinite(lectura.temperatura) &&
    Number.isFinite(lectura.spo2) &&
    typeof lectura.timestamp === 'string' &&
    Number.isFinite(Date.parse(lectura.timestamp))
  );
}

export function useTelemetriaIoT(dispositivoId?: string) {
  const [telemetria, setTelemetria] = useState<Telemetria>({
    lecturas: [],
    estado: 'cargando',
    consultadoEn: 0,
  });

  useEffect(() => {
    let activa = true;
    let siguienteConsulta: number | undefined;
    let solicitud: AbortController | undefined;

    const consultar = async () => {
      const controller = new AbortController();
      solicitud = controller;
      const limite = window.setTimeout(() => controller.abort(), 5000);

      try {
        const respuesta = await fetch(`${API}/sensores/stream`, { signal: controller.signal });
        if (!respuesta.ok) throw new Error(`Error de telemetría (${respuesta.status})`);

        const datos: unknown = await respuesta.json();
        if (!Array.isArray(datos)) throw new Error('Respuesta de telemetría inválida');
        if (!activa) return;

        const lecturas = datos.filter(esLecturaIoT);
        const seleccion = dispositivoId
          ? lecturas.filter((lectura) => lectura.dispositivoId === dispositivoId).slice(0, 1)
          : lecturas;
        const consultadoEn = Date.now();
        setTelemetria((anterior) => ({
          lecturas:
            dispositivoId && seleccion.length === 0
              ? anterior.lecturas.filter((lectura) => lectura.dispositivoId === dispositivoId)
              : seleccion,
          estado: 'conectado',
          consultadoEn,
        }));
      } catch {
        if (!activa) return;
        const consultadoEn = Date.now();
        setTelemetria((anterior) => ({ ...anterior, estado: 'sin-conexion', consultadoEn }));
      } finally {
        window.clearTimeout(limite);
        if (activa) siguienteConsulta = window.setTimeout(consultar, 3000);
      }
    };

    void consultar();
    return () => {
      activa = false;
      window.clearTimeout(siguienteConsulta);
      solicitud?.abort();
    };
  }, [dispositivoId]);

  return telemetria;
}
