import React, { useState, useRef } from "react"
import { BotIcon as Robot, Mic, Send, Volume2, VolumeX } from "lucide-react"
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
  const [messages, setMessages] = useState([{ text: "Hi! I'm Robo, your AI health assistant.", isBot: true }])
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isProfileSubmitted, setIsProfileSubmitted] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const audioRef = useRef(null)
  const currentAudioURL = useRef(null)

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition()

  // Update message when transcript changes
  React.useEffect(() => {
    setMessage(transcript)
  }, [transcript])

  // Cleanup audio URLs when component unmounts
  React.useEffect(() => {
    return () => {
      if (currentAudioURL.current) {
        URL.revokeObjectURL(currentAudioURL.current)
      }
    }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

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

  const queryBackend = async (question) => {
    try {
      // Get text response
      const textResponse = await axios.post("http://localhost:8000/query/", {
        question: question
      })

      // Get audio response
      const audioResponse = await axios.post("http://localhost:8000/query-with-tts/", {
        question: question
      }, {
        responseType: 'blob'
      })

      return {
        text: textResponse.data,
        audio: audioResponse.data
      }
    } catch (error) {
      console.error("Error querying backend:", error)
      throw error
    }
  }

  const handleMessageSubmit = async (e) => {
    e.preventDefault()
    if (message.trim()) {
      setMessages((prev) => [...prev, { text: message, isBot: false }])
      const userMessage = message
      setMessage("")
      resetTranscript()
      setIsLoading(true)

      try {
        setMessages((prev) => [
          ...prev,
          { text: "Thinking...", isBot: true, isLoading: true }
        ])

        const response = await queryBackend(userMessage)

        // Clean up previous audio URL
        if (currentAudioURL.current) {
          URL.revokeObjectURL(currentAudioURL.current)
        }

        // Create new audio URL
        const audioURL = URL.createObjectURL(response.audio)
        currentAudioURL.current = audioURL

        setMessages((prev) => {
          const withoutLoading = prev.filter(msg => !msg.isLoading)
          return [
            ...withoutLoading,
            { 
              text: response.text.answer || response.text.toString(), 
              isBot: true,
              audioURL: audioURL
            }
          ]
        })

        // Play audio
        if (audioRef.current) {
          audioRef.current.src = audioURL
          audioRef.current.play()
          setIsSpeaking(true)
        }
      } catch (error) {
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

  const toggleAudio = (audioURL) => {
    if (audioRef.current) {
      if (audioRef.current.src === audioURL && !audioRef.current.paused) {
        audioRef.current.pause()
        setIsSpeaking(false)
      } else {
        audioRef.current.src = audioURL
        audioRef.current.play()
        setIsSpeaking(true)
      }
    }
  }

  return (
    <div className="chatbot-container">
      <audio 
        ref={audioRef}
        onEnded={() => setIsSpeaking(false)}
        onError={() => setIsSpeaking(false)}
      />
      
      <div className="sidebar">
        <div className="logo">
          <Robot className="h-6 w-6" />
          <span>RoboCare</span>
        </div>
        
        {!isProfileSubmitted ? (
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
              {isLoading ? "Submitting..." : "Submit Profile"}
            </button>
          </form>
        ) : (
          <p className="success-message">Profile submitted! You can now chat.</p>
        )}
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
              <div className="message-bubble">
                {msg.text}
                {msg.audioURL && (
                  <button
                    onClick={() => toggleAudio(msg.audioURL)}
                    className="audio-toggle-button"
                  >
                    {isSpeaking && audioRef.current?.src === msg.audioURL ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
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
              disabled={!isProfileSubmitted || isLoading}
            />
            <button
              type="button"
              onClick={handleMicClick}
              className={`mic-button ${isListening ? 'recording' : ''}`}
              style={{
                color: isListening ? '#22c55e' : 'currentColor',
                backgroundColor: isListening ? 'rgba(34, 197, 94, 0.1)' : 'transparent'
              }}
              disabled={!isProfileSubmitted || isLoading}
            >
              <Mic className="h-5 w-5" />
            </button>
            <button 
              type="submit" 
              className="send-button"
              disabled={!isProfileSubmitted || isLoading}
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}