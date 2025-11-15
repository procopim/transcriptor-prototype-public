'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useJobUpdates } from '@/lib/hooks/useJobUpdates';

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const { job, loading, error } = useJobUpdates(id);

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

  if (loading) return <div className="flex flex-col items-center gap-6 text-center min-h-screen justify-center">Loading...</div>;
  if (error) return <div className="flex flex-col items-center gap-6 text-center min-h-screen justify-center text-red-500">{error}</div>;
  if (!job) return <div className="flex flex-col items-center gap-6 text-center min-h-screen justify-center">Job not found</div>;

  return (
    <div className="flex flex-col items-center gap-6 text-center py-12 px-4">
      <h1 className="w-full text-center text-4xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
        Job Result
      </h1>
      <h2 className="w-full text-center text-xl font-semibold leading-9 text-black dark:text-zinc-50">
        Here are the results for job {job.id}
      </h2>
      <div className="h-9" />
      <div className="w-full max-w-2xl flex flex-col gap-4">

      <div className="w-full max-w-2xl flex flex-col gap-4">
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
                className="px-4 py-2 bg-zinc-900 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Copy
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded p-4 bg-gray-50 dark:bg-gray-700">
              <pre className="whitespace-pre-wrap text-gray-900 dark:text-white">{job.result}</pre>
            </div>
          </div>
        )}
        <Link href="/" className="px-6 py-3 text-lg font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300 self-center mt-4">
          New Ask
        </Link>
      </div>
    </div>
    </div>
  );
}