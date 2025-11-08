#!/usr/bin/env python3
import os
import requests
from dotenv import load_dotenv

# Load env
load_dotenv()

# API base URL
API_BASE_URL = os.getenv('API_BASE_URL')

def update_job_status(job_id, status, progress=None, result=None, error=None):
    """Update job status via API"""
    try:
        payload = {"status": status}
        if progress is not None:
            payload["progress"] = progress
        if result is not None:
            payload["result"] = result
        if error is not None:
            payload["error"] = error
        response = requests.post(f"{API_BASE_URL}/api/jobs/{job_id}/status", json=payload)
        if response.status_code != 200:
            print(f"Failed to update status for job {job_id}: {response.text}")
    except Exception as e:
        print(f"Error updating status for job {job_id}: {e}")