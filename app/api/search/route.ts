import { NextResponse, NextRequest } from "next/server";
import { createJob } from "@/lib/db";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";

  const errors: { field: string; message: string }[] = [];
  if (!question) errors.push({ field: "question", message: "Question is required" });
  if (question.length > 120) errors.push({ field: "question", message: "Must be ≤120 chars" });

  try {
    const u = new URL(sourceUrl);
    if (!["http:", "https:"].includes(u.protocol)) {
      errors.push({ field: "sourceUrl", message: "URL must be http or https" });
    }
    // Enforce allowed hosts / block internal IP ranges here (SSRF protection).
    if (!["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com", "music.youtube.com"].includes(u.hostname)) {
      errors.push({ field: "sourceUrl", message: "URL must be from YouTube" });
    }
  } catch {
    errors.push({ field: "sourceUrl", message: "Invalid URL" });
  }

  if (errors.length) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const id = nanoid(12);
  await createJob({
    id,
    question,
    sourceUrl,
    status: "queued",
    progress: 0,
  });

  // Kick off background processing (queue, async task, etc.)
  // fireAndForgetProcess(id).catch(console.error);

  return NextResponse.json({ id }, { status: 202 });
}