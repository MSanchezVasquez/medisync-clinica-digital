/**
 * Simulador de MicroTriajes de MediSync.
 *
 * Se comporta EXACTAMENTE como el firmware real (mismo contrato HTTP que el ESP32/Arduino):
 *   1. POST /dispositivos/hello        -> se presenta al arrancar
 *   2. POST /dispositivos/heartbeat    -> cada 10 s (batería, señal WiFi, estado)
 *   3. GET  /dispositivos/comando      -> cada 2 s: ¿hay una medición asignada?
 *   4. POST /dispositivos/sesiones/:id/progreso   -> 1 vez por segundo mientras mide
 *   5. POST /dispositivos/sesiones/:id/resultado  -> valores finales (o /error si la señal es mala)
 *
 * Como el backend no distingue simulado de real, cuando llegue el hardware solo cambia quién habla.
 *
 * Variables de entorno:
 *   API_URL      (default http://localhost:3000/api)
 *   SIM_SPEED    (default 1)  1 = tiempo real; 10 = 10x más rápido (útil para pruebas)
 *   SIM_CONFIG   (default ./devices.config.json)
 */
import { readFileSync } from 'node:fs';
import {
  construirObjetivo,
  crearGeneradorMuestras,
  calcularResultado,
  CALIDAD_MINIMA,
  type Escenario,
  type Muestra,
} from './lib/fisiologia.js';

interface FaseCfg { fase: string; seg: number }
interface DispositivoCfg {
  codigo: string;
  clave: string;
  tipo: 'ESTACION_BASICA' | 'MONITOR_MULTIPARAMETRO';
  firmware: string;
  sensores: string[];
  fases: FaseCfg[];
  conPresion: boolean;
  conFR: boolean;
}
interface Comando {
  accion: 'NINGUNA' | 'INICIAR_MEDICION';
  sesionId?: string;
  perfil?: { edad?: number; sintomas?: string; escenario?: Escenario };
  timeoutSeg?: number;
}

const velocidad = Math.max(1, Number(process.env.SIM_SPEED ?? (process.argv.includes('--rapido') ? 10 : 1)));
const rutaCfg = process.env.SIM_CONFIG ?? new URL('./devices.config.json', import.meta.url).pathname;
const cfg = JSON.parse(readFileSync(rutaCfg, 'utf8')) as { apiUrl?: string; dispositivos: DispositivoCfg[] };
const API_URL = (process.env.API_URL ?? cfg.apiUrl ?? 'http://localhost:3000/api').replace(/\/$/, '');

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const dormirVirtual = (segs: number) => dormir((segs * 1000) / velocidad);
const log = (cod: string, ...a: unknown[]) => console.log(`[${new Date().toISOString()}] [${cod}]`, ...a);

class MicroTriajeSimulado {
  private bateria = 70 + Math.random() * 28;
  private rssi = -55 - Math.random() * 15;
  private estadoLocal: 'LIBRE' | 'MIDIENDO' | 'COMPLETADO' | 'ERROR' = 'LIBRE';
  private activo = true;

  constructor(private readonly d: DispositivoCfg) {}

