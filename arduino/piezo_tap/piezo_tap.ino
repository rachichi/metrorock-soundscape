const int MUX_SIG = A0;
const int MUX_S0  = 2;
const int MUX_S1  = 3;
const int MUX_S2  = 4;
const int MUX_S3  = 5;

const int DIRECT_PINS[] = { A1, A2, A3, A4 };
const int NUM_MUX    = 16;
const int NUM_DIRECT = 4;
const int NUM_SENSORS = NUM_MUX + NUM_DIRECT;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  pinMode(MUX_S0, OUTPUT);
  pinMode(MUX_S1, OUTPUT);
  pinMode(MUX_S2, OUTPUT);
  pinMode(MUX_S3, OUTPUT);
}

void setMuxChannel(int ch) {
  digitalWrite(MUX_S0, (ch >> 0) & 1);
  digitalWrite(MUX_S1, (ch >> 1) & 1);
  digitalWrite(MUX_S2, (ch >> 2) & 1);
  digitalWrite(MUX_S3, (ch >> 3) & 1);
  delayMicroseconds(10);
}

void loop() {
  Serial.print("S:");

  for (int i = 0; i < NUM_MUX; i++) {
    setMuxChannel(i);
    int val = analogRead(MUX_SIG);
    Serial.print(val);
    Serial.print(',');
  }

  for (int i = 0; i < NUM_DIRECT; i++) {
    int val = analogRead(DIRECT_PINS[i]);
    Serial.print(val);
    if (i < NUM_DIRECT - 1) Serial.print(',');
  }

  Serial.println();
}
