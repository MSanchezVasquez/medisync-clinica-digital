import axios from 'axios';

const WEBHOOK_NOCODE_URL = process.env.NOCODE_WEBHOOK_URL || '';

export const notificarAgenteNoCode = async (datosTriaje: {
  id: string;
  dni?: string | null;
  edad?: number | null;
  sintomas: string;
  urgencia: string;
  especialidad: string;
  recomendacion: string;
}) => {
  if (!WEBHOOK_NOCODE_URL) {
    console.log('[Agente No-Code] URL de webhook no configurada.');
    return;
  }

  try {
    await axios.post(WEBHOOK_NOCODE_URL, {
      evento: 'NUEVO_TRIAJE_REGISTRADO',
      timestamp: new Date().toISOString(),
      ...datosTriaje,
    });
    console.log('[Agente No-Code] Webhook disparado exitosamente con Axios.');
  } catch (error) {
    console.error('[Agente No-Code] Error al despachar webhook:', error);
  }
};
