-- Create jobs table for transcript processing
CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(255) PRIMARY KEY,
  question TEXT NOT NULL,
  source_url TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  result TEXT,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

-- Create transcripts table for storing fetched YouTube transcripts
CREATE TABLE IF NOT EXISTS transcripts (
  id SERIAL PRIMARY KEY,
  video_id VARCHAR(50) NOT NULL UNIQUE,
  url TEXT NOT NULL,
  transcript_text TEXT NOT NULL,  -- Timestamped text: "start|text\nstart|text..." for AI and positional recall
  language VARCHAR(10) DEFAULT 'en',
  is_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups on video_id
CREATE INDEX IF NOT EXISTS idx_transcripts_video_id ON transcripts(video_id);