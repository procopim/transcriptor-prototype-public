import { NextResponse, NextRequest } from "next/server";
import { getJob } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return NextResponse.json({ message: "Not found" }, { status: 404 });

  // Example response shape
  return NextResponse.json({
    id: job.id,
    status: job.status, // "submitted" | "queued" | "processing" | "done" | "error"
    progress: job.progress ?? 0,
    result: job.result ?? null, // when done
    error: job.error ?? null,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  });
}