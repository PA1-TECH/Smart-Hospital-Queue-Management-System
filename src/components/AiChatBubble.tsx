import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, Sparkles, Navigation, Calendar, RefreshCw } from "lucide-react";
import { ChatMessage } from "../types";

interface AiChatBubbleProps {
  currentRole: string;
}

export default function AiChatBubble({ currentRole }: AiChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "model",
      text: `Hello! I am your AI Hospital Assistant. How can I assist you with queue rankings, clinical departments, appointments, or navigating our clinic today?`,
      createdAt: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `chat_${Date.now()}`,
      role: "user",
      text: textToSend,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const chatCopy = [...messages, userMsg].slice(-8); // send last 8 messages for context
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatCopy.map(m => ({ role: m.role, text: m.text })),
          userRole: currentRole
        })
      });

      if (!res.ok) throw new Error("Connection failed");
      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          id: `chat_${Date.now() + 1}`,
          role: "model",
          text: data.response || "I couldn't process this request. Feel free to rephrase or contact the receptionist.",
          createdAt: new Date().toISOString()
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `chat_error_${Date.now()}`,
          role: "model",
          text: "🔌 Connection to the hospital desk is offline. Showing automatic local check options below.",
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: "Check Live Queues", text: "What is the live status of the clinic queues right now?" },
    { label: "Clinic Directions", text: "Where are the departments located? Give me room directions" },
    { label: "Book a Token", text: "How do I book a token and get my digital queue number?" },
    { label: "Symptom Recommendation", text: "I have symptoms of chest pressure, where should I go?" }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Collapsed Button */}
      {!isOpen && (
        <button
          id="btn-open-chatbot"
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-650 text-white shadow-xl hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          title="Open AI Hospital Assistant"
        >
          <Bot className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
          </span>
        </button>
      )}

      {/* Expandable Panel */}
      {isOpen && (
        <div className="flex h-[550px] w-96 flex-col overflow-hidden rounded-2xl bg-white border border-gray-150 shadow-2xl transition-all duration-300">
          {/* Hospital Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-650 to-indigo-800 p-4 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-wide">CareBot AI Companion</h3>
                <p className="text-[10px] text-white/80 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  Active Hospital Assistant (Role: {currentRole})
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 hover:bg-white/10 active:scale-95 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Chat Messages Log */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-4"
          >
            {messages.map((msg, i) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role !== "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-650 text-white rounded-tr-none"
                      : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                  }`}
                >
                  {msg.text}
                  <span
                    className={`block mt-1 text-[9px] text-right ${
                      msg.role === "user" ? "text-indigo-150" : "text-slate-400"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm text-slate-500">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-600"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-600 [animation-delay:0.2s]"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-600 [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
          </div>

          {/* Suggested Quick chips */}
          <div className="p-2 bg-slate-100 border-t border-slate-105 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none">
            {quickPrompts.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.text)}
                className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[10px] font-medium text-slate-650 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-all cursor-pointer shadow-sm shrink-0"
              >
                {idx === 0 && <RefreshCw className="h-3 w-3" />}
                {idx === 1 && <Navigation className="h-3 w-3" />}
                {idx === 2 && <Calendar className="h-3 w-3" />}
                {chip.label}
              </button>
            ))}
          </div>

          {/* Core Input box */}
          <div className="border-t border-gray-100 bg-white p-3 flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendMessage(inputMessage)}
              placeholder="Ask live queue stats, directions, or clinical details..."
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendMessage(inputMessage)}
              disabled={!inputMessage.trim() || isLoading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-650 text-white shadow-sm hover:bg-indigo-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:scale-100 transition-all cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
