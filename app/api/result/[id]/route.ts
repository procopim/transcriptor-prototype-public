import { NextResponse, NextRequest } from "next/server";
import { getJob } from "@/lib/db";
import { JobDTO } from "@/lib/dto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json(job.toJSON());
}