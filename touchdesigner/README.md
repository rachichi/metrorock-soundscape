# TouchDesigner Setup for Metrorock Soundscape

## Architecture

```
Arduino --serial--> TouchDesigner --WebSocket--> React dashboard
                         |
                         +--> Projector (visuals)
                         +--> Audio out (chords)
```

TouchDesigner owns the Arduino serial connection and drives all outputs.
The React app at `localhost:5173` is a monitoring dashboard that receives
tap events over WebSocket.

## Step-by-step setup

### 1. Serial DAT (reads the Arduino)

1. Add a **Serial DAT** to your network
2. Set **Port**: select your Arduino's USB port (e.g. `/dev/tty.usbmodem*` on Mac, `COM3` on Windows)
3. Set **Baud Rate**: `9600`
4. Set **Row/Callback Format**: `One Per Line`

The Serial DAT will now receive `TAP:0` lines from the Arduino.

### 2. WebSocket Server DAT (sends to React app)

1. Add a **WebSocket Server DAT** to your network
2. Set **Port**: `9980`
3. Make sure **Active** is `On`

### 3. Serial Callback (Text DAT — handles taps, visuals, and audio)

A single **Text DAT** (`tap_callback`) acts as the Serial DAT's callback.
It fires on every received message and handles everything: forwarding to
WebSocket, shifting the gradient, and triggering chords.

1. Add a **Text DAT** — name it `tap_callback`
2. On `serial1`, set **Callbacks DAT** to `tap_callback`
3. Paste this into `tap_callback`:

```python
import random

PALETTES = [
    ((0.05, 0.05, 0.15), (0.2, 0.6, 0.9)),   # deep navy → sky blue
    ((0.6, 0.1, 0.2),    (1.0, 0.6, 0.3)),    # crimson → amber
    ((0.0, 0.3, 0.3),    (0.4, 0.9, 0.7)),    # teal → mint
    ((0.3, 0.1, 0.5),    (0.8, 0.4, 0.9)),    # indigo → lavender
    ((0.1, 0.1, 0.1),    (0.95, 0.95, 0.9)),  # near-black → warm white
]

CHORDS = [
    (261.63, 329.63, 392.00),  # C major
    (293.66, 369.99, 440.00),  # D minor (D F A)
    (349.23, 440.00, 523.25),  # F major
    (392.00, 493.88, 587.33),  # G major
]
chord_index = 0

def onReceive(dat, rowIndex, message, bytes):
    global chord_index
    line = message.strip()
    if not line.startswith('TAP:'):
        return

    # forward to React dashboard
    op('/project1/websocket1').sendText(line)

    # visuals: write new gradient colors into the Table DAT
    start, end = random.choice(PALETTES)
    keys = op('/project1/gradient_colors')
    keys[1, 1].val = str(start[0])
    keys[1, 2].val = str(start[1])
    keys[1, 3].val = str(start[2])
    keys[2, 1].val = str(end[0])
    keys[2, 2].val = str(end[1])
    keys[2, 3].val = str(end[2])

    # audio: cycle chord frequencies and trigger envelope
    root, third, fifth = CHORDS[chord_index % len(CHORDS)]
    chord_index += 1
    op('/project1/osc_root').par.frequency = root
    op('/project1/osc_third').par.frequency = third
    op('/project1/osc_fifth').par.frequency = fifth
    op('/project1/chord_trigger').par.value0 = 1
    run('op("/project1/chord_trigger").par.value0 = 0', delayFrames=3)
```

> **Important:** Use full paths (`/project1/...`) in all `op()` calls to
> avoid context issues. The callback function **must** be named `onReceive`
> (this is what TD 099 Serial DAT expects). The frequency parameter on
> Audio Oscillator CHOPs is `par.frequency`, not `par.freq`.

### 4. Visuals — color gradient shifts (projector output)

Each tap instantly shifts the projected gradient to a new random color
palette from `PALETTES`.

#### Operator network

```
Table DAT (gradient_colors)  ← tap_callback writes colors here
        ↑ (referenced as Keys)
  Ramp TOP (ramp1)
        |
  Window COMP (window1)  ← fullscreen on projector
```

#### Step-by-step

