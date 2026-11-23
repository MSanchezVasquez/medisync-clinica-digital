import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { createXRStore, useXRSessionModeSupported, XR, XROrigin } from '@react-three/xr';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { MedicionesTriaje } from '../components/MedicionesTriaje';
import { ResumenTriaje } from '../components/ResumenTriaje';
import { ControlesUci, type VistaUci } from '../components/uci/ControlesUci';
import { EscenaUci, type PantallaUci } from '../components/uci/EscenaUci';
import { LimiteEscena } from '../components/uci/LimiteEscena';
import {
  dispositivoPractica,
  haySimulacionGuardada,
  useSimulacionSenal,
} from '../hooks/useSimulacionSenal';
import { useTelemetriaIoT } from '../hooks/useTelemetriaIoT';
import { API } from '../services/api';
import {
  esSesionPractica,
  leerSesionPractica,
  obtenerMedicionesPractica,
  resumirPractica,
  rutaTriajeDePractica,
  type ContextoTriaje,
} from '../services/flujoTriajeUci';

const casos = [
  { cama: 4, titulo: 'Monitoreo IoT', dispositivo: 'DISP-UCI-04' },
  { cama: 5, titulo: 'Pérdida de señal', dispositivo: dispositivoPractica },
] as const;

const estadoPractica = {
  activa: 'Recibiendo lecturas',
  interrumpida: 'Sin señal del sensor',
  reconectando: 'Reconectando el sensor…',
  recuperada: 'Señal recuperada',
};

const accionSenal = {
  activa: 'Cortar señal',
  interrumpida: 'Reconectar sensor',
  reconectando: 'Reconectando…',
  recuperada: 'Cortar señal',
};

type ContextoSala = { clave: string; triaje?: ContextoTriaje; practica?: boolean };

type CargaTriaje =
  | { estado: 'cargado'; triaje: ContextoTriaje }
  | { estado: 'sin-conexion' }
  | { estado: 'error'; mensaje: string };

const visor = createXRStore({ emulate: false, enterGrantedSession: false });
const camaraInicial: VistaUci = {
  position: [0, 1.64, 3.05],
  rotation: [-0.13, 0, 0],
  fov: 54,
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

export default function UciVirtual() {
  const [parametros] = useSearchParams();
  const idTriaje = parametros.get('triaje');
  const practicaDesdeTriaje = parametros.get('practica') === 'triaje';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [idTriaje, practicaDesdeTriaje]);

  if (idTriaje !== null) return <UciDesdeTriaje key={idTriaje} idTriaje={idTriaje} />;
  if (practicaDesdeTriaje) return <UciDePractica />;

  return <SalaUci key="general" />;
}

function UciDePractica() {
  const { state } = useLocation();
  const [contexto] = useState<ContextoSala | null>(() => {
    const sesion = leerSesionPractica() ?? state?.sesion;
    if (!esSesionPractica(sesion)) return null;

    const mediciones = obtenerMedicionesPractica(sesion, Date.now());
    if (!mediciones) return null;
    const triaje = resumirPractica(sesion, mediciones);
    if (!triaje) return null;

    return {
      clave: `practica:${sesion.ingreso}`,
      triaje,
      practica: true,
    };
  });

  if (!contexto) return <Navigate to={rutaTriajeDePractica} replace />;
  return <SalaUci contexto={contexto} />;
}

