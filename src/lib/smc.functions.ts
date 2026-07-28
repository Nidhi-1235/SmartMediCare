import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ASSISTANT_PROMPT,
  MEDICINE_SCAN_PROMPT,
  PRESCRIPTION_PROMPT,
  SAFETY_PROMPT,
  callAi,
  extractJson,
} from "./ai.server";
import type { MedicineScanResult, PrescriptionResult, SafetyResult } from "./ai-types";

export const scanMedicineImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageDataUrl: string }) => {
    if (!input?.imageDataUrl?.startsWith("data:image/")) throw new Error("A photo is required.");
    return input;
  })
  .handler(async ({ data }): Promise<MedicineScanResult> => {
    const raw = await callAi([
      { role: "system", content: MEDICINE_SCAN_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Read this medicine package and return the JSON object." },
          { type: "image_url", image_url: { url: data.imageDataUrl } },
        ],
      },
    ]);
    return extractJson<MedicineScanResult>(raw, {
      name: "",
      dosage: "",
      form: "",
      strength: "",
      expiry_date: "",
      instructions: "",
      scanned_text: raw.slice(0, 2000),
      confidence: "low",
      spoken_summary: "I could not read that label clearly. Please try again with more light.",
    });
  });

export const readPrescriptionImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageDataUrl: string }) => {
    if (!input?.imageDataUrl?.startsWith("data:image/")) throw new Error("A photo is required.");
    return input;
  })
  .handler(async ({ data }): Promise<PrescriptionResult> => {
    const raw = await callAi([
      { role: "system", content: PRESCRIPTION_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Read this prescription and return the JSON object." },
          { type: "image_url", image_url: { url: data.imageDataUrl } },
        ],
      },
    ]);
    return extractJson<PrescriptionResult>(raw, {
      doctor_name: "",
      extracted_text: raw.slice(0, 2000),
      spoken_summary: "I could not read that prescription clearly. Please try again.",
      medicines: [],
    });
  });

export const runSafetyCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { medicines: Array<{ name: string; dosage?: string | null; expiry_date?: string | null }> }) => input,
  )
  .handler(async ({ data }): Promise<SafetyResult> => {
    if (!data.medicines?.length) {
      return { alerts: [], spoken_summary: "You have no medicines saved yet, so there is nothing to check." };
    }
    const list = data.medicines
      .map((m) => `- ${m.name}${m.dosage ? `, dose ${m.dosage}` : ""}${m.expiry_date ? `, expires ${m.expiry_date}` : ""}`)
      .join("\n");
    const raw = await callAi([
      { role: "system", content: SAFETY_PROMPT },
      { role: "user", content: `Today is ${new Date().toISOString().slice(0, 10)}.\nPatient medicines:\n${list}` },
    ]);
    return extractJson<SafetyResult>(raw, {
      alerts: [],
      spoken_summary: "I could not complete the safety check right now. Please try again.",
    });
  });

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { question: string; contextText: string }) => {
    if (!input?.question?.trim()) throw new Error("Please ask a question.");
    return input;
  })
  .handler(async ({ data }): Promise<{ answer: string }> => {
    const answer = await callAi([
      { role: "system", content: ASSISTANT_PROMPT },
      {
        role: "user",
        content: `Current time: ${new Date().toString()}\n\nPatient data:\n${data.contextText || "No medicines saved yet."}\n\nQuestion: ${data.question}`,
      },
    ]);
    return { answer: answer.trim() || "Sorry, I did not catch that. Please ask again." };
  });
