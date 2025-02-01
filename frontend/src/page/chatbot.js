import React, { useState } from "react"
import { BotIcon as Robot, Mic, Send } from "lucide-react"
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition"
import axios from "axios"
import "../style/chatbot.css"
export default function Chatbot() {
  const [formData, setFormData] = useState({
    age: "",
    gender: "",
    profession: "",
    goal: "",
  })

  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([{ text: "Hi! I'm Robo, your new AI friend.", isBot: true }])
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition()

  // Update message when transcript changes
  React.useEffect(() => {
    setMessage(transcript)
  }, [transcript])

  const handleFormSubmit = (e) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const queryBackend = async (question) => {
    try {
      const response = await axios.post('http://localhost:8000/query/', {
        question: question
      })
      return response.data
    } catch (error) {
      console.error('Error querying backend:', error)
      throw error
    }
  }

  const handleMessageSubmit = async (e) => {
    e.preventDefault()
    if (message.trim()) {
      // Add user message to chat
      setMessages((prev) => [...prev, { text: message, isBot: false }])
      const userMessage = message
      setMessage("")
      resetTranscript()
      setIsLoading(true)

      try {
        // Add temporary loading message
        setMessages((prev) => [
          ...prev,
          { text: "Thinking...", isBot: true, isLoading: true }
        ])

        // Get response from backend
        const response = await queryBackend(userMessage)

        // Remove loading message and add actual response
        setMessages((prev) => {
          const withoutLoading = prev.filter(msg => !msg.isLoading)
          return [
            ...withoutLoading,
            { text: response.answer || response.toString(), isBot: true }
          ]
        })
      } catch (error) {
        // Handle error
        setMessages((prev) => {
          const withoutLoading = prev.filter(msg => !msg.isLoading)
          return [
            ...withoutLoading,
            { text: "Sorry, I encountered an error. Please try again.", isBot: true }
          ]
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleMicClick = () => {
    if (!browserSupportsSpeechRecognition) {
      alert("Your browser doesn't support speech recognition.")
      return
    }

    if (isListening) {
      SpeechRecognition.stopListening()
    } else {
      resetTranscript()
      SpeechRecognition.startListening({ continuous: true })
    }
    setIsListening(!isListening)
  }

  return (
    <div className="chatbot-container">
      <div className="sidebar">
        <div className="logo">
          <Robot className="h-6 w-6" />
          <span>RoboCare</span>
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
            <label>Profession</label>
            <input
              type="text"
              name="profession"
              placeholder="Your profession"
              value={formData.profession}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Your Goal</label>
            <textarea
              name="goal"
              placeholder="What's your goal?"
              value={formData.goal}
              onChange={handleInputChange}
              rows={4}
            />
          </div>
          <button 
            type="submit" 
            className="submit-button"
            disabled={isLoading}
          >
            Submit Profile
          </button>
        </form>
      </div>
      <div className="chat-area">
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.isBot ? "bot-message" : "user-message"} ${
                msg.isLoading ? "loading" : ""
              }`}
            >
              {msg.isBot && <Robot className="bot-icon" />}
              <div className="message-bubble">{msg.text}</div>
            </div>
          ))}
        </div>
        <div className="input-area">
          <form onSubmit={handleMessageSubmit} className="message-form">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How are you feeling right now?..."
              className="message-input"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleMicClick}
              className={`mic-button ${isListening ? 'recording' : ''}`}
              style={{
                color: isListening ? '#22c55e' : 'currentColor',
                backgroundColor: isListening ? 'rgba(34, 197, 94, 0.1)' : 'transparent'
              }}
              disabled={isLoading}
            >
              <Mic className="h-5 w-5" />
            </button>
            <button 
              type="submit" 
              className="send-button"
              disabled={isLoading}
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}