import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlarmProvider } from "@/lib/alarm";
import { AlarmSetupProvider } from "@/lib/alarm-setup";
import { medicinesQuery } from "@/lib/db";

/** Mounts the dose alarm engine and the spoken alarm-setup flow for signed-in screens. */
export function VoiceRuntime({ children }: { children: ReactNode }) {
  const medicines = useQuery(medicinesQuery);
  return (
    <AlarmProvider>
      <AlarmSetupProvider medicines={medicines.data ?? []}>{children}</AlarmSetupProvider>
    </AlarmProvider>
  );
}
