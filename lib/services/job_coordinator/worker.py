#!/usr/bin/env python3
import os
from rq import Worker, Queue
from redis import Redis
from dotenv import load_dotenv

# Import the job function
from .tasks import job_wrapper

# Load env
load_dotenv()

# RQ connection
redis_conn = Redis.from_url(os.getenv('REDIS_QUEUE_URL'))

# Queues to listen to
listen = ['default']

if __name__ == '__main__':
    try:
        queue = Queue('default', connection=redis_conn)
        worker = Worker([queue])
        print("Worker started, listening for jobs...")
        worker.work()
    except KeyboardInterrupt:
        print("Worker stopped by user")
    except Exception as e:
        print(f"Worker failed: {e}")
        exit(1)