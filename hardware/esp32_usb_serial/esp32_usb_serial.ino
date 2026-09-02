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
const unsigned long ALERT_REPEAT_MS = 10000;
const unsigned long BUZZER_ON_MS = 100;
const unsigned long BUZZER_GAP_MS = 80;
const unsigned long HOST_COMMAND_TIMEOUT_MS = 15000;

LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLUMNS, LCD_ROWS);

enum DeviceMode {
  MODE_READY,
  MODE_SELECTING,
  MODE_RUNNING,
  MODE_TIME_REACHED,
  MODE_REFLECTION,
  MODE_ALERT
};

enum BeepPhase {
  BEEP_IDLE,
  BEEP_FIRST_ON,
  BEEP_GAP,
  BEEP_SECOND_ON
};

DeviceMode mode = MODE_READY;
DeviceMode modeBeforeAlert = MODE_READY;
int selectedMinutes = 0;
long remainingSeconds = 0;
bool alertOn = false;
BeepPhase beepPhase = BEEP_IDLE;
String serialBuffer = "";
unsigned long lastButtonAt[3] = {0, 0, 0};
int lastButtonState[3] = {HIGH, HIGH, HIGH};
unsigned long beepPhaseStartedAt = 0;
unsigned long lastBeepStartedAt = 0;
unsigned long lastHostCommandAt = 0;

String formatSeconds(long seconds) {
  if (seconds < 0) seconds = 0;
  long minutes = seconds / 60;
  long secs = seconds % 60;
  char buffer[12];
  snprintf(buffer, sizeof(buffer), "%ld:%02ld", minutes, secs);
  return String(buffer);
}

void stopBuzzer() {
  digitalWrite(BUZZER_PIN, LOW);
  beepPhase = BEEP_IDLE;
}

void startBeepPattern(unsigned long now) {
  digitalWrite(BUZZER_PIN, HIGH);
  beepPhase = BEEP_FIRST_ON;
  beepPhaseStartedAt = now;
  lastBeepStartedAt = now;
}

void updateAlertBuzzer() {
  if (!alertOn) {
    stopBuzzer();
    return;
  }

  unsigned long now = millis();
  if (beepPhase == BEEP_IDLE && now - lastBeepStartedAt >= ALERT_REPEAT_MS) {
    startBeepPattern(now);
  } else if (beepPhase == BEEP_FIRST_ON && now - beepPhaseStartedAt >= BUZZER_ON_MS) {
    digitalWrite(BUZZER_PIN, LOW);
    beepPhase = BEEP_GAP;
    beepPhaseStartedAt = now;
  } else if (beepPhase == BEEP_GAP && now - beepPhaseStartedAt >= BUZZER_GAP_MS) {
    digitalWrite(BUZZER_PIN, HIGH);
    beepPhase = BEEP_SECOND_ON;
    beepPhaseStartedAt = now;
  } else if (beepPhase == BEEP_SECOND_ON && now - beepPhaseStartedAt >= BUZZER_ON_MS) {
    stopBuzzer();
  }
}

void silenceAlert() {
  alertOn = false;
  digitalWrite(LED_PIN, LOW);
  stopBuzzer();
}

void stopAlertAndRestoreMode() {
  if (alertOn) mode = modeBeforeAlert;
  silenceAlert();
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
    if (buttonNumber == 3 && alertOn) {
      stopAlertAndRestoreMode();
      renderDisplay();
    }
    Serial.print("BUTTON:");
    Serial.println(buttonNumber);
  }
  lastButtonState[index] = currentState;
}

void handleLine(String line) {
  line.trim();
  line.toUpperCase();
  if (line.length() == 0) return;
  lastHostCommandAt = millis();

  if (line == "PING") return;

  if (line == "READY") {
    mode = MODE_READY;
    silenceAlert();
  } else if (line.startsWith("DURATION:")) {
    long parsedMinutes = line.substring(9).toInt();
    selectedMinutes = parsedMinutes < 0 ? 0 : (int)parsedMinutes;
    mode = MODE_SELECTING;
    silenceAlert();
  } else if (line == "START") {
    mode = MODE_RUNNING;
    silenceAlert();
  } else if (line.startsWith("TIME:")) {
    remainingSeconds = max(0L, line.substring(5).toInt());
    DeviceMode timerMode = remainingSeconds == 0 ? MODE_TIME_REACHED : MODE_RUNNING;
    if (alertOn) modeBeforeAlert = timerMode;
    else mode = timerMode;
  } else if (line == "TIME_REACHED") {
    if (alertOn) modeBeforeAlert = MODE_TIME_REACHED;
    else mode = MODE_TIME_REACHED;
  } else if (line == "REFLECTION") {
    mode = MODE_REFLECTION;
    silenceAlert();
  } else if (line == "COMPLETE") {
    mode = MODE_READY;
    selectedMinutes = 0;
    remainingSeconds = 0;
    silenceAlert();
  } else if (line == "ALERT_ON") {
    if (alertOn) return;
    modeBeforeAlert = mode;
    mode = MODE_ALERT;
    alertOn = true;
    digitalWrite(LED_PIN, HIGH);
    startBeepPattern(millis());
  } else if (line == "ALERT_OFF") {
    if (!alertOn) return;
    stopAlertAndRestoreMode();
  }

  renderDisplay();
}

void enforceHostCommandTimeout() {
  if (alertOn && millis() - lastHostCommandAt >= HOST_COMMAND_TIMEOUT_MS) {
    stopAlertAndRestoreMode();
    renderDisplay();
  }
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

  enforceHostCommandTimeout();
  updateAlertBuzzer();

  delay(10);
}
