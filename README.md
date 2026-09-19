# 💊 SmartMediCare

SmartMediCare is an AI-powered mobile application designed to assist visually impaired users in managing their medications safely and independently. The app leverages OCR, NLP, voice assistance, and Firebase to provide an accessible and user-friendly healthcare experience.
SmartMediCare is an AI-powered, voice-first mobile web app that helps **visually impaired users manage their medications safely and independently**. Every screen can be operated entirely by speech — in **English, ಕನ್ನಡ (Kannada) or हिंदी (Hindi)**.

## 🚀 Features
---

- 📷 Scan medicine labels using OCR
- 🔊 Voice guidance with Text-to-Speech (TTS)
- 💊 Medicine reminders and notifications
- ⏰ Expiry date alerts
- 🧠 AI-powered medicine information
- ☁️ Secure data storage with Firebase
- 📱 Accessible and intuitive user interface
## ✨ Features

## 🛠️ Technologies Used
### 🎙️ Voice-first operation
- Every screen announces itself and reads its main content aloud.
- Hands-free navigation: just say "home", "scan", "schedule", "settings" or "emergency" — in any of the three languages.
- Push-to-talk listening: the microphone only listens when triggered (volume key on Android / speaker button in the browser), never in the background.
- "Where am I", "go back", "repeat" and "read page" are always available; unrecognised speech gets a spoken list of what can be said.

- Flutter
- Python
- Firebase
- OpenCV
- OCR
- NLP
- Text-to-Speech (TTS)
### 📷 Medicine scanning (OCR + AI)
- **Take a photo** with the camera or **upload one** from the gallery.
- AI reads the label and speaks back the medicine name, dosage, strength, expiry date and instructions — in the selected language.
- **Prescription mode**: upload a prescription photo and the app extracts the medicines and builds the schedule automatically.

### ⏰ Fully spoken alarm setup & reminders
- Say "set alarm" and a step-by-step **spoken flow** asks for the medicine name, how many times a day, and at what times — no typing, no buttons.
- One-shot phrases work too: *"remind me to take Metformin at 8 in the morning"*.
- Alarms ring with a chime plus a spoken announcement, answerable hands-free with **"taken"** or **"snooze"**.
- Today's doses show due / taken / missed status on the Home screen.

### 🧠 AI assistant & safety checks
- Ask anything about your medicines ("what do I take now?", "can I take these together?") and get a spoken answer based on your saved medicines.
- Automatic safety checks: dosage verification, drug-interaction alerts and expiry warnings.

### 🌐 Multi-language support
- Full UI, speech output and voice recognition in **English, Kannada and Hindi**.
- Language picker spoken aloud option-by-option; choice is saved to your profile and cached on the device.
- AI replies follow the same language.

### 🚨 Emergency SOS
- One-tap emergency screen that calls a saved contact, with a large high-contrast button reachable by voice ("emergency").

### 👥 Caregiver management
- Add caregivers and emergency contacts; keep family in the loop.

### ♿ Built for accessibility
- Large touch targets (minimum 56px), high-contrast themes, maximum-contrast mode, and screen-reader announcements alongside spoken output.
- Installable to the phone's home screen and Capacitor-ready for an Android APK.

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TanStack Start (file-based routing), Tailwind CSS v4 |
| Speech | Web Speech API (TTS + speech recognition) |
| AI | Lovable AI Gateway (vision OCR, prescription reading, safety analysis, assistant) |
| Backend | Lovable Cloud (Supabase) — Auth (Email + Google), PostgreSQL with Row Level Security, Storage |
| Mobile | Capacitor-ready (Android APK via published URL) |

### Database
`profiles`, `medicines`, `schedules`, `dose_logs`, `prescriptions`, `caregivers`, `safety_alerts`, `emergency_events` — all protected with Row Level Security so each user only ever sees their own data.

---

## 🚀 Getting Started

1. **Sign in** with Email or Google.
2. **Pick your language** — English, ಕನ್ನಡ or हिंदी.
3. **Scan or upload** a medicine label, or say **"set alarm"** to schedule your first reminder entirely by voice.
4. Tap the **speaker button** (or volume key on Android) any time to speak a command.

---

## 📂 Project Structure

```
src/
├── components/       # App shell, voice runtime, mic bar, SOS button
├── lib/
│   ├── i18n.tsx      # EN / KN / HI translation dictionaries
│   ├── speech.tsx    # Text-to-speech provider (locale-aware)
│   ├── voice-commands.ts   # Spoken phrase → intent matching (3 languages)
│   ├── alarm.tsx     # Dose alarm engine (chime + spoken prompts)
│   ├── alarm-setup.tsx     # Fully spoken alarm setup flow
│   ├── db.ts         # Database queries & mutations
│   └── smc.functions.ts    # AI server functions (scan, prescription, safety, assistant)
└── routes/           # Home, Scan, Schedule, Assistant, Emergency, More, Auth
```

---

## 🎯 Project Objective

To empower visually impaired users by providing an intelligent medicine assistance system that improves medication safety, accessibility, and independence.

