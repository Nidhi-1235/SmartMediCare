import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Mic, MicOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSpeech } from "@/lib/speech";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { dispatchIntent, matchIntent } from "@/lib/voice-commands";
import type { Lang } from "@/lib/i18n";

/** Always-reachable microphone that turns spoken commands into navigation and actions. */
export function VoiceCommandBar() {
  const navigate = useNavigate();
  const { t, locale, setLang } = useI18n();
  const { speak, stop, repeat } = useSpeech();
  const recognition = useSpeechRecognition(locale);
  const handledRef = useRef("");

  const run = useCallback(
    (transcript: string) => {
      const intent = matchIntent(transcript);
      if (!intent) {
        speak(t("voice.unknown"));
        return;
      }
      if (intent.startsWith("lang:")) {
        const next = intent.slice(5) as Lang;
        setLang(next);
        window.setTimeout(() => speak(t("voice.langChanged")), 200);
        return;
      }
      switch (intent) {
        case "home":
          navigate({ to: "/home" });
          return;
        case "scan":
          navigate({ to: "/scan" });
          return;
        case "schedule":
          navigate({ to: "/schedule" });
          return;
        case "assistant":
          navigate({ to: "/assistant" });
          return;
        case "more":
          navigate({ to: "/more" });
          return;
        case "emergency":
          navigate({ to: "/emergency" });
          return;
        case "stop":
          stop();
          return;
        case "repeat":
          repeat();
          return;
        case "help":
          speak(t("voice.help"));
          return;
        default:
          dispatchIntent(intent);
      }
    },
    [navigate, repeat, setLang, speak, stop, t],
  );

  // When the browser ends recognition on its own, act on what was heard.
  useEffect(() => {
    if (recognition.listening) return;
    const text = recognition.transcript.trim();
    if (!text || handledRef.current === text) return;
    handledRef.current = text;
    speak(t("voice.heard", { text }));
    window.setTimeout(() => run(text), 900);
  }, [recognition.listening, recognition.transcript, run, speak, t]);

  function toggle() {
    if (recognition.listening) {
      recognition.stop();
      return;
    }
    if (!recognition.supported) {
      speak(t("voice.notSupported"));
      return;
    }
    handledRef.current = "";
    stop();
    window.setTimeout(() => recognition.start(), 150);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={recognition.listening ? t("common.listening") : t("voice.tapAndSpeak")}
      aria-pressed={recognition.listening}
      className={`fixed bottom-24 left-4 z-40 flex size-20 flex-col items-center justify-center gap-0.5 rounded-full shadow-xl transition-transform active:scale-95 ${
        recognition.listening ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
      }`}
    >
      {recognition.listening ? (
        <MicOff aria-hidden="true" className="size-7" />
      ) : (
        <Mic aria-hidden="true" className="size-7" />
      )}
      <span className="text-xs font-extrabold tracking-wide">{t("voice.mic")}</span>
    </button>
  );
}
