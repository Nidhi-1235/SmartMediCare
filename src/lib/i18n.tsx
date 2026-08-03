import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type AppLanguage = "en" | "hi" | "kn";

export const LANGUAGES: Array<{ code: AppLanguage; label: string; native: string; speech: string }> = [
  { code: "en", label: "English", native: "English", speech: "en-US" },
  { code: "hi", label: "Hindi", native: "हिंदी", speech: "hi-IN" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", speech: "kn-IN" },
];

const en = {
  "nav.home": "Home",
  "nav.scan": "Scan",
  "nav.schedule": "Schedule",
  "nav.voice": "Voice",
  "nav.more": "More",

  "scan.title": "Scan",
  "scan.subtitle": "Point your camera at the label",
  "scan.medicine": "Medicine box",
  "scan.prescription": "Prescription",
  "scan.openCamera": "Open camera",
  "scan.capture": "Capture photo",
  "scan.upload": "Upload from gallery",
  "scan.close": "Close camera",
  "scan.retake": "Retake photo",
  "scan.reading": "Reading…",
  "scan.ready": "Ready when you are. Hold the pack steady in good light.",
  "scan.repeat": "Repeat that",
  "scan.cameraHelp": "Hold the pack about 20 centimetres from the camera, then tap Capture photo.",
  "scan.cameraError": "I could not open the camera. You can upload a photo instead.",

  "more.title": "More",
  "more.language": "Language",
  "more.languageHelp": "Changes the app text and the voice that speaks to you.",
  "more.reminders": "Reminders",
  "more.remindersHelp": "Get an alert on your phone when a dose is due, even when the app is in the background.",
  "more.enableReminders": "Turn on reminders",
  "more.remindersOn": "Reminders are on",
  "more.remindersBlocked": "Notifications are blocked. Allow them in your phone settings.",
  "more.testReminder": "Send a test alert",

  "reminder.title": "Time for your medicine",
  "reminder.body": "Take {name} now.",
  "reminder.scheduleUpdated": "Your reminder schedule was updated.",
  "reminder.test": "This is how your medicine reminders will look.",
} as const;

export type TranslationKey = keyof typeof en;

const hi: Partial<Record<TranslationKey, string>> = {
  "nav.home": "होम",
  "nav.scan": "स्कैन",
  "nav.schedule": "समय",
  "nav.voice": "आवाज़",
  "nav.more": "और",

  "scan.title": "स्कैन",
  "scan.subtitle": "कैमरा दवा के लेबल पर रखें",
  "scan.medicine": "दवा का डिब्बा",
  "scan.prescription": "पर्चा",
  "scan.openCamera": "कैमरा खोलें",
  "scan.capture": "फ़ोटो लें",
  "scan.upload": "गैलरी से चुनें",
  "scan.close": "कैमरा बंद करें",
  "scan.retake": "दोबारा फ़ोटो लें",
  "scan.reading": "पढ़ रहा हूँ…",
  "scan.ready": "तैयार हूँ। अच्छी रोशनी में डिब्बा स्थिर रखें।",
  "scan.repeat": "फिर से बोलें",
  "scan.cameraHelp": "डिब्बे को कैमरे से लगभग बीस सेंटीमीटर दूर रखें, फिर फ़ोटो लें दबाएँ।",
  "scan.cameraError": "कैमरा नहीं खुल सका। आप गैलरी से फ़ोटो चुन सकते हैं।",

  "more.title": "और",
  "more.language": "भाषा",
  "more.languageHelp": "ऐप का text और बोलने की भाषा बदलती है।",
  "more.reminders": "याद दिलाना",
  "more.remindersHelp": "दवा का समय होने पर फ़ोन पर सूचना मिलेगी।",
  "more.enableReminders": "सूचनाएँ चालू करें",
  "more.remindersOn": "सूचनाएँ चालू हैं",
  "more.remindersBlocked": "सूचनाएँ बंद हैं। फ़ोन सेटिंग में अनुमति दें।",
  "more.testReminder": "एक टेस्ट सूचना भेजें",

  "reminder.title": "दवा का समय हो गया",
  "reminder.body": "अभी {name} लें।",
  "reminder.scheduleUpdated": "आपका दवा समय अपडेट हो गया है।",
  "reminder.test": "आपकी दवा की सूचना ऐसी दिखेगी।",
};

const kn: Partial<Record<TranslationKey, string>> = {
  "nav.home": "ಮುಖಪುಟ",
  "nav.scan": "ಸ್ಕ್ಯಾನ್",
  "nav.schedule": "ವೇಳಾಪಟ್ಟಿ",
  "nav.voice": "ಧ್ವನಿ",
  "nav.more": "ಇನ್ನಷ್ಟು",

  "scan.title": "ಸ್ಕ್ಯಾನ್",
  "scan.subtitle": "ಕ್ಯಾಮೆರಾವನ್ನು ಔಷಧಿ ಲೇಬಲ್ ಮೇಲೆ ಇಡಿ",
  "scan.medicine": "ಔಷಧಿ ಡಬ್ಬಿ",
  "scan.prescription": "ಚೀಟಿ",
  "scan.openCamera": "ಕ್ಯಾಮೆರಾ ತೆರೆಯಿರಿ",
  "scan.capture": "ಫೋಟೋ ತೆಗೆಯಿರಿ",
  "scan.upload": "ಗ್ಯಾಲರಿಯಿಂದ ಆಯ್ಕೆಮಾಡಿ",
  "scan.close": "ಕ್ಯಾಮೆರಾ ಮುಚ್ಚಿ",
  "scan.retake": "ಮತ್ತೆ ಫೋಟೋ ತೆಗೆಯಿರಿ",
  "scan.reading": "ಓದುತ್ತಿದ್ದೇನೆ…",
  "scan.ready": "ಸಿದ್ಧವಾಗಿದೆ. ಒಳ್ಳೆಯ ಬೆಳಕಿನಲ್ಲಿ ಡಬ್ಬಿಯನ್ನು ಸ್ಥಿರವಾಗಿ ಹಿಡಿಯಿರಿ.",
  "scan.repeat": "ಮತ್ತೆ ಹೇಳಿ",
  "scan.cameraHelp": "ಡಬ್ಬಿಯನ್ನು ಕ್ಯಾಮೆರಾದಿಂದ ಸುಮಾರು ಇಪ್ಪತ್ತು ಸೆಂಟಿಮೀಟರ್ ದೂರದಲ್ಲಿ ಹಿಡಿದು, ಫೋಟೋ ತೆಗೆಯಿರಿ ಒತ್ತಿ.",
  "scan.cameraError": "ಕ್ಯಾಮೆರಾ ತೆರೆಯಲಾಗಲಿಲ್ಲ. ಗ್ಯಾಲರಿಯಿಂದ ಫೋಟೋ ಆಯ್ಕೆಮಾಡಬಹುದು.",

  "more.title": "ಇನ್ನಷ್ಟು",
  "more.language": "ಭಾಷೆ",
  "more.languageHelp": "ಆ್ಯಪ್ ಪಠ್ಯ ಮತ್ತು ಮಾತನಾಡುವ ಧ್ವನಿಯನ್ನು ಬದಲಾಯಿಸುತ್ತದೆ.",
  "more.reminders": "ನೆನಪೋಲೆಗಳು",
  "more.remindersHelp": "ಔಷಧಿಯ ಸಮಯ ಬಂದಾಗ ಫೋನ್‌ನಲ್ಲಿ ಸೂಚನೆ ಸಿಗುತ್ತದೆ.",
  "more.enableReminders": "ಸೂಚನೆಗಳನ್ನು ಆನ್ ಮಾಡಿ",
  "more.remindersOn": "ಸೂಚನೆಗಳು ಆನ್ ಆಗಿವೆ",
  "more.remindersBlocked": "ಸೂಚನೆಗಳು ನಿರ್ಬಂಧಿತವಾಗಿವೆ. ಫೋನ್ ಸೆಟ್ಟಿಂಗ್‌ನಲ್ಲಿ ಅನುಮತಿಸಿ.",
  "more.testReminder": "ಪರೀಕ್ಷಾ ಸೂಚನೆ ಕಳುಹಿಸಿ",

  "reminder.title": "ಔಷಧಿಯ ಸಮಯ",
  "reminder.body": "ಈಗ {name} ತೆಗೆದುಕೊಳ್ಳಿ.",
  "reminder.scheduleUpdated": "ನಿಮ್ಮ ನೆನಪೋಲೆ ವೇಳಾಪಟ್ಟಿ ನವೀಕರಿಸಲಾಗಿದೆ.",
  "reminder.test": "ನಿಮ್ಮ ಔಷಧಿ ಸೂಚನೆ ಹೀಗೆ ಕಾಣಿಸುತ್ತದೆ.",
};

const DICTS: Record<AppLanguage, Partial<Record<TranslationKey, string>>> = { en, hi, kn };

const STORAGE_KEY = "smc.language";

type I18nValue = {
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  speechLang: string;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AppLanguage>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
      if (stored && stored in DICTS) setLangState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: AppLanguage) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback<I18nValue["t"]>(
    (key, vars) => {
      const template = DICTS[lang]?.[key] ?? en[key] ?? String(key);
      if (!vars) return template;
      return Object.entries(vars).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        template,
      );
    },
    [lang],
  );

  const speechLang = LANGUAGES.find((l) => l.code === lang)?.speech ?? "en-US";

  const value = useMemo(() => ({ lang, setLang, speechLang, t }), [lang, setLang, speechLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
