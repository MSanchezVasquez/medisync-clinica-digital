import { Component, useEffect, useState, type ReactNode } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import { createXRStore, useXRSessionModeSupported, XR, XROrigin } from '@react-three/xr';
import { Link } from 'react-router-dom';
import { ControlesUci } from '../components/uci/ControlesUci';
import { EscenaUci, type PantallaUci, type SeleccionUci } from '../components/uci/EscenaUci';
import { useTelemetriaIoT, type LecturaIoT } from '../hooks/useTelemetriaIoT';

const casos = [
  { cama: 4, titulo: 'Monitoreo IoT', dispositivo: 'DISP-UCI-04' },
  { cama: 5, titulo: 'Pérdida de señal', dispositivo: 'DISP-UCI-05' },
] as const;

const muestras = [
  { frecuenciaCardiaca: 82, temperatura: 36.8, spo2: 98 },
  { frecuenciaCardiaca: 84, temperatura: 36.9, spo2: 97 },
  { frecuenciaCardiaca: 80, temperatura: 36.8, spo2: 98 },
];

function generarLecturaSimulada(indice: number): LecturaIoT {
  return {
    ...muestras[indice % muestras.length],
    dispositivoId: casos[1].dispositivo,
    paciente: 'Paciente simulado',
    timestamp: new Date().toISOString(),
  };
}

const visor = createXRStore({ emulate: false, enterGrantedSession: false });
const campoVertical = 54;
const camaraInicial: CanvasProps['camera'] = {
  position: [0, 1.64, 3.05],
  rotation: [-0.13, 0, 0],
  fov: campoVertical,
};
const formatoHora = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function AvisoWebGL() {
  return (
    <p
      role="status"
      className="grid min-h-32 place-content-center bg-slate-800 p-6 text-center text-slate-100"
    >
      La escena requiere WebGL 2. Puedes abrir el monitor desde el panel de controles.
    </p>
  );
}

class LimiteEscena extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  render() {
    return this.state.error ? <AvisoWebGL /> : this.props.children;
  }
}

