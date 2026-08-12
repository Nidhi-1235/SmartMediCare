import { useCallback, useEffect, useRef, useState } from "react";

type Recognition = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** True when this browser can turn speech into text. */
export function recognitionSupported() {
  return getRecognitionCtor() !== null;
}

/**
 * Listens for exactly one spoken answer and resolves with it.
 * Used by the spoken alarm setup, which asks a question and waits for a reply.
 */
export function listenOnce(lang = "en-US", timeoutMs = 9000): Promise<string> {
  return new Promise((resolve) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      resolve("");
      return;
    }
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    let text = "";
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        recognition.abort();
      } catch {
        /* already stopped */
      }
      resolve(text.trim());
    };
    const timer = window.setTimeout(finish, timeoutMs);
    recognition.onresult = (event: unknown) => {
      const e = event as { results: ArrayLike<ArrayLike<{ transcript: string }>> };
      let heard = "";
      for (let i = 0; i < e.results.length; i += 1) heard += e.results[i][0].transcript;
      text = heard;
    };
    recognition.onerror = finish;
    recognition.onend = finish;
    try {
      recognition.start();
    } catch {
      finish();
    }
  });
}

/** Browser speech-to-text. Returns a transcript that updates while listening. */
export function useSpeechRecognition(lang = "en-US") {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Voice input is not supported in this browser.");
      return;
    }
    setError(null);
    setTranscript("");
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event: unknown) => {
      const e = event as { results: ArrayLike<ArrayLike<{ transcript: string }>> };
      let text = "";
      for (let i = 0; i < e.results.length; i += 1) text += e.results[i][0].transcript;
      setTranscript(text);
    };
    recognition.onerror = (event: unknown) => {
      const e = event as { error?: string };
      setError(e.error === "not-allowed" ? "Microphone permission denied." : "Could not hear you. Try again.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { listening, transcript, supported, error, start, stop, setTranscript };
}
