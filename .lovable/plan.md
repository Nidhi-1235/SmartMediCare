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

- Listening starts automatically when the app opens (after one spoken "Voice is on" confirmation, since browsers need a first tap anywhere to allow the microphone).
- Recognition runs continuously and restarts itself after every result, error, or silence, so the user never has to press the mic.
- Wake word: normal speech is ignored unless it starts with "medi" / "ಔಷಧಿ" / "दवा", or matches a direct command. This prevents random conversation from triggering navigation.
- Each accepted command is confirmed aloud before it runs; "stop listening" turns the mic off and Settings has a hands-free on/off switch plus a wake-word on/off switch.
- The mic button stays on screen as a status indicator (listening / off) and manual override.

## Technical notes

- New `src/lib/alarm.tsx`: `AlarmProvider` mounted in `__root.tsx` inside the authenticated shell; a 20-second interval compares `buildTodayDoses` output against now, fires for any dose whose time is reached and not yet logged, tracks fired/snoozed keys in `localStorage` so a reload does not re-ring. Chime generated with the Web Audio API (no asset), speech through the existing `useSpeech`. Renders an `AlarmDialog` overlay; "Taken" calls the existing `logDose` mutation and invalidates `dose_logs`.
- `src/lib/use-speech-recognition.ts`: add `continuous` mode with auto-restart in `onend`/`onerror` (with backoff on `not-allowed`), and a `paused` flag so speech synthesis output does not feed back into recognition.
- `src/components/voice-command-bar.tsx`: auto-start on mount when hands-free is enabled, wake-word filter before `matchIntent`, and alarm intents (`taken`, `snooze`) routed to the alarm dialog when it is open.
- `src/lib/voice-commands.ts`: add `snooze` and `taken` phrases in all three languages.
- `src/routes/_authenticated/more.tsx`: hands-free toggle, wake-word toggle, test-alarm button, all with `t()` keys added to `src/lib/i18n.tsx` for en/kn/hi.
- No database or schema changes.
