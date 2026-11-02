import test from 'node:test';
import assert from 'node:assert/strict';
import {
  construirObjetivo, crearGeneradorMuestras, calcularResultado, inferirEscenario, type Muestra,
} from './fisiologia.js';

const sesion = (perfil: Parameters<typeof construirObjetivo>[0], seed: string, conPresion = true) => {
  const { objetivo, escenario } = construirObjetivo(perfil, seed);
  const gen = crearGeneradorMuestras(objetivo, seed);
  for (let t = 1; t <= 10; t++) gen('ESTABILIZACION', t);
  const muestras: Muestra[] = [];
  for (let t = 1; t <= 30; t++) muestras.push(gen('MEDICION', t));
  return { escenario, objetivo, muestras, res: calcularResultado(objetivo, muestras, seed, { conPresion, conFR: conPresion }) };
};

test('es reproducible con la misma semilla', () => {
  const a = sesion({ edad: 40, sintomas: 'tengo fiebre' }, 'abc').res;
  const b = sesion({ edad: 40, sintomas: 'tengo fiebre' }, 'abc').res;
  assert.deepEqual(a, b);
});

test('infiere escenarios desde síntomas en español (con tildes)', () => {
  assert.equal(inferirEscenario('Tengo fiebre y escalofríos desde ayer'), 'FEBRIL');
  assert.equal(inferirEscenario('Me falta el aire, dificultad para respirar'), 'RESPIRATORIO');
  assert.equal(inferirEscenario('dolor de pecho que baja al brazo izquierdo'), 'CARDIACO');
  assert.equal(inferirEscenario('vómitos y diarrea'), 'HIPOVOLEMIA');
  assert.equal(inferirEscenario('control de rutina'), 'ESTABLE');
});

test('valores plausibles y coherentes en 300 pacientes aleatorios', () => {
  let rechazadas = 0;
  for (let i = 0; i < 300; i++) {
    const edad = 1 + (i * 7) % 85;
    const { res, objetivo } = sesion({ edad, sintomas: ['fiebre', 'dolor de pecho', '', 'falta de aire'][i % 4] }, `p${i}`);
    assert.ok(res.frecuenciaCardiaca >= 40 && res.frecuenciaCardiaca <= 200, `FC ${res.frecuenciaCardiaca}`);
    assert.ok(res.spo2 >= 70 && res.spo2 <= 100, `SpO2 ${res.spo2}`);
    assert.ok(res.temperatura >= 35 && res.temperatura <= 41, `T ${res.temperatura}`);
    assert.ok(res.presionSistolica! > res.presionDiastolica!, 'PAS > PAD');
    assert.ok(res.calidad >= 0 && res.calidad <= 99);
    assert.ok(Math.abs(res.frecuenciaCardiaca - objetivo.hr) < 12, 'FC final cerca del objetivo');
    if (res.calidad < 60) rechazadas++;
  }
  // el ~8 % de contacto deficiente + artefactos: debe haber algunas, pero no la mayoría
  assert.ok(rechazadas < 60, `demasiadas mediciones descartadas: ${rechazadas}`);
});

test('fiebre eleva la FC respecto a estable (correlación fisiológica)', () => {
  const media = (esc: 'FEBRIL' | 'ESTABLE') => {
    let s = 0;
    for (let i = 0; i < 100; i++) s += sesion({ edad: 30, escenario: esc }, `m${esc}${i}`).objetivo.hr;
    return s / 100;
  };
  assert.ok(media('FEBRIL') - media('ESTABLE') > 6);
});

test('escenario RESPIRATORIO baja la SpO2 y CRITICO deja valores de alarma', () => {
  const r = sesion({ edad: 50, escenario: 'RESPIRATORIO' }, 'r1').res;
  assert.ok(r.spo2 <= 95);
  const c = sesion({ edad: 50, escenario: 'CRITICO' }, 'c1').objetivo;
  assert.ok(c.spo2 < 90 && c.hr > 120 && c.sbp < 95);
});

test('las primeras muestras de estabilización no son válidas', () => {
  const { objetivo } = construirObjetivo({ edad: 30 }, 'x');
  const gen = crearGeneradorMuestras(objetivo, 'x');
  assert.equal(gen('ESTABILIZACION', 1).valida, false);
  assert.equal(gen('ESTABILIZACION', 10).valida, true);
});
