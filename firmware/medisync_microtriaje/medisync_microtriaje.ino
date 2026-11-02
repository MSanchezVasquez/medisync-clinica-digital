/*
 * MediSync · MicroTriaje MT-100 (prototipo ESP32)
 * Mismo contrato HTTP que iot-device/simulador.ts  ->  el backend NO sabe si habla con el simulador o con esto.
 *
 * ⚠️ ESTADO: código escrito pero NO probado en hardware real (no se dispuso de placa ni sensores al redactarlo).
 *    Hay que probar cada sensor por separado (ver CrearHardware.md, Fase 1-2) y ajustar.
 *    Prototipo académico: NO es un dispositivo médico ni debe usarse para decidir tratamientos.
 *
 * Librerías (Gestor de bibliotecas de Arduino IDE):
 *   - "SparkFun MAX3010x Pulse and Proximity Sensor Library"  (incluye MAX30105.h y spo2_algorithm.h)
 *   - "Adafruit MLX90614 Library"
 *   - "ArduinoJson" (v7)
 *   - "Adafruit SSD1306" + "Adafruit GFX Library"  (pantalla OLED, opcional)
 * Placa: "ESP32 Dev Module"
 *
 * Conexiones (bus I2C compartido): SDA=GPIO21, SCL=GPIO22, 3V3, GND
 *   MAX30102 (0x57) · MLX90614 (0x5A) · OLED SSD1306 (0x3C)
 *   Buzzer pasivo/activo -> GPIO25 · LED verde -> GPIO26 (220Ω) · LED rojo -> GPIO27 (220Ω)
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"
#include <Adafruit_MLX90614.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ======================= CONFIGURACIÓN (editar) =======================
const char* WIFI_SSID   = "TU_WIFI";
const char* WIFI_PASS   = "TU_CLAVE";
// IP de la PC donde corre el backend (NO uses localhost). Ej.: http://192.168.1.50:3000/api
const char* API_URL     = "http://192.168.1.50:3000/api";
const char* DEVICE_CODE = "MT-100-002";                 // el que creaste en la pantalla Microtriajes
const char* DEVICE_KEY  = "PEGA-AQUI-LA-CLAVE-QUE-TE-MOSTRO-EL-SISTEMA";
const char* FIRMWARE    = "esp32-0.1.0";
const float TEMP_OFFSET_C = 0.0;   // calibrar contra un termómetro de referencia (ver guía)
// ======================================================================

const int PIN_BUZZER = 25, PIN_LED_OK = 26, PIN_LED_ERR = 27;
const int DEDO_MIN_IR = 50000;           // por debajo = no hay dedo
const int CALIDAD_MINIMA = 60;
const unsigned long HEARTBEAT_MS = 10000, POLL_MS = 2000;

MAX30105 sensor;
Adafruit_MLX90614 mlx;
Adafruit_SSD1306 oled(128, 64, &Wire, -1);
bool hayOled = false;

String estadoLocal = "LIBRE";
unsigned long tHeartbeat = 0, tPoll = 0;

// Buffers del algoritmo de Maxim: 100 muestras a 25 sps = ventana de 4 s
#define VENT 100
uint32_t bufIR[VENT], bufRED[VENT];

/* ---------------- Utilidades ---------------- */
void pantalla(const String& l1, const String& l2 = "", const String& l3 = "") {
  Serial.println(l1 + " | " + l2 + " | " + l3);
  if (!hayOled) return;
  oled.clearDisplay(); oled.setTextColor(SSD1306_WHITE);
  oled.setTextSize(1); oled.setCursor(0, 0);  oled.println(l1);
  oled.setTextSize(2); oled.setCursor(0, 18); oled.println(l2);
  oled.setTextSize(1); oled.setCursor(0, 50); oled.println(l3);
  oled.display();
}
void pitido(int ms) { digitalWrite(PIN_BUZZER, HIGH); delay(ms); digitalWrite(PIN_BUZZER, LOW); }

void conectarWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  pantalla("Conectando WiFi", WIFI_SSID);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  pantalla("WiFi OK", WiFi.localIP().toString());
}

