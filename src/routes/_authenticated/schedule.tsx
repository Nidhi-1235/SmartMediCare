import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Volume2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useSpeech } from "@/lib/speech";
import { deactivateSchedule, deleteMedicine, medicinesQuery, schedulesQuery } from "@/lib/db";
import { daysUntil, friendlyTime } from "@/lib/dose-utils";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "My schedule — SmartMediCare" },
      { name: "description", content: "Review every saved medicine and its daily reminder times." },
      { property: "og:title", content: "My schedule — SmartMediCare" },
      { property: "og:description", content: "Review every saved medicine and its daily reminder times." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { speak } = useSpeech();
  const queryClient = useQueryClient();
  const medicines = useQuery(medicinesQuery);
  const schedules = useQuery(schedulesQuery);

  const rows = useMemo(() => {
    return (medicines.data ?? []).map((medicine) => ({
      medicine,
      schedules: (schedules.data ?? []).filter((s) => s.medicine_id === medicine.id),
    }));
  }, [medicines.data, schedules.data]);

  const remove = useMutation({
    mutationFn: async (id: string) => deleteMedicine(id),
    onSuccess: () => {
      queryClient.invalidateQueries();
      speak("Medicine removed.");
    },
  });

  const stopSchedule = useMutation({
    mutationFn: async (id: string) => deactivateSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries();
      speak("Reminders turned off for that medicine.");
    },
  });

  const spoken = rows.length
    ? `You have ${rows.length} medicines saved. ` +
      rows
        .map(
          (row) =>
            `${row.medicine.name} at ${row.schedules.flatMap((s) => s.times).map(friendlyTime).join(", ") || "no set time"}.`,
        )
        .join(" ")
    : "You have no medicines saved yet.";

  return (
    <AppShell
      title="My schedule"
      subtitle={`${rows.length} medicines saved`}
      action={
        <Button
          variant="secondary"
          onClick={() => speak(spoken)}
          aria-label="Read my whole schedule aloud"
          className="tap-target size-14 rounded-full p-0"
        >
          <Volume2 aria-hidden="true" className="size-6" />
        </Button>
      }
    >
      {rows.length === 0 ? (
        <p className="rounded-3xl border-2 border-dashed border-border p-6 text-center text-base text-muted-foreground">
          Nothing saved yet. Use the Scan tab to add your first medicine.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map(({ medicine, schedules: medSchedules }) => {
            const expiryDays = daysUntil(medicine.expiry_date);
            return (
              <li key={medicine.id} className="rounded-3xl border-2 border-border bg-card p-5">
                <h2 className="text-xl font-bold text-foreground">{medicine.name}</h2>
                <p className="mt-1 text-base text-muted-foreground">
                  {[medicine.strength, medicine.form, medicine.dosage].filter(Boolean).join(" · ") || "No details saved"}
                </p>
                {medicine.instructions ? (
                  <p className="mt-2 text-base text-foreground">{medicine.instructions}</p>
                ) : null}
                {expiryDays !== null ? (
                  <p
                    className={`mt-2 text-base font-semibold ${expiryDays <= 30 ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {expiryDays < 0 ? `Expired ${Math.abs(expiryDays)} days ago` : `Expires in ${expiryDays} days`}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {medSchedules.flatMap((s) => s.times).length === 0 ? (
                    <span className="text-base text-muted-foreground">No reminders set</span>
                  ) : (
                    medSchedules
                      .flatMap((s) => s.times)
                      .map((time) => (
                        <span key={time} className="rounded-full bg-secondary px-4 py-2 text-base font-bold text-foreground">
                          {friendlyTime(time)}
                        </span>
                      ))
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {medSchedules.map((schedule) => (
                    <Button
                      key={schedule.id}
                      variant="outline"
                      onClick={() => stopSchedule.mutate(schedule.id)}
                      className="tap-target border-2 text-base font-bold"
                    >
                      Turn off reminders
                    </Button>
                  ))}
                  <Button
                    variant="destructive"
                    onClick={() => remove.mutate(medicine.id)}
                    aria-label={`Delete ${medicine.name}`}
                    className="tap-target text-base font-bold"
                  >
                    <Trash2 aria-hidden="true" className="size-5" />
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
