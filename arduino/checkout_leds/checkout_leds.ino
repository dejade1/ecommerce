// Control de Motor Paso a Paso NEMA17 para Banda Transportadora
// Driver: A4988 o DRV8825
// Configuración: 200 pasos/revolución (1.8° por paso)
// 2 vueltas completas = 400 pasos en modo full-step

// Pines del motor para Arduino UNO
const int STEP_PIN = 3;      // Pin STEP del driver
const int DIR_PIN = 4;       // Pin DIR del driver
const int ENABLE_PIN = 5;    // Pin ENABLE del driver (LOW = habilitado)

// Configuración del motor
const int STEPS_PER_REV = 200;           // Pasos por revolución NEMA17
const int MICROSTEPS = 1;                // Microstepping (1 = full-step)
const int TOTAL_STEPS = STEPS_PER_REV * 2 * MICROSTEPS;  // 2 vueltas = 400 pasos
const int STEP_DELAY = 2500;             // Microsegundos entre pulsos (total 2000ms)

void setup() {
  Serial.begin(9600);

  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(ENABLE_PIN, OUTPUT);

  digitalWrite(ENABLE_PIN, HIGH);  // Motor deshabilitado al inicio
  digitalWrite(DIR_PIN, LOW);
  digitalWrite(STEP_PIN, LOW);

  Serial.println("Sistema listo - Motor NEMA17");
}

void loop() {
  if (Serial.available() > 0) {
    String data = Serial.readStringUntil('\n');
    data.trim();

    if (data == "ping") {
      Serial.println("pong");
      return;
    }

    int commaIndex = data.indexOf(',');
    if (commaIndex != -1) {
      String productIdStr = data.substring(0, commaIndex);
      String quantityStr = data.substring(commaIndex + 1);

      int productId = productIdStr.toInt();
      int quantity = quantityStr.toInt();

      Serial.print("Recibido - Producto: ");
      Serial.print(productId);
      Serial.print(", Cantidad: ");
      Serial.println(quantity);

      if ((productId == 1 || productId == 2) && quantity > 0) {
        Serial.print("Dispensando producto ");
        Serial.print(productId);
        Serial.print(" - Cantidad: ");
        Serial.println(quantity);

        for (int i = 0; i < quantity; i++) {
          dispenseProduct();

          if (i < quantity - 1) {
            delay(500);
          }
        }

        Serial.println("OK - Dispensacion completada");
      }
    }
  }
}

void dispenseProduct() {
  // Habilitar motor
  digitalWrite(ENABLE_PIN, LOW);
  delay(100);

  // Dirección horaria
  digitalWrite(DIR_PIN, HIGH);

  // 2 vueltas completas (400 pasos)
  for (int step = 0; step < TOTAL_STEPS; step++) {
    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(STEP_DELAY);
    digitalWrite(STEP_PIN, LOW);
    delayMicroseconds(STEP_DELAY);
  }

  // Deshabilitar motor
  digitalWrite(ENABLE_PIN, HIGH);
  delay(100);
}
