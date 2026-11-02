import { chromium } from 'playwright';

async function ejecutarBotRPA() {
  console.log('[RPA Bot TS] Iniciando automatización en modo VISIBLE...');

  // Cambiamos a headless: false para que veas el navegador ejecutándose
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  const urlTarget = 'https://medisync-clinica-digital.vercel.app';
  console.log(`[RPA Bot TS] Accediendo a: ${urlTarget}`);

  await page.goto(urlTarget, { waitUntil: 'networkidle' });

  try {
    console.log('[RPA Bot TS] Escribiendo credenciales...');
    // Focalizar y rellenar campos asegurando el tipeo de React
    await page.locator('input[type="email"]').click();
    await page.keyboard.type('admin@medisync.pe', { delay: 50 });

    await page.locator('input[type="password"]').click();
    await page.keyboard.type('Admin@2026!', { delay: 50 });

    console.log('[RPA Bot TS] Haciendo clic en el botón de acceso...');
    await page.click('button:has-text("Iniciar Sesión")');

    console.log(
      '[RPA Bot TS] Esperando 6 segundos a que cargue el dashboard...',
    );
    await page.waitForTimeout(6000);
  } catch (e) {
    console.error(`[RPA Bot TS] Error durante la ejecución:`, e);
  }

  // Guardar la captura final del dashboard como evidencia
  const screenshotPath = 'evidencia_dashboard_rpa.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`[RPA Bot TS] Evidencia guardada en: ${screenshotPath}`);

  await browser.close();
  console.log('[RPA Bot TS] Automatización finalizada.');
}

ejecutarBotRPA().catch((err) => {
  console.error('Error crítico:', err);
});
