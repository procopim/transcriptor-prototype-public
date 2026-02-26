# Python Services (`py_services`)

This directory contained the Python backend services for the Transcriptor prototype. The source files have been removed from this public repository.

---

## Overview

`py_services` handled two core functions:

1. **Fetching YouTube transcripts** 
2. **Processing transcripts**
---

## Files (Removed)

| File | Description |
|------|-------------|
| `yt_transcript_fetcher.py` | Fetches transcripts from YouTube URLs, posts them to storage endpoint|
| `transcript_search.py` | Processes transcript and retrieves results |
| `__init__.py` | Python package initialiser for the `py_services` module. |


## Dependencies

- [`youtube-transcript-api`](https://pypi.org/project/youtube-transcript-api/)
- [`requests`](https://pypi.org/project/requests/)
- [`python-dotenv`](https://pypi.org/project/python-dotenv/)