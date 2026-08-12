import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { insertMedicine, insertSchedule } from "./db";
import type { Medicine } from "./db";
import { friendlyTime } from "./dose-utils";
import { useI18n } from "./i18n";
import { useSpeech } from "./speech";
import { listenOnce } from "./use-speech-recognition";

type SetupContextValue = {
  running: boolean;
  start: () => void;
  cancel: () => void;
  status: string;
};

const SetupContext = createContext<SetupContextValue | null>(null);

const YES = ["yes", "yeah", "yep", "correct", "okay", "ok", "save", "ಹೌದು", "ಸರಿ", "हाँ", "हां", "ठीक", "सही"];
const NO = ["no", "wrong", "again", "ಇಲ್ಲ", "ತಪ್ಪು", "नहीं", "गलत"];
const CANCEL = ["cancel", "exit", "stop", "quit", "ರದ್ದು", "ನಿಲ್ಲಿಸಿ", "रद्द", "बंद"];

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  once: 1, twice: 2, thrice: 3,
  ಒಂದು: 1, ಎರಡು: 2, ಮೂರು: 3, ನಾಲ್ಕು: 4, ಐದು: 5, ಆರು: 6, ಏಳು: 7, ಎಂಟು: 8, ಒಂಬತ್ತು: 9, ಹತ್ತು: 10, ಹನ್ನೊಂದು: 11, ಹನ್ನೆರಡು: 12,
  एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5, छह: 6, छः: 6, सात: 7, आठ: 8, नौ: 9, दस: 10, ग्यारह: 11, बारह: 12,
};

const MORNING = ["morning", "am", "ಬೆಳಗ್ಗೆ", "ಬೆಳಿಗ್ಗೆ", "सुबह", "प्रातः"];
const EVENING = ["evening", "night", "pm", "afternoon", "ಸಂಜೆ", "ರಾತ್ರಿ", "ಮಧ್ಯಾಹ್ನ", "शाम", "रात", "दोपहर"];

function matches(text: string, list: string[]) {
  const t = text.toLowerCase();
  return list.some((word) => t.includes(word));
}

/** Turns a spoken phrase into a number, accepting digits and words in all three languages. */
export function parseSpokenNumber(text: string): number | null {
  const digits = text.match(/\d+/);
  if (digits) return Number(digits[0]);
  const lower = text.toLowerCase();
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (lower.includes(word)) return value;
  }
  return null;
}

/** Turns a spoken time ("eight in the morning", "रात नौ बजे") into HH:MM, or null. */
export function parseSpokenTime(text: string): string | null {
  const lower = text.toLowerCase();
  let hour: number | null = null;
  let minute = 0;

  const clock = lower.match(/(\d{1,2})[:.](\d{2})/);
  if (clock) {
    hour = Number(clock[1]);
    minute = Number(clock[2]);
  } else {
    hour = parseSpokenNumber(lower);
  }
  if (hour === null || Number.isNaN(hour)) return null;

  if (hour > 23) return null;
  if (hour <= 12) {
    if (matches(lower, EVENING) && hour !== 12) hour += 12;
    else if (matches(lower, MORNING) && hour === 12) hour = 0;
  }
  if (minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Waits until the browser has finished speaking, so the microphone never hears our own voice. */
function waitForSpeech(maxMs = 12000): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
      if (!synth || (!synth.speaking && !synth.pending) || Date.now() - started > maxMs) {
        window.setTimeout(resolve, 250);
        return;
      }
      window.setTimeout(check, 200);
    };
    window.setTimeout(check, 300);
  });
}

