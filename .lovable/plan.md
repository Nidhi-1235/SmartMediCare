# Multi-language voice app: English, Kannada, Hindi + photo upload

Three additions on top of the existing SmartMediCare app: pick a language and have the whole app speak and read in it, upload photos from the gallery (not just live camera), and make every screen operable by voice.

## 1. Language (English / ಕನ್ನಡ / हिंदी)

- Language picker on the Settings ("More") screen and on first sign-in, with each option spoken aloud as it is focused. Choice is saved to the user's profile (the `language` field already exists) and cached on the device so it applies before the profile loads.
- A translation dictionary covers all fixed UI text: navigation labels, headings, buttons, status lines, error and confirmation messages, and the emergency screen.
- Speech output switches voice locale with the language: `en-US`, `kn-IN`, `hi-IN`. If the phone has no installed voice for Kannada or Hindi, the app says so once in the chosen language and falls back to English speech while keeping on-screen text translated.
- AI replies follow the same language: the scan, prescription, safety-check and assistant prompts are told which language to answer in, so spoken summaries and the assistant come back in Kannada or Hindi.
- Voice input recognition locale switches too, so the user can ask questions in their language.

## 2. Photo upload

- The Scan screen gets two large buttons: "Take photo" (camera) and "Upload photo" (choose from gallery/files). Both feed the same AI reading flow, so nothing else changes.
- Each step is announced: file chosen, reading in progress, result read aloud, saved.
- Guardrails with spoken feedback: image files only, oversized images are downscaled before sending, unreadable photo prompts a spoken retry.
- Prescription mode gets the same upload option.

## 3. Voice-first operation everywhere

- A persistent microphone control (large, bottom of the screen, reachable from every page) starts listening and speaks what it heard back for confirmation.
- Spoken commands, recognised in all three languages, cover: navigation ("home", "scan", "schedule", "assistant", "settings", "emergency"), actions ("take photo", "upload photo", "save", "repeat that", "mark taken", "what do I take now", "help", "stop"), and language switching ("speak Hindi").
- Every screen announces itself on arrival and reads its main content; "repeat" replays the last message.
- Unrecognised commands get a spoken list of what can be said on the current screen.
- Voice on/off, speech speed, and language stay controllable from Settings, all with spoken labels.

## Technical notes

- New `src/lib/i18n.tsx`: language context + `t()` lookup, dictionaries for `en` / `kn` / `hi`, persistence to `localStorage` and the `profiles.language` column, provider mounted in `__root.tsx` next to `SpeechProvider`.
- `src/lib/speech.tsx`: locale driven by the i18n context; voice-availability check against `speechSynthesis.getVoices()` with English fallback.
- `src/lib/use-speech-recognition.ts`: accept locale from context; existing API unchanged.
- New `src/lib/voice-commands.ts`: per-language phrase tables mapped to intents, plus a matcher tolerant of extra words. A `VoiceCommandBar` component in the app shell wires intents to router navigation and screen-local handlers.
- `src/lib/smc.functions.ts` / `ai.server.ts`: add a `language` input to the four AI server functions and append a "reply in <language>" instruction to each prompt. No schema change needed.
- `src/routes/_authenticated/scan.tsx`: second hidden file input without `capture`, shared `handleFile` path, client-side downscale via canvas before building the data URL.
- All existing screens swap hardcoded strings for `t()` keys; no layout or design-system changes.