  private async http<T>(metodo: 'GET' | 'POST', ruta: string, cuerpo?: unknown): Promise<T | null> {
    try {
      const resp = await fetch(`${API_URL}${ruta}`, {
        method: metodo,
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Code': this.d.codigo,
          'X-Device-Key': this.d.clave,
        },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      });
      if (!resp.ok) {
        log(this.d.codigo, `HTTP ${resp.status} en ${metodo} ${ruta}`);
        return null;
      }
      return (await resp.json().catch(() => ({}))) as T;
    } catch (e) {
      log(this.d.codigo, `Sin conexión con el backend (${(e as Error).message}). Reintentando...`);
      return null;
    }
  }

  async iniciar() {
    // 1. Presentación (reintenta hasta lograrlo, como haría el firmware tras reiniciar)
    while (this.activo) {
      const ok = await this.http('POST', '/dispositivos/hello', {
        firmware: this.d.firmware,
        sensores: this.d.sensores,
        bateria: Math.round(this.bateria),
        rssi: Math.round(this.rssi),
      });
      if (ok) break;
      await dormir(3000);
    }
    log(this.d.codigo, 'Vinculado al sistema.');
    void this.bucleHeartbeat();
    void this.bucleComandos();
  }

  private async bucleHeartbeat() {
    while (this.activo) {
      // la batería baja lentamente; el WiFi fluctúa
      this.bateria = Math.max(5, this.bateria - 0.03);
      this.rssi = Math.min(-40, Math.max(-85, this.rssi + (Math.random() - 0.5) * 4));
      await this.http('POST', '/dispositivos/heartbeat', {
        bateria: Math.round(this.bateria),
        rssi: Math.round(this.rssi),
        estadoLocal: this.estadoLocal,
      });
      await dormir(10_000 / Math.min(velocidad, 5));
    }
  }

  private async bucleComandos() {
    while (this.activo) {
      if (this.estadoLocal === 'LIBRE' || this.estadoLocal === 'COMPLETADO') {
        const cmd = await this.http<Comando>('GET', '/dispositivos/comando');
        if (cmd?.accion === 'INICIAR_MEDICION' && cmd.sesionId) {
          await this.medir(cmd);
        }
      }
      await dormir(2000 / Math.min(velocidad, 5));
    }
  }

  private async medir(cmd: Comando) {
    const sesionId = cmd.sesionId!;
    const perfil = { edad: cmd.perfil?.edad ?? 35, sintomas: cmd.perfil?.sintomas, escenario: cmd.perfil?.escenario };
    const { objetivo, escenario } = construirObjetivo(perfil, sesionId);
    const gen = crearGeneradorMuestras(objetivo, sesionId, this.d.fases.find((f) => f.fase === 'ESTABILIZACION')?.seg ?? 10);
    const total = this.d.fases.reduce((a, f) => a + f.seg, 0);
    const muestras: Muestra[] = [];
    let transcurrido = 0;
    this.estadoLocal = 'MIDIENDO';
    log(this.d.codigo, `Sesión ${sesionId.slice(0, 8)} iniciada (escenario simulado: ${escenario}, duración ${total}s).`);

    for (const f of this.d.fases) {
      for (let t = 1; t <= f.seg; t++) {
        await dormirVirtual(1);
        transcurrido++;
        let muestra: Muestra | undefined;
        if (f.fase === 'ESTABILIZACION' || f.fase === 'MEDICION') {
          muestra = gen(f.fase, t);
          if (f.fase === 'MEDICION') muestras.push(muestra);
        }
        const resp = await this.http<{ cancelar?: boolean }>('POST', `/dispositivos/sesiones/${sesionId}/progreso`, {
          fase: f.fase,
          faseRestanteSeg: f.seg - t,
          progreso: Math.round((transcurrido / total) * 100),
          tiempoSeg: transcurrido,
          muestra,
        });
        if (resp?.cancelar) {
          log(this.d.codigo, 'Medición cancelada por el personal.');
          this.estadoLocal = 'LIBRE';
          return;
        }
      }
    }

    const resultado = calcularResultado(objetivo, muestras, sesionId, {
      conPresion: this.d.conPresion,
      conFR: this.d.conFR,
    });

    if (resultado.calidad < CALIDAD_MINIMA) {
      this.estadoLocal = 'ERROR';
      await this.http('POST', `/dispositivos/sesiones/${sesionId}/error`, {
        codigo: 'SENAL_DEBIL',
        mensaje: `Calidad de señal ${resultado.calidad}% (mínimo ${CALIDAD_MINIMA}%). Reposicione el sensor y repita.`,
        calidad: resultado.calidad,
      });
      log(this.d.codigo, `Medición descartada (calidad ${resultado.calidad}%).`);
      await dormir(2000);
      this.estadoLocal = 'LIBRE';
      return;
    }

    await this.http('POST', `/dispositivos/sesiones/${sesionId}/resultado`, {
      ...resultado,
      duracionSeg: total,
      muestras: muestras.map((m) => ({ t: m.t, hr: m.hr, spo2: m.spo2 })),
    });
    this.estadoLocal = 'COMPLETADO';
    log(this.d.codigo, 'Resultado enviado:', resultado);
  }

  detener() { this.activo = false; }
}

const flota = cfg.dispositivos.map((d) => new MicroTriajeSimulado(d));
console.log(`MediSync · simulador de MicroTriajes · ${flota.length} dispositivo(s) · API ${API_URL} · velocidad x${velocidad}`);
for (const f of flota) void f.iniciar();
process.on('SIGINT', () => { flota.forEach((f) => f.detener()); process.exit(0); });