// POST/GET JSON con cabeceras de dispositivo. Devuelve true si HTTP 2xx y llena 'resp'.
bool http(const char* metodo, const String& ruta, const JsonDocument* cuerpo, JsonDocument& resp) {
  if (WiFi.status() != WL_CONNECTED) { WiFi.reconnect(); return false; }
  HTTPClient h;
  h.begin(String(API_URL) + ruta);
  h.setTimeout(5000);
  h.addHeader("Content-Type", "application/json");
  h.addHeader("X-Device-Code", DEVICE_CODE);
  h.addHeader("X-Device-Key", DEVICE_KEY);
  int code;
  if (String(metodo) == "GET") code = h.GET();
  else {
    String body; if (cuerpo) serializeJson(*cuerpo, body);
    code = h.POST(body);
  }
  bool ok = code >= 200 && code < 300;
  if (ok) deserializeJson(resp, h.getString());
  else Serial.printf("HTTP %d en %s %s\n", code, metodo, ruta.c_str());
  h.end();
  return ok;
}
bool httpSimple(const char* m, const String& ruta, const JsonDocument* c = nullptr) {
  JsonDocument r; return http(m, ruta, c, r);
}

/* ---------------- Protocolo ---------------- */
void hello() {
  JsonDocument d;
  d["firmware"] = FIRMWARE;
  JsonArray s = d["sensores"].to<JsonArray>(); s.add("FC"); s.add("SPO2"); s.add("TEMP");
  d["bateria"] = 100;                       // si usas LiPo: leer con divisor resistivo en un pin ADC
  d["rssi"] = WiFi.RSSI();
  while (!httpSimple("POST", "/dispositivos/hello", &d)) { pantalla("Sin backend", "reintento"); delay(3000); }
  pantalla("Vinculado", DEVICE_CODE, "Listo");
}

void heartbeat() {
  JsonDocument d;
  d["bateria"] = 100; d["rssi"] = WiFi.RSSI(); d["estadoLocal"] = estadoLocal;
  httpSimple("POST", "/dispositivos/heartbeat", &d);
}

void enviarProgreso(const String& sesionId, const char* fase, int progreso, int tSeg, int hr, int spo2, bool conMuestra, bool& cancelar) {
  JsonDocument d, r;
  d["fase"] = fase; d["progreso"] = progreso; d["tiempoSeg"] = tSeg;
  if (conMuestra) { JsonObject m = d["muestra"].to<JsonObject>(); m["t"] = tSeg; m["hr"] = hr; m["spo2"] = spo2; m["valida"] = true; }
  if (http("POST", "/dispositivos/sesiones/" + sesionId + "/progreso", &d, r)) cancelar = r["cancelar"] | false;
}

void enviarError(const String& sesionId, const char* codigo, const String& msg, int calidad = 0) {
  JsonDocument d; d["codigo"] = codigo; d["mensaje"] = msg; d["calidad"] = calidad;
  httpSimple("POST", "/dispositivos/sesiones/" + sesionId + "/error", &d);
  estadoLocal = "ERROR"; digitalWrite(PIN_LED_ERR, HIGH); pitido(400); delay(1500); digitalWrite(PIN_LED_ERR, LOW);
  estadoLocal = "LIBRE";
}

bool dedoPuesto() { return sensor.getIR() > DEDO_MIN_IR; }

int mediana(int* a, int n) {
  for (int i = 1; i < n; i++) { int k = a[i], j = i - 1; while (j >= 0 && a[j] > k) { a[j + 1] = a[j]; j--; } a[j + 1] = k; }
  return n ? a[n / 2] : 0;
}

