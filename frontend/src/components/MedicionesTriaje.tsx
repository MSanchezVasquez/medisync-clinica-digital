import type { MedicionesIngreso } from '../services/flujoTriajeUci';

const decimal = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });

export function MedicionesTriaje({
  mediciones,
  horizontal = false,
}: {
  mediciones?: MedicionesIngreso | null;
  horizontal?: boolean;
}) {
  const campos = [
    { nombre: 'Peso', valor: mediciones?.peso, unidad: 'kg' },
    { nombre: 'Talla', valor: mediciones?.altura, unidad: 'cm' },
    { nombre: 'Pulso', valor: mediciones?.monitor.frecuenciaCardiaca, unidad: 'bpm' },
    { nombre: 'Temperatura', valor: mediciones?.monitor.temperatura, unidad: '°C' },
    { nombre: 'SpO₂', valor: mediciones?.monitor.spo2, unidad: '%' },
  ];

  return (
    <dl className={`grid grid-cols-2 gap-x-4 gap-y-3 ${horizontal ? 'sm:grid-cols-5' : ''}`}>
      {campos.map(({ nombre, valor, unidad }) => (
        <div key={nombre}>
          <dt className="text-xs opacity-80">{nombre}</dt>
          <dd className="mt-0.5 text-base font-semibold tabular-nums">
            {valor === undefined ? '—' : decimal.format(valor)}{' '}
            <span className="text-xs font-normal">{unidad}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
