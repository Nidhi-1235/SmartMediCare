import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mic, MicOff, Send, Volume2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSpeech, useSpokenIntro } from "@/lib/speech";
import { useI18n } from "@/lib/i18n";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { doseLogsQuery, medicinesQuery, schedulesQuery } from "@/lib/db";
import { buildTodayDoses, friendlyTime } from "@/lib/dose-utils";
import { askAssistant } from "@/lib/smc.functions";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "Voice assistant — SmartMediCare" },
      { name: "description", content: "Ask questions about your medicines and hear the answers spoken back." },
      { property: "og:title", content: "Voice assistant — SmartMediCare" },
      { property: "og:description", content: "Ask questions about your medicines and hear the answers spoken back." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssistantPage,
});

type Turn = { role: "you" | "assistant"; text: string };

function AssistantPage() {
  const { speak, lang } = useSpeech();
  const { t, aiLanguage } = useI18n();
  const recognition = useSpeechRecognition(lang);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  const medicines = useQuery(medicinesQuery);
  const schedules = useQuery(schedulesQuery);
  const logs = useQuery(doseLogsQuery);

  useSpokenIntro(t("assistant.intro"));

  const contextText = useMemo(() => {
    const doses = buildTodayDoses(medicines.data ?? [], schedules.data ?? [], logs.data ?? []);
    const medLines = (medicines.data ?? [])
      .map((m) => `- ${m.name}${m.strength ? ` ${m.strength}` : ""}${m.dosage ? `, dose ${m.dosage}` : ""}${m.expiry_date ? `, expires ${m.expiry_date}` : ""}${m.instructions ? `, instructions: ${m.instructions}` : ""}`)
      .join("\n");
    const doseLines = doses
      .map((d) => `- ${d.medicine.name} at ${friendlyTime(d.time)} — ${d.status}`)
      .join("\n");
    return `Medicines:\n${medLines || "none"}\n\nToday's doses:\n${doseLines || "none"}`;
  }, [medicines.data, schedules.data, logs.data]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setTurns((prev) => [...prev, { role: "you", text: trimmed }]);
    setQuestion("");
    recognition.setTranscript("");
    setBusy(true);
    try {
      const { answer } = await askAssistant({ data: { question: trimmed, contextText, language: aiLanguage } });
      setTurns((prev) => [...prev, { role: "assistant", text: answer }]);
      speak(answer);
    } catch (error) {
      const text2 = error instanceof Error ? error.message : t("assistant.failed");
      setTurns((prev) => [...prev, { role: "assistant", text: text2 }]);
      speak(text2);
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (recognition.listening) {
      recognition.stop();
      if (recognition.transcript.trim()) void ask(recognition.transcript);
      return;
    }
    speak(t("common.listening"));
    window.setTimeout(() => recognition.start(), 600);
  }

  return (
    <AppShell title={t("assistant.title")} subtitle={t("assistant.subtitle")}>
      <Button
        type="button"
        onClick={toggleMic}
        disabled={busy}
        aria-label={recognition.listening ? "Stop listening and send my question" : "Start listening"}
        className={`flex h-48 w-full flex-col items-center justify-center gap-3 rounded-3xl text-2xl font-extrabold ${
          recognition.listening ? "bg-destructive text-destructive-foreground" : ""
        }`}
      >
        {busy ? (
          <Loader2 aria-hidden="true" className="size-14 animate-spin" />
        ) : recognition.listening ? (
          <MicOff aria-hidden="true" className="size-14" />
        ) : (
          <Mic aria-hidden="true" className="size-14" />
        )}
        {busy ? t("common.thinking") : recognition.listening ? t("assistant.tapFinish") : t("assistant.tapSpeak")}
      </Button>

      <p role="status" aria-live="polite" className="mt-4 min-h-12 text-lg font-medium text-foreground">
        {recognition.error ?? (recognition.listening ? recognition.transcript || t("common.listening") : "")}
      </p>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
      >
        <label htmlFor="question" className="sr-only">
          Type your question
        </label>
        <Input
          id="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t("assistant.type")}
          className="tap-target text-lg"
        />
        <Button type="submit" disabled={busy} aria-label="Send question" className="tap-target size-14 shrink-0 p-0">
          <Send aria-hidden="true" className="size-6" />
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {[t("assistant.q1"), t("assistant.q2"), t("assistant.q3"), t("assistant.q4")].map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => void ask(suggestion)}
            className="rounded-full border-2 border-border bg-card px-4 py-3 text-base font-semibold text-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <section aria-label="Conversation" className="mt-6 space-y-3">
        {turns.map((turn, index) => (
          <div
            key={`${turn.role}-${index}`}
            className={`rounded-3xl p-4 ${
              turn.role === "you" ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground"
            }`}
          >
            <p className="text-sm font-bold uppercase tracking-wide opacity-70">
              {turn.role === "you" ? t("assistant.you") : t("app.name")}
            </p>
            <p className="mt-1 text-lg font-medium leading-snug">{turn.text}</p>
            {turn.role === "assistant" ? (
              <Button
                variant="secondary"
                onClick={() => speak(turn.text)}
                className="tap-target mt-3 text-base font-bold"
              >
                <Volume2 aria-hidden="true" className="size-5" />
                Repeat
              </Button>
            ) : null}
          </div>
        ))}
      </section>
    </AppShell>
  );
}
