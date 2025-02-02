import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.llms.base import LLM
from langchain.schema import Document
from typing import List, Optional, Any, Dict
import google.generativeai as genai
from pydantic import PrivateAttr
from PyPDF2 import PdfReader
from dotenv import load_dotenv

load_dotenv()
class GeminiLLM(LLM):
    """Custom LangChain LLM wrapper for Google's Gemini API"""
    
    api_key: str
    model_name: str = "gemini-1.5-flash"
    _model: Any = PrivateAttr()
    
    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash", **kwargs):
        """Initialize the model"""
        super().__init__(api_key=api_key, model_name=model_name, **kwargs)
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(model_name)
    
    def _call(self, prompt: str, stop: Optional[List[str]] = None) -> str:
        """Generate text based on the prompt"""
        response = self._model.generate_content(prompt)
        return response.text
    
    @property
    def _identifying_params(self) -> Dict[str, Any]:
        """Get identifying parameters"""
        return {
            "name": "GeminiLLM",
            "model_name": self.model_name
        }
    
    @property
    def _llm_type(self) -> str:
        """Return type of LLM"""
        return "gemini"


class RAGApplication:
    def __init__(self, api_key: str):
        """
        Initialize the RAG application with Gemini API
        
        Args:
            api_key: Gemini API key
        """
        # Initialize the Gemini LLM
        self.llm = GeminiLLM(api_key=api_key)
        
        # Initialize HuggingFace embeddings
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-mpnet-base-v2",
            model_kwargs={'device': 'cpu'}  # Change to 'cuda' if using GPU
        )
        
        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        
        # Initialize vector store as None
        self.vector_store = None
        
        # Create custom prompt template
        template = """You are a mental health assistant that provides supportive, evidence-based responses to users’ mental health concerns. Use the retrieved context from trusted mental health PDFs to answer questions accurately. If the retrieved documents do not contain relevant information, simply response from the llm model without rag. make sure your response are concise and empathetic.
        
        Context: {context}
        
        Question: {question}
        
        Answer: """
        
        self.QA_CHAIN_PROMPT = PromptTemplate(
            input_variables=["context", "question"],
            template=template,
        )

    ## loading the pdf form the directory
    def load_documents(self, directory: str):
        """
        Load documents from all PDF files in the given directory
        
        Args:
            directory: Path to the directory containing PDF files to load
        """
        documents = []  
        # Iterate through all files in the directory
        for file_name in os.listdir(directory):
            file_path = os.path.join(directory, file_name)
            # Ensure only PDF files are processed
            if os.path.isfile(file_path) and file_name.endswith(".pdf"):
                try:
                    # Create a PDF reader object
                    pdf_reader = PdfReader(file_path)
                    
                    # Extract text from each page
                    text = ""
                    for page in pdf_reader.pages:
                        text += page.extract_text() + "\n"
                    
                    # Skip if no text was extracted
                    if not text.strip():
                        print(f"Warning: No text could be extracted from {file_name}")
                        continue
                        
                    # Wrap content in a Document object
                    documents.append(Document(page_content=text, metadata={"source": file_name}))
                    
                except Exception as e:
                    print(f"Error processing file {file_name}: {str(e)}")
        
        if not documents:
            print("No valid PDF documents were found in the directory.")
            return
            
        # Split documents into chunks
        texts = self.text_splitter.split_documents(documents)
        
        # Create vector store
        self.vector_store = FAISS.from_documents(texts, self.embeddings)
        print(f"Loaded {len(texts)} text chunks into the vector store")

    ## creting the vector store        
    def save_vector_store(self, path: str):
        """
        Save the vector store to disk
        
        Args:
            path: Directory path to save the vector store
        """
        if self.vector_store is None:
            raise ValueError("No vector store to save. Please load documents first.")
        
        self.vector_store.save_local(path)
        print(f"Vector store saved to {path}")
    
    def load_vector_store(self, path: str, allow_dangerous_deserialization: bool = False):
        """
        Load a vector store from disk
        
        Args:
            path: Directory path where the vector store is saved
            allow_dangerous_deserialization: Whether to allow loading of pickle files
        """
        self.vector_store = FAISS.load_local(
            path, 
            self.embeddings,
            allow_dangerous_deserialization=allow_dangerous_deserialization
        )
        print(f"Vector store loaded from {path}")
    
    def query(self, question: str, k: int = 2) -> str:
        """
        Query the RAG system
        
        Args:
            question: The question to ask
            k: Number of relevant documents to retrieve
            
        Returns:
            str: The answer to the question
        """
        if self.vector_store is None:
            raise ValueError("No vector store available. Please load documents first.")
        
        # Create the retrieval chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.vector_store.as_retriever(search_kwargs={"k": k}),
            chain_type_kwargs={"prompt": self.QA_CHAIN_PROMPT}
        )
        
        # Get the answer
        result = qa_chain.invoke({"query": question})
        return result["result"]

#################### run this file to ingest the new data ####################
if __name__ == "__main__":
    API_KEY = os.get('gemini_api')  

    # Initialize the RAG application
    rag = RAGApplication(api_key=API_KEY)
    
    #create a vector store
    # rag.load_documents("Data")
    # rag.save_vector_store("VectorDB")

    # Load existing vector store
    rag.load_vector_store("vectorDB",allow_dangerous_deserialization=True)
    
    # Interactive query loop
    while True:
        question = input("\nEnter your question (or 'quit' to exit): ")
        if question.lower() == 'quit':
            break
            
        try:
            answer = rag.query(question)
            print(f"\nQuestion: {question}")
            print(f"Answer: {answer}")
        except Exception as e:
            print(f"Error: {str(e)}")