import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { doseLogsQuery, medicinesQuery, schedulesQuery } from "@/lib/db";
import { buildTodayDoses } from "@/lib/dose-utils";
import { useI18n } from "@/lib/i18n";
import { clearReminders, scheduleReminders } from "@/lib/notifications";

/**
 * Keeps device reminder alerts in sync with the saved schedule.
 * Re-runs whenever medicines, schedules, dose logs or the language change.
 */
export function useDoseReminders() {
  const { t, lang } = useI18n();
  const medicines = useQuery(medicinesQuery);
  const schedules = useQuery(schedulesQuery);
  const logs = useQuery(doseLogsQuery);

  const ready = medicines.data && schedules.data && logs.data;

  useEffect(() => {
    if (!ready) return;
    const doses = buildTodayDoses(medicines.data ?? [], schedules.data ?? [], logs.data ?? []);
    const items = doses
      .filter((dose) => dose.status === "upcoming" || dose.status === "due")
      .map((dose) => ({
        key: dose.key,
        at: dose.scheduledFor,
        title: t("reminder.title"),
        body: t("reminder.body", { name: dose.medicine.name }),
      }));
    scheduleReminders(items);
    return () => clearReminders();
  }, [ready, medicines.data, schedules.data, logs.data, t, lang]);
}
