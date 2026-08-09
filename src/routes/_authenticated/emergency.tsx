import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PhoneCall, Siren } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useSpeech, useSpokenIntro } from "@/lib/speech";
import { useI18n } from "@/lib/i18n";
import { caregiversQuery, logEmergency, profileQuery } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency help — SmartMediCare" },
      { name: "description", content: "Call your emergency contact or caregiver instantly from one big button." },
      { property: "og:title", content: "Emergency help — SmartMediCare" },
      { property: "og:description", content: "Call your emergency contact or caregiver instantly from one big button." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmergencyPage,
});

function EmergencyPage() {
  const { speak } = useSpeech();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const profile = useQuery(profileQuery);
  const caregivers = useQuery(caregiversQuery);

  useSpokenIntro(t("emergency.intro"));

  const record = useMutation({
    mutationFn: async (contact: string | null) => logEmergency({ kind: "sos", contact_notified: contact }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emergency_events"] }),
  });

  const primaryPhone = profile.data?.emergency_contact_phone ?? caregivers.data?.[0]?.phone ?? null;
  const primaryName = profile.data?.emergency_contact_name ?? caregivers.data?.[0]?.name ?? null;

  function call(phone: string | null, name: string | null) {
    record.mutate(name ?? phone);
    if (phone) {
      speak(t("emergency.calling", { name: name ?? phone }));
      window.location.href = `tel:${phone}`;
    } else {
      speak(t("emergency.noContactSpoken"));
    }
  }

  return (
    <AppShell title={t("emergency.title")} subtitle={t("emergency.subtitle")}>
      <Button
        onClick={() => call(primaryPhone, primaryName)}
        variant="destructive"
        className="flex h-60 w-full flex-col items-center justify-center gap-3 rounded-3xl text-3xl font-extrabold"
        aria-label={primaryName ? `Call ${primaryName} now` : "No emergency contact saved"}
      >
        <Siren aria-hidden="true" className="size-16" />
        {primaryName ? t("emergency.call", { name: primaryName }) : t("emergency.noContact")}
      </Button>

      <p className="mt-4 text-lg text-muted-foreground">
        {primaryPhone
          ? t("emergency.dial", { phone: primaryPhone })
          : t("emergency.addContact")}
      </p>

      {(caregivers.data ?? []).length ? (
        <section aria-labelledby="caregiver-calls" className="mt-8">
          <h2 id="caregiver-calls" className="text-lg font-bold text-foreground">
            {t("more.caregivers")}
          </h2>
          <ul className="mt-3 space-y-3">
            {(caregivers.data ?? []).map((caregiver) => (
              <li key={caregiver.id}>
                <Button
                  variant="outline"
                  onClick={() => call(caregiver.phone, caregiver.name)}
                  className="tap-target w-full justify-start border-2 text-lg font-bold"
                >
                  <PhoneCall aria-hidden="true" className="size-6" />
                  {caregiver.name}
                  {caregiver.relationship ? ` · ${caregiver.relationship}` : ""}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