function UciDesdeTriaje({ idTriaje }: { idTriaje: string }) {
  const [resultado, setResultado] = useState<CargaTriaje>();
  const clave = `triaje:${idTriaje}`;

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem('medisync_token');
    const limite = window.setTimeout(() => {
      controller.abort();
      setResultado({ estado: 'sin-conexion' });
    }, 5000);

    async function cargarTriaje() {
      try {
        if (!idTriaje.trim()) throw new Error('El enlace no contiene un triaje válido.');

        const respuesta = await fetch(`${API}/triajes/${encodeURIComponent(idTriaje)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });
        if (respuesta.status === 404) throw new Error('No se encontró el triaje de este caso.');
        if (respuesta.status >= 500) {
          setResultado({ estado: 'sin-conexion' });
          return;
        }
        if (!respuesta.ok) throw new Error('No se pudo cargar el triaje de este caso.');

        const triaje: ContextoTriaje = await respuesta.json();
        setResultado({ estado: 'cargado', triaje });
      } catch (error) {
        if (!controller.signal.aborted) {
          setResultado(
            error instanceof TypeError
              ? { estado: 'sin-conexion' }
              : {
                  estado: 'error',
                  mensaje:
                    error instanceof Error
                      ? error.message
                      : 'No se pudo cargar el triaje de este caso.',
                }
          );
        }
      } finally {
        window.clearTimeout(limite);
      }
    }

    void cargarTriaje();
    return () => {
      window.clearTimeout(limite);
      controller.abort();
    };
  }, [idTriaje]);

  if (!resultado)
    return (
      <p role="status" className="p-8">
        Cargando el triaje de origen…
      </p>
    );

  if (resultado.estado === 'cargado')
    return <SalaUci contexto={{ clave, triaje: resultado.triaje }} />;

  if (resultado.estado === 'sin-conexion' && haySimulacionGuardada(clave)) {
    return <SalaUci contexto={{ clave }} />;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-3 px-4 py-8">
      <h1 className="text-2xl font-bold">UCI virtual</h1>
      <p role="alert">
        {resultado.estado === 'error'
          ? resultado.mensaje
          : 'El triaje de origen está temporalmente no disponible.'}
      </p>
      <Link
        to="/dashboard"
        className="text-sm font-semibold text-teal-700 hover:underline dark:text-teal-300"
      >
        Volver al historial de triajes
      </Link>
    </main>
  );
}

function SalaUci({ contexto }: { contexto?: ContextoSala }) {
  const [parametros, setParametros] = useSearchParams();
  const esSimulacion = Boolean(contexto) || parametros.get('cama') === '5';
  const caso = esSimulacion ? casos[1] : casos[0];
  const [monitorSeleccionado, setMonitorSeleccionado] = useState(false);
  const [errorVisor, setErrorVisor] = useState(false);
  const [reencuadres, setReencuadres] = useState(0);
  const simulacion = useSimulacionSenal(
    contexto?.clave ?? 'general',
    esSimulacion,
    contexto?.triaje?.mediciones?.monitor
  );
  const soportaVr = useXRSessionModeSupported('immersive-vr');
  const {
    lecturas: [lecturaIoT],
    estado,
    consultadoEn,
  } = useTelemetriaIoT(casos[0].dispositivo, !esSimulacion);

  useEffect(
    () => () => {
      void visor
        .getState()
        .session?.end()
        .catch(() => undefined);
    },
    []
  );

  const lectura = esSimulacion ? simulacion.lectura : lecturaIoT;
  const sinConexion = !esSimulacion && estado === 'sin-conexion';
  const fase = esSimulacion ? simulacion.fase : undefined;
  const lecturaAnterior = fase === 'interrumpida' || fase === 'reconectando';
  const monitorAbierto = esSimulacion || monitorSeleccionado;
  const desactualizada = Boolean(
    !esSimulacion && lecturaIoT && consultadoEn - Date.parse(lecturaIoT.timestamp) >= 15_000
  );
  const estadoVisible = fase
    ? estadoPractica[fase]
    : sinConexion
      ? 'Sin conexión'
      : desactualizada
        ? 'Datos desactualizados'
        : lectura
          ? 'Telemetría activa'
          : 'Esperando datos';
  const pantalla: PantallaUci = {
    estado: estadoVisible,
    hora: lectura ? formatoHora.format(new Date(lectura.timestamp)) : '',
    advertencia: sinConexion || lecturaAnterior || desactualizada,
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

  function reencuadrar() {
    setReencuadres((actual) => actual + 1);
  }

  function cambiarCaso(siguiente: (typeof casos)[number]) {
    if (siguiente === caso) return;

    const nuevosParametros = new URLSearchParams(parametros);
    if (siguiente.cama === 5) nuevosParametros.set('cama', '5');
    else nuevosParametros.delete('cama');
    setParametros(nuevosParametros, { replace: true });
    setMonitorSeleccionado(false);
    reencuadrar();
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
        to={contexto?.practica ? rutaTriajeDePractica : '/dashboard'}
        className="inline-flex rounded-sm text-sm font-semibold text-teal-700 hover:underline dark:text-teal-300"
      >
        {contexto?.practica ? '← Volver al triaje de práctica' : '← Volver al panel'}
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">UCI virtual</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {contexto
              ? 'Monitoreo del caso de triaje.'
              : 'Monitoreo de las camas de cuidados intensivos.'}
          </p>
        </div>
        {!contexto && (
          <Link
            to={rutaTriajeDePractica}
            className="rounded-lg border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300 dark:hover:bg-teal-950"
          >
            Empezar desde triaje
          </Link>
        )}
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

      {contexto ? (
        <section
          aria-labelledby="triaje-origen"
          className="rounded-2xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-950/60"
        >
          <h2 id="triaje-origen" className="font-semibold">
            Triaje de origen
          </h2>
          {contexto.triaje ? (
            <>
              <ResumenTriaje triaje={contexto.triaje} />
              {contexto.triaje.mediciones && (
                <div className="mt-4 border-t border-teal-200 pt-3 dark:border-teal-800">
                  <h3 className="mb-2 text-sm font-semibold">Mediciones al ingreso</h3>
                  <MedicionesTriaje mediciones={contexto.triaje.mediciones} horizontal />
                </div>
              )}
            </>
          ) : (
            <p role="status" className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Triaje de origen temporalmente no disponible.
            </p>
          )}
        </section>
      ) : (
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
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <aside
          aria-label={`Controles y telemetría de la Cama ${caso.cama}`}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold">Cama {caso.cama}</h2>
          <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-300">
            {caso.dispositivo}
            {esSimulacion && ' · Datos simulados'}
          </p>
          {!monitorAbierto && (
            <button
              type="button"
              onClick={() => setMonitorSeleccionado(true)}
              className="mt-4 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Abrir monitor
            </button>
          )}
          {monitorAbierto && (
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
                  {lecturaAnterior ? 'Lectura anterior al corte' : 'Última lectura'}{' '}
                  <time className="tabular-nums" dateTime={lectura.timestamp}>
                    {pantalla.hora}
                  </time>
                </p>
              )}
            </section>
          )}
          {fase && (
            <button
              type="button"
              disabled={fase === 'reconectando'}
              onClick={simulacion.alternarSenal}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              {accionSenal[fase]}
            </button>
          )}
        </aside>

        <section
          aria-label="Sala de cuidados intensivos"
          className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${esSimulacion ? 'lg:order-first' : 'order-first'}`}
        >
          <LimiteEscena alternativa={<AvisoWebGL />}>
            <div className="h-80 max-h-[660px] bg-slate-800 focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-400 sm:h-[55vh] sm:min-h-80">
              <Canvas camera={camaraInicial} dpr={[1, 1.5]} fallback={<AvisoWebGL />}>
                <XR store={visor}>
                  <XROrigin position={[0, 0, 3.05]} />
                  <ControlesUci vistaInicial={camaraInicial} reencuadres={reencuadres} />
                  <EscenaUci
                    numero={caso.cama}
                    pantalla={pantalla}
                    monitorAbierto={monitorAbierto}
                    onAbrirMonitor={() => setMonitorSeleccionado(true)}
                    senal={
                      fase
                        ? {
                            estado: fase === 'recuperada' ? 'activa' : fase,
                            onPulsar: simulacion.alternarSenal,
                          }
                        : undefined
                    }
                  />
                </XR>
              </Canvas>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
              <p className="max-w-lg leading-relaxed">
                Arrastra para mirar. Usa WASD o las flechas con la escena enfocada para moverte.
              </p>
              <button
                type="button"
                onClick={reencuadrar}
                className="rounded-lg border border-slate-300 px-3 py-2 font-semibold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                Volver a la vista inicial
              </button>
            </div>
          </LimiteEscena>
        </section>
      </div>
    </main>
  );
}
