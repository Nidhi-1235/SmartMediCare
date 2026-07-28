import type { DoseLog, Medicine, Schedule } from "./db";

export type TodayDose = {
  key: string;
  medicine: Medicine;
  schedule: Schedule;
  time: string;
  scheduledFor: Date;
  status: "taken" | "skipped" | "missed" | "upcoming" | "due";
};

export function friendlyTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function buildTodayDoses(
  medicines: Medicine[],
  schedules: Schedule[],
  logs: DoseLog[],
  now = new Date(),
): TodayDose[] {
  const byId = new Map(medicines.map((m) => [m.id, m]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const doses: TodayDose[] = [];

  for (const schedule of schedules) {
    const medicine = byId.get(schedule.medicine_id);
    if (!medicine) continue;
    if (schedule.days_of_week?.length && !schedule.days_of_week.includes(now.getDay())) continue;
    if (schedule.start_date && new Date(schedule.start_date) > now) continue;
    if (schedule.end_date && new Date(schedule.end_date) < today) continue;

    for (const time of schedule.times ?? []) {
      const [h, m] = time.split(":").map(Number);
      const scheduledFor = new Date(today);
      scheduledFor.setHours(h || 0, m || 0, 0, 0);

      const log = logs.find(
        (l) => l.medicine_id === medicine.id && Math.abs(new Date(l.scheduled_for).getTime() - scheduledFor.getTime()) < 60000,
      );

      let status: TodayDose["status"];
      if (log?.status === "taken") status = "taken";
      else if (log?.status === "skipped") status = "skipped";
      else if (now.getTime() - scheduledFor.getTime() > 1000 * 60 * 60) status = "missed";
      else if (scheduledFor.getTime() - now.getTime() > 1000 * 60 * 30) status = "upcoming";
      else status = "due";

      doses.push({ key: `${schedule.id}-${time}`, medicine, schedule, time, scheduledFor, status });
    }
  }

  return doses.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
}

export function nextDose(doses: TodayDose[]) {
  return doses.find((d) => d.status === "due" || d.status === "upcoming") ?? null;
}

export function daysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function spokenSummary(doses: TodayDose[]) {
  const remaining = doses.filter((d) => d.status === "due" || d.status === "upcoming");
  const taken = doses.filter((d) => d.status === "taken").length;
  if (!doses.length) return "You have no medicines scheduled today. Tap Scan to add your first medicine.";
  const next = nextDose(doses);
  const nextText = next
    ? ` Your next dose is ${next.medicine.name} at ${friendlyTime(next.time)}.`
    : " You have finished all doses for today.";
  return `You have ${doses.length} doses today. ${taken} taken, ${remaining.length} remaining.${nextText}`;
}
