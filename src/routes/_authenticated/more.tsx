import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSpeech } from "@/lib/speech";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import {
  acknowledgeAlert,
  alertsQuery,
  caregiversQuery,
  deleteCaregiver,
  insertCaregiver,
  medicinesQuery,
  profileQuery,
  replaceAlerts,
  saveProfile,
} from "@/lib/db";
import { runSafetyCheck } from "@/lib/smc.functions";

export const Route = createFileRoute("/_authenticated/more")({
  head: () => ({
    meta: [
      { title: "Settings & caregivers — SmartMediCare" },
      { name: "description", content: "Voice settings, safety checks, caregivers and emergency contact details." },
      { property: "og:title", content: "Settings & caregivers — SmartMediCare" },
      {
        property: "og:description",
        content: "Voice settings, safety checks, caregivers and emergency contact details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MorePage,
});

function MorePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { speak, enabled, setEnabled, rate, setRate } = useSpeech();
  const { t, lang, setLang, aiLanguage } = useI18n();

  const profile = useQuery(profileQuery);
  const caregivers = useQuery(caregiversQuery);
  const alerts = useQuery(alertsQuery);
  const medicines = useQuery(medicinesQuery);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [checking, setChecking] = useState(false);

  const addCaregiver = useMutation({
    mutationFn: async () => insertCaregiver({ name, phone, relationship, permission: "view", notify_on_missed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caregivers"] });
      speak(`${name} added as a caregiver.`);
      setName("");
      setPhone("");
      setRelationship("");
    },
  });

  const removeCaregiver = useMutation({
    mutationFn: async (id: string) => deleteCaregiver(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["caregivers"] }),
  });

  const saveContact = useMutation({
    mutationFn: async () =>
      saveProfile({ emergency_contact_name: contactName, emergency_contact_phone: contactPhone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      speak(t("more.contactSaved"));
    },
  });

  const ackAlert = useMutation({
    mutationFn: async (id: string) => acknowledgeAlert(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["safety_alerts"] }),
  });

  async function checkSafety() {
    setChecking(true);
    speak(t("more.checking"));
    try {
      const result = await runSafetyCheck({
        data: {
          medicines: (medicines.data ?? []).map((m) => ({
            name: m.name,
            dosage: m.dosage,
            expiry_date: m.expiry_date,
          })),
          language: aiLanguage,
        },
      });
      await replaceAlerts(result.alerts);
      queryClient.invalidateQueries({ queryKey: ["safety_alerts"] });
      speak(result.spoken_summary || `Found ${result.alerts.length} issues.`);
    } catch (error) {
      speak(error instanceof Error ? error.message : t("more.checkFailed"));
    } finally {
      setChecking(false);
    }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const openAlerts = (alerts.data ?? []).filter((a) => !a.acknowledged);

  return (
    <AppShell title={t("more.title")} subtitle={t("more.subtitle")}>
      <section aria-labelledby="language-heading" className="rounded-3xl border-2 border-border bg-card p-5">
        <h2 id="language-heading" className="text-xl font-bold text-foreground">
          {t("more.language")}
        </h2>
        <p className="mt-1 text-base text-muted-foreground">{t("more.languageHelp")}</p>
        <div className="mt-4 grid gap-3" role="radiogroup" aria-labelledby="language-heading">
          {LANGUAGES.map((option) => (
            <Button
              key={option.code}
              role="radio"
              aria-checked={lang === option.code}
              variant={lang === option.code ? "default" : "outline"}
              onClick={() => {
                setLang(option.code);
                window.setTimeout(() => speak(option.label), 250);
              }}
              onFocus={() => speak(option.label)}
              className="tap-target w-full border-2 text-lg font-bold"
            >
              {option.label} · {option.english}
            </Button>
          ))}
        </div>
      </section>

      <section aria-labelledby="voice-heading" className="mt-6 rounded-3xl border-2 border-border bg-card p-5">
        <h2 id="voice-heading" className="text-xl font-bold text-foreground">
          {t("more.voice")}
        </h2>
        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="text-lg font-semibold text-foreground">{t("more.speakAll")}</span>
          <Button
            variant={enabled ? "default" : "outline"}
            onClick={() => {
              setEnabled(!enabled);
              if (!enabled) speak(t("more.voiceOn"));
            }}
            aria-pressed={enabled}
            className="tap-target border-2 text-base font-bold"
          >
            {enabled ? t("common.on") : t("common.off")}
          </Button>
        </div>
        <div className="mt-5 space-y-2">
          <Label htmlFor="rate" className="text-base font-semibold">
            {t("more.speed", { rate: rate.toFixed(1) })}
          </Label>
          <input
            id="rate"
            type="range"
            min={0.6}
            max={1.6}
            step={0.1}
            value={rate}
            onChange={(event) => setRate(Number(event.target.value))}
            onMouseUp={() => speak(t("more.speedDemo"))}
            onTouchEnd={() => speak(t("more.speedDemo"))}
            className="h-3 w-full accent-[var(--color-primary)]"
          />
        </div>
      </section>

      <section aria-labelledby="safety-heading" className="mt-6 rounded-3xl border-2 border-border bg-card p-5">
        <h2 id="safety-heading" className="text-xl font-bold text-foreground">
          {t("more.safety")}
        </h2>
        <p className="mt-1 text-base text-muted-foreground">
          Looks for interactions, duplicates and expiry problems. Always confirm with your doctor or pharmacist.
        </p>
        <Button onClick={checkSafety} disabled={checking} className="tap-target mt-4 w-full text-lg font-bold">
          {checking ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : <ShieldCheck aria-hidden="true" className="size-5" />}
          Check my medicines
        </Button>

        {openAlerts.length ? (
          <ul className="mt-4 space-y-3">
            {openAlerts.map((alert) => (
              <li key={alert.id} className="rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-4">
                <p className="text-base font-bold text-foreground">{alert.title}</p>
                <p className="mt-1 text-base text-muted-foreground">{alert.message}</p>
                <Button
                  variant="outline"
                  onClick={() => ackAlert.mutate(alert.id)}
                  className="tap-target mt-3 border-2 text-base font-bold"
                >
                  {t("more.markRead")}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="caregivers-heading" className="mt-6 rounded-3xl border-2 border-border bg-card p-5">
        <h2 id="caregivers-heading" className="text-xl font-bold text-foreground">
          {t("more.caregivers")}
        </h2>
        <ul className="mt-3 space-y-2">
          {(caregivers.data ?? []).map((caregiver) => (
            <li key={caregiver.id} className="flex items-center justify-between gap-3 rounded-2xl bg-secondary p-4">
              <span className="min-w-0">
                <span className="block truncate text-base font-bold text-foreground">{caregiver.name}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {[caregiver.relationship, caregiver.phone].filter(Boolean).join(" · ")}
                </span>
              </span>
              <Button
                variant="ghost"
                onClick={() => removeCaregiver.mutate(caregiver.id)}
                aria-label={`Remove ${caregiver.name}`}
                className="tap-target size-14 shrink-0 p-0"
              >
                <Trash2 aria-hidden="true" className="size-6" />
              </Button>
            </li>
          ))}
        </ul>

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) addCaregiver.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="cg-name" className="text-base font-semibold">
              Caregiver name
            </Label>
            <Input id="cg-name" value={name} onChange={(e) => setName(e.target.value)} className="tap-target text-lg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cg-rel" className="text-base font-semibold">
              Relationship
            </Label>
            <Input
              id="cg-rel"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="tap-target text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cg-phone" className="text-base font-semibold">
              Phone number
            </Label>
            <Input
              id="cg-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="tap-target text-lg"
            />
          </div>
          <Button type="submit" className="tap-target w-full text-lg font-bold">
            {t("more.addCaregiver")}
          </Button>
        </form>
      </section>

      <section aria-labelledby="contact-heading" className="mt-6 rounded-3xl border-2 border-border bg-card p-5">
        <h2 id="contact-heading" className="text-xl font-bold text-foreground">
          {t("more.emergencyContact")}
        </h2>
        <p className="mt-1 text-base text-muted-foreground">
          Currently: {profile.data?.emergency_contact_name || "not set"}{" "}
          {profile.data?.emergency_contact_phone ? `· ${profile.data.emergency_contact_phone}` : ""}
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            saveContact.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="ec-name" className="text-base font-semibold">
              Name
            </Label>
            <Input
              id="ec-name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="tap-target text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ec-phone" className="text-base font-semibold">
              Phone number
            </Label>
            <Input
              id="ec-phone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="tap-target text-lg"
            />
          </div>
          <Button type="submit" className="tap-target w-full text-lg font-bold">
            {t("more.saveContact")}
          </Button>
        </form>
      </section>

      <Button variant="outline" onClick={signOut} className="tap-target mt-6 w-full border-2 text-lg font-bold">
        <LogOut aria-hidden="true" className="size-5" />
        {t("more.signOut")}
      </Button>
    </AppShell>
  );
}
