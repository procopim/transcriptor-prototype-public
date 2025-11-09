#!/usr/bin/env python3
import os
import requests
import logging
from dotenv import load_dotenv
from rq import Queue
from redis import Redis
from time import sleep

# Import job functions
from ..py_services.transcript_search import search_transcript_with_grok
from ..py_services.yt_transcript_fetcher import fetch_transcript, post_transcript, extract_video_id

from .job_helpers_funcs import update_job_status

# Set up logging
logger = logging.getLogger(__name__)

# Load env
load_dotenv()

# API base URL
API_BASE_URL = os.getenv('API_BASE_URL')

# RQ queue
REDIS_QUEUE_URL = os.getenv('REDIS_QUEUE_URL', 'redis://localhost:6379/1')
redis_conn = Redis.from_url(REDIS_QUEUE_URL)
queue = Queue('default', connection=redis_conn)

def job_wrapper(job_id):
    """Wrapper that handles job processing based on status"""
    logger.info(f"Worker picked up job {job_id}")
    try:
        sleep(1)
        # Get job details from API
        response = requests.get(f"{API_BASE_URL}/api/jobs/{job_id}")
        if response.status_code != 200:
            raise Exception(f"Failed to get job details: {response.status_code}")
        
        job = response.json()
        status = job.get('status')
        logger.info(f"Job {job_id} status: {status}")
        
        if status == 'queued':
            # Fetch transcript
            url = job['source_url']
            data = fetch_transcript(url)
            if data:
                success = post_transcript(data)
                if success:
                    update_job_status(job_id, 'fetched', 50)
                    sleep(2)
                    # Requeue for next step
                    try:
                        queue.enqueue(job_wrapper, job_id)
                    except Exception as enqueue_error:
                        logger.error(f"Failed to requeue job {job_id} after fetch: {enqueue_error}")
                        update_job_status(job_id, 'error', error=f'Fetch successful but requeue failed: {enqueue_error}')
                        raise
                else:
                    update_job_status(job_id, 'error', error='Failed to store transcript')
            else:
                update_job_status(job_id, 'error', error='Failed to fetch transcript')
                
        elif status == 'fetched':
            # Search transcript
            video_id = extract_video_id(job['source_url'])
            update_job_status(job_id, 'processing', 70)
            sleep(2)
            question = job['question']
            result = search_transcript_with_grok(video_id, question)
            update_job_status(job_id, 'done', 100, result=result)
            sleep(2)

        else:
            raise Exception(f"Unexpected status for processing: {status}")
        
    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")
        update_job_status(job_id, 'error', error=str(e))
        raise