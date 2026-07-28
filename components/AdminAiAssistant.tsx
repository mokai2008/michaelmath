"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Bot, 
  X, 
  Send, 
  Paperclip, 
  Sparkles, 
  ChevronDown, 
  BarChart3, 
  BookOpen, 
  Video, 
  Users, 
  RefreshCw,
  Cpu,
  ArrowRight
} from "lucide-react";

interface Message {
  role: string;
  content: string;
  image?: string | null;
  provider?: string;
  model?: string;
}

export function AdminAiAssistant({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<'auto' | 'claude' | 'gpt'>('auto');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Welcome back, Michael! I am your AI Admin Co-Pilot, powered by Claude 3.7 and GPT-4o. How can I assist you with the website, courses, or students today?',
      model: 'Balanced Engine'
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();

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
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file (PNG, JPG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() && !attachedImage) return;

    const userMessage: Message = { role: 'user', content: textToSend, image: attachedImage };
    setMessages(prev => [...prev, userMessage]);
    if (!customPrompt) setInput("");
    setAttachedImage(null);
    setIsTyping(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          chatId,
          mode: 'admin',
          provider: selectedProvider,
          messages: [...messages, userMessage],
          context: {
            currentPage: pathname || '/admin/stats',
          }
        }),
      });

      if (!response.ok) throw new Error('API Error');

      const data = await response.json();
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: data.reply,
          provider: data.provider,
          model: data.model
        }
      ]);

      if (data.chatId && !chatId) {
        setChatId(data.chatId);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: "Sorry, I encountered an error connecting to the AI services." }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Helper to parse markdown links [Text](URL) into interactive UI elements
  const renderMessageContent = (content: string) => {
    const parts = [];
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      const label = match[1];
      const url = match[2];

      if (url.startsWith('/admin')) {
        parts.push(
          <button
            key={match.index}
            onClick={() => {
              router.push(url);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 my-1 mx-0.5 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs rounded-lg transition-colors border border-primary/20"
          >
            {label}
            <ArrowRight className="w-3 h-3" />
          </button>
        );
      } else {
        parts.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline font-medium hover:text-primary/80"
          >
            {label}
          </a>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="bg-slate-900 p-4 text-white flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 border border-primary/40 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight flex items-center gap-2">
                Admin AI Co-Pilot
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-medium">
                  Live
                </span>
              </h3>
              <p className="text-xs text-slate-400">Website Management & Curriculum Assistant</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Model Switcher */}
        <div className="flex items-center justify-between bg-slate-800/80 p-1.5 rounded-lg border border-slate-700 text-xs">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium px-2">
            <Cpu className="w-3.5 h-3.5 text-primary" /> Model:
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedProvider('auto')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                selectedProvider === 'auto'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Balanced load between Claude & GPT"
            >
              Auto (Balanced)
            </button>
            <button
              onClick={() => setSelectedProvider('claude')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                selectedProvider === 'claude'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Claude 3.7
            </button>
            <button
              onClick={() => setSelectedProvider('gpt')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                selectedProvider === 'gpt'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              GPT-4o
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
        {/* Quick Prompts on initial conversation */}
        {messages.length === 1 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Suggested Actions</p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: "Website Overview & Metrics", prompt: "Give me an executive summary of current site statistics, course counts, and pending requests.", icon: BarChart3 },
                { label: "Help Draft a Math Quiz", prompt: "I want to create a new quiz for Algebra. Can you suggest 5 multiple-choice questions with answer choices?", icon: BookOpen },
                { label: "Pending Live Sessions Status", prompt: "Are there any pending live session requests that need my approval?", icon: Video },
                { label: "Student Roster Insights", prompt: "How many active students do we have and where can I view their profiles?", icon: Users }
              ].map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.prompt)}
                    className="flex items-center gap-3 p-3 bg-white hover:bg-primary/5 border border-gray-200 hover:border-primary/30 rounded-xl text-left transition-all shadow-sm group"
                  >
                    <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-text group-hover:text-primary transition-colors">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl p-4 shadow-sm ${
              msg.role === 'user'
                ? 'bg-primary text-white rounded-br-none'
                : 'bg-white text-slate-800 border border-gray-200 rounded-bl-none'
            }`}>
              {msg.role === 'assistant' && msg.model && (
                <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-gray-100">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {msg.model}
                  </span>
                </div>
              )}

              {msg.image && (
                <img src={msg.image} alt="attached" className="max-w-full rounded-lg mb-3 border border-gray-200 object-cover max-h-48" />
              )}

              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {renderMessageContent(msg.content)}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary animate-spin" />
              <span className="text-xs font-medium text-slate-500">AI Co-Pilot thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        {attachedImage && (
          <div className="relative inline-block mb-3">
            <img src={attachedImage} alt="Attachment" className="h-16 rounded-lg border border-gray-200 object-cover" />
            <button 
              type="button" 
              onClick={() => setAttachedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:scale-110 transition-transform"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }} 
          className="flex items-end gap-2"
        >
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
            className="p-2.5 text-slate-400 hover:text-primary hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
            title="Attach image"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 bg-slate-50 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary overflow-hidden transition-all">
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask AI Co-Pilot anything about site..."
              className="w-full max-h-32 bg-transparent p-3 text-sm outline-none resize-none"
              rows={1}
            />
          </div>

          <button 
            type="submit"
            disabled={(!input.trim() && !attachedImage) || isTyping}
            className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition-all shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 px-1">
          <span>Shift+Enter for line break</span>
          <span className="font-semibold text-slate-600">Claude 3.7 & GPT-4o Engine</span>
        </div>
      </div>
    </div>
  );
}
