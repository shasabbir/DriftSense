# DriftSense Phase 2 ESP32 Discussion

Date: 25–26 August 2026  
Project: DriftSense

> This transcript contains the user–assistant discussion. Hidden system and developer instructions are not included.

## User

In phase 2 we want to use the JSON model to give an alert using an ESP32 device with a red light and beep when drift activity is detected during a session—for example, when the user is inactive for a major portion of the time, detected by the model based on current session time and active time. Once it has beeped, if the user goes to a session domain again, the beeping will stop.

We also want to use three buttons:

- The first button will start session setup.
- The second button will set time; each click increases the time by 10 minutes.
- The third button will actually start the session.
- During time selection, the first button resets the time.
- During a session, the third button stops the session.
- After stopping, the first button means aligned, the second means drifted, and the third means not sure.

A mini display will show the time during time selection and the remaining time during the session. How can I establish this whole system? What do I need? I want a very cheap build in Bangladesh.

Mentioned model artifact: `ml/artifacts/full_session_model/full_session_model.json`

## Assistant

Yes, this is technically feasible with an ESP32, OLED, three buttons, LED, and buzzer. But two research-design changes are required before building it:

1. The supplied JSON model cannot be used for early drift alerts. It is explicitly a session-end model whose artifact says:

   - `model_scope`: `session_end_before_post_session_answer`
   - `unsupported_use`: “Do not use this artifact as a 3, 5, or 10 minute predictor.”

2. A red light and beep is an interruptive intervention, not the neutral, nonblocking reflective prompt currently specified for Phase 2. If used in the study, update the protocol, consent/ethics materials, Phase 2 condition definition, annoyance measures, and safety rules before deployment.

### Recommended system design

Let the Chrome extension remain the source of truth. The ESP32 should be a display/input/output device, not the component that decides whether somebody drifted.

```text
Browser extension
  ├─ approved task-site context
  ├─ content-free activity counts
  ├─ session timing
  ├─ frozen checkpoint model
  ├─ eligibility, threshold, and randomization
  └─ complete audit record
             │ local connection
             ▼
ESP32 device
  ├─ OLED countdown
  ├─ three buttons
  ├─ red LED
  └─ buzzer
```

The extension should compute features, run inference, enforce the prompt cap, and decide whether an intervention is delivered. The device only receives commands such as:

```json
{"type":"SESSION_RUNNING","remainingSeconds":1200}
{"type":"ALERT_ON","sessionId":"session_123"}
{"type":"ALERT_OFF","reason":"returned_to_task_site"}
{"type":"REFLECTION_REQUIRED"}
```

It sends button events back:

```json
{"type":"BUTTON","button":2,"deviceSequence":41}
```

Every event should have a timestamp and increasing sequence number so duplicates and disconnects are auditable.

### Three-button behavior

The proposed controls work best as a state machine:

| State | Button 1 | Button 2 | Button 3 |
|---|---|---|---|
| Idle | New session/setup | — | — |
| Time selection | Reset duration to 0 | Add 10 minutes | Start session |
| Running | — | — | Stop session |
| Post-session question | Aligned | Moved away/drift | Not sure |

OLED states:

- Idle: `READY`
- Selecting: `DURATION 30 MIN`
- Running: `29:59`, optionally with a small connection indicator
- Alert: `CHECK IN`—do not show “drift detected” or a probability
- Reflection: `1 ALIGNED  2 MOVED AWAY  3 NOT SURE`
- Disconnected: `BROWSER OFFLINE`

Pressing “new session” cannot completely start a valid session by itself. The extension still needs:

- an active participant-approved task site;
- a selected structured task type;
- consent and monitoring enabled;
- no other open session.

A practical workflow is to select the task type in the extension first, then use the hardware to select duration and start.

### Correct alert logic

Do not use “inactive for most of the session” as the drift definition. That would turn DriftSense into an inactivity rule and could misclassify legitimate reading, watching a tutorial, thinking, or coding without frequent input.

Instead:

1. Capture leakage-safe features at the frozen checkpoint.
2. Run the separately trained and frozen cutoff model.
3. Check Phase 2 eligibility and the daily prompt cap.
4. Randomize eligible sessions 1:1:

   - intervention: red light plus a short, neutral beep;
   - silent control: record the assignment and simulated trigger, but send nothing to the device.

