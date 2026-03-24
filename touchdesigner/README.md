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

### 3. CHOP Execute DAT (bridge between serial and WebSocket)

Every time the Serial DAT receives a line, we forward it to
the WebSocket server. Add a **DAT Execute** DAT and set:

- **DATs**: point to your Serial DAT
- **Row Change**: `On`

Then paste this into the DAT Execute callback:

```python
def onRowChange(dat, rows, prev):
    ws = op('websocketserver1')
    for r in rows:
        line = dat[r, 0].val.strip()
        if line.startswith('TAP:'):
            ws.sendText(line)
```

This forwards every `TAP:X` message to all connected WebSocket clients
(your React dashboard).

### 4. Visuals (projector output)

Use the Serial DAT callbacks or a CHOP network to trigger visual changes:

- **Ramp TOP** or **Noise TOP** with color driven by a **Timer CHOP** that resets on each tap
- Route the TOP output to a **Window COMP** on your projector display
- Example: on each tap, randomize the RGB values of a **Constant CHOP** that feeds into a **Ramp TOP**'s color parameter

### 5. Audio (harmonic chords)

- Use an **Audio Oscillator CHOP** with multiple oscillators for chord tones
- Gate them with an **Envelope CHOP** triggered by the Serial DAT tap
- Route through **Audio Device Out CHOP** to your speakers
- Example chord: oscillators at 261.6 Hz (C4), 329.6 Hz (E4), 392.0 Hz (G4)

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
