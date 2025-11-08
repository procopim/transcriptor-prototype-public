import { NextResponse, NextRequest } from "next/server";
import { getJob } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJob(id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    return NextResponse.json(job);
  } catch (error) {
    console.error('Get job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}