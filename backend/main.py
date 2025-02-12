from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import io
import base64
from rag import RAGApplication
from PIL import Image
from gtts import gTTS
from langdetect import detect
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Define request models
class QueryRequest(BaseModel):
    question: str

class UserContext(BaseModel):
    age: str
    gender: str
    height: str
    weight: str

# Constants api and vector store path
API_KEY = os.getenv("gemini_api")
VECTOR_STORE_PATH = "vectorDB"

# Create FastAPI app
app = FastAPI(
    title="RAG API",
    description="Simple RAG Application with TTS",
    version="1.0.0"
)

# Enable CORS for all domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG and load vector store
rag = RAGApplication(api_key=API_KEY)
rag.load_vector_store(VECTOR_STORE_PATH, allow_dangerous_deserialization=True)

LANGUAGE_MAP = {
    "en": "en",    # English
    "hi": "hi",    # Hindi
    "ta": "ta",    # Tamil
    "te": "te",    # Telugu
    "kn": "kn",    # Kannada
    "ml": "ml",    # Malayalam
}
# Initialize user context and conversation history
user_context = {}
conversation_history = []

# Define endpoints
@app.post(
    "/user-context/",
    response_model=dict,
    summary="Submit user context",
    description="Submit user details like age, gender, height, and weight",
)
async def submit_user_context(context: UserContext):
    """Endpoint to receive and process user context."""
    try:
        global user_context
        user_context = {
            "age": context.age,
            "gender": context.gender,
            "height": context.height,
            "weight": context.weight,
        }
        
        # Add user context to conversation history
        conversation_history.append({
            "type": "context",
            "data": user_context
        })
        
        return {
            "message": "User context received successfully", 
            "data": user_context
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing user context: {str(e)}")
    
@app.post(
    "/upload-image/",
    summary="Upload and analyze an image",
    description="Upload an image for analysis and add to conversation history"
)
async def upload_image(image: UploadFile = File(...)):
    """
    Endpoint to upload and analyze an image
    """
    try:
        # Read the uploaded image file
        contents = await image.read()
        
        # Open image using Pillow
        image_pil = Image.open(io.BytesIO(contents))
        
        # Convert image to base64 for storage and potential frontend display
        buffered = io.BytesIO()
        image_pil.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        # Use Gemini Vision for image analysis
        genai.configure(api_key=API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Analyze the image
        response = model.generate_content([
            "Describe this image in detail. What objects, scenes, or key elements do you observe? and if any skin infection is present in the image, please describe it.", 
            image_pil
        ])
        
        # Sanitize the image analysis
        image_analysis = response.text.strip()
        
        # Add to conversation history
        conversation_history.append({
            "type": "image",
            "base64": img_base64,
            "analysis": image_analysis
        })
        
        # Return analysis to frontend
        return {
            "message": "Image uploaded successfully", 
            "analysis": image_analysis,
            "base64": img_base64
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


def detect_language(text: str) -> str:
    """
    Detect the language of input text and map it to supported TTS language code.
    Falls back to English if language is not supported.
    """
    try:
        detected = detect(text)
        return LANGUAGE_MAP.get(detected, "en")
    except:
        return "en"  # Default to English if detection fails

def generate_audio(text: str, language: str = None) -> io.BytesIO:
    """
    Generate audio from text using automatically detected language or specified language.
    Falls back to English if the detected/specified language is not supported.
    """
    try:
        # If language not specified, detect it from text
        if not language:
            lang_code = detect_language(text)
        else:
            lang_code = LANGUAGE_MAP.get(language.lower(), "en")
        
        # Create gTTS object
        tts = gTTS(text=text, lang=lang_code, slow=False)
        
        # Save to an in-memory buffer
        audio_buffer = io.BytesIO()
        tts.save("temp.mp3")
        with open("temp.mp3", "rb") as f:
            audio_buffer.write(f.read())
        
        # Prepare buffer for streaming
        audio_buffer.seek(0)
        return audio_buffer
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation error: {str(e)}")
    

@app.post(
    "/query/",
    summary="Query the RAG system with optional TTS response",
    description="Submit a question and get text and optional audio response",
)
async def query_rag(request: QueryRequest):
    """
    Handle chat queries with automatic language detection and TTS
    """
    try:
        # Build context-aware prompt
        context_prompt = build_context_prompt(
            user_context,
            conversation_history,
            request.question
        )
        
        # Get response from RAG system
        text_answer = rag.query(context_prompt)
        
        # Detect language from the question
        detected_language = detect_language(request.question)
        
        # Generate audio with detected language
        audio_buffer = generate_audio(text_answer, detected_language)
        
        # Convert audio buffer to base64
        audio_base64 = base64.b64encode(audio_buffer.getvalue()).decode('utf-8')
        
        # Store in conversation history
        conversation_history.append({
            "type": "text",
            "question": request.question,
            "answer": text_answer,
            "detected_language": detected_language
        })
        
        # Return both text and audio in JSON response
        return JSONResponse({
            "answer": text_answer,
            "audio": audio_base64,
            "detected_language": detected_language
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

# For context-aware prompt
def build_context_prompt(context, history, question):
    """
    Build a context-aware prompt combining user context, conversation history,
    and the current question
    """
    prompt_parts = []
    
    # Add user context if available
    if context:
        prompt_parts.append(
            f"User Context: Age: {context.get('age')}, "
            f"Gender: {context.get('gender')}, "
            f"Height: {context.get('height')}cm, "
            f"Weight: {context.get('weight')}kg"
        )
    
    # Add relevant conversation history
    if history:
        last_exchanges = history[-3:]  # Get last 3 exchanges for context
        for exchange in last_exchanges:
            if exchange["type"] == "text":
                prompt_parts.append(f"Previous Q: {exchange['question']}")
                prompt_parts.append(f"Previous A: {exchange['answer']}")
            elif exchange["type"] == "image":
                prompt_parts.append(f"Previous Image Analysis: {exchange['analysis']}")
    
    # Add current question
    prompt_parts.append(f"Current Question: {question}")
    
    # Combine all parts
    return "\n".join(prompt_parts)

def create_audio_response(audio_buffer, headers=None):
    """
    Create a streaming response for audio data with optional headers
    """
    def iterfile():
        yield audio_buffer

    response = StreamingResponse(
        iterfile(),
        media_type="audio/mp3",
        headers=headers or {}
    )
    
    return response



# gemini-2.0-flash-lite-preview-02-05
