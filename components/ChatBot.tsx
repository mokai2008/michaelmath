"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X, Send, Paperclip, Minimize2, Sparkles, User, BrainCircuit } from "lucide-react";

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am the Michael Gad Math AI Assistant. How can I help you with your studies today?' }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setSession(data.session);
      });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file (PNG, JPG, etc) so the AI can read it visually.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachedImage) return;

    const userMessage = { role: 'user', content: input, image: attachedImage };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setAttachedImage(null);
    setIsTyping(true);

    try {
      // API call to our route
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          chatId,
          messages: [...messages, userMessage],
          context: {
            currentPage: pathname || 'dashboard',
            studentName: session?.user?.user_metadata?.full_name || 'Student'
          }
        }),
      });

      if (!response.ok) throw new Error('API Error');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.chatId && !chatId) {
        setChatId(data.chatId);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-primary to-green-400 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform z-50 group"
      >
        <Sparkles className="w-6 h-6 group-hover:hidden" />
        <MessageSquare className="w-6 h-6 hidden group-hover:block" />
        <span className="absolute -top-10 right-0 bg-text text-white text-xs py-1 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
          Ask Michael's AI Assistant
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-[400px] h-[560px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-primary p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-primary rounded-full"></div>
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">Math AI Assistant</h3>
            <span className="text-xs text-white/80">Online | Powered by ChatGPT</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-background-alt space-y-4">
        {/* Quick Prompts - Show only if few messages */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {["What should I study today?", "How do I top up my wallet?", "Explain algebra basics"].map((chip, i) => (
              <button 
                key={i}
                onClick={() => setInput(chip)}
                className="bg-white border border-primary/20 text-primary text-xs px-3 py-1.5 rounded-full hover:bg-primary/5 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-3 ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-br-none' 
                : 'bg-white text-text border border-gray-100 shadow-sm rounded-bl-none'
            }`}>
              {msg.image && (
                <img src={msg.image} alt="attached" className="max-w-full rounded-md mb-2 border border-white/20" />
              )}
              {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-none p-4 flex gap-1">
              <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-primary/80 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        {attachedImage && (
          <div className="relative inline-block mb-3">
            <img src={attachedImage} alt="Attachment" className="h-16 rounded-md border border-gray-200 object-cover" />
            <button 
              type="button" 
              onClick={() => setAttachedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:scale-110 transition-transform"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-primary transition-colors flex-shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Ask a math question..."
              className="w-full max-h-32 bg-transparent p-3 text-sm outline-none resize-none"
              rows={1}
            />
          </div>
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <div className="text-center mt-2">
          <span className="text-[10px] text-gray-400">Powered by ChatGPT</span>
        </div>
      </div>
    </div>
  );
}
