const int PIEZO_PIN = A0;
const int THRESHOLD = 150;
const int COOLDOWN = 500;

unsigned long lastTrigger = 0;

void setup() {
  Serial.begin(9600);
}

void loop() {
  int val = analogRead(PIEZO_PIN);
  unsigned long now = millis();

  if (val > THRESHOLD && (now - lastTrigger) > COOLDOWN) {
    lastTrigger = now;
    Serial.println("TAP:0");
  }
}
