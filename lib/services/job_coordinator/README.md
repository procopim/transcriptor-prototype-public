# Job Coordinator

This directory contains the job coordination logic for the Transcript Prototype using Redis Queue (RQ). It handles asynchronous processing of transcript search jobs, separating orchestration from business logic.

## Architecture

- **Enqueuer**: Queries 'submitted' jobs from Postgres and enqueues them to RQ.
- **Worker**: RQ worker that pulls jobs and executes task functions.
- **Reconciler**: Repopulates the RQ queue from Postgres after Redis restarts.
- **Integration**: Jobs start as 'submitted' in the API, get enqueued to 'queued', processed to 'done'/'error'.

## Files

- `enqueuer.py`: Enqueues 'submitted' jobs to RQ and updates status to 'queued'.
- `worker.py`: RQ worker entrypoint; runs indefinitely listening for jobs.
- `reconciler.py`: Re-enqueues jobs from DB on Redis restart (no persistence mode).
- `tasks.py`: Task wrapper functions for RQ jobs.
- `__init__.py`: Package marker.

## Dependencies

Install from `../py-services/requirements.txt`:
- `rq`: Redis Queue library
- `redis`: Redis client
- `requests`: HTTP client for API calls
- `python-dotenv`: Environment variables

## Environment Variables

- `REDIS_QUEUE_URL`: Redis URL for RQ (e.g., `redis://localhost:6379/1`)
- `API_BASE_URL`: Base URL for API calls (e.g., `http://localhost:3000`)

## Usage

1. **Install deps**:
   ```
   pip install -r ../py-services/requirements.txt
   ```

2. **Run reconciler** (on Redis start):
   ```
   python reconciler.py
   ```

3. **Start worker**:
   ```
   python worker.py
   ```

4. **Enqueue a job** (called by API):
   ```
   python enqueuer.py <job_id>
   ```

## Task Functions

Workers import and run `job_wrapper` from `tasks.py`, which wraps `process_job` from `../py-services/transcript_search.py` with status updates. The wrapper:
- Sets status to 'processing' before running
- Runs the actual job logic
- Sets status to 'done' on success or 'error' on failure

The underlying `process_job`:
- Fetches/checks transcripts
- Searches with LLM
- Updates DB and publishes SSE events

## Monitoring

- RQ dashboard: `rq-dashboard` (install separately)
- Queue depth: `redis-cli -n 1 llen rq:queue:default`
- Job status: Query Postgres `jobs` table

## Production Notes

- Run worker as systemd service or container.
- Use reconciler on Redis restart if no persistence.
- Scale workers horizontally; RQ handles distribution.