import { supabase } from "@/integrations/supabase/client";

export type Medicine = {
  id: string;
  user_id: string;
  name: string;
  dosage: string | null;
  form: string | null;
  strength: string | null;
  expiry_date: string | null;
  instructions: string | null;
  photo_url: string | null;
  scanned_text: string | null;
  notes: string | null;
  created_at: string;
};

export type Schedule = {
  id: string;
  user_id: string;
  medicine_id: string;
  times: string[];
  days_of_week: number[];
  start_date: string;
  end_date: string | null;
  active: boolean;
};

export type DoseLog = {
  id: string;
  medicine_id: string | null;
  schedule_id: string | null;
  scheduled_for: string;
  status: string;
  taken_at: string | null;
};

export type Caregiver = {
  id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  permission: string;
  notify_on_missed: boolean;
};

export type SafetyAlert = {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  acknowledged: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  language: string;
  voice_speed: number;
  high_contrast: boolean;
  text_size: string;
  voice_enabled: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

export type EmergencyEvent = {
  id: string;
  kind: string;
  note: string | null;
  contact_notified: string | null;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("You need to be signed in.");
  return data.user.id;
}

export const medicinesQuery = {
  queryKey: ["medicines"],
  queryFn: async (): Promise<Medicine[]> => {
    const { data, error } = await db.from("medicines").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

export const schedulesQuery = {
  queryKey: ["schedules"],
  queryFn: async (): Promise<Schedule[]> => {
    const { data, error } = await db.from("schedules").select("*").eq("active", true);
    if (error) throw error;
    return data ?? [];
  },
};

export const doseLogsQuery = {
  queryKey: ["dose_logs"],
  queryFn: async (): Promise<DoseLog[]> => {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();
    const { data, error } = await db
      .from("dose_logs")
      .select("*")
      .gte("scheduled_for", since)
      .order("scheduled_for", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

export const caregiversQuery = {
  queryKey: ["caregivers"],
  queryFn: async (): Promise<Caregiver[]> => {
    const { data, error } = await db.from("caregivers").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};

export const alertsQuery = {
  queryKey: ["safety_alerts"],
  queryFn: async (): Promise<SafetyAlert[]> => {
    const { data, error } = await db
      .from("safety_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  },
};

export const profileQuery = {
  queryKey: ["profile"],
  queryFn: async (): Promise<Profile | null> => {
    const userId = await currentUserId();
    const { data, error } = await db.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    return data ?? null;
  },
};

export const emergencyEventsQuery = {
  queryKey: ["emergency_events"],
  queryFn: async (): Promise<EmergencyEvent[]> => {
    const { data, error } = await db
      .from("emergency_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data ?? [];
  },
};

export async function insertMedicine(values: Partial<Medicine>) {
  const user_id = await currentUserId();
  const { data, error } = await db.from("medicines").insert({ ...values, user_id }).select().single();
  if (error) throw error;
  return data as Medicine;
}

export async function deleteMedicine(id: string) {
  const { error } = await db.from("medicines").delete().eq("id", id);
  if (error) throw error;
}

export async function insertSchedule(values: Partial<Schedule>) {
  const user_id = await currentUserId();
  const { data, error } = await db.from("schedules").insert({ ...values, user_id }).select().single();
  if (error) throw error;
  return data as Schedule;
}

export async function deactivateSchedule(id: string) {
  const { error } = await db.from("schedules").update({ active: false }).eq("id", id);
  if (error) throw error;
}

export async function logDose(values: {
  medicine_id: string;
  schedule_id?: string | null;
  scheduled_for: string;
  status: string;
}) {
  const user_id = await currentUserId();
  const { error } = await db.from("dose_logs").insert({
    ...values,
    user_id,
    taken_at: values.status === "taken" ? new Date().toISOString() : null,
  });
  if (error) throw error;
}

export async function insertCaregiver(values: Partial<Caregiver>) {
  const user_id = await currentUserId();
  const { error } = await db.from("caregivers").insert({ ...values, user_id });
  if (error) throw error;
}

export async function deleteCaregiver(id: string) {
  const { error } = await db.from("caregivers").delete().eq("id", id);
  if (error) throw error;
}

export async function replaceAlerts(alerts: Array<{ alert_type: string; severity: string; title: string; message: string }>) {
  const user_id = await currentUserId();
  await db.from("safety_alerts").delete().eq("user_id", user_id).eq("acknowledged", false);
  if (!alerts.length) return;
  const { error } = await db.from("safety_alerts").insert(alerts.map((a) => ({ ...a, user_id })));
  if (error) throw error;
}

export async function acknowledgeAlert(id: string) {
  const { error } = await db.from("safety_alerts").update({ acknowledged: true }).eq("id", id);
  if (error) throw error;
}

export async function saveProfile(values: Partial<Profile>) {
  const id = await currentUserId();
  const { error } = await db.from("profiles").upsert({ ...values, id });
  if (error) throw error;
}

export async function insertPrescription(values: {
  image_url?: string | null;
  extracted_text?: string | null;
  doctor_name?: string | null;
}) {
  const user_id = await currentUserId();
  const { error } = await db.from("prescriptions").insert({ ...values, user_id });
  if (error) throw error;
}

export async function logEmergency(values: { kind: string; note?: string | null; contact_notified?: string | null }) {
  const user_id = await currentUserId();
  const { error } = await db.from("emergency_events").insert({ ...values, user_id });
  if (error) throw error;
}

export async function uploadMedicineImage(dataUrl: string, prefix = "medicine") {
  const userId = await currentUserId();
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${userId}/${prefix}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("medicine-images").upload(path, blob, { contentType: blob.type });
  if (error) throw error;
  return path;
}
