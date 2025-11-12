'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MediaSearchForm() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const validate = () => {
    const q = question.trim();
    if (!q) return "Question is required";
    if (q.length > 120) return "Question must be 120 characters or fewer";
    if (!sourceUrl.trim()) return "URL is required";
    try {
      const u = new URL(sourceUrl);
      if (!["http:", "https:"].includes(u.protocol)) return "URL must be http or https";
    } catch {
      return "Invalid URL";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    // Submit to API
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sourceUrl }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.errors?.[0]?.message || 'Failed to create job');
        return;
      }
      const { id } = await response.json();
      // Redirect to result page
      router.push(`/result/${id}`);
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="w-full text-center text-4xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
        Transcriptor helps you recall those elusive details.
      </h1>
      <h2 className="w-full text-center text-xl font-semibold leading-9 text-black dark:text-zinc-50">
        Get started by pasting a Youtube URL and asking a question.
      </h2>
      <div className="h-9" />
      <form onSubmit={handleSubmit} className="w-full max-w-2xl flex flex-col gap-4">
        <input
          className="px-4 py-3 text-base sm:text-lg border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
          type="url"
          placeholder="Paste YouTube URL here..."
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          required
        />
        <input
          className="px-4 py-3 text-base sm:text-lg border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
          type="text"
          placeholder="What are the names of the books discussed?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={120}
          required
        />
        {error && <p className="text-red-500">{error}</p>}
        <button
          className="px-6 py-3 text-lg font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          type="submit"
        >
          Ask
        </button>
      </form>
      <p className="text-xl leading-8 text-zinc-700 dark:text-zinc-400">
        Ask Transcriptor to find those key details that were mentioned.
      </p>
      <p className="text-md leading-15 text-zinc-700 dark:text-zinc-400">
        Have a podcast episode you want to explore? Just paste the link and ask away!
      </p>
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-400 break-words">
        Transcriptor helps you recall details that you might have missed or want to return to.
      </p>
    </div>
  );
}
