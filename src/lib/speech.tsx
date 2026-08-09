import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useI18n } from "./i18n";

type SpeechContextValue = {
  speak: (text: string, opts?: { interrupt?: boolean }) => void;
  stop: () => void;
  repeat: () => void;
  announce: (text: string) => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  rate: number;
  setRate: (v: number) => void;
  lang: string;
  supported: boolean;
  liveMessage: string;
};

const SpeechContext = createContext<SpeechContextValue | null>(null);

const STORAGE_KEY = "smc.voice";

function pickVoice(locale: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const base = locale.split("-")[0];
  return (
    voices.find((v) => v.lang.replace("_", "-").toLowerCase() === locale.toLowerCase()) ??
    voices.find((v) => v.lang.replace("_", "-").toLowerCase().startsWith(`${base}-`)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ??
    null
  );
}

export function SpeechProvider({ children }: { children: ReactNode }) {
  const { locale, t, languageLabel, lang: uiLang } = useI18n();
  const [enabled, setEnabledState] = useState(true);
  const [rate, setRateState] = useState(1);
  const [liveMessage, setLiveMessage] = useState("");
  const [supported, setSupported] = useState(false);
  const [voicesReady, setVoicesReady] = useState(0);
  const lastRef = useRef("");
  const warnedRef = useRef<string | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { enabled?: boolean; rate?: number };
        if (typeof parsed.enabled === "boolean") setEnabledState(parsed.enabled);
        if (typeof parsed.rate === "number") setRateState(parsed.rate);
      }
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const onVoices = () => setVoicesReady((n) => n + 1);
      window.speechSynthesis.addEventListener("voiceschanged", onVoices);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
    }
    return undefined;
  }, []);

  const persist = useCallback((next: { enabled?: boolean; rate?: number }) => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const current = raw ? JSON.parse(raw) : {};
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...next }));
    } catch {
      /* ignore */
    }
  }, []);

  const setEnabled = useCallback(
    (v: boolean) => {
      setEnabledState(v);
      persist({ enabled: v });
      if (!v && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    },
    [persist],
  );

  const setRate = useCallback(
    (v: number) => {
      setRateState(v);
      persist({ rate: v });
    },
    [persist],
  );

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback(
    (text: string, opts?: { interrupt?: boolean }) => {
      if (!text) return;
      setLiveMessage(text);
      lastRef.current = text;
      if (!enabled) return;
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      if (opts?.interrupt !== false) window.speechSynthesis.cancel();
      const voice = pickVoice(locale);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1;
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = locale;
      }
      window.speechSynthesis.speak(utterance);
    },
    // voicesReady forces a refresh once the device reports its installed voices
    [enabled, rate, locale, voicesReady],
  );

  const repeat = useCallback(() => {
    if (lastRef.current) speak(lastRef.current);
  }, [speak]);

  // Tell the user once when their device has no voice for the chosen language.
  useEffect(() => {
    if (!supported || uiLang === "en") return;
    if (!window.speechSynthesis.getVoices().length) return;
    if (pickVoice(locale)) return;
    if (warnedRef.current === uiLang) return;
    warnedRef.current = uiLang;
    speak(t("voice.noVoiceInstalled", { language: languageLabel }));
  }, [supported, uiLang, locale, voicesReady, speak, t, languageLabel]);

  const announce = useCallback((text: string) => setLiveMessage(text), []);

  const value = useMemo(
    () => ({
      speak,
      stop,
      repeat,
      announce,
      enabled,
      setEnabled,
      rate,
      setRate,
      lang: locale,
      supported,
      liveMessage,
    }),
    [speak, stop, repeat, announce, enabled, setEnabled, rate, setRate, locale, supported, liveMessage],
  );

  return (
    <SpeechContext.Provider value={value}>
      {children}
      <div aria-live="assertive" aria-atomic="true" className="sr-only-focusable">
        {liveMessage}
      </div>
    </SpeechContext.Provider>
  );
}

export function useSpeech() {
  const ctx = useContext(SpeechContext);
  if (!ctx) throw new Error("useSpeech must be used inside SpeechProvider");
  return ctx;
}

/** Speaks a message once when the screen mounts. */
export function useSpokenIntro(text: string | null | undefined, deps: unknown[] = []) {
  const { speak } = useSpeech();
  const spokenRef = useRef(false);
  useEffect(() => {
    if (!text || spokenRef.current) return;
    spokenRef.current = true;
    const timer = window.setTimeout(() => speak(text), 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, ...deps]);
}
