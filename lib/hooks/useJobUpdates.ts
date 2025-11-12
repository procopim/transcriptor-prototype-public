'use client';

import { useState, useEffect, useRef } from 'react';

interface Job {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  result: string | null;
  error: string | null;
}

export function useJobUpdates(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!jobId) return;

    // Fetch initial job data
    const fetchInitial = async () => {
      try {
        console.log('Fetching initial job data for', jobId);
        const res = await fetch(`/api/result/${jobId}`);
        const data = await res.json();
        if (data.message === 'Not found') {
          setError('Job not found');
        } else {
          setJob(data);
        }
        setLoading(false);
        console.log('Initial job data', data);
      } catch (err) {
        console.error('Error fetching job', err);
        setError('Failed to load job');
        setLoading(false);
      }
    };

    fetchInitial();

    // Connect to SSE
    const connectSSE = () => {
      console.log('Connecting to SSE for', jobId);
      const eventSource = new EventSource(`/api/jobs/${jobId}/events`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => console.log('SSE connection opened');

      eventSource.onmessage = (event) => {
        console.log('SSE raw message', event.data);
        const parsed = JSON.parse(event.data);
        console.log('SSE message received', parsed.type, parsed.data);

        setJob(prev => {
          if (!prev) return null;
          const updated = { ...prev };
          if (parsed.type === 'progress') {
            updated.progress = parsed.data;
          } else if (parsed.type === 'status') {
            updated.status = parsed.data;
          } else if (parsed.type === 'done') {
            updated.status = 'done';
            updated.result = parsed.data;
            // Close SSE immediately on done
            eventSource.close();
            eventSourceRef.current = null;
          } else if (parsed.type === 'error') {
            updated.status = 'error';
            updated.error = parsed.data;
            // Close SSE on error
            eventSource.close();
            eventSourceRef.current = null;
          }
          return updated;
        });
      };

      eventSource.onerror = (error) => {
        console.log('SSE error, falling back to polling', error);
        // Close SSE on error
        eventSource.close();
        eventSourceRef.current = null;

        // Start polling
        const poll = () => {
          console.log('Polling for updates');
          fetch(`/api/result/${jobId}`)
            .then(res => res.json())
            .then(data => {
              console.log('Polled data', data);
              setJob(data);
              if (data.status === 'done' || data.status === 'error') {
                // Stop polling when done
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
              }
            })
            .catch(err => console.error('Polling error', err));
        };

        poll(); // Initial poll
        pollIntervalRef.current = setInterval(poll, 2000);
      };
    };

    connectSSE();

    // Cleanup function
    return () => {
      if (eventSourceRef.current) {
        console.log('Closing SSE connection');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [jobId]);

  return { job, loading, error };
}