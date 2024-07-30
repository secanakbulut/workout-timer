# workout timer

interval timer for the classic stuff: tabata, hiit, emom. picked it up after using a borrowed gym timer that did the job and not much else, and i wanted one that lived in a browser tab so i could glance at it from the couch.

three preset buttons, a custom panel for your own work/rest/rounds, a big countdown ring that swaps colour between work and rest, a tiny "next" line so you know what is coming, and a beep on every transition.

## the presets

- tabata: 20s work, 10s rest, 8 rounds
- classic hiit: 30/30, 10 rounds
- emom: 60s work, no rest, 10 rounds

custom takes work seconds, rest seconds, and a round count. your last custom set is stored in localStorage so it sticks around between sessions.

## the ring

it is one SVG circle, `r=108`, so the circumference is `2 * pi * 108`, about 678.58. progress is drawn by sliding `stroke-dashoffset` from 0 (full ring) to the full circumference (empty ring), and the offset is recalculated on every frame from `remaining / phaseTotal`. work is orange, rest is teal. nothing fancy, but it reads at a glance.

total runtime, if you're curious:

```
rounds * work + (rounds - 1) * rest
```

(the last round skips the trailing rest because the workout is over.)

## running it

no build, no install. open the html.

```
git clone https://github.com/secanakbulut/workout-timer.git
cd workout-timer
open index.html
```

space toggles start/pause once you have clicked into the page. r resets.

## files

- `index.html` is the layout
- `style.css` does the dark theme and the ring styling
- `app.js` runs the state machine, the rAF tick, and the Web Audio beep

## a few notes

- the beep is generated through the Web Audio API, no audio file shipped. browsers may suppress the very first one until you click somewhere, that's a browser thing.
- the timer ticks with `requestAnimationFrame` and a delta in seconds, so backgrounded tabs lose accuracy. fine for a workout, not fine for surgery.
- there's a `totalRuntime()` helper i never wired into the UI. left it in for later.

released under PolyForm Noncommercial 1.0.0. see LICENSE for the details.
