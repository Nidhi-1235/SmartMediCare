# Automatic dose alarms + hands-free voice

Two changes: doses ring an alarm on their own, and the microphone listens continuously instead of needing a tap.

## 1. Dose alarms

- While the app is open, each scheduled dose time triggers an alarm: a loud repeating chime plus a spoken announcement in the chosen language ("It is 8 o'clock. Time for Metformin, one tablet").
- A full-screen alarm panel appears with two very large buttons: "Taken" and "Snooze 10 minutes". It also responds to the spoken words "taken", "snooze", "stop" — no touch needed.
- If nothing is answered, the alarm repeats every 2 minutes up to 3 times, then the dose is left as missed and the home screen shows it.
- Permission for system notifications is requested once (spoken prompt); when granted, a notification also fires so the alarm is noticeable if the app is in the background on the phone.
- A "Test alarm" button in Settings so the user can hear it and confirm the sound works.

Note: a web app can only ring reliably while it is open or recently backgrounded. Alarms that fire with the phone fully asleep need the Android build (Capacitor local notifications) — that stays available as a later step.

## 2. Voice without tapping

- Pressing the phone's volume up or down key starts listening from any screen — no need to find the mic button. A short beep plus "Listening" confirms it started.
- Once started, recognition keeps running: it restarts itself after each result, error, or silence, so the user can give one command after another without pressing anything again.
- Saying "stop listening" (or pressing volume again) turns it off, confirmed aloud.
- Each accepted command is confirmed aloud before it runs; unrecognised speech gets the spoken list of options.
- The on-screen mic button stays as a status indicator (listening / off) and manual fallback.

Note: hardware volume keys are only reachable from the Android build (Capacitor). In the browser preview the same trigger is wired to the on-screen speaker/volume button in the header, so the behaviour can be tested now and works identically once packaged.


## Technical notes

- New `src/lib/alarm.tsx`: `AlarmProvider` mounted in `__root.tsx` inside the authenticated shell; a 20-second interval compares `buildTodayDoses` output against now, fires for any dose whose time is reached and not yet logged, tracks fired/snoozed keys in `localStorage` so a reload does not re-ring. Chime generated with the Web Audio API (no asset), speech through the existing `useSpeech`. Renders an `AlarmDialog` overlay; "Taken" calls the existing `logDose` mutation and invalidates `dose_logs`.
- `src/lib/use-speech-recognition.ts`: add `continuous` mode with auto-restart in `onend`/`onerror` (with backoff on `not-allowed`), and a `paused` flag so speech synthesis output does not feed back into recognition.
- `src/components/voice-command-bar.tsx`: auto-start on mount when hands-free is enabled, wake-word filter before `matchIntent`, and alarm intents (`taken`, `snooze`) routed to the alarm dialog when it is open.
- `src/lib/voice-commands.ts`: add `snooze` and `taken` phrases in all three languages.
- `src/routes/_authenticated/more.tsx`: hands-free toggle, wake-word toggle, test-alarm button, all with `t()` keys added to `src/lib/i18n.tsx` for en/kn/hi.
- No database or schema changes.
