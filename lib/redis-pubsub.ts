import { createClient } from 'redis';

// Initialize Redis clients for pub/sub
let redisSubscriber: any;
let redisPublisher: any;
let subscriberConnected = false;
let publisherConnected = false;
try {
  redisSubscriber = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  redisPublisher = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  redisSubscriber.connect().then(() => {
    if (!subscriberConnected) {
      console.log('Redis subscriber connected');
      subscriberConnected = true;
    }
  }).catch(() => console.log('Redis subscriber not available'));
  redisPublisher.connect().then(() => {
    if (!publisherConnected) {
      console.log('Redis publisher connected');
      publisherConnected = true;
    }
  }).catch(() => console.log('Redis publisher not available'));
} catch {
  console.log('Redis not available, skipping pub/sub');
}

// Map to store callbacks for each job channel
const jobCallbacks = new Map<string, ((evt: { type: string; data: any }) => void)[]>();

// Publish job event to Redis
export async function publishJobEvent(id: string, updates: { status?: string; progress?: number; result?: string; error?: string }): Promise<void> {
  if (!redisPublisher) return;

  const channel = `job:${id}`;
  try {
    if (updates.status && updates.status !== 'done' && updates.status !== 'error') {
      await redisPublisher.publish(channel, JSON.stringify({ type: 'status', data: updates.status }));
    }
    if (updates.progress !== undefined) {
      await redisPublisher.publish(channel, JSON.stringify({ type: 'progress', data: updates.progress }));
    }
    if (updates.status === 'done' && updates.result) {
      await redisPublisher.publish(channel, JSON.stringify({ type: 'done', data: updates.result }));
    }
    if (updates.status === 'error' && updates.error) {
      await redisPublisher.publish(channel, JSON.stringify({ type: 'error', data: updates.error }));
    }
  } catch (error) {
    console.error('Failed to publish to Redis:', error);
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

// Close Redis connections
export async function closeRedis(): Promise<void> {
  if (redisSubscriber) await redisSubscriber.quit();
  if (redisPublisher) await redisPublisher.quit();
}