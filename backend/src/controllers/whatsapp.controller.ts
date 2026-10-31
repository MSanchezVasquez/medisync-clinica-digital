import { type Request, type Response } from 'express';
import { AiService } from '../ai/aiService.js';
import { prisma } from '../lib/prisma.js';

const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
const aiService = new AiService(apiKey);

export const webhookWhatsapp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  res.status(200).send('Webhook recibido');

  const body = req.body;

  if (body?.event === 'message' && !body?.payload?.fromMe) {
    const telefonoPaciente = body.payload.from;

    if (
      telefonoPaciente.includes('@g.us') ||
      telefonoPaciente.includes('@broadcast')
    ) {
      return;
    }
    const mensajeTexto = body.payload.body?.toLowerCase() || '';

    const palabrasClaveSalud = [
      'dolor',
      'fiebre',
      'síntoma',
      'sintoma',
      'urgencia',
      'triaje',
      'clínica',
      'clinica',
      'doctor',
      'emergencia',
    ];

    const esMensajeMedico = palabrasClaveSalud.some((palabra) =>
      mensajeTexto.includes(palabra),
    );

    if (esMensajeMedico) {
      try {
        console.log('Evaluando síntomas con Gemini AI...');

        const resultadoIA = await aiService.evaluar(mensajeTexto, 'few-shot');
        console.log(
          `✅ Evaluación lista -> Urgencia: ${resultadoIA.urgencia} | Especialidad: ${resultadoIA.especialidad}`,
        );

        console.log('💾 Guardando resultado en PostgreSQL...');
        const triajeGuardado = await prisma.triaje.create({
          data: {
            telefono: telefonoPaciente,
            sintomas: mensajeTexto,
            urgencia: resultadoIA.urgencia,
            especialidad: resultadoIA.especialidad,
            recomendacion: resultadoIA.recomendacion,
          },
        });
        console.log(`✅ Registro exitoso en BD. ID: ${triajeGuardado.id}`);

        const mensajeRespuesta = `🏥 *MediSync Perú - Pre-Triaje Automático*\n\nHemos analizado tus síntomas:\n\n🚨 *Nivel de Urgencia:* ${resultadoIA.urgencia}\n👨‍⚕️ *Especialidad Sugerida:* ${resultadoIA.especialidad}\n📋 *Recomendación:* ${resultadoIA.recomendacion}\n\n_Por favor, acércate a recepción con este mensaje. Ticket: ${triajeGuardado.id.split('-')[0]}_`;

        await fetch('http://127.0.0.1:3005/api/sendText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': 'MediSync_SecretKey_2026',
          },
          body: JSON.stringify({
            session: 'bot-medisync',
            chatId: telefonoPaciente,
            text: mensajeRespuesta,
          }),
        });

        console.log(
          '💬 Respuesta enviada exitosamente por WhatsApp al paciente.',
        );
      } catch (error) {
        console.error('❌ Error en el flujo de IA o WhatsApp:', error);
      }
    } else {
      console.log(
        `Mensaje ignorado (no médico): "${mensajeTexto}" de ${telefonoPaciente}`,
      );
    }
  }
};
