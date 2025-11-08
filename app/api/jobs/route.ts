import { NextResponse, NextRequest } from "next/server";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, source_url } = body;

    if (!question || !source_url) {
      return NextResponse.json({ error: "Question and source_url required" }, { status: 400 });
    }

    // Insert job with status 'submitted'
    const [job] = await sql`
      INSERT INTO jobs (question, source_url, status, job_type, job_args)
      VALUES (${question}, ${source_url}, 'submitted', 'transcript_search', ${JSON.stringify({ question, url: source_url })})
      RETURNING id
    `;

    // Notify coordinator to enqueue
    try {
      const coordinatorResponse = await fetch('http://localhost:8000/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id.toString() }),
      });

      if (!coordinatorResponse.ok) {
        console.error('Coordinator enqueue failed:', await coordinatorResponse.text());
        // Don't fail the job creation, just log
      }
    } catch (error) {
      console.error('Error calling coordinator:', error);
      // Continue, job is created
    }

    return NextResponse.json({ id: job.id, message: "Job created and enqueued" });
  } catch (error) {
    console.error('Create job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}