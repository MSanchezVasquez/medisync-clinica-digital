import { Component, useEffect, useState, type ReactNode } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import { createXRStore, useXRSessionModeSupported, XR, XROrigin } from '@react-three/xr';
import { Link } from 'react-router-dom';
import { ControlesUci } from '../components/uci/ControlesUci';
import { EscenaUci, type PantallaUci, type SeleccionUci } from '../components/uci/EscenaUci';
import { useTelemetriaIoT } from '../hooks/useTelemetriaIoT';

const dispositivo = 'DISP-UCI-04';
const visor = createXRStore({ emulate: false, enterGrantedSession: false });
const camaraInicial: CanvasProps['camera'] = {
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
  const [seleccion, setSeleccion] = useState<SeleccionUci | null>(null);
  const [errorVisor, setErrorVisor] = useState(false);
  const soportaVr = useXRSessionModeSupported('immersive-vr');
  const {
    lecturas: [lectura],
    estado,
    consultadoEn,
  } = useTelemetriaIoT(dispositivo);

  useEffect(
    () => () => {
      void visor
        .getState()
        .session?.end()
        .catch(() => undefined);
    },
    []
  );

  const desactualizada = lectura && consultadoEn - Date.parse(lectura.timestamp) >= 15_000;
  const estadoVisible =
    estado === 'sin-conexion'
      ? 'Sin conexión'
      : desactualizada
        ? 'Datos desactualizados'
        : lectura
          ? 'Telemetría activa'
          : 'Esperando datos';
  const pantalla: PantallaUci = {
    estado: estadoVisible,
    hora: lectura ? formatoHora.format(new Date(lectura.timestamp)) : '',
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
            Recorrido de capacitación con telemetría simulada de la Cama 4.
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

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section
          aria-label="Sala de cuidados intensivos"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <LimiteEscena>
            <div className="h-[55vh] min-h-80 max-h-[660px] bg-slate-800 focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-400">
              <Canvas camera={camaraInicial} dpr={[1, 1.5]} fallback={<AvisoWebGL />}>
                <XR store={visor}>
                  <XROrigin position={[0, 0, 3.05]} />
                  <ControlesUci />
                  <EscenaUci
                    seleccion={seleccion}
                    pantalla={pantalla}
                    onSeleccionar={setSeleccion}
                  />
                </XR>
              </Canvas>
            </div>
            <p className="px-4 py-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Arrastra para mirar. Enfoca la escena y usa WASD o las flechas para moverte. Selecciona
              la cama o el monitor dentro de la sala.
            </p>
          </LimiteEscena>
        </section>

        <aside
          aria-label="Controles y telemetría de la Cama 4"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold">Cama 4</h2>
          <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-300">{dispositivo}</p>
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
              Cama 4 seleccionada.
            </p>
          )}
          {seleccion === 'monitor' && (
            <section
              aria-label="Monitor de la Cama 4"
              className="mt-4 rounded-xl bg-slate-950 px-4 py-3 text-slate-100"
            >
              <p role="status" className="text-sm font-semibold text-teal-200">
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
        </aside>
      </div>
    </main>
  );
}
