import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateJob } from '@/lib/db';

// Schema for job update payload (partial updates allowed)
const jobUpdateSchema = z.object({
  status: z.enum(['queued', 'processing', 'done', 'error']).optional(),
  progress: z.number().min(0).max(100).optional(),
  result: z.string().optional(),
  error: z.string().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate and parse with Zod
    const updates = jobUpdateSchema.parse(body);

    // Update the job in the database
    await updateJob(id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error updating job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}