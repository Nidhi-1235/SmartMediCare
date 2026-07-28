## SmartMediCare — Assistive Medicine App

An installable, accessibility-first mobile app for visually impaired users to manage medication independently. Built as a phone-shaped web app with home-screen install support, large touch targets, high contrast, screen-reader labels, and voice-first interaction.

### Backend (Lovable Cloud)
Enable Cloud for accounts, database, storage, and AI. Email + Google sign-in, with profiles.

Tables (all with row-level security so users only see their own data):
- `profiles` — name, language, voice speed, high-contrast preference, emergency contact
- `medicines` — name, dosage, form, expiry date, instructions, photo, scan text
- `schedules` — medicine, times of day, days, start/end date, active
- `dose_logs` — taken / missed / snoozed with timestamp
- `prescriptions` — uploaded image, extracted text, generated schedule status
- `caregivers` — linked caregiver/family contacts with permission level
- `interaction_alerts` — detected drug-interaction and dosage warnings
- `emergency_events` — SOS triggers with time and contact notified

### Screens
1. **Onboarding / Auth** — voice-guided sign in, large buttons, Google + email
2. **Home dashboard** — "next dose" hero card, spoken on open, quick actions: Scan, Speak, SOS
3. **Scan medicine** — camera capture with live spoken alignment guidance, OCR text extraction, AI parsing into name / dosage / expiry / instructions, read back aloud, confirm and save
4. **Prescription upload** — photo or file, AI extracts medicines and builds a schedule automatically for review
5. **My medicines** — list with expiry warnings, detail view read aloud
6. **Schedule & reminders** — daily timeline, mark taken/missed, in-app + notification reminders
7. **Safety centre** — dosage verification, drug-interaction checks, expiry alerts, all announced by voice
8. **Voice assistant** — hold-to-talk; speech-to-text question, AI answer, spoken back ("What do I take now?", "Is this expired?")
9. **Caregivers & family** — invite contacts, share adherence, they get missed-dose visibility
10. **Emergency SOS** — large always-reachable button; logs event and surfaces emergency contact with call link
11. **Pharmacy finder** — nearby pharmacies by location with contact details
12. **Settings** — language (multi-language UI + speech), voice speed, contrast, text size

### AI & device features
- OCR + parsing of medicine labels and prescriptions via Lovable AI (vision model reads the captured photo)
- Drug interaction and dosage checks via AI, stored as alerts
- Speech-to-text and text-to-speech using the browser speech APIs, with a spoken-feedback layer on every screen
- Camera access for capture and alignment guidance

### Accessibility rules applied throughout
Minimum 56px touch targets, semantic headings, aria-live announcements, focus order, full keyboard/screen-reader support, haptic-style confirmations, and a high-contrast theme option.

### Delivery
Installable on phones: app manifest, icons, theme colour, and home-screen support so it launches like a native app.

### Build order
1. Enable Cloud, auth + profiles, database schema
2. Design system (accessible, high-contrast, large type) + app shell with bottom nav and SOS
3. Home, medicines, schedule, reminders, dose logging
4. Scan + prescription upload with OCR/AI parsing
5. Voice assistant and global speech feedback
6. Safety centre, caregivers, emergency, pharmacy finder, settings
7. Installability (manifest + icons)

### Technical notes
Frontend is TanStack Start with protected routes under an authenticated layout. AI and OCR calls run in server functions using Lovable AI Gateway, never in the browser. Speech APIs run client-side only. This is a web app installable to the home screen — not a Play Store/App Store native build; for your report it can be documented as a cross-platform mobile web application.
