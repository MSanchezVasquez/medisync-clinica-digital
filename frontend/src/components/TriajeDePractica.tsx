import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Link } from 'react-router-dom';
import {
  consultarPacientePractica,
  duracionCaptura,
  duracionLlegada,
  evaluarTriajePractica,
  guardarSesionPractica,
  leerSesionPractica,
  obtenerMedicionesPractica,
  resumirPractica,
  rutaUciDePractica,
} from '../services/flujoTriajeUci';
import { MedicionesTriaje } from './MedicionesTriaje';
import { ResumenTriaje } from './ResumenTriaje';

const EstacionTriaje3D = lazy(() => import('./uci/EstacionTriaje3D'));
const formatoHora = new Intl.DateTimeFormat('es-PE', { timeStyle: 'medium', hour12: false });

export function TriajeDePractica() {
  const [sesion, setSesion] = useState(leerSesionPractica);
  const [dni, setDni] = useState(sesion?.paciente.dni ?? '');
  const [sintomas, setSintomas] = useState(sesion?.sintomas ?? '');
  const [ahora, setAhora] = useState(Date.now);
  const [accion, setAccion] = useState<'ingreso' | 'evaluacion'>();
  const [errorIngreso, setErrorIngreso] = useState('');
  const [errorEvaluacion, setErrorEvaluacion] = useState('');
  const solicitud = useRef<AbortController | null>(null);
  const ingreso = sesion?.ingreso ?? null;
  const mediciones = sesion ? obtenerMedicionesPractica(sesion, ahora) : null;
  const resumen = sesion && mediciones ? resumirPractica(sesion, mediciones) : null;
  const estado =
    ingreso === null
      ? 'Esperando paciente'
      : mediciones
        ? 'Mediciones registradas'
        : ahora < ingreso + duracionLlegada
          ? 'Paciente entrando'
          : 'Tomando mediciones';

  useLayoutEffect(() => {
    guardarSesionPractica(sesion ? { ...sesion, sintomas } : null);
  }, [sesion, sintomas]);

  useEffect(() => () => solicitud.current?.abort(), []);

  useEffect(() => {
    if (ingreso === null) return;

    const temporizadores = [duracionLlegada, duracionCaptura].map((duracion) => {
      const objetivo = ingreso + duracion;
      return window.setTimeout(
        () => setAhora(Math.max(objetivo, Date.now())),
        Math.max(0, objetivo - Date.now())
      );
    });

    return () => temporizadores.forEach((temporizador) => window.clearTimeout(temporizador));
  }, [ingreso]);

  function editarDni(valor: string) {
    const nuevoDni = valor.replace(/\D/g, '').slice(0, 8);
    setDni(nuevoDni);
    setErrorIngreso('');
    if (sesion && nuevoDni !== sesion.paciente.dni) {
      setSesion(null);
      setSintomas('');
      setErrorEvaluacion('');
    }
  }

  function editarSintomas(valor: string) {
    setSintomas(valor);
    setErrorEvaluacion('');
    if (sesion?.evaluacion) setSesion({ ...sesion, evaluacion: undefined });
  }

  async function recibirPaciente(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (solicitud.current || !/^\d{8}$/.test(dni)) return;

    const controller = new AbortController();
    solicitud.current = controller;
    setAccion('ingreso');
    setErrorIngreso('');
    try {
      const paciente = await consultarPacientePractica(dni, controller.signal);
      const entrada = Date.now();
      setSesion({ ingreso: entrada, paciente, sintomas });
      setAhora(entrada);
      setErrorEvaluacion('');
    } catch (error) {
      if (!controller.signal.aborted) {
        setErrorIngreso(
          error instanceof Error ? error.message : 'No se pudo consultar el paciente.'
        );
      }
    } finally {
      solicitud.current = null;
      if (!controller.signal.aborted) setAccion(undefined);
    }
  }

  async function evaluar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (solicitud.current || !sesion || !mediciones || !sintomas.trim()) return;

    const controller = new AbortController();
    solicitud.current = controller;
    setAccion('evaluacion');
    setErrorEvaluacion('');
    try {
      const texto = sintomas.trim();
      const evaluacion = await evaluarTriajePractica(sesion.paciente.dni, texto, controller.signal);
      setSesion({ ...sesion, sintomas: texto, evaluacion });
      setSintomas(texto);
    } catch (error) {
      if (!controller.signal.aborted) {
        setErrorEvaluacion(
          error instanceof Error ? error.message : 'No se pudo realizar el triaje.'
        );
      }
    } finally {
      solicitud.current = null;
      if (!controller.signal.aborted) setAccion(undefined);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-7 sm:px-6 sm:py-9">
      <Link
        to="/triaje"
        className="text-sm font-semibold text-teal-700 hover:underline dark:text-teal-300"
      >
        ← Volver a triaje
      </Link>
      <header>
        <h1 className="text-3xl font-bold">Triaje de práctica</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Usa un DNI y síntomas ficticios para simular el ingreso y la evaluación.
        </p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section
          aria-labelledby="recepcion-triaje"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="space-y-3 px-4 py-3">
            <div>
              <h2 id="recepcion-triaje" className="font-semibold">
                Recepción del paciente
              </h2>
              <p role="status" className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {estado}
              </p>
            </div>
            <form onSubmit={recibirPaciente} className="space-y-2">
              <label htmlFor="dni-practica" className="block text-sm font-semibold">
                DNI de práctica
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="dni-practica"
                  inputMode="numeric"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  required
                  disabled={Boolean(accion)}
                  aria-describedby="dnis-disponibles"
                  value={dni}
                  onChange={(evento) => editarDni(evento.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600"
                />
                <button
                  type="submit"
                  disabled={
                    Boolean(accion) || !/^\d{8}$/.test(dni) || (ingreso !== null && !mediciones)
                  }
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  {accion === 'ingreso'
                    ? 'Buscando paciente…'
                    : mediciones
                      ? 'Repetir recepción'
                      : 'Recibir paciente'}
                </button>
              </div>
              <p id="dnis-disponibles" className="text-xs text-slate-600 dark:text-slate-300">
                DNI disponibles: 00000001, 00000002 y 00000003.
              </p>
              {errorIngreso && (
                <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                  {errorIngreso}
                </p>
              )}
            </form>
            {sesion && (
              <dl
                aria-label="Ficha del paciente"
                className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg bg-teal-50 p-3 text-sm dark:bg-teal-950/60"
              >
                <div>
                  <dt className="text-xs text-slate-600 dark:text-slate-300">Paciente</dt>
                  <dd className="font-semibold">{sesion.paciente.nombreCompleto}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-600 dark:text-slate-300">Edad</dt>
                  <dd className="font-semibold">{sesion.paciente.edad} años</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-600 dark:text-slate-300">Sexo</dt>
                  <dd className="font-semibold">{sesion.paciente.sexo}</dd>
                </div>
              </dl>
            )}
          </div>
          <Suspense fallback={<div className="h-64 bg-slate-200 sm:h-80 dark:bg-slate-800" />}>
            <EstacionTriaje3D
              ingreso={ingreso}
              talla={sesion?.paciente.altura}
              capturada={mediciones !== null}
            />
          </Suspense>
        </section>

        <section
          aria-labelledby="pantalla-triaje"
          className="rounded-2xl bg-slate-950 p-4 text-slate-100 shadow-sm"
        >
          <h2 id="pantalla-triaje" className="font-semibold text-teal-200">
            Monitor de triaje
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            Balanza, tallímetro y signos vitales simulados
          </p>
          <div className="mt-4">
            <MedicionesTriaje mediciones={mediciones} />
          </div>
          {mediciones && (
            <p className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-300">
              Lectura de ingreso{' '}
              <time dateTime={mediciones.monitor.timestamp}>
                {formatoHora.format(new Date(mediciones.monitor.timestamp))}
              </time>
            </p>
          )}
        </section>
      </div>

      <section
        aria-labelledby="evaluacion-triaje"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="evaluacion-triaje" className="text-lg font-semibold">
          Evaluación
        </h2>
        <form onSubmit={evaluar} className="mt-3 space-y-3">
          <label htmlFor="sintomas-practica" className="block text-sm font-semibold">
            Síntomas del paciente
          </label>
          <textarea
            id="sintomas-practica"
            rows={3}
            maxLength={3000}
            required
            disabled={Boolean(accion)}
            value={sintomas}
            onChange={(evento) => editarSintomas(evento.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={Boolean(accion) || !mediciones || !sintomas.trim()}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {accion === 'evaluacion' ? 'Evaluando síntomas…' : 'Evaluar triaje'}
            </button>
            {sesion && (
              <button
                type="button"
                disabled={Boolean(accion)}
                onClick={() => editarSintomas(sesion.paciente.sintomasEjemplo)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                Usar síntomas de ejemplo
              </button>
            )}
          </div>
          {errorEvaluacion && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {errorEvaluacion}
            </p>
          )}
        </form>
      </section>

      {resumen && sesion && (
        <section
          aria-labelledby="resultado-triaje-practica"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <h2 id="resultado-triaje-practica" className="text-lg font-semibold">
            Resultado del triaje
          </h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {sesion.evaluacion?.origen === 'ejemplo'
              ? 'Resultado de demostración'
              : 'Evaluación de práctica con Gemini'}
          </p>
          <ResumenTriaje triaje={resumen} />
          <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <h3 className="mb-2 text-sm font-semibold">Mediciones al ingreso</h3>
            <MedicionesTriaje mediciones={mediciones} horizontal />
          </div>
          <Link
            to={rutaUciDePractica}
            state={{ sesion }}
            className="mt-5 inline-flex rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Continuar el caso en la UCI
          </Link>
        </section>
      )}
    </main>
  );
}
