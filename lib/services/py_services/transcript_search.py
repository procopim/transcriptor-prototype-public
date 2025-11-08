import os
import requests
import logging
from dotenv import load_dotenv

# Load environment variables (e.g., API keys from .env)
load_dotenv()

# xAI API details
XAI_API_KEY = os.getenv('XAI_API_KEY')  # Your xAI API key
XAI_BASE_URL = os.getenv('XAI_BASE_URL')  # xAI's API endpoint
MODEL = os.getenv('XAI_MODEL')  # Specify Grok model

# Get API base URL from environment, with fallback
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3000')

# Set up logging to file
logging.basicConfig(
    filename='transcript_search.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def get_transcript_from_api(video_id):
    """
    Fetches the transcript from your Next.js API.
    Why? The script needs the transcript data. We call the new GET route we'll create.
    This assumes your Next.js app is running on localhost:3000.
    """
    url = f"{API_BASE_URL}/api/transcripts/{video_id}"
    response = requests.get(url)
    if response.status_code == 200:
        logging.info(f"fetched transcript 200  videoId: {video_id}")
        data = response.json()
        return data.get('transcript_text', '')  # Assuming the API returns {'transcript_text': '...'}
    else:
        raise Exception(f"Failed to fetch transcript: {response.status_code} - {response.text}")

def search_transcript_with_grok(video_id, question):
    """
    Main function: Grab transcript, pass to Grok3, get answer.
    """
    # Step 1: Grab the transcript
    transcript = get_transcript_from_api(video_id)
    if not transcript:
        return "No transcript found."

    # Step 2: Define LLM rules in the prompt
    # Why here? LLM "rules" are instructions in the system/user message. We tell it to be succinct and format with timestamps.
    system_prompt = """
    You are an AI assistant for searching YouTube transcripts. The transcript is provided in the format: "start_time|text...".
    Answer the user's question based on the transcript. Be succinct; do not provide any preamble, only an answer in the format indicated below. 
    Do not add extra commentary. Please adhere strictly to the response format below. 
    Response format:
    start_time: answer
    where "start_time" is the timestamp directly from the transcript, and "answer" corresponds to the answer you are giving.
    The purpose is for the user to be able to pinpoint an exact moment/moments in the video that answers their question.
    """

    user_prompt = f"Transcript: {transcript}\n\nQuestion: {question}"

    # Step 3: Make connection with Grok3
    headers = {
        'Authorization': f'Bearer {XAI_API_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {
        'model': MODEL,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt}
        ],
        'max_tokens': 500,  # Limit response length for succinctness
        'temperature': 0.1  # Low for factual answers
    }

    response = requests.post(f'{XAI_BASE_URL}/chat/completions', headers=headers, json=payload)
    if response.status_code == 200:
        logging.info(f"Grok3 response 200 received for videoId: {video_id}")
        data = response.json()
        return data['choices'][0]['message']['content']
    else:
        raise Exception(f"Grok3 API error: {response.status_code} - {response.text}")

# Example usage (run this script directly for testing)
if __name__ == '__main__':
    video_id = 'yJnpb5Ekkvk'  # Replace with real ID
    question = 'tell me the names of the books discussed in this video'
    logging.info(f"starting script with video id: {video_id}")
    result = search_transcript_with_grok(video_id, question)
    print(result)