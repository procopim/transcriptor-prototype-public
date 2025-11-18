import { NextResponse, NextRequest } from "next/server";
import { createJob } from "@/lib/db";
import { nanoid } from "nanoid";

// API route to create a new search job, validate input, and POST to the python enqueue service

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const source_url = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";

  const errors: { field: string; message: string }[] = [];
  if (!question) errors.push({ field: "question", message: "Question is required" });
  if (question.length > 120) errors.push({ field: "question", message: "Must be ≤120 chars" });

  try {
    const u = new URL(source_url);
    if (!["http:", "https:"].includes(u.protocol)) {
      errors.push({ field: "source_url", message: "URL must be http or https" });
    }
    // Enforce allowed hosts / block internal IP ranges here (SSRF protection).
    if (!["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com", "music.youtube.com"].includes(u.hostname)) {
      errors.push({ field: "source_url", message: "URL must be from YouTube" });
    }
  } catch {
    errors.push({ field: "source_url", message: "Invalid URL" });
  }

  if (errors.length) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const id = nanoid(12); //create jobid
  await createJob({
    id,
    question,
    source_url,
    status: "submitted",
    progress: 0,
  });

  // Enqueue the job; POST to the python enqueue service, awaits on DB insertion
  const enqueueUrl = process.env.ENQUEUE_URL || 'http://localhost:8000/enqueue';
  const enqueueResponse = await fetch(enqueueUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: id }),
  });

  if (!enqueueResponse.ok) {
    console.error('Failed to enqueue job');
    // Update job status to error
    try {
      await fetch(`${process.env.API_BASE_URL}/api/jobs/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'error' }),
      });
    } catch (updateError) {
      console.error('Failed to update job status to error:', updateError);
    }
    return NextResponse.json({ error: 'Failed to enqueue job' }, { status: 500 });
  }

  return NextResponse.json({ id }, { status: 202 });
}