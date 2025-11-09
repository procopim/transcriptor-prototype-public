#!/usr/bin/env python3
import os
import sys
from rq import Worker, Queue
from redis import Redis
from dotenv import load_dotenv

# Import the job function; importing job_wrapper explicitly in the worker at startup, 
# causes tasks module to get loaded into memory, ensuring RQ can access the function when executing jobs. 
from lib.services.job_coordinator.tasks import job_wrapper

# Load env
load_dotenv()

# RQ connection
redis_url = os.getenv('REDIS_QUEUE_URL')
print(f"REDIS_QUEUE_URL: {repr(redis_url)}")
if not redis_url:
    print("Error: REDIS_QUEUE_URL environment variable is not set")
    exit(1)

try:
    redis_conn = Redis.from_url(redis_url)
    print(f"Redis connection created: {redis_conn}")
except Exception as e:
    print(f"Error creating Redis connection: {e}")
    exit(1)

# Queues to listen to
listen = ['default']

if __name__ == '__main__':
    try:
        queue = Queue('default', connection=redis_conn)
        worker = Worker([queue], connection=redis_conn)
        print("Worker started, listening for jobs...")
        worker.work()
    except KeyboardInterrupt:
        print("Worker stopped by user")
    except Exception as e:
        print(f"Worker failed: {e}")
        exit(1)