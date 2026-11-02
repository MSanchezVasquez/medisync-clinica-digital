import nodemailer from 'nodemailer';

const smtpConfigurado = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);

export const enviarReporteMicrotriaje = async (destinatario: string, archivoPdf: Buffer, nombreArchivo: string) => {
  if (!smtpConfigurado()) throw new Error('CORREO_NO_CONFIGURADO');
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: destinatario,
      subject: 'MediSync | Informe de mediciones MicroTriaje',
      text: 'Se adjunta el informe de mediciones de signos vitales del MicroTriaje seleccionado. El archivo contiene únicamente datos de medición y del equipo.',
      attachments: [{ filename: nombreArchivo, content: archivoPdf, contentType: 'application/pdf' }],
    });
  } finally {
    transport.close();
  }
};
