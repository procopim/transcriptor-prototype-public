import postgres from 'postgres';
import { publishJobEvent, closeRedis } from './redis-pubsub';
import { Job, Transcript } from './types';
import { JobDTO, TranscriptDTO } from './dto';

// Initialize Postgres client
const sql = postgres(process.env.DATABASE_URL!);

// Create job
export async function createJob(job: JobDTO): Promise<void> {
  const now = new Date();
  await sql`
    INSERT INTO jobs (id, question, source_url, status, progress, result, error, created_at, updated_at)
    VALUES (${job.id}, ${job.question}, ${job.source_url}, ${job.status}, ${job.progress}, ${job.result ?? null}, ${job.error ?? null}, ${now}, ${now})
  `;
}

// Get job by ID
export async function getJob(id: string): Promise<JobDTO | null> {
  const rows = await sql<Job[]>`
    SELECT id, question, source_url, status, progress, result, error, created_at, updated_at
    FROM jobs WHERE id = ${id}
  `;
  return rows[0] ? JobDTO.fromDatabaseRow(rows[0]) : null;
}

// Update job (used by job processor)
export async function updateJob(id: string, updates: Partial<Pick<Job, 'status' | 'progress' | 'result' | 'error'>>): Promise<void> {
  const validatedUpdates = JobDTO.validateUpdate(updates);
  const now = new Date();
  const keys = Object.keys(validatedUpdates);
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const query = `UPDATE jobs SET ${setClause}, updated_at = $${keys.length + 1} WHERE id = $${keys.length + 2}`;
  const values = [...keys.map(key => (validatedUpdates as any)[key]), now, id];

  await sql.unsafe(query, values);

  // Publish event to Redis
  console.log('Publishing event for job', id, validatedUpdates);
  const job = await getJob(id);
  await publishJobEvent(id, validatedUpdates);
}

// Get transcript by videoId
export async function getTranscriptByVideoId(videoId: string): Promise<TranscriptDTO | null> {
  const rows = await sql<Transcript[]>`
    SELECT id, video_id, url, transcript_text, language, is_generated, created_at, updated_at
    FROM transcripts WHERE video_id = ${videoId}
  `;
  return rows[0] ? TranscriptDTO.fromDatabaseRow(rows[0]) : null;
}

// Close DB connection (call on app shutdown)
export async function closeDb(): Promise<void> {
  await sql.end();
  await closeRedis();
}

// Insert transcript
export async function insertTranscript(transcript: TranscriptDTO): Promise<void> {
  const now = new Date();
  await sql`
    INSERT INTO transcripts (video_id, url, transcript_text, language, is_generated, created_at, updated_at)
    VALUES (${transcript.video_id}, ${transcript.url}, ${transcript.transcript_text}, ${transcript.language ?? 'en'}, ${transcript.is_generated ?? false}, ${now}, ${now})
    ON CONFLICT (video_id) DO NOTHING
  `;

}