1. **Table DAT** (`gradient_colors`)
   - Create a Table DAT (not Text, not Info — specifically **Table**)
   - Set up with 5 columns and 2 data rows:

   | pos | r | g | b | a |
   |-----|---|---|---|---|
   | 0   | 0 | 0 | 0 | 1 |
   | 1   | 1 | 1 | 1 | 1 |

   - The `a` (alpha) column is required — without it the ramp is invisible.
   - The `tap_callback` script writes new `r/g/b` values on each tap.

   You can set this up from the Textport:
   ```python
   t = op('/project1/gradient_colors')
   t.clear()
   t.appendRow(['pos', 'r', 'g', 'b', 'a'])
   t.appendRow([0, 0, 0, 0, 1])
   t.appendRow([1, 1, 1, 1, 1])
   ```

2. **Ramp TOP** (`ramp1`)
   - **Type**: `Linear`
   - **Resolution**: match your projector (e.g. `1920 × 1080`)
   - **Keys** parameter: set to `gradient_colors`

   From the Textport:
   ```python
   op('/project1/ramp1').par.keys = 'gradient_colors'
   ```

3. **Window COMP** (`window1`)
   - Wire `ramp1` → `window1`
   - **Borders**: Off
   - **Window Index**: set to your projector monitor
   - Toggle **Open in Separate Window** to test

> **Tip:** To add smooth fading between colors, insert a per-frame
> **Execute DAT** that lerps `gradient_colors` values toward a target.
> For a sharp reactive look, the instant color change works well on its own.

---

### 5. Audio — harmonic chords on each tap

Each tap triggers a chord that swells in, sustains briefly, then fades out.
The chord progression cycles C → Dm → F → G on successive taps.

#### Operator network

```
Audio Oscillator CHOP × 3  (osc_root, osc_third, osc_fifth)
        |          |          |
        +-----+----+----------+
              |
        Merge CHOP (merge1)
              |
        Math CHOP (math1)  ← Combine Channels: Average
              |
              +──────────────────────┐
                                     |
Constant CHOP (chord_trigger) ──→ Trigger CHOP (chord_env)
                                     |
                                Math CHOP (audio_gate)  ← Combine CHOPs: Multiply
                                     |            ↑
                                     |     (also receives math1)
                                     |
                              Audio Device Out CHOP (audiodevout1)
```

#### Step-by-step

1. **Audio Oscillator CHOP × 3**
   - `osc_root`: **Frequency** `261.63` (C4), **Wave** `Sine`
   - `osc_third`: **Frequency** `329.63` (E4), **Wave** `Sine`
   - `osc_fifth`: **Frequency** `392.00` (G4), **Wave** `Sine`
   - All three: **Amplitude** `1`, **Sample Rate** `44100`

2. **Merge CHOP** (`merge1`) — wire all three oscillators in.

3. **Math CHOP** (`math1`)
   - **Combine Channels**: `Average`
   - Mixes the three tones into one channel, prevents clipping.

4. **Constant CHOP** (`chord_trigger`)
   - 1 channel, value `0`
   - The callback pulses this 0 → 1 → 0 to fire the envelope.

5. **Trigger CHOP** (`chord_env`)
   - Input: `chord_trigger`
   - **Attack Length**: `0.05` s
   - **Sustain Length**: `0.3` s
   - **Release Length**: `0.8` s

6. **Math CHOP** (`audio_gate`)
   - Two inputs: `math1` (mixed audio) and `chord_env` (envelope shape)
   - **Combine CHOPs**: `Multiply`
   - This gates the audio — silence when trigger is 0, sound when triggered.

7. **Audio Device Out CHOP** (`audiodevout1`)
   - Input: `audio_gate`
   - **Device**: your speakers / audio interface

#### Customizing the sound

| Tweak | How |
|-------|-----|
| **Warmer tone** | Change one or more oscillators to `Triangle` wave |
| **Richer / detuned** | Add a 4th oscillator slightly detuned (+2 Hz) for chorus |
| **Longer sustain** | Increase Trigger CHOP **Sustain** and **Release** |
| **Reverb** | Add an **Audio Filter CHOP** (Comb or Allpass) before device out |
| **Different progression** | Edit `CHORDS` in `tap_callback` — any `(root, third, fifth)` Hz |
| **Match visuals to chord** | Index into `PALETTES` with `chord_index` instead of `random.choice` |

## Testing without an Arduino

You can test the WebSocket bridge without hardware. In a TouchDesigner
Text DAT or Script, run:

```python
op('websocketserver1').sendText('TAP:0')
```

The React dashboard should show the tap event appear.

## Ports

| Service          | Port  |
|------------------|-------|
| React dev server | 5173  |
| WebSocket server | 9980  |
| Arduino serial   | 9600 baud |
