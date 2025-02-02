from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag import RAGApplication
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

# Create FastAPI app
app = FastAPI(
    title="RAG API",
    description="Simple RAG Application",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any origin (change to frontend domain for security)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Initialize RAG
rag = RAGApplication(api_key=API_KEY)
rag.load_vector_store(VECTOR_STORE_PATH, allow_dangerous_deserialization=True)

@app.post("/query/",
         response_model=dict,
         summary="Query the RAG system",
         description="Submit a question to the RAG system")

async def query_rag(request: QueryRequest):
    """Query endpoint for the RAG application."""
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
