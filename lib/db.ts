import postgres from 'postgres';
import { createClient } from 'redis';

// Initialize Postgres client
const sql = postgres(process.env.DATABASE_URL!);

// Initialize Redis clients for pub/sub (optional for transcripts)
let redisSubscriber: any;
let redisPublisher: any;
try {
  redisSubscriber = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  redisPublisher = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  redisSubscriber.connect().then(() => console.log('Redis subscriber connected')).catch(() => console.log('Redis subscriber not available'));
  redisPublisher.connect().then(() => console.log('Redis publisher connected')).catch(() => console.log('Redis publisher not available'));
} catch {
  console.log('Redis not available, skipping pub/sub');
}

// Job interface
export interface Job {
  id: string;
  question: string;
  sourceUrl: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  result?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Transcript interface
export interface Transcript {
  id?: number;
  videoId: string;
  url: string;
  transcriptText: string;  // Now: "start|text\nstart|text..." format
  language?: string;
  isGenerated?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Map to store callbacks for each job channel
const jobCallbacks = new Map<string, ((evt: { type: string; data: any }) => void)[]>();

// Create job
export async function createJob(job: Omit<Job, 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = new Date();
  await sql`
    INSERT INTO jobs (id, question, source_url, status, progress, result, error, created_at, updated_at)
    VALUES (${job.id}, ${job.question}, ${job.sourceUrl}, ${job.status}, ${job.progress}, ${job.result ?? null}, ${job.error ?? null}, ${now}, ${now})
  `;
}

// Get job by ID
export async function getJob(id: string): Promise<Job | null> {
  const rows = await sql<Job[]>`
    SELECT id, question, source_url as sourceUrl, status, progress, result, error, created_at as createdAt, updated_at as updatedAt
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
  if (job && redisPublisher) {
    const channel = `job:${id}`;
    try {
      if (updates.status && updates.status !== 'done' && updates.status !== 'error') {
        await redisPublisher.publish(channel, JSON.stringify({ type: 'status', data: updates.status }));
      }
      if (updates.progress !== undefined) {
        await redisPublisher.publish(channel, JSON.stringify({ type: 'progress', data: updates.progress }));
      }
      if (updates.status === 'done' && job.result) {
        await redisPublisher.publish(channel, JSON.stringify({ type: 'done', data: job.result }));
      }
      if (updates.status === 'error' && job.error) {
        await redisPublisher.publish(channel, JSON.stringify({ type: 'error', data: job.error }));
      }
    } catch (error) {
      console.error('Failed to publish to Redis:', error);
      // Continue without failing the update
    }
  }
}

// Subscribe to job events
export async function subscribeToJob(id: string, callback: (evt: { type: string; data: any }) => void): Promise<() => void> {
  if (!redisSubscriber) return () => {}; // No-op if Redis not available

  const channel = `job:${id}`;

  // Add callback to the map
  if (!jobCallbacks.has(channel)) {
    jobCallbacks.set(channel, []);
    // Subscribe to the channel in Redis
    console.log(`Subscribing to Redis channel: ${channel}`);
    await redisSubscriber.subscribe(channel, (message: string, ch: string) => {
      console.log(`Received message on channel ${ch}:`, message);
      const callbacks = jobCallbacks.get(ch);
      if (callbacks) {
        const evt = JSON.parse(message);
        callbacks.forEach(cb => cb(evt));
      }
    });
  }
  jobCallbacks.get(channel)!.push(callback);
  console.log(`Added callback for channel ${channel}, total callbacks: ${jobCallbacks.get(channel)!.length}`);

  // Return unsubscribe function
  return () => {
    const callbacks = jobCallbacks.get(channel);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        console.log(`Removed callback for channel ${channel}, remaining: ${callbacks.length}`);
      }
      if (callbacks.length === 0) {
        jobCallbacks.delete(channel);
        redisSubscriber.unsubscribe(channel);
        console.log(`Unsubscribed from Redis channel: ${channel}`);
      }
    }
  };
}

// Close DB connection (call on app shutdown)
export async function closeDb(): Promise<void> {
  await sql.end();
  if (redisSubscriber) await redisSubscriber.quit();
  if (redisPublisher) await redisPublisher.quit();
}

// Insert transcript
export async function insertTranscript(transcript: Omit<Transcript, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = new Date();
  await sql`
    INSERT INTO transcripts (video_id, url, transcript_text, language, is_generated, created_at, updated_at)
    VALUES (${transcript.videoId}, ${transcript.url}, ${transcript.transcriptText}, ${transcript.language ?? 'en'}, ${transcript.isGenerated ?? false}, ${now}, ${now})
  `;
}