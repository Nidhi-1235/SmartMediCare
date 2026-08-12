import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlarmClock, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { doseLogsQuery, logDose, medicinesQuery, schedulesQuery } from "./db";
import { buildTodayDoses, friendlyTime } from "./dose-utils";
import type { TodayDose } from "./dose-utils";
import { useI18n } from "./i18n";
import { useSpeech } from "./speech";
import { useVoiceIntent } from "./voice-commands";

type AlarmContextValue = {
  ringing: TodayDose | null;
  testAlarm: () => void;
  acknowledge: (action: "taken" | "snooze") => void;
};

const AlarmContext = createContext<AlarmContextValue | null>(null);

const FIRED_KEY = "smc.alarm.fired";
const SNOOZE_MINUTES = 10;

function readFired(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(FIRED_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function writeFired(next: Record<string, number>) {
  try {
    window.localStorage.setItem(FIRED_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** Short two-note chime built with the Web Audio API so no sound file is needed. */
function playChime() {
  try {
    const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const start = ctx.currentTime;
    [0, 0.35, 0.7].forEach((offset, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = index % 2 === 0 ? 880 : 660;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, start + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start + offset);
      osc.stop(start + offset + 0.32);
    });
    window.setTimeout(() => ctx.close().catch(() => undefined), 1600);
  } catch {
    /* audio not available */
  }
}

export function AlarmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { speak } = useSpeech();
  const queryClient = useQueryClient();
  const medicines = useQuery(medicinesQuery);
  const schedules = useQuery(schedulesQuery);
  const logs = useQuery(doseLogsQuery);
  const [ringing, setRinging] = useState<TodayDose | null>(null);
  const ringingRef = useRef<TodayDose | null>(null);
  ringingRef.current = ringing;

  const mark = useMutation({
    mutationFn: (dose: TodayDose) =>
      logDose({
        medicine_id: dose.medicine.id,
        schedule_id: dose.schedule.id,
        scheduled_for: dose.scheduledFor.toISOString(),
        status: "taken",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dose_logs"] }),
  });

  const ring = useCallback(
    (dose: TodayDose) => {
      setRinging(dose);
      playChime();
      window.setTimeout(
        () => speak(t("alarm.ring", { time: friendlyTime(dose.time), medicine: dose.medicine.name })),
        1400,
      );
    },
    [speak, t],
  );

  // Every 20 seconds, look for a dose whose time has arrived and has not rung yet.
  useEffect(() => {
    const tick = () => {
      if (ringingRef.current) return;
      const doses = buildTodayDoses(medicines.data ?? [], schedules.data ?? [], logs.data ?? []);
      const now = Date.now();
      const fired = readFired();
      const due = doses.find((dose) => {
        if (dose.status === "taken" || dose.status === "skipped") return false;
        const at = dose.scheduledFor.getTime();
        if (at > now) return false;
        if (now - at > 1000 * 60 * 60) return false;
        const marker = fired[dose.key];
        return !marker || marker <= now;
      });
      if (!due) return;
      fired[due.key] = now + 1000 * 60 * 60 * 24;
      writeFired(fired);
      ring(due);
    };
    tick();
    const timer = window.setInterval(tick, 20000);
    return () => window.clearInterval(timer);
  }, [medicines.data, schedules.data, logs.data, ring]);

  const acknowledge = useCallback(
    (action: "taken" | "snooze") => {
      const dose = ringingRef.current;
      setRinging(null);
      if (!dose) return;
      if (action === "taken") {
        mark.mutate(dose);
        speak(t("home.markedTaken"));
        return;
      }
      const fired = readFired();
      fired[dose.key] = Date.now() + 1000 * 60 * SNOOZE_MINUTES;
      writeFired(fired);
      speak(t("alarm.snoozed"));
    },
    [mark, speak, t],
  );

  useVoiceIntent(
    useCallback(
      (intent) => {
        if (!ringingRef.current) return false;
        if (intent === "markTaken") {
          acknowledge("taken");
          return true;
        }
        if (intent === "snooze" || intent === "cancel") {
          acknowledge("snooze");
          return true;
        }
        return false;
      },
      [acknowledge],
    ),
  );

  const testAlarm = useCallback(() => {
    playChime();
    window.setTimeout(() => speak(t("alarm.testTitle")), 1200);
  }, [speak, t]);

  const value = useMemo(() => ({ ringing, testAlarm, acknowledge }), [ringing, testAlarm, acknowledge]);

  return (
    <AlarmContext.Provider value={value}>
      {children}
      {ringing ? (
        <div
          role="alertdialog"
          aria-label={t("alarm.title")}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-primary p-6 text-primary-foreground"
        >
          <AlarmClock aria-hidden="true" className="size-16" />
          <p className="text-center text-3xl font-extrabold leading-tight">{ringing.medicine.name}</p>
          <p className="text-center text-xl font-semibold opacity-90">{friendlyTime(ringing.time)}</p>
          <div className="mt-2 flex w-full max-w-sm flex-col gap-4">
            <Button
              variant="secondary"
              onClick={() => acknowledge("taken")}
              className="tap-target h-20 w-full text-2xl font-extrabold"
            >
              <Check aria-hidden="true" className="size-7" />
              {t("alarm.taken")}
            </Button>
            <Button
              variant="outline"
              onClick={() => acknowledge("snooze")}
              className="tap-target h-20 w-full border-2 bg-transparent text-2xl font-extrabold text-primary-foreground"
            >
              <Clock aria-hidden="true" className="size-7" />
              {t("alarm.snooze")}
            </Button>
          </div>
        </div>
      ) : null}
    </AlarmContext.Provider>
  );
}

export function useAlarm() {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error("useAlarm must be used inside AlarmProvider");
  return ctx;
}
