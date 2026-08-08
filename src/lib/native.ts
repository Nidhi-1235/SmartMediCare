/**
 * Thin bridge to Capacitor native plugins.
 * Every call is safe on the web: when the app is not running inside the
 * Android shell these helpers report "unavailable" and callers fall back to
 * the existing browser implementation.
 */

let nativeChecked = false;
let nativeFlag = false;

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  if (nativeChecked) return nativeFlag;
  nativeChecked = true;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  nativeFlag = Boolean(cap?.isNativePlatform?.());
  return nativeFlag;
}

/* ---------------------------------- Camera --------------------------------- */

export type NativePhoto = { dataUrl: string } | null;

/** Opens the native camera. Returns null when unavailable or cancelled. */
export async function nativeTakePhoto(): Promise<NativePhoto> {
  if (!isNative()) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      correctOrientation: true,
    });
    return photo.dataUrl ? { dataUrl: photo.dataUrl } : null;
  } catch {
    return null;
  }
}

/** Opens the native gallery picker. Returns null when unavailable or cancelled. */
export async function nativePickPhoto(): Promise<NativePhoto> {
  if (!isNative()) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      correctOrientation: true,
    });
    return photo.dataUrl ? { dataUrl: photo.dataUrl } : null;
  } catch {
    return null;
  }
}

/* ------------------------------ Text to speech ----------------------------- */

export async function nativeSpeak(text: string, lang: string, rate: number): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
    await TextToSpeech.stop().catch(() => undefined);
    await TextToSpeech.speak({ text, lang, rate, pitch: 1, volume: 1, category: "ambient" });
    return true;
  } catch {
    return false;
  }
}

export async function nativeStopSpeaking(): Promise<void> {
  if (!isNative()) return;
  try {
    const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
    await TextToSpeech.stop();
  } catch {
    /* ignore */
  }
}

/* --------------------------------- Haptics --------------------------------- */

export async function nativeBuzz(strong = false): Promise<void> {
  if (!isNative()) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(strong ? [250, 120, 250] : 60);
    }
    return;
  }
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: strong ? ImpactStyle.Heavy : ImpactStyle.Medium });
  } catch {
    /* ignore */
  }
}

/* ----------------------------- Local notifications -------------------------- */

export type NativeReminder = { key: string; at: Date; title: string; body: string };

function numericId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 2147483647;
  return hash || 1;
}

export async function nativeRequestNotifications(): Promise<"granted" | "denied" | "unavailable"> {
  if (!isNative()) return "unavailable";
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted" ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}

/** Replaces all pending native reminders. Returns the count scheduled, or -1 when unavailable. */
export async function nativeScheduleReminders(items: NativeReminder[]): Promise<number> {
  if (!isNative()) return -1;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
    const now = Date.now();
    const upcoming = items.filter((item) => item.at.getTime() > now);
    if (!upcoming.length) return 0;
    await LocalNotifications.schedule({
      notifications: upcoming.map((item) => ({
        id: numericId(item.key),
        title: item.title,
        body: item.body,
        schedule: { at: item.at, allowWhileIdle: true },
        smallIcon: "ic_stat_icon",
        ongoing: false,
      })),
    });
    return upcoming.length;
  } catch {
    return -1;
  }
}

export async function nativeShowNow(title: string, body: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [{ id: Date.now() % 2147483647, title, body, smallIcon: "ic_stat_icon" }],
    });
    return true;
  } catch {
    return false;
  }
}
