import { NextResponse } from "next/server";
import { hasSession } from "@/lib/session";
import { env, OPENAI_BASE } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 300;

// Recebe um pedaço de áudio (mp3, até ~4 MB) e devolve os trechos com tempo.
export async function POST(req: Request) {
  if (!(await hasSession())) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  const offset = Number(form.get("offset") ?? 0);
  if (!(file instanceof Blob)) return NextResponse.json({ error: "Áudio ausente." }, { status: 400 });

  const body = new FormData();
  body.append("file", file, "audio.mp3");
  body.append("model", "whisper-1");
  body.append("response_format", "verbose_json");
  body.append("timestamp_granularities[]", "segment");

  const res = await fetch(`${OPENAI_BASE()}/v1/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("OPENAI_API_KEY")}` },
    body,
    signal: AbortSignal.timeout(280_000),
  });
  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json({ error: `A transcrição falhou (${res.status}): ${text.slice(0, 200)}` }, { status: 502 });
  }
  const data = JSON.parse(text) as { language?: string; segments?: { start: number; end: number; text: string }[] };
  return NextResponse.json({
    offset,
    language: data.language ?? null,
    segments: (data.segments ?? []).map((s) => ({ start: s.start, end: s.end, text: s.text })),
  });
}
