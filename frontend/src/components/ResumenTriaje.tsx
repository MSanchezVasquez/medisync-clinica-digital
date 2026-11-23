import type { ContextoTriaje } from '../services/flujoTriajeUci';

export function ResumenTriaje({ triaje }: { triaje: ContextoTriaje }) {
  return (
    <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-slate-600 dark:text-slate-300">Paciente</dt>
        <dd className="wrap-break-word font-semibold">
          {triaje.nombreCompleto || 'Paciente sin nombre registrado'}
        </dd>
      </div>
      <div>
        <dt className="text-slate-600 dark:text-slate-300">Urgencia registrada</dt>
        <dd className="font-semibold">{triaje.urgencia}</dd>
      </div>
      <div>
        <dt className="text-slate-600 dark:text-slate-300">Especialidad registrada</dt>
        <dd className="wrap-break-word font-semibold">{triaje.especialidad}</dd>
      </div>
      {triaje.edad != null && (
        <div>
          <dt className="text-slate-600 dark:text-slate-300">Edad</dt>
          <dd className="font-semibold">{triaje.edad} años</dd>
        </div>
      )}
      {triaje.sexo && (
        <div>
          <dt className="text-slate-600 dark:text-slate-300">Sexo</dt>
          <dd className="font-semibold">{triaje.sexo}</dd>
        </div>
      )}
      {triaje.peso != null && (
        <div>
          <dt className="text-slate-600 dark:text-slate-300">Peso al ingreso</dt>
          <dd className="font-semibold tabular-nums">{triaje.peso} kg</dd>
        </div>
      )}
      {triaje.altura != null && (
        <div>
          <dt className="text-slate-600 dark:text-slate-300">Talla al ingreso</dt>
          <dd className="font-semibold tabular-nums">{triaje.altura} cm</dd>
        </div>
      )}
      <div className="sm:col-span-3">
        <dt className="text-slate-600 dark:text-slate-300">Síntomas registrados</dt>
        <dd className="wrap-break-word">{triaje.sintomas}</dd>
      </div>
      {triaje.recomendacion && (
        <div className="sm:col-span-3">
          <dt className="text-slate-600 dark:text-slate-300">Recomendación</dt>
          <dd className="wrap-break-word">{triaje.recomendacion}</dd>
        </div>
      )}
    </dl>
  );
}
