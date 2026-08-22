import { NextRequest, NextResponse } from "next/server";
import { firebaseReady, submitQuestionnaireEntry, type QuestionnairePayload } from "@/lib/firebase";

type FormWebhookPayload = {
  source?: string;
  submittedAt?: string;
  response?: string;
  [key: string]: unknown;
};

type QuestionnaireEntry = {
  id: string;
  text: string;
  submittedAt: string;
  source: string;
};

const questionnaireMemory = new Map<string, QuestionnaireEntry>();

function normalizePayload(payload: unknown): FormWebhookPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Webhook payload must be a JSON object.");
  }

  const record = payload as Record<string, unknown>;

  return {
    source: typeof record.source === "string" ? record.source : "google-form",
    submittedAt:
      typeof record.submittedAt === "string"
        ? record.submittedAt
        : new Date().toISOString(),
    response:
      typeof record.response === "string"
        ? record.response
        : typeof record.answer === "string"
          ? record.answer
          : "",
    ...record,
  };
}

export function getQuestionnaireEntries(): QuestionnaireEntry[] {
  return Array.from(questionnaireMemory.values()).sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawPayload = await request.json();
    const payload = normalizePayload(rawPayload);

    const responseText = String(payload.response ?? "").trim();
    if (!responseText) {
      throw new Error("Webhook payload must include a non-empty response.");
    }

    const entry: QuestionnaireEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text: responseText,
      submittedAt: payload.submittedAt ?? new Date().toISOString(),
      source: payload.source ?? "google-form",
    };

    questionnaireMemory.set(entry.id, entry);

    // Attempt to persist to Firestore if available. Do not fail the webhook if Firestore write errors.
    if (firebaseReady) {
      try {
        const qPayload: QuestionnairePayload = {
          text: entry.text,
          submittedAt: entry.submittedAt,
          source: entry.source,
        };

        const result = await submitQuestionnaireEntry(qPayload);
        console.log("Firestore write result:", result);
      } catch (err) {
        console.error("Error writing to Firestore:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Form payload received and queued for processing.",
      receivedAt: new Date().toISOString(),
      payload: entry,
    });
  } catch (error) {
    console.error("Form webhook error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Invalid request body.",
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Questionnaire webhook endpoint is active.",
    expected: "POST a JSON payload from Google Apps Script or your form source.",
    entries: getQuestionnaireEntries(),
  });
}
