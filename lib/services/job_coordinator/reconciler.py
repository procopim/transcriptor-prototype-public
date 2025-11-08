import os
import requests
from rq import Queue
from redis import Redis
from dotenv import load_dotenv

# Load env
load_dotenv()

# RQ queue
REDIS_QUEUE_URL = os.getenv('REDIS_QUEUE_URL')
queue = Queue(connection=Redis.from_url(REDIS_QUEUE_URL))

# Import task
from tasks import job_wrapper

def reconcile_queue():
    """Repopulate RQ queue from API 'submitted' jobs."""
    api_base = os.getenv('API_BASE_URL')
    response = requests.get(f'{api_base}/api/jobs/submitted')
    if response.status_code != 200:
        print("Failed to get submitted jobs")
        return

    jobs = response.json()
    for job in jobs:
        try:
            queue.enqueue(job_wrapper, job['id'])
            print(f"Re-enqueued job {job['id']}")
        except Exception as e:
            print(f"Failed to re-enqueue job {job['id']}: {e}")

if __name__ == '__main__':
    reconcile_queue()