5. Never display risk probability or claim that the model “knows” the participant is drifting.
6. Allow only one alert episode per session.
7. Stop the buzzer immediately when:

   - the active browser tab returns to a participant-approved task site;
   - the user stops the session;
   - a short maximum alert duration expires;
   - the device or browser loses synchronization.

A short beep pattern—perhaps two 100 ms tones—and a persistent but non-flashing red LED is preferable. Continuous beeping until the participant returns could be coercive and disruptive. If continuous sound is essential, impose a maximum such as 3–5 seconds while allowing the LED to remain on.

Returning to a task site should silence the device, but it must not be recorded as proof of alignment. Only the final explicit answer supplies the outcome label.

### Why the current JSON does not work mid-session

The model uses 17 features, including:

- click, scroll, and keyboard rates;
- idle, active, away, and video shares;
- tab-switch rate;
- log-transformed duration and cumulative activity counts.

It is not merely a comparison between active time and elapsed time. Its logistic-regression score is:

```text
z = intercept + Σ(coefficient[i] × standardized_feature[i])
probability = 1 / (1 + exp(-z))
```

For each numeric feature:

```text
value = missing ? impute_median : value
standardized = (value - mean) / scale
```

The supplied threshold is approximately `0.6129`, but that threshold is validated only for the full-session model. Applying its full-session preprocessing and threshold to partial-session data would create an unsupported distribution shift.

Train and export separate checkpoint artifacts. Then freeze one model/checkpoint policy for Phase 2. The existing checkpoint capture code already records the main raw signals, so it provides a useful foundation.

### Cheap hardware list

A simple prototype needs:

- ESP32 DevKit V1, 30-pin
- 0.96-inch SSD1306 I²C OLED, 128×64
- three momentary push buttons
- red 5 mm LED
- 220–330 Ω LED resistor
- 3.3 V-compatible active buzzer
- preferably a 2N2222/S8050 transistor and 1 kΩ base resistor for the buzzer
- breadboard and male-to-male jumper wires
- USB data cable
- USB phone charger or laptop USB power
- optional small plastic project enclosure

Listed ESP32 prices in Bangladesh varied approximately from ৳320 to ৳640 depending on the seller and version. A realistic breadboard prototype budget was estimated at approximately ৳950–1,900 excluding delivery.

### Suggested wiring

Example ESP32 DevKit V1 pin assignment:

```text
OLED VCC  -> 3V3
OLED GND  -> GND
OLED SDA  -> GPIO 21
OLED SCL  -> GPIO 22

Button 1  -> GPIO 25 and GND
Button 2  -> GPIO 26 and GND
Button 3  -> GPIO 27 and GND
            use INPUT_PULLUP

Red LED   -> GPIO 18 through 220–330 Ω resistor -> GND

GPIO 19   -> 1 kΩ -> transistor base
Transistor emitter -> GND
Transistor collector -> buzzer negative
Buzzer positive -> appropriate supply
```

Check the buzzer’s voltage and current. Do not connect a higher-current 5 V buzzer directly to an ESP32 GPIO. Add a flyback diode if it is an electromagnetic buzzer rather than a piezo device.

### Required software work

The repository is currently Phase 1-specific. Phase 2 implementation will need:

1. New Phase 2 types for intervention/control assignment, eligibility, model version, threshold, checkpoint, delivery, suppression, and failure records.
2. Leakage-safe checkpoint inference in TypeScript.
3. Python-versus-TypeScript parity tests for every frozen model fixture.
4. Randomization persisted before device delivery.
5. Daily cap and one-alert-per-session enforcement.
6. A device connection manager and message validation.
7. Hardware button handling integrated with the session manager.
8. Explicit post-session answers:

   - Button 1 → `aligned`, label `0`
   - Button 2 → `moved_away`, label `1`
   - Button 3 → `not_sure`, label `null`

9. Tests for restart/reconnection, duplicated button packets, timer expiry, silent control, device failure, pending reflections, and returning to a task site.
10. Updated schema, README, consent/protocol, and questionnaire.

