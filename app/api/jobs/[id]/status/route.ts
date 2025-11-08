import { NextResponse, NextRequest } from "next/server";
import { updateJob } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, progress, result, error } = body;

    if (status && !['queued', 'processing', 'fetched', 'done', 'error'].includes(status)) {
      return NextResponse.json({ error: "Valid status required" }, { status: 400 });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (progress !== undefined) updates.progress = progress;
    if (result !== undefined) updates.result = result;
    if (error !== undefined) updates.error = error;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    await updateJob(id, updates);
    return NextResponse.json({ message: "Status updated" });
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}