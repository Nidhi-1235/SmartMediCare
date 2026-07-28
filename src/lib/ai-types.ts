export type MedicineScanResult = {
  name: string;
  dosage: string;
  form: string;
  strength: string;
  expiry_date: string;
  instructions: string;
  scanned_text: string;
  confidence: "high" | "medium" | "low";
  spoken_summary: string;
};

export type PrescriptionMedicine = {
  name: string;
  dosage: string;
  instructions: string;
  times: string[];
  duration_days: number;
};

export type PrescriptionResult = {
  doctor_name: string;
  extracted_text: string;
  spoken_summary: string;
  medicines: PrescriptionMedicine[];
};

export type SafetyAlertDraft = {
  alert_type: "interaction" | "dosage" | "expiry" | "duplicate";
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
};

export type SafetyResult = {
  alerts: SafetyAlertDraft[];
  spoken_summary: string;
};