Do not let the intended-duration countdown automatically determine the true session boundary. When it reaches zero, show something like `TIME REACHED — PRESS 3 TO FINISH`; the session continues until the participant actually stops it or a prespecified recovery rule applies.

The recommended implementation order is: train and validate the cutoff model, freeze the Phase 2 policy, build a breadboard device, implement the local message protocol, add audit fields and tests, and then run a small hardware/usability pilot kept separate from the main Phase 2 data.

## User

3, 5, and 10 are not needed. Go for 10, 20, 30, 60, and 90 minutes.

## Assistant

Understood. Replace the 3/5/10-minute checkpoints with:

```text
10, 20, 30, 60, and 90 minutes
```

However, the existing full-session JSON still cannot be used directly at those checkpoints. Train and export five leakage-safe checkpoint models:

```text
checkpoint_model_600s.json
checkpoint_model_1200s.json
checkpoint_model_1800s.json
checkpoint_model_3600s.json
checkpoint_model_5400s.json
```

During a session:

1. Evaluate at every checkpoint the session reaches.
2. Use only activity observed up to that checkpoint.
3. If the frozen threshold is crossed and the session is eligible:

   - intervention assignment → activate LED and beep;
   - silent-control assignment → record the trigger without activating hardware.

4. Deliver at most one alert per session.
5. Returning to a participant-approved task site stops the alert.
6. Stopping the session cancels all remaining checkpoints.
7. Sessions ending before a checkpoint are reported as not observable at that cutoff.

For example:

```ts
const CHECKPOINT_SECONDS = [
  10 * 60,
  20 * 60,
  30 * 60,
  60 * 60,
  90 * 60,
] as const
```

The device countdown and model checkpoints should remain separate. A participant might select a 30-minute intended duration, but the model can evaluate at 10 and 20 minutes. The 30-minute countdown reaching zero should not automatically end the session.

One methodological caution: 60- and especially 90-minute checkpoints will probably have substantially fewer observable sessions. Report performance and sample coverage separately at each cutoff. Before Phase 2, freeze either:

- one primary checkpoint, such as 20 minutes; or
- a sequential policy across all five checkpoints with one alert per session.

For this hardware design, the recommended sequential policy is: evaluate at 10, 20, 30, 60, and 90 minutes, stop evaluating after the first eligible trigger, and never beep more than once per session. This policy must be trained, evaluated, and frozen before Phase 2—not selected after seeing Phase 2 results.

## User

How will the ESP communicate with the extension? Don’t complicate things.

## Assistant

Use USB serial. It is the simplest option.

```text
Chrome extension ← USB cable → ESP32
```

No Wi-Fi, server, IP address, router, cloud, or Bluetooth is needed.

The extension sends short commands:

```text
DURATION:30
START
TIME:1785
ALERT_ON
ALERT_OFF
REFLECTION
COMPLETE
```

The ESP32 sends button events:

```text
BUTTON:1
BUTTON:2
BUTTON:3
```

### Simple workflow

1. Connect the ESP32 to the computer using a USB data cable.
2. Open the DriftSense extension.
3. Click **Connect device** once.
4. Chrome displays a serial-port selection dialog.
5. Select the ESP32 port.
6. Keep the extension’s small device-control page open during the session.

The open page is important because Chrome’s background extension worker cannot reliably maintain a continuous USB serial connection by itself.

### Responsibilities

The extension handles:

- session and approved task-site detection;
- activity collection;
- model inference;
- Phase 2 eligibility and randomization;
- stopping the alert when the approved task site becomes active;
- saving the complete audit record.

The ESP32 handles only:

- three buttons;
- countdown display;
- red LED;
- buzzer.

### Alert sequence

```text
Model trigger
    ↓
Extension sends ALERT_ON
    ↓
ESP32 turns on LED and briefly beeps
    ↓
User returns to an approved task site
    ↓
Extension sends ALERT_OFF
    ↓
ESP32 stops the buzzer and turns off the LED
```

### Minimal parts

- ESP32 DevKit V1
- USB data cable
- SSD1306 OLED
- three push buttons
- red LED and resistor
- active buzzer

This is the cheapest and least complicated build. Use Wi-Fi only later if the device must operate without a USB connection.

## User

Make the current full chat as a Markdown file.