export function AlarmSetupProvider({
  children,
  medicines,
}: {
  children: ReactNode;
  medicines: Medicine[];
}) {
  const { t, locale } = useI18n();
  const { speak } = useSpeech();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const cancelledRef = useRef(false);
  const medicinesRef = useRef<Medicine[]>(medicines);
  medicinesRef.current = medicines;

  const say = useCallback(
    async (text: string) => {
      setStatus(text);
      speak(text);
      await waitForSpeech();
    },
    [speak],
  );

  const ask = useCallback(
    async (prompt: string) => {
      await say(prompt);
      if (cancelledRef.current) return "";
      setStatus(`${prompt} — ${t("voice.listening")}`);
      const heard = await listenOnce(locale);
      if (matches(heard, CANCEL)) {
        cancelledRef.current = true;
        return "";
      }
      return heard;
    },
    [locale, say, t],
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setRunning(false);
    setStatus("");
    speak(t("alarm.setup.cancelled"));
  }, [speak, t]);

  const start = useCallback(() => {
    if (running) return;
    cancelledRef.current = false;
    setRunning(true);

    void (async () => {
      try {
        // 1. Medicine name
        let name = "";
        for (let attempt = 0; attempt < 2 && !name; attempt += 1) {
          const heard = await ask(attempt === 0 ? t("alarm.setup.start") : t("alarm.setup.askMedicine"));
          if (cancelledRef.current) return;
          name = heard.trim();
        }
        if (!name) {
          await say(t("voice.nothingHeard"));
          return;
        }
        const existing = medicinesRef.current.find((m) => m.name.toLowerCase().includes(name.toLowerCase()));
        const medicineName = existing?.name ?? name;

        // 2. How many times a day
        let count: number | null = null;
        for (let attempt = 0; attempt < 3 && count === null; attempt += 1) {
          const heard = await ask(attempt === 0 ? t("alarm.setup.askCount") : t("alarm.setup.badCount"));
          if (cancelledRef.current) return;
          const value = parseSpokenNumber(heard);
          if (value && value >= 1 && value <= 6) count = value;
        }
        if (count === null) {
          await say(t("alarm.setup.cancelled"));
          return;
        }

        // 3. One time per dose
        const times: string[] = [];
        for (let index = 1; index <= count; index += 1) {
          let time: string | null = null;
          for (let attempt = 0; attempt < 3 && !time; attempt += 1) {
            const heard = await ask(
              attempt === 0 ? t("alarm.setup.askTime", { index }) : t("alarm.setup.badTime"),
            );
            if (cancelledRef.current) return;
            time = parseSpokenTime(heard);
          }
          if (!time) {
            await say(t("alarm.setup.cancelled"));
            return;
          }
          times.push(time);
          await say(t("alarm.setup.timeHeard", { index, time: friendlyTime(time) }));
          if (cancelledRef.current) return;
        }

        // 4. Read back and confirm
        const spokenTimes = times.map(friendlyTime).join(", ");
        const answer = await ask(
          t("alarm.setup.confirm", { medicine: medicineName, count, times: spokenTimes }),
        );
        if (cancelledRef.current) return;
        if (!matches(answer, YES)) {
          if (matches(answer, NO)) {
            setRunning(false);
            window.setTimeout(() => start(), 300);
            return;
          }
          await say(t("alarm.setup.cancelled"));
          return;
        }

        const medicine = existing ?? (await insertMedicine({ name: medicineName }));
        await insertSchedule({ medicine_id: medicine.id, times, active: true });
        await queryClient.invalidateQueries({ queryKey: ["medicines"] });
        await queryClient.invalidateQueries({ queryKey: ["schedules"] });
        await say(t("alarm.setup.saved", { medicine: medicineName, times: spokenTimes }));
      } catch {
        await say(t("alarm.setup.failed"));
      } finally {
        setRunning(false);
        setStatus("");
      }
    })();
  }, [ask, queryClient, running, say, t]);

  const value = useMemo(() => ({ running, start, cancel, status }), [running, start, cancel, status]);

  return (
    <SetupContext.Provider value={value}>
      {children}
      {running ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 top-24 z-50 rounded-3xl border-2 border-primary bg-card p-5 shadow-2xl"
        >
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary">
            <Mic aria-hidden="true" className="size-5" />
            {t("alarm.setup.title")}
          </p>
          <p className="mt-2 text-lg font-semibold leading-snug text-foreground">{status}</p>
          <Button variant="outline" onClick={cancel} className="tap-target mt-4 w-full border-2 text-lg font-bold">
            {t("alarm.setup.cancel")}
          </Button>
        </div>
      ) : null}
    </SetupContext.Provider>
  );
}

export function useAlarmSetup() {
  const ctx = useContext(SetupContext);
  if (!ctx) throw new Error("useAlarmSetup must be used inside AlarmSetupProvider");
  return ctx;
}
