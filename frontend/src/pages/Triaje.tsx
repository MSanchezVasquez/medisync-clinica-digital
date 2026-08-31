import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { descargarInformeTriaje } from '../utils/informeTriaje';

type DiagnosticoIA = {
  urgencia: 'ALTA' | 'MEDIA' | 'BAJA' | 'NULA';
  especialidad: string;
  recomendacion: string;
};
type TriajeEdicion = {
  id: string; dni: string; edad: number; peso: number; altura: number; sintomas: string;
};

const API = 'http://localhost:3000/api';
const campo = 'w-full bg-transparent border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';

export const Triaje = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const recibido = (location.state as { triajeEditar?: TriajeEdicion } | null)?.triajeEditar;
  const [idEdicion, setIdEdicion] = useState<string | null>(recibido?.id ?? null);
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [dni, setDni] = useState(recibido?.dni ?? '');
  const [edad, setEdad] = useState(recibido ? String(recibido.edad) : '');
  const [peso, setPeso] = useState(recibido ? String(recibido.peso) : '');
  const [altura, setAltura] = useState(recibido ? String(recibido.altura) : '');
  const [sintomas, setSintomas] = useState(recibido?.sintomas ?? '');
  const [diagnostico, setDiagnostico] = useState<DiagnosticoIA | null>(null);
  const [consultandoDni, setConsultandoDni] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const resultadoRef = useRef<HTMLDivElement>(null);

  useGSAP(() => { gsap.from('.gsap-card', { y: 24, opacity: 0, duration: 0.55, stagger: 0.15 }); }, { scope: containerRef });
  useGSAP(() => { if (diagnostico) gsap.from(resultadoRef.current, { y: 18, opacity: 0, scale: 0.97, duration: 0.45 }); }, [diagnostico]);

  const consultarDni = async (): Promise<string | null> => {
    if (!/^\d{8}$/.test(dni)) {
      toast.warning('El DNI debe contener exactamente 8 dígitos.');
      return null;
    }
    setConsultandoDni(true); setNombreCompleto('');
    try {
      const r = await fetch(`${API}/consultar-dni`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dni }) });
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(data?.error || 'No se pudo consultar el DNI.');
      setNombreCompleto(data.nombreCompleto);
      toast.success('Datos del paciente encontrados.');
      return data.nombreCompleto as string;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo consultar el DNI.');
      return null;
    } finally { setConsultandoDni(false); }
  };

  const guardarAutomaticamente = async (d: DiagnosticoIA, nombreVerificado: string) => {
    setGuardando(true);
    try {
      const r = await fetch(idEdicion ? `${API}/triajes/${idEdicion}` : `${API}/triajes`, {
        method: idEdicion ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombreCompleto: nombreVerificado, dni, edad: Number(edad), peso: Number(peso), altura: Number(altura), sintomas, ...d }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(data?.error || 'No se pudo guardar el triaje.');
      setGuardado(true);
    } finally { setGuardando(false); }
  };

  const evaluar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{8}$/.test(dni)) return toast.warning('Ingrese un DNI válido de 8 dígitos.');
    if (!edad || !peso || !altura || Number(edad) < 0 || Number(edad) > 120) return toast.warning('Ingrese edad, peso y altura válidos.');
    if (!sintomas.trim()) return toast.warning('Ingrese los síntomas del paciente.');
    setCargando(true); setDiagnostico(null); setGuardado(false);
    try {
      const nombreVerificado = await consultarDni();
      if (!nombreVerificado) return;
      const r = await fetch(`${API}/triaje`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sintomas }) });
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(data?.error || `Error del servidor (${r.status})`);
      setDiagnostico(data);
      if (data.urgencia === 'NULA') {
        if (idEdicion) {
          const eliminacion = await fetch(`${API}/triajes/${idEdicion}`, { method: 'DELETE' });
          if (!eliminacion.ok) throw new Error('No se pudo retirar el triaje anterior del historial.');
          setIdEdicion(null);
        }
        toast.info('La urgencia es nula y no se guardará en el historial.');
      } else {
        await guardarAutomaticamente(data, nombreVerificado);
        toast.success(idEdicion ? 'Triaje reevaluado y actualizado.' : 'Triaje evaluado y guardado automáticamente.');
      }
    } catch (error) {
      toast.error(error instanceof TypeError ? 'No se pudo conectar con el backend.' : error instanceof Error ? error.message : 'No se pudo completar la evaluación.');
    } finally { setCargando(false); }
  };

  const nuevoTriaje = () => {
    setNombreCompleto(''); setDni(''); setEdad(''); setPeso(''); setAltura(''); setSintomas('');
    setIdEdicion(null); setDiagnostico(null); setGuardado(false); setGuardando(false);
    navigate('/triaje', { replace: true, state: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const descargar = () => diagnostico && descargarInformeTriaje({
    nombreCompleto, dni, edad: Number(edad), peso: Number(peso), altura: Number(altura), sintomas, ...diagnostico, creadoEn: new Date().toISOString(),
  });

  const etiqueta = 'text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1 block';
  return <main ref={containerRef} className="max-w-6xl mx-auto px-6 py-10">
    <div className="gsap-card bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-2xl shadow-lg mb-8 flex justify-between">
      <div><h2 className="text-emerald-800 dark:text-emerald-300 font-semibold">Sistema de pre-triaje</h2><p className="text-emerald-700 dark:text-emerald-400 text-sm">Evaluación conectada al backend y al motor Gemini IA</p></div>
      <span className="h-3 w-3 mt-2 bg-emerald-500 rounded-full" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="gsap-card bg-white/90 dark:bg-slate-900/90 rounded-2xl shadow-xl border border-white dark:border-slate-800 p-6">
        <h3 className="text-xl font-bold mb-1">{idEdicion ? 'Reevaluar triaje' : 'Nueva evaluación'}</h3><p className="text-sm text-slate-500 mb-6">{idEdicion ? 'Modifique los datos permitidos. El nombre y el diagnóstico se obtendrán nuevamente.' : 'Complete la información clínica del paciente.'}</p>
        <form onSubmit={evaluar} className="space-y-4">
          <div><label htmlFor="dni" className={etiqueta}>DNI</label><div className="flex gap-2">
            <input id="dni" inputMode="numeric" maxLength={8} value={dni} onChange={(e) => { setDni(e.target.value.replace(/\D/g, '')); setNombreCompleto(''); }} className={`${campo} flex-1 min-w-0`} required />
            <button type="button" onClick={consultarDni} disabled={consultandoDni || dni.length !== 8} className="px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-semibold">{consultandoDni ? 'Consultando...' : 'Aceptar'}</button>
          </div>{nombreCompleto && <div className="mt-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900"><p className="text-xs font-semibold text-teal-700 dark:text-teal-300">Paciente encontrado</p><p className="font-bold mt-1">{nombreCompleto}</p><p className="text-xs text-slate-500 mt-1">Fuente pública externa; verifique los datos.</p></div>}</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className={etiqueta}>Edad</label><input type="number" min="0" max="120" value={edad} onChange={(e) => setEdad(e.target.value)} className={campo} required /></div>
            <div><label className={etiqueta}>Peso (kg)</label><input type="number" min="1" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} className={campo} required /></div>
            <div><label className={etiqueta}>Altura (cm)</label><input type="number" min="30" max="250" step="0.1" value={altura} onChange={(e) => setAltura(e.target.value)} className={campo} required /></div>
          </div>
          <div><label htmlFor="sintomas" className={etiqueta}>Síntomas del paciente</label><textarea id="sintomas" rows={5} value={sintomas} onChange={(e) => setSintomas(e.target.value)} className={`${campo} resize-none`} required /></div>
          <button type="submit" disabled={cargando} className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:opacity-60 text-white font-semibold shadow-lg transition-all">{cargando ? 'Analizando...' : 'Evaluar síntomas'}</button>
        </form>
      </section>
      <div className="space-y-6">{diagnostico ? <section ref={resultadoRef} className="bg-white/95 dark:bg-slate-900 rounded-2xl shadow-xl border border-white dark:border-slate-800 p-6">
        <h3 className="text-xl font-bold border-b dark:border-slate-700 pb-3 mb-4">Resultado del triaje</h3>
        <div className="space-y-4 text-sm"><div className="flex justify-between"><span className="text-slate-500">Nivel de urgencia</span><span className={`font-bold px-2.5 py-1 rounded-lg ${diagnostico.urgencia === 'ALTA' ? 'bg-red-100 text-red-700' : diagnostico.urgencia === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' : diagnostico.urgencia === 'BAJA' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white'}`}>{diagnostico.urgencia}</span></div>
          <div><span className="text-slate-500">Especialidad sugerida</span><p className="font-semibold mt-1">{diagnostico.especialidad}</p></div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800"><span className="text-slate-500">Recomendación</span><p className="mt-1">{diagnostico.recomendacion}</p></div>
          {diagnostico.urgencia === 'NULA' ? <p className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">Evaluación informativa. No se guardó en el historial.</p> : <p className={`p-3 rounded-xl font-semibold ${guardado ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-700'}`}>{guardando ? 'Guardando automáticamente...' : guardado ? 'Triaje guardado automáticamente' : 'No se pudo guardar automáticamente'}</p>}
          <div className="grid sm:grid-cols-2 gap-3"><button type="button" onClick={descargar} className="py-3 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-semibold">Descargar reporte</button><button type="button" onClick={nuevoTriaje} className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold">Nuevo triaje</button></div>
        </div>
      </section> : <section className="gsap-card bg-white/70 dark:bg-slate-900/70 rounded-2xl border border-white dark:border-slate-800 p-8 text-center text-slate-500"><p className="font-semibold">El resultado aparecerá aquí después de evaluar los síntomas.</p></section>}</div>
    </div>
  </main>;
};
