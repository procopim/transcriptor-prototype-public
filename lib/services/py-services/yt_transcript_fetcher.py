#!/usr/bin/python3
'''
November 2025
@procopim
'''

import sys
import logging
import requests
from youtube_transcript_api import YouTubeTranscriptApi

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
    else:
        raise ValueError("Invalid YouTube URL")

def fetch_transcript(url):
    try:
        video_id = extract_video_id(url)
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id)
        logging.info(f"Transcript fetched for: {video_id}")
        # Format as "start|text\nstart|text..." for AI with timestamps
        timestamped_text = '\n'.join([f"{snippet.start:.1f}|{snippet.text}" for snippet in transcript])
        logging.info(f"Successfully fetched and formatted transcript for URL: {url}")
        return {
            'videoId': video_id,
            'url': url,
            'transcriptText': timestamped_text,
            'language': getattr(transcript, 'language_code', 'en'),  # Default to 'en' if missing
            'isGenerated': getattr(transcript, 'is_generated', False),  # Default to False if missing
        }
    except Exception as e:
        error_msg = f"Error fetching transcript for URL {url}: {str(e)}"
        logging.error(error_msg)
        return None

def post_transcript(data):
    try:
        response = requests.post('http://localhost:3000/api/transcripts/store', json=data)
        if response.status_code == 201:
            logging.info(f"Successfully posted transcript for videoId: {data['videoId']}")
            return True
        else:
            logging.error(f"Failed to post transcript for videoId {data['videoId']}: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        logging.error(f"Error posting transcript for videoId {data['videoId']}: {str(e)}")
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