/* ---------------- Medición ---------------- */
void medir(const String& sesionId, int timeoutSeg) {
  estadoLocal = "MIDIENDO";
  bool cancelar = false;
  const int T_ESTAB = 10, T_MED = 30, T_TEMP = 5, TOTAL = T_ESTAB + T_MED + T_TEMP + 2;
  int hrs[T_MED], spos[T_MED], nValidas = 0;

  // 1) COLOCACIÓN: esperar al dedo
  pantalla("Coloque el dedo", "en el sensor");
  unsigned long ini = millis();
  while (!dedoPuesto()) {
    if (millis() - ini > (unsigned long)timeoutSeg * 1000UL) { enviarError(sesionId, "SIN_PACIENTE", "No se detectó dedo a tiempo."); return; }
    if ((millis() - ini) % 2000 < 60) enviarProgreso(sesionId, "COLOCACION", 0, 0, 0, 0, false, cancelar);
    if (cancelar) { estadoLocal = "LIBRE"; return; }
    delay(50);
  }
  pitido(80);

  // Llenar la primera ventana de 100 muestras (4 s)
  for (int i = 0; i < VENT; i++) {
    while (!sensor.available()) sensor.check();
    bufRED[i] = sensor.getRed(); bufIR[i] = sensor.getIR(); sensor.nextSample();
  }

  // 2) ESTABILIZACIÓN + 3) MEDICIÓN: una iteración por segundo (25 muestras nuevas)
  int32_t spo2, hr; int8_t okSpo2, okHr;
  for (int seg = 1; seg <= T_ESTAB + T_MED; seg++) {
    for (int i = 25; i < VENT; i++) { bufRED[i - 25] = bufRED[i]; bufIR[i - 25] = bufIR[i]; }
    for (int i = VENT - 25; i < VENT; i++) {
      while (!sensor.available()) sensor.check();
      bufRED[i] = sensor.getRed(); bufIR[i] = sensor.getIR(); sensor.nextSample();
    }
    maxim_heart_rate_and_oxygen_saturation(bufIR, VENT, bufRED, &spo2, &okSpo2, &hr, &okHr);

    bool estab = seg <= T_ESTAB;
    bool valida = okSpo2 && okHr && dedoPuesto() && hr > 30 && hr < 220 && spo2 > 70 && spo2 <= 100;
    if (!estab && valida) { hrs[nValidas] = hr; spos[nValidas] = spo2; nValidas++; }

    pantalla(estab ? "Estabilizando..." : "Midiendo...", valida ? String(hr) + " lpm" : "-- lpm", "SpO2 " + (valida ? String(spo2) + "%" : String("--")));
    int prog = (seg * 100) / TOTAL;
    enviarProgreso(sesionId, estab ? "ESTABILIZACION" : "MEDICION", prog, seg, hr, spo2, valida && !estab, cancelar);
    if (cancelar) { estadoLocal = "LIBRE"; pantalla("Cancelado"); return; }
    if (!dedoPuesto() && seg > T_ESTAB) { /* dedo retirado: se sigue, pero bajará la calidad */ }
  }

  // 4) TEMPERATURA (3 lecturas IR, promedio)
  pantalla("Acerque sensor", "a la frente", "3 a 5 cm");
  float suma = 0;
  for (int i = 0; i < 3; i++) { delay(1500); suma += mlx.readObjectTempC(); }
  float temp = round(((suma / 3.0) + TEMP_OFFSET_C) * 10.0) / 10.0;
  enviarProgreso(sesionId, "TEMPERATURA", 95, T_ESTAB + T_MED + T_TEMP, 0, 0, false, cancelar);

  // 5) VALIDACIÓN
  int calidad = (nValidas * 100) / T_MED;
  if (calidad < CALIDAD_MINIMA || nValidas < 8) {
    enviarError(sesionId, "SENAL_DEBIL", "Calidad de señal " + String(calidad) + "%. Reposicione y repita.", calidad);
    pantalla("Repetir medicion", "senal debil");
    return;
  }
  int hrFinal = mediana(hrs, nValidas), spoFinal = mediana(spos, nValidas);

  JsonDocument d;
  d["frecuenciaCardiaca"] = hrFinal; d["spo2"] = spoFinal; d["temperatura"] = temp;
  d["calidad"] = calidad; d["duracionSeg"] = (int)((millis() - ini) / 1000);
  httpSimple("POST", "/dispositivos/sesiones/" + sesionId + "/resultado", &d);

  estadoLocal = "COMPLETADO";
  digitalWrite(PIN_LED_OK, HIGH); pitido(200);
  pantalla("Listo", String(hrFinal) + " lpm", "SpO2 " + String(spoFinal) + "%  " + String(temp, 1) + "C");
  delay(3000); digitalWrite(PIN_LED_OK, LOW);
}

/* ---------------- Arduino ---------------- */
void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUZZER, OUTPUT); pinMode(PIN_LED_OK, OUTPUT); pinMode(PIN_LED_ERR, OUTPUT);
  Wire.begin(21, 22);
  hayOled = oled.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  if (!sensor.begin(Wire, I2C_SPEED_FAST)) { pantalla("ERROR", "MAX30102"); while (1) delay(1000); }
  // brillo 60, promedio 4, modo rojo+IR, 100 sps (=> 25 sps efectivos), ancho 411, rango 4096
  sensor.setup(60, 4, 2, 100, 411, 4096);
  if (!mlx.begin()) { pantalla("ERROR", "MLX90614"); while (1) delay(1000); }

  conectarWifi();
  hello();
}

void loop() {
  unsigned long ahora = millis();
  if (ahora - tHeartbeat > HEARTBEAT_MS) { tHeartbeat = ahora; heartbeat(); }
  if (estadoLocal == "LIBRE" && ahora - tPoll > POLL_MS) {
    tPoll = ahora;
    JsonDocument r;
    if (http("GET", "/dispositivos/comando", nullptr, r) && String((const char*)(r["accion"] | "NINGUNA")) == "INICIAR_MEDICION") {
      String sesionId = r["sesionId"].as<String>();
      int timeout = r["timeoutSeg"] | 180;
      medir(sesionId, timeout);
      estadoLocal = "LIBRE";
      pantalla("Listo", "MediSync", DEVICE_CODE);
    }
  }
  delay(20);
}
