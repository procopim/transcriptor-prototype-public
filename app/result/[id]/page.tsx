'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Job }  from '@/lib/db';

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    console.log('Fetching initial job data for', id);
    // Fetch initial job status
    fetch(`/api/result/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.message === 'Not found') {
          setError('Job not found');
        } else {
          setJob(data);
        }
        setLoading(false);
        console.log('Initial job data', data);
      })
      .catch(err => {
        console.error('Error fetching job', err);
        setError('Failed to load job');
        setLoading(false);
      });

    console.log('Connecting to SSE for', id);
    // Connect to SSE for real-time updates
    const eventSource = new EventSource(`/api/jobs/${id}/events`);

    eventSource.onopen = () => console.log('SSE connection opened');
    eventSource.onmessage = (event) => {
      console.log('SSE raw message', event.data);
      const parsed = JSON.parse(event.data);
      console.log('SSE message received', parsed.type, parsed.data);
      if (parsed.type === 'progress') {
        setJob(prev => prev ? { ...prev, progress: parsed.data } : null);
      } else if (parsed.type === 'status') {
        setJob(prev => prev ? { ...prev, status: parsed.data } : null);
      } else if (parsed.type === 'done') {
        setJob(prev => prev ? { ...prev, status: 'done', result: parsed.data } : null);
      } else if (parsed.type === 'error') {
        setJob(prev => prev ? { ...prev, status: 'error', error: parsed.data } : null);
      }
    };

    eventSource.onerror = (error) => {
      console.log('SSE error, falling back to polling', error);
      // Fallback to polling if SSE fails
      const poll = setInterval(() => {
        console.log('Polling for updates');
        fetch(`/api/result/${id}`)
          .then(res => res.json())
          .then(data => {
            console.log('Polled data', data);
            setJob(data);
            if (data.status === 'done' || data.status === 'error') {
              clearInterval(poll);
            }
          });
      }, 2000);

      return () => clearInterval(poll);
    };

    return () => {
      console.log('Closing SSE connection');
      eventSource.close();
    };
  }, [id]);

  const copyToClipboard = async () => {
    if (job?.result) {
      try {
        await navigator.clipboard.writeText(job.result);
        alert('Copied to clipboard!');
      } catch (err) {
        alert('Failed to copy');
      }
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>;
  if (!job) return <div className="flex justify-center items-center min-h-screen">Job not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Job Result: {job.id}
        </h1>

        {job.status === 'queued' && (
          <div className="text-center">
            <p className="text-lg text-gray-600 dark:text-gray-400">Job is queued...</p>
          </div>
        )}

        {job.status === 'processing' && (
          <div className="text-center">
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">Processing... {job.progress}%</p>
            <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {job.status === 'error' && (
          <div className="text-center">
            <p className="text-lg text-red-500">Error: {job.error}</p>
          </div>
        )}

        {job.status === 'done' && job.result && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Result</h2>
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Copy
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded p-4 bg-gray-50 dark:bg-gray-700">
              <pre className="whitespace-pre-wrap text-gray-900 dark:text-white">{job.result}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}