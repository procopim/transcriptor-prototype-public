import { NextResponse, NextRequest } from "next/server";
import { getJob } from "@/lib/db";
import { Job } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return NextResponse.json({ message: "Not found" }, { status: 404 });

  // Example response shape
  const response: Job = {
    id: job.id,
    question: job.question,
    source_url: job.source_url,
    status: job.status,
    progress: job.progress,
    result: job.result,
    error: job.error,
    created_at: job.created_at,
    updated_at: job.updated_at,
  };
  return NextResponse.json(response);
}