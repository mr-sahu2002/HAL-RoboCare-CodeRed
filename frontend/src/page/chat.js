import React, { useState, useRef} from "react";
import { BotIcon as Robot, Mic, Send, Globe, Image as ImageIcon  } from "lucide-react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import axios from "axios";
import "../style/chatbot.css";

// Language codes for speech recognition
const SUPPORTED_LANGUAGES = {
  english: "en-IN",
  hindi: "hi-IN",
  kannada: "kn-IN",
  tamil: "ta-IN",
  telugu: "te-IN",
  malayalam: "ml-IN",
};

export default function Chat() {
  const [formData, setFormData] = useState({
    age: "",
    gender: "",
    height: "",
    weight: "",
  });

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { text: "Hi! I'm Robo, your multilingual AI friend.", isBot: true },
  ]);
  const [isProfileSubmitted, setIsProfileSubmitted] = useState(false)
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("en-IN"); // Default to English
  const fileInputRef = useRef(null);
  const currentAudioURL = useRef(null);

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition({
    continuous: true,
    language: currentLanguage,
  });

  // Update message when transcript changes
  React.useEffect(() => {
    setMessage(transcript);
  }, [transcript]);

  React.useEffect(() => {
    return () => {
      if (currentAudioURL.current) {
        URL.revokeObjectURL(currentAudioURL.current)
      }
    }
  }, [])

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await axios.post("http://localhost:8000/user-context/", formData)
      console.log("Profile saved:", response.data)
      setIsProfileSubmitted(true)
    } catch (error) {
      console.error("Error saving profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      setIsLoading(true);
      setMessages((prev) => [...prev, {
        type: "image",
        url: URL.createObjectURL(file),
        isBot: false
      }]);

      const response = await axios.post(
        "http://localhost:8000/upload-image/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Add bot's response about the image
      setMessages((prev) => [...prev, {
        text: response.data.analysis,
        isBot: true
      }]);
    } catch (error) {
      console.error("Error uploading image:", error);
      setMessages((prev) => [...prev, {
        text: "Sorry, I couldn't process that image.",
        isBot: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const detectLanguage = async (text) => {
    try {
      const response = await axios.post(
        "http://localhost:8000/detect-language/",
        { text: text }
      );
      return response.data.languageCode;
    } catch (error) {
      console.error("Error detecting language:", error);
      // return "en-IN";
    }
  };

  const queryBackend = async (question, enableTTS = true) => {
    try {
        const response = await axios.post("http://localhost:8000/query/", {
            question: question,
            enable_tts: enableTTS,
        });

        // Check if we have both text and audio in the response
        if (response.data.audio && response.data.answer) {
            // Create and play audio from base64
            const audio = new Audio(`data:audio/mp3;base64,${response.data.audio}`);
            await audio.play();
            return response.data.answer;
        } else {
            return response.data.answer;
        }
    } catch (error) {
        console.error("Error querying backend:", error);
        throw error;
    }
};

const handleMessageSubmit = async (e) => {
  e.preventDefault();
  if (message.trim()) {
      // Add user message to chat
      setMessages((prev) => [...prev, { text: message, isBot: false }]);
      const userMessage = message;
      setMessage("");
      resetTranscript();
      setIsLoading(true);

      try {
          // Add temporary loading message
          setMessages((prev) => [
              ...prev,
              { text: "Thinking...", isBot: true, isLoading: true },
          ]);

          // Detect language of the message
          const detectedLanguage = await detectLanguage(userMessage);

          // Update current language for speech recognition
          setCurrentLanguage(detectedLanguage);

          // Get response from backend
          const response = await queryBackend(userMessage, true);

          // Remove loading message and add actual response
          setMessages((prev) => {
              const withoutLoading = prev.filter((msg) => !msg.isLoading);
              return [
                  ...withoutLoading,
                  {
                      text: response,
                      isBot: true,
                      language: detectedLanguage,
                  },
              ];
          });
      } catch (error) {
          setMessages((prev) => {
              const withoutLoading = prev.filter((msg) => !msg.isLoading);
              return [
                  ...withoutLoading,
                  {
                      text: "Sorry, I encountered an error. Please try again.",
                      isBot: true,
                  },
              ];
          });
      } finally {
          setIsLoading(false);
      }
  }
};

  const handleMicClick = () => {
    if (!browserSupportsSpeechRecognition) {
      alert("Your browser doesn't support speech recognition.");
      return;
    }

    if (!isMicrophoneAvailable) {
      alert("Please allow microphone access to use speech recognition.");
      return;
    }

    if (isListening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({
        continuous: true,
        language: currentLanguage,
      });
    }
    setIsListening(!isListening);
  };

  // Add language selection UI
  const handleLanguageChange = (language) => {
    setCurrentLanguage(SUPPORTED_LANGUAGES[language]);
    resetTranscript();
    if (isListening) {
      SpeechRecognition.stopListening();
      SpeechRecognition.startListening({
        continuous: true,
        language: SUPPORTED_LANGUAGES[language],
      });
    }
  };

  return (
    <div className="chatbot-container">
      <div className="sidebar">
        <div className="logo">
          <Robot className="h-6 w-6" />
          <span>RoboCare</span>
        </div>
        
        {/* Language selector moved to top of sidebar, after logo */}
        <div className="language-selector">
          <div className="language-selector-header">
            <Globe className="h-4 w-4" />
            <span>Select Language</span>
          </div>
          <select
            value={Object.keys(SUPPORTED_LANGUAGES).find(
              (key) => SUPPORTED_LANGUAGES[key] === currentLanguage
            )}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="language-select"
          >
            {Object.keys(SUPPORTED_LANGUAGES).map((lang) => (
              <option key={lang} value={lang}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleFormSubmit} className="form">
          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              name="age"
              placeholder="Years"
              value={formData.age}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Height</label>
            <input
              type="number"
              name="height"
              placeholder="cm"
              value={formData.height}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Weight</label>
            <input
              type="number"
              name="weight"
              placeholder="kg"
              value={formData.weight}
              onChange={handleInputChange}
            />
          </div>
          <button type="submit" className="submit-button" disabled={isLoading}>
            Submit Profile
          </button>
        </form>
      </div>

       <div className="chat-area">
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${
                msg.isBot ? "bot-message" : "user-message"
              } ${msg.isLoading ? "loading" : ""}`}
            >
              {msg.isBot && <Robot className="bot-icon" />}
              <div className="message-bubble">
                {msg.type === "image" ? (
                  <img 
                    src={msg.url} 
                    alt="Uploaded" 
                    className="uploaded-image"
                    style={{ maxWidth: '200px', maxHeight: '200px' }} 
                  />
                ) : (
                  msg.text
                )}
                {/* {msg.language && msg.isBot && (
                  <span className="message-language">
                    {Object.keys(SUPPORTED_LANGUAGES).find(
                      key => SUPPORTED_LANGUAGES[key] === msg.language
                    )}
                  </span>
                )} */}
              </div>
            </div>
          ))}
        </div>

        <div className="input-area">
          <form onSubmit={handleMessageSubmit} className="message-form">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleImageUpload(e.target.files[0]);
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="image-upload-button"
              disabled={isLoading}
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Type in ${Object.keys(SUPPORTED_LANGUAGES).find(
                key => SUPPORTED_LANGUAGES[key] === currentLanguage
              )}...`}
              className="message-input"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleMicClick}
              className={`mic-button ${isListening ? "recording" : ""}`}
              style={{
                color: isListening ? "#22c55e" : "currentColor",
                backgroundColor: isListening
                  ? "rgba(34, 197, 94, 0.1)"
                  : "transparent",
              }}
              disabled={isLoading}
            >
              <Mic className="h-5 w-5" />
            </button>
            <button type="submit" className="send-button" disabled={isLoading}>
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}