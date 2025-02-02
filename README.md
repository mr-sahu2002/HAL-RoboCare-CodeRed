# AI-Powered Mental Health Chatbot

## Overview
This AI-powered chatbot is designed to assist users with mental health-related queries by leveraging advanced NLP, multilingual speech processing, and real-time data retrieval. The chatbot provides personalized, reliable, and accessible mental health support while ensuring user privacy.

## Tech Stack
- **Frontend:** React.js or Streamlit
- **Backend:** FastAPI for efficient request handling
- **Database:** MongoDB for storing user data
- **Vector Database:** FAISS for fast and accurate information retrieval
- **LLM (Language Model):** Gemini API with RAG framework (LangChain) for context-aware responses
- **Multilingual Speech Processing:** Kokoro for text-to-speech and speech-to-text


## Features
- **Mental Health Assistance:** Provides evidence-based responses to user queries.
- **Multimodal Capabilities:** Supports text and voice-based inputs.
- **Multilingual Support:** Enables voice-based interactions in multiple languages for wider accessibility.
- **Reliable Information:** Reduces misinformation by sourcing data from authoritative sources.
- **Context-Aware Responses:** Uses RAG to enhance the accuracy and personalization of responses.

## How to Run
1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Set Up Virtual Environment** (optional but recommended)
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Backend (FastAPI)**
   ```bash
   uvicorn main:app --reload
   ```

5. **Run the Frontend (React.js or Streamlit)**
   - **React.js:**
     ```bash
     cd frontend
     npm install
     npm start
     ```
   - **Streamlit:**
     ```bash
     streamlit run app.py
     ```

6. **Access the Chatbot**
   - If using React.js, open `http://localhost:3000`
   - If using Streamlit, follow the link provided in the terminal

## Impact & Benefits
- **Empowers Users:** Helps individuals manage their mental health with trusted resources.
- **Accessibility:** Multilingual support makes it accessible to a wider audience.
- **Contextual Awareness:** Provides responses tailored to user concerns.
- **Reliable Information:** Reduces misinformation and promotes well-being.

---
This project aims to enhance mental health support by integrating AI-driven solutions for personalized, accessible, and trustworthy assistance.

