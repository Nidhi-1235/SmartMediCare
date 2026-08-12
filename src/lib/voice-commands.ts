import { useEffect } from "react";

export type VoiceIntent =
  | "home"
  | "scan"
  | "schedule"
  | "assistant"
  | "more"
  | "emergency"
  | "takePhoto"
  | "uploadPhoto"
  | "save"
  | "markTaken"
  | "readPage"
  | "repeat"
  | "stop"
  | "help"
  | "setAlarm"
  | "back"
  | "whereAmI"
  | "yes"
  | "no"
  | "cancel"
  | "snooze"
  | "lang:en"
  | "lang:kn"
  | "lang:hi";

/** Phrases per intent, across English, Kannada and Hindi (plus common transliterations). */
const PHRASES: Array<[VoiceIntent, string[]]> = [
  ["home", ["home", "main page", "dashboard", "today", "ಮುಖಪುಟ", "ಮನೆ", "होम", "मुख्य", "मुखपृष्ठ", "आज"]],
  ["scan", ["scan", "camera", "read label", "ಸ್ಕ್ಯಾನ್", "ಕ್ಯಾಮೆರಾ", "स्कैन", "कैमरा"]],
  [
    "schedule",
    ["schedule", "my medicines", "reminders", "ವೇಳಾಪಟ್ಟಿ", "ಔಷಧಿಗಳು", "समय सारणी", "समय-सारणी", "दवाएं", "दवाएँ", "रिमाइंडर"],
  ],
  ["assistant", ["assistant", "voice assistant", "ask", "question", "ಸಹಾಯಕ", "ಪ್ರಶ್ನೆ", "सहायक", "प्रश्न", "पूछ"]],
  ["more", ["settings", "more", "options", "ಸೆಟ್ಟಿಂಗ್", "ಇನ್ನಷ್ಟು", "सेटिंग", "और"]],
  ["emergency", ["emergency", "help me", "sos", "call for help", "ತುರ್ತು", "ಸಹಾಯ ಬೇಕು", "आपातकाल", "मदद करो", "बचाओ"]],
  ["takePhoto", ["take photo", "take a photo", "take picture", "click photo", "ಫೋಟೋ ತೆಗೆ", "ಚಿತ್ರ ತೆಗೆ", "फोटो लो", "फोटो लें", "तस्वीर लो"]],
  ["uploadPhoto", ["upload photo", "upload", "choose photo", "gallery", "ಅಪ್‌ಲೋಡ್", "ಗ್ಯಾಲರಿ", "ಫೋಟೋ ಆರಿಸಿ", "अपलोड", "गैलरी", "फोटो चुनो"]],
  ["save", ["save", "ಉಳಿಸಿ", "ಸೇವ್", "सहेज", "सेव"]],
  ["markTaken", ["mark taken", "taken", "i took", "took my medicine", "ತೆಗೆದುಕೊಂಡೆ", "ಸೇವಿಸಿದೆ", "ले लिया", "ले ली", "खा लिया"]],
  ["readPage", ["read page", "read this", "read aloud", "what is on screen", "ಪುಟ ಓದಿ", "ಓದಿ", "पृष्ठ पढ़", "पढ़ो", "पढ़ें"]],
  ["repeat", ["repeat", "say again", "ಮತ್ತೆ ಹೇಳಿ", "ಪುನಃ", "फिर से", "दोहरा"]],
  ["stop", ["stop", "quiet", "silence", "ನಿಲ್ಲಿಸಿ", "ಸುಮ್ಮನಿರಿ", "रुको", "बंद करो", "चुप"]],
  ["help", ["help", "what can i say", "commands", "ಸಹಾಯ", "ಏನು ಹೇಳಬಹುದು", "मदद", "क्या कह सकता"]],
  [
    "setAlarm",
    [
      "set alarm",
      "set an alarm",
      "set a reminder",
      "add reminder",
      "new alarm",
      "remind me",
      "ಅಲಾರಂ ಇಡಿ",
      "ಅಲಾರಂ",
      "ನೆನಪಿಸು",
      "अलार्म लगाओ",
      "अलार्म",
      "याद दिलाओ",
      "रिमाइंडर लगाओ",
    ],
  ],
  ["snooze", ["snooze", "later", "ಸ್ನೂಜ್", "ನಂತರ", "स्नूज़", "स्नूज", "बाद में"]],
  ["back", ["go back", "back", "previous", "ಹಿಂದಕ್ಕೆ", "ಹಿಂದಿನದು", "वापस", "पीछे"]],
  ["whereAmI", ["where am i", "which screen", "ನಾನು ಎಲ್ಲಿದ್ದೇನೆ", "ಯಾವ ಪರದೆ", "मैं कहाँ हूँ", "कौन सी स्क्रीन"]],
  ["yes", ["yes", "yeah", "correct", "okay", "ok", "ಹೌದು", "ಸರಿ", "हाँ", "हां", "ठीक", "सही"]],
  ["no", ["no", "wrong", "again", "ಇಲ್ಲ", "ತಪ್ಪು", "नहीं", "गलत"]],
  ["cancel", ["cancel", "exit", "quit", "ರದ್ದು", "ರದ್ದುಮಾಡಿ", "रद्द", "बंद"]],
  ["lang:en", ["speak english", "english", "ಇಂಗ್ಲಿಷ್", "अंग्रेज़ी", "अंग्रेजी", "इंग्लिश"]],
  ["lang:kn", ["speak kannada", "kannada", "ಕನ್ನಡ", "कन्नड़"]],
  ["lang:hi", ["speak hindi", "hindi", "ಹಿಂದಿ", "हिंदी", "हिन्दी"]],
];

const LISTEN_EVENT = "smc:voice-listen";

/** Asks the always-mounted voice bar to start one listening turn. */
export function requestListening() {
  window.dispatchEvent(new Event(LISTEN_EVENT));
}

export function onListenRequest(handler: () => void) {
  window.addEventListener(LISTEN_EVENT, handler);
  return () => window.removeEventListener(LISTEN_EVENT, handler);
}

/** Matches a spoken phrase to an intent, tolerating extra words around it. */
export function matchIntent(transcript: string): VoiceIntent | null {
  const text = transcript.toLowerCase().trim();
  if (!text) return null;
  let best: { intent: VoiceIntent; length: number } | null = null;
  for (const [intent, phrases] of PHRASES) {
    for (const phrase of phrases) {
      if (text.includes(phrase) && (!best || phrase.length > best.length)) {
        best = { intent, length: phrase.length };
      }
    }
  }
  return best?.intent ?? null;
}

const EVENT = "smc:voice-intent";

export function dispatchIntent(intent: VoiceIntent) {
  window.dispatchEvent(new CustomEvent<VoiceIntent>(EVENT, { detail: intent }));
}

/** Lets a screen handle voice intents. Return true when the intent was handled. */
export function useVoiceIntent(handler: (intent: VoiceIntent) => boolean | void) {
  useEffect(() => {
    const listener = (event: Event) => {
      handler((event as CustomEvent<VoiceIntent>).detail);
    };
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
  }, [handler]);
}
