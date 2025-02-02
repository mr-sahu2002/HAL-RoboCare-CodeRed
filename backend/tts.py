from kokoro import KPipeline
from IPython.display import display, Audio
import soundfile as sf
import numpy as np
from datetime import datetime
import os

# 🇺🇸 'a' => American English, 🇬🇧 'b' => British English
pipeline = KPipeline(lang_code='a') # <= make sure lang_code matches voice

# Sample text
text = '''
The sky above the port was the color of television, tuned to a dead channel.
"It's not like I'm using," Case heard someone say, as he shouldered his way through the crowd around the door of the Chat. "It's like my body's developed this massive drug deficiency."
It was a Sprawl voice and a Sprawl joke. The Chatsubo was a bar for professional expatriates; you could drink there for a week and never hear two words in Japanese.

[Kokoro](/kˈOkəɹO/) is an open-weight TTS model with 82 million parameters. Despite its lightweight architecture, it delivers comparable quality to larger models while being significantly faster and more cost-efficient. With Apache-licensed weights, [Kokoro](/kˈOkəɹO/) can be deployed anywhere from production environments to personal projects.'''

# Generate audio
generator = pipeline(
    text, voice='af_heart', # <= change voice here
    speed=1, split_pattern=r'\n+'
)

# Store all audio segments
audio_data = []

for i, (gs, ps, audio) in enumerate(generator):
    print(i)  # i => index
    print(gs) # gs => graphemes/text
    print(ps) # ps => phonemes
    display(Audio(data=audio, rate=24000, autoplay=i==0))
    audio_data.append(audio)

# Concatenate all audio segments into one
final_audio = np.concatenate(audio_data)

# Create 'audio' directory if it doesn't exist
audio_dir = "audio"
os.makedirs(audio_dir, exist_ok=True)

# Generate filename with date and time
timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
filename = os.path.join(audio_dir, f"{timestamp}.wav")

# Save final audio file
sf.write(filename, final_audio, 24000)

print(f"Saved as {filename}")
