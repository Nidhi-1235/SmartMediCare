import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SmartMediCare — talking medicine helper" },
      {
        name: "description",
        content: "Scan medicines, hear labels read aloud, get reminders and reach help — built for blind users.",
      },
      { property: "og:title", content: "SmartMediCare — talking medicine helper" },
      {
        property: "og:description",
        content: "Scan medicines, hear labels read aloud, get reminders and reach help — built for blind users.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/home" : "/auth" });
  },
  component: () => null,
});
