const API_URL = 'https://medisync-clinica-digital.onrender.com/api/sensores';

const generarDatosBiometricos = () => {
  // Simular pulso cardíaco
  const frecuenciaCardiaca = Math.floor(Math.random() * (130 - 55 + 1)) + 55;
  // Simular temperatura corporal (36.5 a 39.5)
  const temperatura = (Math.random() * (39.5 - 36.5) + 36.5).toFixed(1);
  // Saturación de oxígeno
  const SPO2 = Math.floor(Math.random() * (100 - 92 + 1)) + 92;

  return {
    dispositivoId: 'DISP-UCI-04',
    paciente: 'Monitoreo Automático Cama 4',
    frecuenciaCardiaca: Number(frecuenciaCardiaca),
    temperatura: Number(temperatura),
    spo2: Number(SPO2),
    timestamp: new Date().toISOString(),
  };
};

const enviarTelemetria = async () => {
  const data = generarDatosBiometricos();
  try {
    console.log('Enviando telemetría IoT:', data);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      console.log('Métrica registrada correctamente en el backend.');
    } else {
      console.warn('El servidor respondió con estado:', response.status);
    }
  } catch (error) {
    console.error('Error de conexión con el backend IoT:', error.message);
  }
};

// Enviar datos cada 5 segundos para simular tiempo real
console.log('Iniciando emulador de dispositivo IoT médico...');
setInterval(enviarTelemetria, 5000);
