import postgres from 'postgres';
import { publishJobEvent, closeRedis } from './redis-pubsub';
import { Job, Transcript } from './types';

// Initialize Postgres client
const sql = postgres(process.env.DATABASE_URL!);

// Create job
export async function createJob(job: Omit<Job, 'created_at' | 'updated_at'>): Promise<void> {
  const now = new Date();
  await sql`
    INSERT INTO jobs (id, question, source_url, status, progress, result, error, created_at, updated_at)
    VALUES (${job.id}, ${job.question}, ${job.source_url}, ${job.status}, ${job.progress}, ${job.result ?? null}, ${job.error ?? null}, ${now}, ${now})
  `;
}

// Get job by ID
export async function getJob(id: string): Promise<Job | null> {
  const rows = await sql<Job[]>`
    SELECT id, question, source_url, status, progress, result, error, created_at, updated_at
    FROM jobs WHERE id = ${id}
  `;
  return rows[0] || null;
}

// Update job (used by job processor)
export async function updateJob(id: string, updates: Partial<Pick<Job, 'status' | 'progress' | 'result' | 'error'>>): Promise<void> {
  const now = new Date();
  const keys = Object.keys(updates);
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const query = `UPDATE jobs SET ${setClause}, updated_at = $${keys.length + 1} WHERE id = $${keys.length + 2}`;
  const values = [...keys.map(key => (updates as any)[key]), now, id];

  await sql.unsafe(query, values);

  // Publish event to Redis
  console.log('Publishing event for job', id, updates);
  const job = await getJob(id);
  await publishJobEvent(id, updates);
}

// Get transcript by videoId
export async function getTranscriptByVideoId(videoId: string): Promise<Transcript | null> {
  const rows = await sql<Transcript[]>`
    SELECT id, video_id, url, transcript_text, language, is_generated, created_at, updated_at
    FROM transcripts WHERE video_id = ${videoId}
  `;
  return rows[0] || null;
}

// Close DB connection (call on app shutdown)
export async function closeDb(): Promise<void> {
  await sql.end();
  await closeRedis();
}

// Insert transcript
export async function insertTranscript(transcript: Omit<Transcript, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
  const now = new Date();
  await sql`
    INSERT INTO transcripts (video_id, url, transcript_text, language, is_generated, created_at, updated_at)
    VALUES (${transcript.video_id}, ${transcript.url}, ${transcript.transcript_text}, ${transcript.language ?? 'en'}, ${transcript.is_generated ?? false}, ${now}, ${now})
    ON CONFLICT (video_id) DO NOTHING
  `;

}