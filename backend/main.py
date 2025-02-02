# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from rag import RAGApplication
from kokoro import KPipeline
import soundfile as sf
import numpy as np
import io
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Define request models
class QueryRequest(BaseModel):
    question: str

class UserContext(BaseModel):
    age: str
    gender: str
    goal: str
    profession: str

# Constants
API_KEY = os.getenv("gemini_api")
VECTOR_STORE_PATH = 'vectorDB'

# Initialize TTS pipeline
tts_pipeline = KPipeline(lang_code='a')

# Create FastAPI app
app = FastAPI(
    title="RAG API",
    description="Simple RAG Application with TTS",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG
rag = RAGApplication(api_key=API_KEY)
rag.load_vector_store(VECTOR_STORE_PATH, allow_dangerous_deserialization=True)

def generate_audio(text):
    """Generate audio from text using Kokoro TTS."""
    audio_segments = []
    generator = tts_pipeline(text, voice='af_heart', speed=1, split_pattern=r'\n+')
    
    for _, _, audio in generator:
        audio_segments.append(audio)
    
    final_audio = np.concatenate(audio_segments)
    return final_audio

def create_audio_response(audio_data):
    """Create a streaming response for audio data."""
    # Create in-memory buffer
    audio_buffer = io.BytesIO()
    
    # Save audio to buffer
    sf.write(audio_buffer, audio_data, 24000, format='wav')
    
    # Seek to beginning of buffer
    audio_buffer.seek(0)
    
    return StreamingResponse(
        audio_buffer,
        media_type="audio/wav",
        headers={
            "Content-Disposition": "attachment; filename=response.wav"
        }
    )

@app.post("/query-with-tts/",
         summary="Query the RAG system with TTS response",
         description="Submit a question and get both text and audio response")
async def query_rag_with_tts(request: QueryRequest):
    """Query endpoint that returns both text and audio response."""
    try:
        # Get text response from RAG
        text_answer = rag.query(request.question)
        
        # Generate audio from text
        audio_data = generate_audio(text_answer)
        
        # Create streaming response
        return create_audio_response(audio_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.post("/query/",
         response_model=dict,
         summary="Query the RAG system",
         description="Submit a question to the RAG system")
async def query_rag(request: QueryRequest):
    """Query endpoint for text-only response."""
    try:
        answer = rag.query(request.question)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.post("/user-context/",
         response_model=dict,
         summary="Submit user context",
         description="Submit user details like age, gender, goal, and profession")
async def submit_user_context(context: UserContext):
    """Endpoint to receive and process user context."""
    try:
        user_data = {
            "age": context.age,
            "gender": context.gender,
            "goal": context.goal,
            "profession": context.profession
        }
        return {"message": "User context received successfully", "data": user_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing user context: {str(e)}")