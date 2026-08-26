#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

const int LCD_ADDRESS = 0x27;
const int LCD_COLUMNS = 16;
const int LCD_ROWS = 2;

const int BUTTON_1_PIN = 25;
const int BUTTON_2_PIN = 26;
const int BUTTON_3_PIN = 27;
const int LED_PIN = 18;
const int BUZZER_PIN = 19;

const unsigned long DEBOUNCE_MS = 300;

LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLUMNS, LCD_ROWS);

enum DeviceMode {
  MODE_READY,
  MODE_SELECTING,
  MODE_RUNNING,
  MODE_TIME_REACHED,
  MODE_REFLECTION,
  MODE_ALERT
};

DeviceMode mode = MODE_READY;
DeviceMode modeBeforeAlert = MODE_READY;
int selectedMinutes = 0;
long remainingSeconds = 0;
bool alertOn = false;
String serialBuffer = "";
unsigned long lastButtonAt[3] = {0, 0, 0};
int lastButtonState[3] = {HIGH, HIGH, HIGH};

String formatSeconds(long seconds) {
  if (seconds < 0) seconds = 0;
  long minutes = seconds / 60;
  long secs = seconds % 60;
  char buffer[12];
  snprintf(buffer, sizeof(buffer), "%ld:%02ld", minutes, secs);
  return String(buffer);
}

void beepBriefly() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(100);
  digitalWrite(BUZZER_PIN, LOW);
  delay(80);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(100);
  digitalWrite(BUZZER_PIN, LOW);
}

void printRow(int row, String text) {
  if (text.length() > LCD_COLUMNS) text = text.substring(0, LCD_COLUMNS);
  while (text.length() < LCD_COLUMNS) text += " ";
  lcd.setCursor(0, row);
  lcd.print(text);
}

void renderDisplay() {
  lcd.clear();

  if (alertOn) {
    printRow(0, "CHECK IN");
    printRow(1, "RETURN TO TASK");
  } else if (mode == MODE_SELECTING) {
    printRow(0, "DURATION");
    printRow(1, String(selectedMinutes) + " MIN");
  } else if (mode == MODE_RUNNING) {
    printRow(0, "RUNNING");
    printRow(1, formatSeconds(remainingSeconds));
  } else if (mode == MODE_TIME_REACHED) {
    printRow(0, "TIME REACHED");
    printRow(1, "PRESS 3 FINISH");
  } else if (mode == MODE_REFLECTION) {
    printRow(0, "1 OK 2 DRIFT");
    printRow(1, "3 NOT SURE");
  } else {
    printRow(0, "DRIFTSENSE");
    printRow(1, "READY");
  }
}

void readButton(int pin, int buttonNumber) {
  int index = buttonNumber - 1;
  int currentState = digitalRead(pin);
  unsigned long now = millis();
  if (lastButtonState[index] == HIGH && currentState == LOW && now - lastButtonAt[index] >= DEBOUNCE_MS) {
    lastButtonAt[index] = now;
    Serial.print("BUTTON:");
    Serial.println(buttonNumber);
  }
  lastButtonState[index] = currentState;
}

void handleLine(String line) {
  line.trim();
  line.toUpperCase();

  if (line == "READY") {
    mode = MODE_READY;
    alertOn = false;
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
  } else if (line.startsWith("DURATION:")) {
    long parsedMinutes = line.substring(9).toInt();
    selectedMinutes = parsedMinutes < 0 ? 0 : (int)parsedMinutes;
    mode = MODE_SELECTING;
  } else if (line == "START") {
    mode = MODE_RUNNING;
    alertOn = false;
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
  } else if (line.startsWith("TIME:")) {
    remainingSeconds = max(0L, line.substring(5).toInt());
    if (!alertOn) mode = remainingSeconds == 0 ? MODE_TIME_REACHED : MODE_RUNNING;
  } else if (line == "TIME_REACHED") {
    if (!alertOn) mode = MODE_TIME_REACHED;
  } else if (line == "REFLECTION") {
    mode = MODE_REFLECTION;
    alertOn = false;
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
  } else if (line == "COMPLETE") {
    mode = MODE_READY;
    alertOn = false;
    selectedMinutes = 0;
    remainingSeconds = 0;
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
  } else if (line == "ALERT_ON") {
    modeBeforeAlert = mode;
    mode = MODE_ALERT;
    alertOn = true;
    digitalWrite(LED_PIN, HIGH);
    beepBriefly();
  } else if (line == "ALERT_OFF") {
    alertOn = false;
    mode = modeBeforeAlert;
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
  }

  renderDisplay();
}

void readSerialLines() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n') {
      handleLine(serialBuffer);
      serialBuffer = "";
    } else if (c != '\r') {
      serialBuffer += c;
      if (serialBuffer.length() > 80) serialBuffer = "";
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_1_PIN, INPUT_PULLUP);
  pinMode(BUTTON_2_PIN, INPUT_PULLUP);
  pinMode(BUTTON_3_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();

  renderDisplay();
}

void loop() {
  readSerialLines();

  readButton(BUTTON_1_PIN, 1);
  readButton(BUTTON_2_PIN, 2);
  readButton(BUTTON_3_PIN, 3);

  delay(10);
}
