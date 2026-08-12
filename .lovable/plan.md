# Voice-first navigation, spoken alarm setup, push-to-talk mic

Three connected pieces so the app can be driven entirely by speech, in English, Kannada or Hindi.

## 1. Hands-free navigation

- Spoken commands move between Home, Scan, Schedule, Assistant, More and Emergency, recognised in the selected language (this wiring already exists and is extended, not rebuilt).
- Every arrival on a screen is announced aloud, followed by its main content, so the user always knows where they are.
- "Where am I", "go back", and "repeat" are added; unrecognised speech gets a spoken list of what can be said on the current screen.
- Each recognised command is confirmed aloud before it runs.

## 2. Setting an alarm entirely by voice

- Saying "set alarm" / "ಅಲಾರಂ ಇಡಿ" / "अलार्म लगाओ" from any screen starts a spoken, step-by-step setup — no typing, no buttons:
  1. "Which medicine?" — the user says a name; if it matches a saved medicine it is used, otherwise a new medicine is created with that name.
  2. "How many times a day?" — a number.
  3. "At what times?" — spoken times, one at a time ("eight in the morning", "ಎಂಟು ಗಂಟೆ", "रात नौ बजे"), each read back for confirmation.
  4. Full read-back: "Metformin, twice a day, at 8 in the morning and 9 at night. Say yes to save." — "yes" saves, "no" restarts, "cancel" exits.
- Everything is saved to the existing medicines and schedules records, so it shows up on Home and Schedule immediately.
- One-shot phrases also work: "remind me to take Metformin at 8 in the morning" is parsed directly and only asks for confirmation.
- Errors are spoken and recoverable: an unclear time is asked again rather than dropped.
- The alarms themselves ring at their times with a chime plus a spoken announcement, answerable by saying "taken" or "snooze" — no touch.

## 3. Push-to-talk listening only

- The microphone is off by default and never listens in the background.
- Pressing the phone's volume up or down key starts one listening turn: a short beep plus "Listening", then it captures a single command and stops on its own.
- During a spoken setup flow, listening reopens automatically for each answer and closes after the flow ends or the user says "cancel".
- A spoken "microphone off" line confirms every time it stops, so there is never uncertainty about whether it is on.
- The on-screen mic button remains as a status light and manual alternative.

In the browser preview hardware volume keys are not available, so the same trigger is wired to the on-screen speaker button in the header; the Android build maps it to the real volume keys with identical behaviour.

## Technical notes

- `src/lib/use-speech-recognition.ts`: single-turn mode with explicit start/stop, a `paused` flag so spoken output does not feed the mic, and a promise-style `listenOnce()` used by the setup dialog.
- New `src/lib/alarm-setup.tsx`: a small state machine (medicine → count → times → confirm) driving prompts through `useSpeech` and answers through `listenOnce()`; parses spoken numbers and times in en/kn/hi into `HH:MM`; saves through the existing `insertMedicine` / `insertSchedule` in `src/lib/db.ts` and invalidates the medicines/schedules queries. Renders a large high-contrast status panel while running.
- New `src/lib/alarm.tsx`: `AlarmProvider` with a 20-second tick over `buildTodayDoses`; Web Audio chime, spoken announcement, overlay with Taken / Snooze; fired and snoozed keys kept in `localStorage` so reloads do not re-ring; "Taken" calls the existing `logDose`.
- `src/components/voice-command-bar.tsx`: exposes a global `startListening()`; the header speaker button and a volume-key listener (Capacitor plugin on Android, no-op on web) both call it. Routes `setAlarm`, `taken`, `snooze`, `cancel`, `yes`, `no` intents to the active flow.
- `src/lib/voice-commands.ts`: new intents `setAlarm`, `back`, `whereAmI`, `yes`, `no`, `cancel`, `taken`, `snooze` with phrases in all three languages.
- `src/routes/_authenticated/*.tsx`: each screen announces itself on mount via the existing speech hook and answers "read page".
- New `t()` keys for every spoken prompt in `src/lib/i18n.tsx` (en/kn/hi). No database or schema changes.
