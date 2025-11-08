import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { job_id } = body;

    if (!job_id || typeof job_id !== "string") {
      return NextResponse.json({ error: "job_id required" }, { status: 400 });
    }

    // Spawn enqueuer.py with job_id
    const { spawn } = require('child_process');
    const enqueueProcess = spawn('python', [
      'lib/services/job_coordinator/enqueuer.py',
      job_id
    ], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    enqueueProcess.on('error', (err: Error) => {
      console.error('Failed to run enqueuer:', err);
    });

    return NextResponse.json({ message: "Enqueue initiated" }, { status: 200 });
  } catch (error) {
    console.error('Enqueue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}