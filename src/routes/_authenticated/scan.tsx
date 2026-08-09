import { useCallback, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Save, Upload, Volume2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSpeech, useSpokenIntro } from "@/lib/speech";
import { useI18n } from "@/lib/i18n";
import { useVoiceIntent } from "@/lib/voice-commands";
import { insertMedicine, insertPrescription, insertSchedule, uploadMedicineImage } from "@/lib/db";
import { readPrescriptionImage, scanMedicineImage } from "@/lib/smc.functions";
import type { MedicineScanResult, PrescriptionResult } from "@/lib/ai-types";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan a medicine — SmartMediCare" },
      {
        name: "description",
        content: "Photograph or upload a medicine label or prescription and hear the details read aloud.",
      },
      { property: "og:title", content: "Scan a medicine — SmartMediCare" },
      {
        property: "og:description",
        content: "Photograph or upload a medicine label or prescription and hear the details read aloud.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanPage,
});

/** Reads a photo and shrinks it so uploads stay small enough for the AI reader. */
async function fileToDataUrl(file: File, maxSide = 1600) {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that photo."));
    reader.readAsDataURL(file);
  });

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("decode failed"));
      img.src = raw;
    });
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    if (scale === 1 && raw.length < 3_000_000) return raw;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return raw;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return raw;
  }
}

function ScanPage() {
  const { speak, repeat } = useSpeech();
  const { t, aiLanguage } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"medicine" | "prescription">("medicine");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<MedicineScanResult | null>(null);
  const [prescription, setPrescription] = useState<PrescriptionResult | null>(null);
  const [times, setTimes] = useState("08:00, 20:00");

  useSpokenIntro(t("scan.intro"));

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setStatus(t("scan.notAnImage"));
      speak(t("scan.notAnImage"));
      return;
    }
    setBusy(true);
    setResult(null);
    setPrescription(null);
    const working = mode === "medicine" ? t("scan.readingMedicine") : t("scan.readingPrescription");
    setStatus(working);
    speak(working);
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageDataUrl(dataUrl);
      if (mode === "medicine") {
        const scan = await scanMedicineImage({ data: { imageDataUrl: dataUrl, language: aiLanguage } });
        setResult(scan);
        setStatus(scan.spoken_summary);
        speak(scan.spoken_summary || scan.name || t("scan.failed"));
      } else {
        const parsed = await readPrescriptionImage({ data: { imageDataUrl: dataUrl, language: aiLanguage } });
        setPrescription(parsed);
        const spoken = parsed.spoken_summary || `${parsed.medicines.length}`;
        setStatus(spoken);
        speak(spoken);
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : t("scan.failed");
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
        .map((t2) => t2.trim())
        .filter((t2) => /^\d{1,2}:\d{2}$/.test(t2))
        .map((t2) => (t2.length === 4 ? `0${t2}` : t2));

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
      speak(`${medicine.name} — ${t("common.save")}`);
      navigate({ to: "/home" });
    } catch (error) {
      const text = error instanceof Error ? error.message : t("scan.saveFailed");
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
        const itemTimes = (item.times ?? []).filter((time) => /^\d{2}:\d{2}$/.test(time));
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
      speak(`${prescription.medicines.length} — ${t("common.save")}`);
      navigate({ to: "/home" });
    } catch (error) {
      const text = error instanceof Error ? error.message : t("scan.saveFailed");
      setStatus(text);
      speak(text);
    } finally {
      setBusy(false);
    }
  }

  useVoiceIntent(
    useCallback(
      (intent) => {
        if (intent === "takePhoto") cameraRef.current?.click();
        else if (intent === "uploadPhoto") uploadRef.current?.click();
        else if (intent === "save") {
          if (result) void saveMedicine();
          else if (prescription) void savePrescription();
        } else if (intent === "readPage") speak(status ?? t("scan.ready"));
        else if (intent === "repeat") repeat();
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [result, prescription, status, t, speak, repeat],
    ),
  );

  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      speak(t("scan.photoChosen"));
      void handleFile(file);
    }
    event.target.value = "";
  };

  return (
    <AppShell title={t("scan.title")} subtitle={t("scan.subtitle")}>
      <div className="flex gap-2" role="tablist" aria-label={t("scan.title")}>
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
              speak(label);
            }}
            className={`tap-target flex-1 rounded-2xl border-2 px-3 text-base font-bold ${
              mode === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPick} />
      <input ref={uploadRef} type="file" accept="image/*" className="sr-only" onChange={onPick} />

      <Button
        type="button"
        onClick={() => cameraRef.current?.click()}
        disabled={busy}
        className="mt-6 flex h-48 w-full flex-col items-center justify-center gap-3 rounded-3xl text-2xl font-extrabold"
        aria-label={t("scan.takePhoto")}
      >
        {busy ? (
          <Loader2 aria-hidden="true" className="size-14 animate-spin" />
        ) : (
          <Camera aria-hidden="true" className="size-14" />
        )}
        {busy ? t("scan.reading") : t("scan.takePhoto")}
      </Button>

      <Button
        type="button"
        variant="secondary"
        onClick={() => uploadRef.current?.click()}
        disabled={busy}
        className="mt-3 flex h-28 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-border text-xl font-extrabold"
        aria-label={t("scan.uploadPhoto")}
      >
        <Upload aria-hidden="true" className="size-10" />
        {t("scan.uploadPhoto")}
      </Button>

      <p
        role="status"
        aria-live="polite"
        className="mt-5 min-h-14 rounded-2xl bg-secondary px-4 py-3 text-lg font-medium text-foreground"
      >
        {status ?? t("scan.ready")}
      </p>

      {status ? (
        <Button
          variant="outline"
          onClick={() => speak(status)}
          className="tap-target mt-3 w-full border-2 text-base font-bold"
        >
          <Volume2 aria-hidden="true" className="size-5" />
          {t("common.repeat")}
        </Button>
      ) : null}

      {result ? (
        <section aria-labelledby="scan-result" className="mt-8 space-y-4 rounded-3xl border-2 border-border bg-card p-5">
          <h2 id="scan-result" className="text-xl font-bold text-foreground">
            {t("scan.whatIRead")}
          </h2>
          <dl className="space-y-3">
            {[
              [t("scan.field.name"), result.name],
              [t("scan.field.strength"), result.strength],
              [t("scan.field.form"), result.form],
              [t("scan.field.dose"), result.dosage],
              [t("scan.field.expiry"), result.expiry_date],
              [t("scan.field.instructions"), result.instructions],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
                <dt className="text-base font-semibold text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words text-base font-bold text-foreground">
                  {value || t("scan.notReadable")}
                </dd>
              </div>
            ))}
          </dl>

          <div className="space-y-2">
            <Label htmlFor="times" className="text-base font-semibold">
              {t("scan.times")}
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
            {t("scan.saveMedicine")}
          </Button>
        </section>
      ) : null}

      {prescription ? (
        <section
          aria-labelledby="prescription-result"
          className="mt-8 space-y-4 rounded-3xl border-2 border-border bg-card p-5"
        >
          <h2 id="prescription-result" className="text-xl font-bold text-foreground">
            {t("scan.medicinesFound")}
          </h2>
          {prescription.medicines.length === 0 ? (
            <p className="text-base text-muted-foreground">{t("scan.noMedicines")}</p>
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
            {t("scan.saveAll")}
          </Button>
        </section>
      ) : null}
    </AppShell>
  );
}
