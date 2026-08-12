import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Mic, MicOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSpeech } from "@/lib/speech";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { dispatchIntent, matchIntent, onListenRequest } from "@/lib/voice-commands";
import { useAlarmSetup } from "@/lib/alarm-setup";
import type { Lang } from "@/lib/i18n";

const SCREEN_KEYS: Record<string, string> = {
  "/home": "nav.home",
  "/scan": "nav.scan",
  "/schedule": "nav.schedule",
  "/assistant": "nav.assistant",
  "/more": "nav.more",
  "/emergency": "nav.emergency",
};

/** Push-to-talk microphone: listens for one command, then stops on its own. */
export function VoiceCommandBar() {
  const navigate = useNavigate();
  const router = useRouter();
  const { t, locale, setLang } = useI18n();
  const { speak, stop, repeat } = useSpeech();
  const recognition = useSpeechRecognition(locale);
  const alarmSetup = useAlarmSetup();
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
        case "setAlarm":
          alarmSetup.start();
          return;
        case "back":
          speak(t("voice.wentBack"));
          router.history.back();
          return;
        case "whereAmI": {
          const key = SCREEN_KEYS[router.state.location.pathname] ?? "nav.home";
          speak(t("voice.whereAmI", { screen: t(key) }));
          return;
        }
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
    [alarmSetup, navigate, repeat, router, setLang, speak, stop, t],
  );

  // When the browser ends the listening turn, act on what was heard.
  useEffect(() => {
    if (recognition.listening) return;
    const text = recognition.transcript.trim();
    if (!text || handledRef.current === text) return;
    handledRef.current = text;
    speak(t("voice.heard", { text }));
    window.setTimeout(() => run(text), 900);
  }, [recognition.listening, recognition.transcript, run, speak, t]);

  const startListening = useCallback(() => {
    if (alarmSetup.running || recognition.listening) return;
    if (!recognition.supported) {
      speak(t("voice.notSupported"));
      return;
    }
    handledRef.current = "";
    stop();
    speak(t("voice.listening"));
    window.setTimeout(() => recognition.start(), 700);
  }, [alarmSetup.running, recognition, speak, stop, t]);

  // The volume keys (Android) and the header speaker button both request one listening turn.
  useEffect(() => onListenRequest(startListening), [startListening]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "AudioVolumeUp" || event.key === "AudioVolumeDown") {
        event.preventDefault();
        startListening();
      }
    };
    const onVolume = () => startListening();
    window.addEventListener("keydown", onKey);
    window.addEventListener("volumebuttonlistener", onVolume);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("volumebuttonlistener", onVolume);
    };
  }, [startListening]);

  function toggle() {
    if (recognition.listening) {
      recognition.stop();
      speak(t("voice.micOff"));
      return;
    }
    startListening();
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
