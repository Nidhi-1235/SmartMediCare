import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Pill, ScanLine, Volume2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useSpeech } from "@/lib/speech";
import { alertsQuery, doseLogsQuery, logDose, medicinesQuery, profileQuery, schedulesQuery } from "@/lib/db";
import { buildTodayDoses, daysUntil, friendlyTime, spokenSummary } from "@/lib/dose-utils";
import { nativeBuzz } from "@/lib/native";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Today's medicines — SmartMediCare" },
      { name: "description", content: "See and confirm today's medicine doses with spoken guidance." },
      { property: "og:title", content: "Today's medicines — SmartMediCare" },
      { property: "og:description", content: "See and confirm today's medicine doses with spoken guidance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const STATUS_LABEL: Record<string, string> = {
  taken: "Taken",
  skipped: "Skipped",
  missed: "Missed",
  due: "Due now",
  upcoming: "Upcoming",
};

function HomePage() {
  const { speak } = useSpeech();
  const queryClient = useQueryClient();

  const medicines = useQuery(medicinesQuery);
  const schedules = useQuery(schedulesQuery);
  const logs = useQuery(doseLogsQuery);
  const alerts = useQuery(alertsQuery);
  const profile = useQuery(profileQuery);

  const doses = useMemo(
    () => buildTodayDoses(medicines.data ?? [], schedules.data ?? [], logs.data ?? []),
    [medicines.data, schedules.data, logs.data],
  );

  const openAlerts = (alerts.data ?? []).filter((a) => !a.acknowledged);
  const expiring = (medicines.data ?? []).filter((m) => {
    const days = daysUntil(m.expiry_date);
    return days !== null && days <= 30;
  });

  const mark = useMutation({
    mutationFn: async ({
      medicineId,
      scheduleId,
      scheduledFor,
      status,
    }: {
      medicineId: string;
      scheduleId: string;
      scheduledFor: string;
      status: "taken" | "skipped";
    }) => logDose({ medicine_id: medicineId, schedule_id: scheduleId, scheduled_for: scheduledFor, status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dose_logs"] });
      void nativeBuzz(variables.status === "taken");
      speak(variables.status === "taken" ? "Marked as taken. Well done." : "Dose skipped.");
    },
    onError: () => speak("Sorry, that did not save. Please try again."),
  });

  const summary = spokenSummary(doses);
  const greeting = profile.data?.full_name ? `Hello ${profile.data.full_name.split(" ")[0]}` : "Hello";

  return (
    <AppShell
      title={greeting}
      subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
      action={
        <Button
          variant="secondary"
          onClick={() => speak(summary)}
          aria-label="Read today's plan aloud"
          className="tap-target size-14 rounded-full p-0"
        >
          <Volume2 aria-hidden="true" className="size-6" />
        </Button>
      }
    >
      <section aria-labelledby="today-summary" className="rounded-3xl bg-primary p-5 text-primary-foreground">
        <h2 id="today-summary" className="text-sm font-bold uppercase tracking-widest opacity-80">
          Today
        </h2>
        <p className="mt-2 text-xl font-semibold leading-snug">{summary}</p>
      </section>

      {openAlerts.length ? (
        <section aria-labelledby="alerts-heading" className="mt-6 space-y-3">
          <h2 id="alerts-heading" className="text-lg font-bold text-foreground">
            Safety alerts
          </h2>
          {openAlerts.slice(0, 3).map((alert) => (
            <Link
              key={alert.id}
              to="/more"
              className="flex items-start gap-3 rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-4"
            >
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-destructive" />
              <span className="min-w-0">
                <span className="block text-base font-bold text-foreground">{alert.title}</span>
                <span className="block text-sm text-muted-foreground">{alert.message}</span>
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      <section aria-labelledby="doses-heading" className="mt-6 space-y-3">
        <h2 id="doses-heading" className="text-lg font-bold text-foreground">
          Doses today
        </h2>

        {doses.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border p-6 text-center">
            <Pill aria-hidden="true" className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-3 text-base text-muted-foreground">
              Nothing scheduled yet. Scan a medicine to get started.
            </p>
            <Button asChild className="tap-target mt-4 w-full text-lg font-bold">
              <Link to="/scan">
                <ScanLine aria-hidden="true" className="size-5" />
                Scan a medicine
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {doses.map((dose) => (
              <li
                key={dose.key}
                className={`rounded-3xl border-2 p-4 ${
                  dose.status === "due"
                    ? "border-primary bg-secondary"
                    : dose.status === "missed"
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border bg-card"
                }`}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xl font-bold text-foreground">{dose.medicine.name}</p>
                    <p className="text-base text-muted-foreground">
                      {friendlyTime(dose.time)}
                      {dose.medicine.dosage ? ` · ${dose.medicine.dosage}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm font-bold text-foreground">
                    {STATUS_LABEL[dose.status]}
                  </span>
                </div>

                <div className="mt-4 flex gap-3">
                  <Button
                    onClick={() =>
                      mark.mutate({
                        medicineId: dose.medicine.id,
                        scheduleId: dose.schedule.id,
                        scheduledFor: dose.scheduledFor.toISOString(),
                        status: "taken",
                      })
                    }
                    disabled={dose.status === "taken" || mark.isPending}
                    aria-label={`Mark ${dose.medicine.name} at ${friendlyTime(dose.time)} as taken`}
                    className="tap-target flex-1 text-lg font-bold"
                  >
                    <Check aria-hidden="true" className="size-5" />
                    Taken
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      mark.mutate({
                        medicineId: dose.medicine.id,
                        scheduleId: dose.schedule.id,
                        scheduledFor: dose.scheduledFor.toISOString(),
                        status: "skipped",
                      })
                    }
                    disabled={dose.status === "skipped" || mark.isPending}
                    aria-label={`Skip ${dose.medicine.name} at ${friendlyTime(dose.time)}`}
                    className="tap-target flex-1 border-2 text-lg font-bold"
                  >
                    <X aria-hidden="true" className="size-5" />
                    Skip
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {expiring.length ? (
        <section aria-labelledby="expiry-heading" className="mt-6">
          <h2 id="expiry-heading" className="text-lg font-bold text-foreground">
            Expiring soon
          </h2>
          <ul className="mt-3 space-y-2">
            {expiring.map((medicine) => {
              const days = daysUntil(medicine.expiry_date)!;
              return (
                <li key={medicine.id} className="rounded-2xl border-2 border-border bg-card p-4">
                  <p className="text-base font-bold text-foreground">{medicine.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {days < 0 ? `Expired ${Math.abs(days)} days ago` : `Expires in ${days} days`}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
