#!/usr/bin/python3
'''
November 2025
@procopim
'''

import sys
import logging
import os
import requests
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig
from dotenv import load_dotenv
from requests import Session

# Load environment variables from .env file
load_dotenv()

# Get API base URL from environment, with fallback
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3000')
PROXY = os.getenv('PROXY', '')
PROXY_AUTH = os.getenv('PROXY_AUTH', '')

# Set up logging to file
logging.basicConfig(
    filename='transcript_fetcher.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def extract_video_id(url):
    # Simple extraction of video ID from YouTube URL
    if 'youtu.be/' in url:
        return url.split('youtu.be/')[1].split('?')[0]
    elif 'youtube.com/watch?v=' in url:
        return url.split('v=')[1].split('&')[0]
    elif 'youtube.com/live/' in url:
        return url.split('youtube.com/live/')[1].split('?')[0]
    elif 'youtube.com/embed/' in url:
        return url.split('youtube.com/embed/')[1].split('?')[0]
    elif 'youtube.com/v/' in url:
        return url.split('youtube.com/v/')[1].split('?')[0]
    else:
        raise ValueError("Invalid YouTube URL")

def fetch_transcript(url):
    try:
        httpclient=Session()
        video_id = extract_video_id(url)
        ytt_api = YouTubeTranscriptApi(proxy_config=GenericProxyConfig(
            http_url=f"http://{PROXY_AUTH}@{PROXY}",
            https_url=f"http://{PROXY_AUTH}@{PROXY}"))
        print("Fetching transcript for video ID:", video_id)
        transcript = ytt_api.fetch(video_id)
        print(len(transcript))
        logging.info(f"Transcript fetched for: {video_id}")
        # Format as "start|text\nstart|text..." for AI with timestamps
        timestamped_text = '\n'.join([f"{snippet.start:.1f}|{snippet.text}" for snippet in transcript])
        logging.info(f"Successfully fetched and formatted transcript for URL: {url}")
        return {
            'video_id': video_id,
            'url': url,
            'transcript_text': timestamped_text,
            'language': getattr(transcript, 'language_code', 'en'),  # Default to 'en' if missing
            'is_generated': getattr(transcript, 'is_generated', False),  # Default to False if missing
        }
    except Exception as e:
        error_msg = f"Error fetching transcript for URL {url}: {str(e)}"
        logging.error(error_msg)
        return None

def post_transcript(data):
    try:
        endpoint = f"{API_BASE_URL}/api/transcripts/store"
        response = requests.post(endpoint, json=data)
        if response.status_code == 201:
            logging.info(f"Successfully posted transcript for video_id: {data['video_id']}")
            return True
        else:
            logging.error(f"Failed to post transcript for video_id {data['video_id']}: {response.status_code} - {response.text} (endpoint: {endpoint})")
            return False
    except Exception as e:
        logging.error(f"Error posting transcript for video_id {data['video_id']}: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python yt_transcript_fetcher.py <youtube_url>")
        sys.exit(1)

    url = sys.argv[1]

    data = fetch_transcript(url)
    if data:
        success = post_transcript(data)
        if success:
            print("Transcript fetched and stored successfully.")
        else:
            print("Transcript fetched but failed to store.")
    else:
        print("Failed to fetch transcript.")

