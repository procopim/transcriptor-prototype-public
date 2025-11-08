import { NextResponse } from "next/server";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const jobs = await sql`
      SELECT id, question, source_url, status
      FROM jobs
      WHERE status = 'submitted'
    `;
    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Get submitted jobs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}