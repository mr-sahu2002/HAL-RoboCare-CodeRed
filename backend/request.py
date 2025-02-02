import requests

# For single stream
response = requests.post(
    "http://localhost:8000/tts/generate",
    json={
        "text": "Hello world",
        "voice": "af_heart",
        "speed": 1.0,
        "return_type": "stream"
    }
)

# For segments
response = requests.post(
    "http://localhost:8000/tts/generate",
    json={
        "text": "Hello\nworld",
        "voice": "af_heart",
        "speed": 1.0,
        "return_type": "segments"
    }
)