import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Siren } from "lucide-react";
import { useSpeech } from "@/lib/speech";

/** Always-reachable emergency button. Long-press-free: one big tap opens the emergency screen. */
export function SosButton() {
  const navigate = useNavigate();
  const { speak } = useSpeech();
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        setPressed(true);
        speak("Opening emergency help.");
        navigate({ to: "/emergency" });
      }}
      aria-label="Emergency help. Opens the emergency screen."
      className="fixed bottom-24 right-4 z-40 flex size-20 flex-col items-center justify-center gap-0.5 rounded-full bg-destructive text-destructive-foreground shadow-xl transition-transform active:scale-95"
      data-pressed={pressed}
    >
      <Siren aria-hidden="true" className="size-7" />
      <span className="text-sm font-extrabold tracking-wide">SOS</span>
    </button>
  );
}
