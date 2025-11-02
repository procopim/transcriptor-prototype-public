import { NextResponse } from "next/server";
import { updateJob } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Test update for job', id);
    // Simulate progress update
    await updateJob(id, { progress: 50 });
    console.log('Update successful');
    return NextResponse.json({ message: "Updated" });
  } catch (error) {
    console.error('Test update error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}