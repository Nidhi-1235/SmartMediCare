import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { isNative, nativeSpeak, nativeStopSpeaking } from "@/lib/native";

type SpeechContextValue = {
  speak: (text: string, opts?: { interrupt?: boolean }) => void;
  stop: () => void;
  announce: (text: string) => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  rate: number;
  setRate: (v: number) => void;
  lang: string;
  setLang: (v: string) => void;
  supported: boolean;
  liveMessage: string;
};

const SpeechContext = createContext<SpeechContextValue | null>(null);

const STORAGE_KEY = "smc.voice";

export function SpeechProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(true);
  const [rate, setRateState] = useState(1);
  const [lang, setLang] = useState("en-US");
  const [liveMessage, setLiveMessage] = useState("");
  const [supported, setSupported] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    setSupported(isNative() || (typeof window !== "undefined" && "speechSynthesis" in window));
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { enabled?: boolean; rate?: number; lang?: string };
        if (typeof parsed.enabled === "boolean") setEnabledState(parsed.enabled);
        if (typeof parsed.rate === "number") setRateState(parsed.rate);
        if (typeof parsed.lang === "string") setLang(parsed.lang);
      }
    } catch {
      /* ignore */
    }
    readyRef.current = true;
  }, []);

  const persist = useCallback((next: { enabled?: boolean; rate?: number; lang?: string }) => {
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
    if (isNative()) {
      void nativeStopSpeaking();
      return;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback(
    (text: string, opts?: { interrupt?: boolean }) => {
      setLiveMessage(text);
      if (!enabled) return;
      // Android shell: use the device's built-in voice (better Hindi/Kannada support).
      if (isNative()) {
        void nativeSpeak(text, lang, rate);
        return;
      }
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      if (opts?.interrupt !== false) window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.lang = lang;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    },
    [enabled, rate, lang],
  );

  // Announce to screen readers without speaking aloud
  const announce = useCallback((text: string) => setLiveMessage(text), []);

  const value = useMemo(
    () => ({ speak, stop, announce, enabled, setEnabled, rate, setRate, lang, setLang, supported, liveMessage }),
    [speak, stop, announce, enabled, setEnabled, rate, setRate, lang, supported, liveMessage],
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