export default function UciVirtual() {
  const [caso, setCaso] = useState<(typeof casos)[number]>(casos[0]);
  const [seleccion, setSeleccion] = useState<SeleccionUci | null>(null);
  const [errorVisor, setErrorVisor] = useState(false);
  const [senalActiva, setSenalActiva] = useState(true);
  const [lecturaSimulada, setLecturaSimulada] = useState<LecturaIoT>();
  const esSimulacion = caso.cama === 5;
  const soportaVr = useXRSessionModeSupported('immersive-vr');
  const {
    lecturas: [lecturaIoT],
    estado,
    consultadoEn,
  } = useTelemetriaIoT(casos[0].dispositivo, !esSimulacion);

  useEffect(() => {
    if (!esSimulacion || !senalActiva) return;

    let muestra = 1;
    const intervalo = window.setInterval(() => {
      setLecturaSimulada(generarLecturaSimulada(muestra++));
    }, 3000);
    return () => window.clearInterval(intervalo);
  }, [esSimulacion, senalActiva]);

  useEffect(
    () => () => {
      void visor
        .getState()
        .session?.end()
        .catch(() => undefined);
    },
    []
  );

  const lectura = esSimulacion ? lecturaSimulada : lecturaIoT;
  const sinConexion = !esSimulacion && estado === 'sin-conexion';
  const interrumpida = esSimulacion && !senalActiva;
  const desactualizada = Boolean(
    !esSimulacion && lecturaIoT && consultadoEn - Date.parse(lecturaIoT.timestamp) >= 15_000
  );
  const estadoVisible = sinConexion
    ? 'Sin conexión'
    : interrumpida
      ? 'Señal interrumpida'
      : desactualizada
        ? 'Datos desactualizados'
        : lectura
          ? 'Telemetría activa'
          : 'Esperando datos';
  const pantalla: PantallaUci = {
    estado: estadoVisible,
    hora: lectura ? formatoHora.format(new Date(lectura.timestamp)) : '',
    advertencia: sinConexion || interrumpida || desactualizada,
    metricas: [
      { nombre: 'Pulso', valor: lectura ? String(lectura.frecuenciaCardiaca) : '—', unidad: 'bpm' },
      {
        nombre: 'Temperatura',
        valor: lectura ? lectura.temperatura.toFixed(1) : '—',
        unidad: '°C',
      },
      { nombre: 'SpO₂', valor: lectura ? String(lectura.spo2) : '—', unidad: '%' },
    ],
  };

  function cambiarCaso(siguiente: (typeof casos)[number]) {
    if (siguiente === caso) return;
    setCaso(siguiente);
    setSeleccion(null);
    setSenalActiva(true);
    setLecturaSimulada(siguiente.cama === 5 ? generarLecturaSimulada(0) : undefined);
  }

  function alternarSenal() {
    if (senalActiva) {
      setSenalActiva(false);
    } else {
      setLecturaSimulada(generarLecturaSimulada(0));
      setSenalActiva(true);
    }
    setSeleccion('monitor');
  }

  const entrarVr = async () => {
    setErrorVisor(false);
    try {
      const sesion = await visor.enterVR();
      if (!sesion) setErrorVisor(true);
    } catch {
      setErrorVisor(true);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6 sm:py-9">
      <Link
        to="/dashboard"
        className="inline-flex rounded-sm text-sm font-semibold text-teal-700 hover:underline dark:text-teal-300"
      >
        ← Volver al panel
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">UCI virtual</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Recorrido de capacitación con dos casos de monitoreo de pacientes.
          </p>
        </div>
        {soportaVr && (
          <button
            type="button"
            onClick={() => void entrarVr()}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Entrar con visor VR
          </button>
        )}
      </header>
      {errorVisor && (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-300">
          No se pudo iniciar el visor. Puedes continuar en la pantalla.
        </p>
      )}

      <div role="group" aria-label="Casos de la UCI" className="grid gap-2 sm:grid-cols-2">
        {casos.map((opcion) => (
          <button
            key={opcion.cama}
            type="button"
            aria-pressed={caso === opcion}
            onClick={() => cambiarCaso(opcion)}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold hover:border-teal-500 aria-pressed:border-teal-600 aria-pressed:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:aria-pressed:border-teal-500 dark:aria-pressed:bg-teal-950"
          >
            {opcion.titulo}
            <span className="text-xs text-slate-600 dark:text-slate-300">Cama {opcion.cama}</span>
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section
          aria-label="Sala de cuidados intensivos"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <LimiteEscena>
            <div className="h-80 max-h-[660px] bg-slate-800 focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-400 sm:h-[55vh] sm:min-h-80">
              <Canvas camera={camaraInicial} dpr={[1, 1.5]} fallback={<AvisoWebGL />}>
                <XR store={visor}>
                  <XROrigin position={[0, 0, 3.05]} />
                  <ControlesUci campoVertical={campoVertical} />
                  <EscenaUci
                    numero={caso.cama}
                    seleccion={seleccion}
                    pantalla={pantalla}
                    onSeleccionar={setSeleccion}
                    senal={
                      esSimulacion ? { activa: senalActiva, onAlternar: alternarSenal } : undefined
                    }
                  />
                </XR>
              </Canvas>
            </div>
            <p className="px-4 py-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Arrastra para mirar. Usa WASD o las flechas con la escena enfocada para moverte. Pulsa
              la cama, el monitor{esSimulacion ? ' o el módulo de señal' : ''} en la sala.
            </p>
          </LimiteEscena>
        </section>

        <aside
          aria-label={`Controles y telemetría de la Cama ${caso.cama}`}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold">Cama {caso.cama}</h2>
          <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-300">
            {caso.dispositivo}
          </p>
          {esSimulacion && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Interrumpe la señal y comprueba que el monitor conserva la última lectura.
              Restablécela con el módulo iluminado debajo de la pantalla 3D o con el botón del
              panel.
            </p>
          )}
          <div className="mt-4 flex gap-2 text-sm font-semibold">
            <button
              type="button"
              aria-pressed={seleccion === 'cama'}
              onClick={() => setSeleccion('cama')}
              className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-100 aria-pressed:border-teal-600 aria-pressed:bg-teal-50 dark:border-slate-600 dark:hover:bg-slate-800 dark:aria-pressed:bg-teal-950"
            >
              Seleccionar cama
            </button>
            <button
              type="button"
              aria-pressed={seleccion === 'monitor'}
              onClick={() => setSeleccion('monitor')}
              className="rounded-lg bg-teal-700 px-3 py-2 text-white hover:bg-teal-800 aria-pressed:bg-teal-900"
            >
              Abrir monitor
            </button>
          </div>
          {seleccion === 'cama' && (
            <p role="status" className="mt-4 text-sm text-teal-700 dark:text-teal-300">
              Cama {caso.cama} seleccionada.
            </p>
          )}
          {seleccion === 'monitor' && (
            <section
              aria-label={`Monitor de la Cama ${caso.cama}`}
              className="mt-4 rounded-xl bg-slate-950 px-4 py-3 text-slate-100"
            >
              <p
                role="status"
                className={`text-sm font-semibold ${pantalla.advertencia ? 'text-amber-200' : 'text-teal-200'}`}
              >
                {estadoVisible}
              </p>
              <dl className="my-2 divide-y divide-slate-800 text-sm">
                {pantalla.metricas.map(({ nombre, valor, unidad }) => (
                  <div key={nombre} className="flex items-baseline justify-between gap-2 py-2">
                    <dt className="text-slate-300">{nombre}</dt>
                    <dd className="font-semibold tabular-nums">
                      {valor} <span className="text-xs font-normal">{unidad}</span>
                    </dd>
                  </div>
                ))}
              </dl>
              {lectura && (
                <p className="text-xs text-slate-400">
                  Última lectura <time dateTime={lectura.timestamp}>{pantalla.hora}</time>
                </p>
              )}
            </section>
          )}
          {esSimulacion && (
            <button
              type="button"
              onClick={alternarSenal}
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              {senalActiva ? 'Simular interrupción' : 'Restablecer señal'}
            </button>
          )}
        </aside>
      </div>
    </main>
  );
}
