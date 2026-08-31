import { jsPDF } from 'jspdf';

export type DatosInformeTriaje = {
  nombreCompleto: string; dni: string; edad: number; peso: number; altura: number;
  sintomas: string; urgencia: 'ALTA' | 'MEDIA' | 'BAJA' | 'NULA';
  especialidad: string; recomendacion: string; creadoEn: string;
};

export const descargarInformeTriaje = (t: DatosInformeTriaje) => {
  const pdf = new jsPDF();
  pdf.setFillColor(15, 118, 110); pdf.rect(0, 0, 210, 36, 'F');
  pdf.setTextColor(255, 255, 255); pdf.setFontSize(20); pdf.text('MediSync Peru', 16, 16);
  pdf.setFontSize(11); pdf.text('Informe de pre-triaje automatizado', 16, 26);
  pdf.setTextColor(30, 41, 59); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13);
  pdf.text('Datos del paciente', 16, 50); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10.5);
  pdf.text(`Nombre: ${t.nombreCompleto}`, 16, 60); pdf.text(`DNI: ${t.dni || 'Sin registrar'}`, 16, 68);
  pdf.text(`Edad: ${t.edad} anos`, 16, 76); pdf.text(`Fecha: ${new Date(t.creadoEn).toLocaleString('es-PE')}`, 105, 60);
  pdf.text(`Peso: ${t.peso} kg`, 105, 68); pdf.text(`Altura: ${t.altura} cm`, 105, 76);
  const seccion = (titulo: string, contenido: string, y: number) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.text(titulo, 16, y);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10.5);
    const lineas = pdf.splitTextToSize(contenido, 178) as string[]; pdf.text(lineas, 16, y + 8);
    return y + 8 + lineas.length * 5.5 + 8;
  };
  let y = seccion('Sintomas reportados', t.sintomas, 92);
  y = seccion('Resultado del triaje', `Urgencia: ${t.urgencia}\nEspecialidad sugerida: ${t.especialidad}`, y);
  seccion('Recomendacion', t.recomendacion, y);
  pdf.setDrawColor(203, 213, 225); pdf.line(16, 275, 194, 275); pdf.setFontSize(8.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Este informe es orientativo y no sustituye una evaluacion medica profesional.', 16, 282);
  pdf.save(`triaje-${t.dni || 'sin-dni'}-${t.creadoEn.slice(0, 10)}.pdf`);
};
