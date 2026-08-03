import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Volume2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CameraCapture } from "@/components/camera-capture";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSpeech, useSpokenIntro } from "@/lib/speech";
import { insertMedicine, insertPrescription, insertSchedule, uploadMedicineImage } from "@/lib/db";
import { readPrescriptionImage, scanMedicineImage } from "@/lib/smc.functions";
import type { MedicineScanResult, PrescriptionResult } from "@/lib/ai-types";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan a medicine — SmartMediCare" },
      { name: "description", content: "Photograph a medicine label or prescription and hear the details read aloud." },
      { property: "og:title", content: "Scan a medicine — SmartMediCare" },
      {
        property: "og:description",
        content: "Photograph a medicine label or prescription and hear the details read aloud.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const { speak } = useSpeech();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const [mode, setMode] = useState<"medicine" | "prescription">("medicine");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<MedicineScanResult | null>(null);
  const [prescription, setPrescription] = useState<PrescriptionResult | null>(null);
  const [times, setTimes] = useState("08:00, 20:00");

  useSpokenIntro(
    "Scan screen. Tap the big camera button to take a photo of your medicine. I will read the details back to you.",
  );

  async function handleImage(dataUrl: string) {
    setBusy(true);
    setResult(null);
    setPrescription(null);
    const working = mode === "medicine" ? "Reading your medicine label. Please hold on." : "Reading your prescription.";
    setStatus(working);
    speak(working);
    try {
      setImageDataUrl(dataUrl);
      if (mode === "medicine") {
        const scan = await scanMedicineImage({ data: { imageDataUrl: dataUrl } });
        setResult(scan);
        setStatus(scan.spoken_summary);
        speak(scan.spoken_summary || `I read ${scan.name || "no clear name"}.`);
      } else {
        const parsed = await readPrescriptionImage({ data: { imageDataUrl: dataUrl } });
        setPrescription(parsed);
        const spoken = parsed.spoken_summary || `I found ${parsed.medicines.length} medicines.`;
        setStatus(spoken);
        speak(spoken);
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "I could not read that photo. Please try again.";
      setStatus(text);
      speak(text);
    } finally {
      setBusy(false);
    }
  }

  async function saveMedicine() {
    if (!result) return;
    setBusy(true);
    try {
      let photoPath: string | null = null;
      if (imageDataUrl) {
        try {
          photoPath = await uploadMedicineImage(imageDataUrl);
        } catch {
          photoPath = null;
        }
      }
      const medicine = await insertMedicine({
        name: result.name || "Unnamed medicine",
        dosage: result.dosage || null,
        form: result.form || null,
        strength: result.strength || null,
        expiry_date: result.expiry_date || null,
        instructions: result.instructions || null,
        scanned_text: result.scanned_text || null,
        photo_url: photoPath,
      });

      const parsedTimes = times
        .split(",")
        .map((t) => t.trim())
        .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
        .map((t) => (t.length === 4 ? `0${t}` : t));

      if (parsedTimes.length) {
        await insertSchedule({
          medicine_id: medicine.id,
          times: parsedTimes,
          days_of_week: [0, 1, 2, 3, 4, 5, 6],
          start_date: new Date().toISOString().slice(0, 10),
          active: true,
        });
      }

      queryClient.invalidateQueries();
      speak(`${medicine.name} saved with ${parsedTimes.length} daily reminders.`);
      navigate({ to: "/home" });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Saving failed. Please try again.";
      setStatus(text);
      speak(text);
    } finally {
      setBusy(false);
    }
  }

  async function savePrescription() {
    if (!prescription) return;
    setBusy(true);
    try {
      let photoPath: string | null = null;
      if (imageDataUrl) {
        try {
          photoPath = await uploadMedicineImage(imageDataUrl, "prescription");
        } catch {
          photoPath = null;
        }
      }
      await insertPrescription({
        image_url: photoPath,
        extracted_text: prescription.extracted_text || null,
        doctor_name: prescription.doctor_name || null,
      });

      for (const item of prescription.medicines) {
        const medicine = await insertMedicine({
          name: item.name || "Unnamed medicine",
          dosage: item.dosage || null,
          instructions: item.instructions || null,
        });
        const itemTimes = (item.times ?? []).filter((t) => /^\d{2}:\d{2}$/.test(t));
        if (itemTimes.length) {
          await insertSchedule({
            medicine_id: medicine.id,
            times: itemTimes,
            days_of_week: [0, 1, 2, 3, 4, 5, 6],
            start_date: new Date().toISOString().slice(0, 10),
            end_date:
              item.duration_days && item.duration_days > 0
                ? new Date(Date.now() + item.duration_days * 86400000).toISOString().slice(0, 10)
                : null,
            active: true,
          });
        }
      }

      queryClient.invalidateQueries();
      speak(`Saved ${prescription.medicines.length} medicines from your prescription.`);
      navigate({ to: "/home" });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Saving failed. Please try again.";
      setStatus(text);
      speak(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={t("scan.title")} subtitle={t("scan.subtitle")}>
      <div className="flex gap-2" role="tablist" aria-label="What are you scanning?">
        {(
          [
            ["medicine", t("scan.medicine")],
            ["prescription", t("scan.prescription")],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => {
              setMode(value);
              speak(`${label} selected.`);
            }}
            className={`tap-target flex-1 rounded-2xl border-2 px-3 text-base font-bold ${
              mode === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <CameraCapture
        busy={busy}
        onCapture={(dataUrl) => void handleImage(dataUrl)}
        label={mode === "medicine" ? t("scan.medicine") : t("scan.prescription")}
      />

      <p role="status" aria-live="polite" className="mt-5 min-h-14 rounded-2xl bg-secondary px-4 py-3 text-lg font-medium text-foreground">
        {status ?? t("scan.ready")}
      </p>

      {status ? (
        <Button
          variant="outline"
          onClick={() => speak(status)}
          className="tap-target mt-3 w-full border-2 text-base font-bold"
        >
          <Volume2 aria-hidden="true" className="size-5" />
          {t("scan.repeat")}
        </Button>
      ) : null}

      {result ? (
        <section aria-labelledby="scan-result" className="mt-8 space-y-4 rounded-3xl border-2 border-border bg-card p-5">
          <h2 id="scan-result" className="text-xl font-bold text-foreground">
            What I read
          </h2>
          <dl className="space-y-3">
            {[
              ["Name", result.name],
              ["Strength", result.strength],
              ["Form", result.form],
              ["Dose", result.dosage],
              ["Expiry", result.expiry_date],
              ["Instructions", result.instructions],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
                <dt className="text-base font-semibold text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words text-base font-bold text-foreground">{value || "Not readable"}</dd>
              </div>
            ))}
          </dl>

          <div className="space-y-2">
            <Label htmlFor="times" className="text-base font-semibold">
              Reminder times (24-hour, comma separated)
            </Label>
            <Input
              id="times"
              value={times}
              onChange={(event) => setTimes(event.target.value)}
              className="tap-target text-lg"
              inputMode="numeric"
            />
          </div>

          <Button onClick={saveMedicine} disabled={busy} className="tap-target w-full text-lg font-bold">
            <Save aria-hidden="true" className="size-5" />
            Save medicine and reminders
          </Button>
        </section>
      ) : null}

      {prescription ? (
        <section
          aria-labelledby="prescription-result"
          className="mt-8 space-y-4 rounded-3xl border-2 border-border bg-card p-5"
        >
          <h2 id="prescription-result" className="text-xl font-bold text-foreground">
            Medicines found
          </h2>
          {prescription.medicines.length === 0 ? (
            <p className="text-base text-muted-foreground">No medicines could be read. Try another photo.</p>
          ) : (
            <ul className="space-y-3">
              {prescription.medicines.map((item, index) => (
                <li key={`${item.name}-${index}`} className="rounded-2xl bg-secondary p-4">
                  <p className="text-lg font-bold text-foreground">{item.name}</p>
                  <p className="text-base text-muted-foreground">
                    {[item.dosage, item.times?.join(", "), item.instructions].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Button
            onClick={savePrescription}
            disabled={busy || prescription.medicines.length === 0}
            className="tap-target w-full text-lg font-bold"
          >
            <Save aria-hidden="true" className="size-5" />
            Save all and create schedules
          </Button>
        </section>
      ) : null}
    </AppShell>
  );
}
