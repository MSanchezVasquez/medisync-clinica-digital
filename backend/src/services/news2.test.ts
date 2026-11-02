import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularNews2, combinarUrgencia } from './news2.js';
import { validarSignos, clasificarSigno, generarAlertas } from './signosVitales.js';

test('NEWS2: adulto normal = 0 puntos, sin escalamiento', () => {
  const r = calcularNews2(
    { frecuenciaRespiratoria: 16, spo2: 98, presionSistolica: 120, frecuenciaCardiaca: 72, temperatura: 36.8 },
    35,
  );
  assert.equal(r.total, 0);
  assert.equal(r.parcial, false);
  assert.equal(r.urgenciaMinima, 'NULA');
});

test('NEWS2: caso grave suma >= 7 => ALTA', () => {
  // FR 28 (3) + SpO2 88 (3) + PAS 85 (3) + FC 135 (3) + T 39.5 (2) = 14
  const r = calcularNews2(
    { frecuenciaRespiratoria: 28, spo2: 88, presionSistolica: 85, frecuenciaCardiaca: 135, temperatura: 39.5 },
    50,
  );
  assert.equal(r.total, 14);
  assert.equal(r.riesgo, 'ALTO');
  assert.equal(r.urgenciaMinima, 'ALTA');
});

test('NEWS2: un parámetro con 3 puntos => MEDIA (respuesta urgente)', () => {
  const r = calcularNews2({ spo2: 90 }, 40);
  assert.equal(r.total, 3);
  assert.equal(r.riesgo, 'BAJO_MEDIO');
  assert.equal(r.urgenciaMinima, 'MEDIA');
  assert.equal(r.parcial, true); // faltan FR, PAS, FC, T
});

test('NEWS2: puntos de borde (temperatura, FC, SpO2)', () => {
  const t = (v: number) => calcularNews2({ temperatura: v }, 30).total;
  assert.equal(t(38.0), 0);
  assert.equal(t(38.1), 1);
  assert.equal(t(39.0), 1);
  assert.equal(t(39.1), 2);
  assert.equal(t(36.0), 1);
  assert.equal(t(35.0), 3);
  assert.equal(calcularNews2({ frecuenciaCardiaca: 91 }, 30).total, 1);
  assert.equal(calcularNews2({ frecuenciaCardiaca: 111 }, 30).total, 2);
  assert.equal(calcularNews2({ spo2: 96 }, 30).total, 0);
  assert.equal(calcularNews2({ spo2: 95 }, 30).total, 1);
});

test('NEWS2: no aplica a menores de 16', () => {
  const r = calcularNews2({ frecuenciaCardiaca: 140, spo2: 85 }, 8);
  assert.equal(r.aplica, false);
  assert.equal(r.urgenciaMinima, 'NULA');
});

test('combinarUrgencia solo escala, nunca baja', () => {
  assert.deepEqual(combinarUrgencia('BAJA', 'ALTA'), { urgencia: 'ALTA', escalada: true });
  assert.deepEqual(combinarUrgencia('ALTA', 'NULA'), { urgencia: 'ALTA', escalada: false });
  assert.deepEqual(combinarUrgencia('NULA', 'MEDIA'), { urgencia: 'MEDIA', escalada: true });
});

test('validarSignos rechaza valores imposibles y PAD >= PAS', () => {
  const malo = validarSignos({ spo2: 140, temperatura: 36.6 });
  assert.equal(malo.ok, false);
  const incoherente = validarSignos({ presionSistolica: 110, presionDiastolica: 120 });
  assert.equal(incoherente.ok, false);
  const bueno = validarSignos({ frecuenciaCardiaca: '72', temperatura: 36.64, spo2: 97.4 });
  assert.equal(bueno.ok, true);
  if (bueno.ok) {
    assert.equal(bueno.signos.frecuenciaCardiaca, 72);
    assert.equal(bueno.signos.temperatura, 36.6);
    assert.equal(bueno.signos.spo2, 97);
  }
});

test('clasificarSigno y alertas', () => {
  assert.equal(clasificarSigno('spo2', 98, 30), 'NORMAL');
  assert.equal(clasificarSigno('spo2', 93, 30), 'BAJO');
  assert.equal(clasificarSigno('spo2', 88, 30), 'CRITICO');
  assert.equal(clasificarSigno('frecuenciaCardiaca', 130, 8), 'ALTO'); // niño: no usa críticos de adulto
  const a = generarAlertas({ spo2: 88, temperatura: 38.4 }, 30);
  assert.equal(a.length, 2);
  assert.equal(a.find((x) => x.codigo.startsWith('SPO2'))?.severidad, 'CRITICA');
});
