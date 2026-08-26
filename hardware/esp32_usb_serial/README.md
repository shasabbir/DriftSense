# DriftSense ESP32 USB serial device

This sketch turns an ESP32 into a simple DriftSense input/output device.

The Chrome extension remains the source of truth for task sites, sessions,
model logic, randomization, labels, and exports. The ESP32 only handles:

- three buttons;
- a 16x2 I2C character LCD;
- one red LED;
- one active buzzer.

## Line protocol

ESP32 to extension:

```text
BUTTON:1
BUTTON:2
BUTTON:3
```

Extension to ESP32:

```text
READY
DURATION:30
START
TIME:1785
TIME_REACHED
REFLECTION
COMPLETE
ALERT_ON
ALERT_OFF
```

## Suggested wiring

```text
LCD VCC   -> 5V or 3V3
LCD GND   -> GND
LCD SDA   -> GPIO 21
LCD SCL   -> GPIO 22

Button 1  -> GPIO 25 and GND
Button 2  -> GPIO 26 and GND
Button 3  -> GPIO 27 and GND
            use INPUT_PULLUP

Red LED   -> GPIO 18 through 220-330 ohm resistor -> GND

GPIO 19   -> active buzzer signal
Buzzer -  -> GND
```

Use a transistor driver if the buzzer draws more current than an ESP32 GPIO can
safely provide.

Most 16x2 I2C LCD backpack modules use address `0x27`. Some use `0x3F`.
If the display lights up but shows no text, adjust this line in
`esp32_usb_serial.ino`:

```cpp
const int LCD_ADDRESS = 0x27;
```

## Arduino libraries

Install these in Arduino IDE:

- LiquidCrystal I2C

Select an ESP32 board, upload `esp32_usb_serial.ino`, then open the DriftSense
extension's ESP32 device page and click `Connect ESP32`.
