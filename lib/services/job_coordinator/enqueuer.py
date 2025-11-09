import os
import sys
import requests
from rq import Queue
from redis import Redis
from dotenv import load_dotenv
from time import sleep

from .job_helpers_funcs import update_job_status

'''
This script is called by coordinator_api.py to enqueue a specific job by ID.
errors are printed to stderr and cause exit code 1 on failure, which is caught by coordinator_api.py.
'''

# Load env
load_dotenv()

# RQ queue
REDIS_QUEUE_URL = os.getenv('REDIS_QUEUE_URL')
queue = Queue('default',connection=Redis.from_url(REDIS_QUEUE_URL))

# Import task function
from .tasks import job_wrapper

def enqueue_job(job_id):
    """Enqueue a specific job by ID."""
    print(f"Enqueuer: Starting enqueue for job {job_id}", file=sys.stderr)
    
    # GET job data from API
    api_base = os.getenv('API_BASE_URL')
    print(f"Enqueuer: API_BASE_URL = {api_base}", file=sys.stderr)
    response = requests.get(f'{api_base}/api/jobs/{job_id}')
    print(f"Enqueuer: GET request status = {response.status_code}", file=sys.stderr)
    
    if response.status_code != 200:
        error_msg = f"Failed to get job {job_id}: {response.status_code}"
        print(error_msg, file=sys.stderr)
        sys.exit(1)

    job = response.json()
    print(f"Enqueuer: Job status = {job.get('status')}", file=sys.stderr)
    if job['status'] != 'submitted':
        error_msg = f"Job {job_id} not in submitted status"
        print(error_msg, file=sys.stderr)
        sys.exit(1)

    try:
        print(f"Enqueuer: Attempting to enqueue job {job_id}", file=sys.stderr)
        queue.enqueue(job_wrapper, job_id)
        print(f"Enqueuer: Successfully enqueued job {job_id}", file=sys.stderr)
        # Update status to 'queued' via API
        update_job_status(job_id, 'queued', 20)
        print(f"Enqueuer: Updated job {job_id} status to queued", file=sys.stderr)
        sleep(1)
    except Exception as e:
        error_msg = f"Failed to enqueue job {job_id} to RQ: {e}"
        print(error_msg, file=sys.stderr)
        # Try to update status to error
        try:
            update_job_status(job_id, 'error', error=f'Enqueue failed: {e}')
        except Exception as status_error:
            print(f"Also failed to update job status: {status_error}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python enqueuer.py <job_id>")
        sys.exit(1)
    job_id = sys.argv[1]
    enqueue_job(job_id)