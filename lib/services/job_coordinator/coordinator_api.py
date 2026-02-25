from fastapi import FastAPI, HTTPException
import subprocess
import sys
import logging
from pydantic import BaseModel
from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()

# Set up logging to file
logging.basicConfig(
    filename='coordinator_api.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logging.info(f"Python executable: {sys.executable}")

app = FastAPI()


class EnqueueRequest(BaseModel):
    '''Request model for enqueueing a job.
    Provides automatic JSON validation and parameter checking.'''
    job_id: str


@app.post("/enqueue")
async def enqueue_job(request: EnqueueRequest):
    """
    Endpoint to enqueue a job by running enqueuer.py with the job_id.
    Retries up to 3 times on failure.
    """
    job_id = request.job_id
    logging.info(f"Received enqueue request for job {job_id}")
    max_retries = 3
    for attempt in range(max_retries):
        try:
            logging.info(f"Attempting to enqueue job {job_id} "
                         f"(attempt {attempt + 1}/{max_retries})")
            cmd = [sys.executable, "-m",
                   "lib.services.job_coordinator.enqueuer", job_id]
            logging.info(f"Running command: {' '.join(cmd)}")
            # Run the script with job_id as argument
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10  # Timeout to prevent hanging
            )
            logging.info(f"Subprocess return code: {result.returncode}")
            logging.info(f"Subprocess stdout: {result.stdout}")
            if result.stderr:
                logging.warning(f"Subprocess stderr: {result.stderr}")

            if result.returncode == 0:
                logging.info(f"Successfully enqueued job {job_id}")
                return {"message": f"Job {job_id} enqueued successfully",
                        "output": result.stdout}
            else:
                error_msg = (f"Enqueue failed on attempt {attempt + 1}: "
                             f"{result.stderr}")
                logging.warning(f"Job {job_id} enqueue failed: {error_msg}")
                if attempt < max_retries - 1:
                    continue  # Retry
                else:
                    msg = (f"Job {job_id} enqueue failed after "
                           f"{max_retries} attempts")
                    logging.error(msg)
                    raise HTTPException(status_code=500, detail=error_msg)

        except subprocess.TimeoutExpired:
            error_msg = f"Enqueue timed out on attempt {attempt + 1}"
            logging.warning(f"Job {job_id} enqueue timeout: {error_msg}")
            if attempt < max_retries - 1:
                continue
            else:
                msg = (f"Job {job_id} enqueue failed after "
                       f"{max_retries} timeouts")
                logging.error(msg)
                raise HTTPException(status_code=500, detail=error_msg)

    # This shouldn't be reached, but just in case
    logging.error(f"Unexpected end of retry loop for job {job_id}")
    detail_msg = (f"Failed to enqueue job {job_id} after "
                  f"{max_retries} attempts")
    raise HTTPException(status_code=500, detail=detail_msg)

if __name__ == "__main__":
    logging.info("Starting coordinator API server on port 8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
