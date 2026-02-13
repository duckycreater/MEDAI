
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, X, Send, Mic, MicOff, Sparkles, 
  Bot, User, ChevronDown, Minimize2, Maximize2, RefreshCw 
} from 'lucide-react';
import { ChatMessage, MedicalContext } from '../types';
import { createMedicalChatSession } from '../services/aiService';
import { GenerateContentResponse } from '@google/generative-ai';

interface MedicalChatbotProps {
  context: MedicalContext;
}

const MedicalChatbot: React.FC<MedicalChatbotProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
        id: 'welcome',
        role: 'model',
        text: 'Hello, Doctor. I am your Medical Copilot. I have access to the current case context. How can I assist with the diagnosis or treatment plan today?',
        timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Chat Session
  useEffect(() => {
    const session = createMedicalChatSession(context);
    setChatSession(session);
    // Reset messages when context changes significantly? 
    // For now, we keep history but maybe append a system note if context shifts.
  }, [context.diagnosis?.diagnosis]); // Re-init if diagnosis changes

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Speech Recognition Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US'; // Default to English for medical terms accuracy

        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => prev + (prev ? ' ' : '') + transcript);
            setIsListening(false);
        };

        recognitionRef.current.onerror = () => setIsListening(false);
        recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
        alert("Speech recognition not supported in this browser.");
        return;
    }
    if (isListening) {
        recognitionRef.current.stop();
    } else {
        setIsListening(true);
        recognitionRef.current.start();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !chatSession) return;

    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: input,
        timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
        const resultStream = await chatSession.sendMessageStream({ message: userMsg.text });
        
        const botMsgId = (Date.now() + 1).toString();
        // Placeholder for streaming
        setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '', timestamp: Date.now(), isStreaming: true }]);
        
        let fullText = "";

        for await (const chunk of resultStream) {
            const c = chunk as GenerateContentResponse;
            const textChunk = c.text || "";
            fullText += textChunk;
            
            setMessages(prev => prev.map(m => 
                m.id === botMsgId 
                ? { ...m, text: fullText } 
                : m
            ));
        }

        setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, isStreaming: false } : m));

    } catch (e) {
        console.error("Chat Error", e);
        setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: 'model', 
            text: "I apologize, Doctor. I encountered an error processing that request. Please try again.", 
            timestamp: Date.now() 
        }]);
    } finally {
        setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  if (!isOpen) {
    return (
        <button 
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50 group border border-slate-700"
        >
            <div className="absolute inset-0 bg-teal-500 rounded-full opacity-20 group-hover:animate-ping"></div>
            <Sparkles size={28} className="text-teal-400" />
        </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 flex flex-col bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl overflow-hidden
        ${isMinimized ? 'w-72 h-16' : 'w-[90vw] md:w-[450px] h-[600px] max-h-[80vh]'}
    `}>
        {/* Header */}
        <div 
            className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 flex items-center justify-between cursor-pointer shrink-0"
            onClick={() => !isMinimized && setIsMinimized(true)}
        >
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center border border-teal-500/50">
                    <Bot size={18} className="text-teal-400" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm">Medical Copilot</h3>
                    {!isMinimized && <p className="text-[10px] text-teal-400 font-mono flex items-center gap-1"><span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse"></span> GEMINI-3 PRO ACTIVE</p>}
                </div>
            </div>
            <div className="flex items-center gap-1">
                {isMinimized ? (
                    <button onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }} className="p-1.5 hover:bg-white/10 rounded-lg text-white">
                        <Maximize2 size={14} />
                    </button>
                ) : (
                    <button onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }} className="p-1.5 hover:bg-white/10 rounded-lg text-white">
                        <Minimize2 size={14} />
                    </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-400 transition-colors">
                    <X size={16} />
                </button>
            </div>
        </div>

        {!isMinimized && (
            <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scrollbar-thin">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-200' : 'bg-teal-100 text-teal-700'}`}>
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-slate-800 text-white rounded-tr-none' 
                                : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                            }`}>
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                                {msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-teal-500 ml-1 animate-pulse align-middle"></span>}
                            </div>
                        </div>
                    ))}
                    {isTyping && !messages[messages.length-1].isStreaming && (
                         <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0"><Bot size={16} /></div>
                            <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm flex gap-1">
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <div className="relative flex items-end gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-teal-500/50 transition-all">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask follow-up questions..."
                            className="flex-1 bg-transparent border-none outline-none text-sm p-2 max-h-32 resize-none text-slate-800 placeholder-slate-400"
                            rows={1}
                            style={{ minHeight: '40px' }}
                        />
                        <div className="flex gap-1 pb-1">
                             <button 
                                onClick={toggleListening}
                                className={`p-2 rounded-xl transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                            >
                                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                             </button>
                             <button 
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="p-2 bg-slate-900 text-white rounded-xl hover:bg-teal-600 disabled:opacity-50 disabled:hover:bg-slate-900 transition-colors shadow-lg"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="mt-2 text-[10px] text-center text-slate-400 font-medium">
                        AI can make mistakes. Verify clinical outputs.
                    </div>
                </div>
            </>
        )}
    </div>
  );
};

export default MedicalChatbot;
