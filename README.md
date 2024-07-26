# workout timer

interval timer for tabata, hiit, emom, plus a custom panel for your own work/rest/rounds.

three preset buttons, a big SVG ring that swaps colour between work and rest, a "next" line so you know what is coming, and a beep on every transition through the Web Audio API (no audio file shipped).

## presets

- tabata: 20s work, 10s rest, 8 rounds
- classic hiit: 30/30, 10 rounds
- emom: 60s work, no rest, 10 rounds

your last custom set is stored in localStorage so it sticks around between sessions.

## running it

```
git clone https://github.com/secanakbulut/workout-timer.git
cd workout-timer
open index.html
```

released under PolyForm Noncommercial 1.0.0, see LICENSE.
