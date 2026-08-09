// Server-only helpers for Lovable AI Gateway calls. Never imported by the client.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type AiTextPart = { type: "text"; text: string };
export type AiImagePart = { type: "image_url"; image_url: { url: string } };
export type AiContent = string | Array<AiTextPart | AiImagePart>;
export type AiMessage = { role: "system" | "user" | "assistant"; content: AiContent };

export class AiGatewayError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function callAi(messages: AiMessage[], model = "google/gemini-2.5-flash"): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new AiGatewayError("AI is not configured for this app yet.", 500);

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (response.status === 429) {
    throw new AiGatewayError("The assistant is busy right now. Please try again in a moment.", 429);
  }
  if (response.status === 402) {
    throw new AiGatewayError("AI usage limit reached. Please top up AI credits to continue.", 402);
  }
  if (!response.ok) {
    const detail = await response.text();
    throw new AiGatewayError(`The assistant could not respond. ${detail.slice(0, 200)}`, response.status);
  }

  const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return body.choices?.[0]?.message?.content ?? "";
}

/** Pulls the first JSON object out of a model reply, tolerating code fences and prose. */
export function extractJson<T>(raw: string, fallback: T): T {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return fallback;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return fallback;
  }
}

export const MEDICINE_SCAN_PROMPT = `You read photographs of medicine packaging, strips, bottles and labels for a blind user.
Return ONLY a JSON object with this exact shape:
{"name":"","dosage":"","form":"","strength":"","expiry_date":"","instructions":"","scanned_text":"","confidence":"high|medium|low","spoken_summary":""}
Rules:
- expiry_date must be YYYY-MM-DD, or "" if not visible. If only month and year are printed, use the last day of that month.
- form is tablet, capsule, syrup, injection, drops, inhaler, cream or "".
- dosage is the amount per intake if printed (e.g. "1 tablet"), otherwise "".
- scanned_text is the full raw text you can read on the package.
- spoken_summary is one short friendly sentence read aloud to a blind user, naming the medicine, its strength and expiry.
- Never invent details you cannot read. Use "" for anything unreadable and set confidence accordingly.`;

export const PRESCRIPTION_PROMPT = `You read photographs of doctor prescriptions for a blind patient.
Return ONLY a JSON object with this exact shape:
{"doctor_name":"","extracted_text":"","spoken_summary":"","medicines":[{"name":"","dosage":"","instructions":"","times":["08:00"],"duration_days":0}]}
Rules:
- times must be 24-hour "HH:MM" strings inferred from the prescription frequency. Morning 08:00, afternoon 14:00, evening 20:00, night 22:00. 1-0-1 means 08:00 and 20:00.
- duration_days is 0 when not stated.
- extracted_text is everything you can read.
- spoken_summary is one short sentence naming how many medicines were found.
- Never invent a medicine that is not written down.`;

export const SAFETY_PROMPT = `You are a medication safety checker supporting a blind patient. You are NOT a doctor and must always advise confirming with a pharmacist or doctor.
Given the patient's medicine list, return ONLY a JSON object:
{"alerts":[{"alert_type":"interaction|dosage|expiry|duplicate","severity":"critical|warning|info","title":"","message":""}],"spoken_summary":""}
Rules:
- Report only well-established, clinically meaningful issues.
- title is under 8 words. message is one or two plain-language sentences a non-medical person understands.
- If nothing concerning is found, return an empty alerts array and a reassuring spoken_summary.`;

export const ASSISTANT_PROMPT = `You are SmartMediCare, a calm voice assistant for a blind or low-vision person managing their medicines.
- Answer in 1 to 3 short spoken sentences. No lists, no markdown, no symbols that sound odd when read aloud.
- Use the patient's own medicine and schedule data given to you. If the answer is not in that data, say so plainly.
- Never give a diagnosis or change a dose. For medical decisions, tell them to check with their doctor or pharmacist.
- For emergencies, tell them to use the emergency button or call local emergency services.`;

/** Appended to a system prompt so spoken text comes back in the user's language. */
export function languageInstruction(language?: string) {
  const target = (language ?? "").trim() || "English";
  return `\n\nIMPORTANT: Write every human-readable field (spoken_summary, title, message, instructions and any answer text) in ${target}. Keep JSON keys, dates and 24-hour times in their original format.`;
}
