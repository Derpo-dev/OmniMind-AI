import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Image as ImageIcon, 
  Search, 
  Brain, 
  Sparkles, 
  Terminal,
  Layers,
  ChevronRight,
  Plus,
  History,
  Settings,
  Cpu,
  Globe,
  Zap,
  Video,
  Music,
  Volume2,
  Download,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generateOmniResponse, type ChatMessage, pollVideoOperation } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ToolType = 'chat' | 'image' | 'search' | 'reasoning' | 'video' | 'audio';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType>('chat');
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Check for Veo API Key if video tool is selected
    if (activeTool === 'video') {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio?.openSelectKey();
        // Proceeding after dialog - user might have selected a key
      }
    }

    const userMessage: ChatMessage = {
      role: 'user',
      parts: [{ text: input }]
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await generateOmniResponse(input, activeTool);
      
      if (result.type === 'video' && result.operation) {
        setVideoStatus("Synthesizing video frames (this may take 1-2 minutes)...");
        const finalOp = await pollVideoOperation(result.operation);
        const downloadLink = finalOp.response?.generatedVideos?.[0]?.video?.uri;
        
        const modelMessage: ChatMessage = {
          role: 'model',
          parts: [{ 
            text: "Video generation complete. You can view or download the result below.",
            videoUri: downloadLink 
          }],
          type: 'video'
        };
        setMessages(prev => [...prev, modelMessage]);
        setVideoStatus(null);
      } else if (result.type === 'audio' && result.audio) {
        const modelMessage: ChatMessage = {
          role: 'model',
          parts: [{ 
            text: result.text,
            inlineData: { mimeType: 'audio/pcm', data: result.audio }
          }],
          type: 'audio'
        };
        setMessages(prev => [...prev, modelMessage]);
        
        // Auto-play audio
        const audio = new Audio(`data:audio/wav;base64,${result.audio}`);
        audio.play().catch(e => console.error("Audio playback failed", e));
      } else {
        const modelMessage: ChatMessage = {
          role: 'model',
          parts: [{ text: result.text }],
          type: result.type as any,
          groundingMetadata: result.groundingMetadata
        };

        if (result.image) {
          modelMessage.parts.push({
            inlineData: {
              mimeType: 'image/png',
              data: result.image.split(',')[1]
            }
          });
        }

        setMessages(prev => [...prev, modelMessage]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: "Error: Failed to process request. Please check your configuration and API limits." }]
      }]);
    } finally {
      setIsLoading(false);
      setVideoStatus(null);
    }
  };

  const tools = [
    { id: 'chat', icon: Bot, label: 'Assistant', desc: 'General purpose AI', color: 'text-blue-400' },
    { id: 'reasoning', icon: Brain, label: 'Reasoning', desc: 'Complex problem solving', color: 'text-purple-400' },
    { id: 'search', icon: Search, label: 'Search', desc: 'Real-time web grounding', color: 'text-emerald-400' },
    { id: 'image', icon: ImageIcon, label: 'Creative', desc: 'Generate visual assets', color: 'text-orange-400' },
    { id: 'video', icon: Video, label: 'Cinema', desc: 'Generate cinematic video', color: 'text-pink-400' },
    { id: 'audio', icon: Volume2, label: 'Sonic', desc: 'Generate sounds & speech', color: 'text-cyan-400' },
  ];

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 border-r border-zinc-800/50 flex flex-col bg-[#0D0D0E]">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-800/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">OmniMind</h1>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">v2.5.0-PRO</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Capabilities</p>
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id as ToolType)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  activeTool === tool.id 
                    ? "bg-zinc-800 text-white shadow-sm" 
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                )}
              >
                <tool.icon className={cn("w-5 h-5", activeTool === tool.id ? tool.color : "text-zinc-500 group-hover:text-zinc-400")} />
                <div className="text-left">
                  <p className="text-sm font-medium leading-none">{tool.label}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">{tool.desc}</p>
                </div>
                {activeTool === tool.id && (
                  <motion.div layoutId="active-indicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />
                )}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <p className="px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">System Status</p>
            <div className="px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Neural Engine</span>
                <span className="text-emerald-500 flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Latency</span>
                <span className="text-zinc-300">24ms</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800/50">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors">
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Configuration</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-[#0A0A0B]">
        {/* Header */}
        <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-8 bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Terminal className="w-4 h-4" />
              <span className="text-xs font-mono">session_id: omni-772x</span>
            </div>
            <div className="h-4 w-[1px] bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500">Mode:</span>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                {activeTool}
              </span>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl">
                <Sparkles className="w-10 h-10 text-indigo-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-white">¡Hola! Soy OmniMind, ¿cómo puedo ayudarte hoy? ✨</h2>
                <p className="text-zinc-500 text-lg">Elige una de mis herramientas especiales en la barra lateral para empezar una sesión increíble. 🚀</p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={idx}
              className={cn(
                "flex gap-6 max-w-4xl mx-auto",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
                msg.role === 'user' 
                  ? "bg-zinc-800 border border-zinc-700" 
                  : "bg-indigo-600 border border-indigo-500"
              )}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-zinc-300" /> : <Bot className="w-5 h-5 text-white" />}
              </div>

              <div className={cn(
                "flex-1 space-y-4",
                msg.role === 'user' ? "text-right" : "text-left"
              )}>
                <div className={cn(
                  "inline-block p-5 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/20" 
                    : "bg-zinc-900 border border-zinc-800 text-zinc-200"
                )}>
                  <div className="markdown-body">
                    <Markdown>{msg.parts[0].text}</Markdown>
                  </div>
                  
                  {msg.parts[0].videoUri && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl bg-black aspect-video flex flex-col items-center justify-center">
                      <video 
                        src={`${msg.parts[0].videoUri}&x-goog-api-key=${process.env.GEMINI_API_KEY}`} 
                        controls 
                        className="w-full h-full"
                      />
                      <a 
                        href={`${msg.parts[0].videoUri}&x-goog-api-key=${process.env.GEMINI_API_KEY}`}
                        target="_blank"
                        download="omnimind-video.mp4"
                        className="mt-2 flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        <Download className="w-3 h-3" />
                        Download Video
                      </a>
                    </div>
                  )}

                  {msg.parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith('image')) && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl">
                      <img 
                        src={`data:${msg.parts.find(p => p.inlineData)?.inlineData?.mimeType};base64,${msg.parts.find(p => p.inlineData)?.inlineData?.data}`} 
                        alt="Generated content"
                        className="w-full h-auto object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {msg.parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith('audio')) && (
                    <div className="mt-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <Volume2 className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-mono text-zinc-400">AUDIO_STREAM_GENERATED</p>
                        <audio 
                          src={`data:audio/wav;base64,${msg.parts.find(p => p.inlineData)?.inlineData?.data}`} 
                          controls 
                          className="w-full h-8 mt-2"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {msg.groundingMetadata?.groundingChunks && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.groundingMetadata.groundingChunks.map((chunk: any, i: number) => (
                      chunk.web && (
                        <a 
                          key={i}
                          href={chunk.web.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          <Globe className="w-3 h-3" />
                          {chunk.web.title || 'Source'}
                        </a>
                      )
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <div className="flex gap-6 max-w-4xl mx-auto">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                </div>
                {videoStatus && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-indigo-400 font-mono flex items-center gap-2"
                  >
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {videoStatus}
                  </motion.p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-8 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B] to-transparent">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-end gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl">
              <div className="flex flex-col gap-2 flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={`Command OmniMind (${activeTool})...`}
                  className="w-full bg-transparent border-none focus:ring-0 text-zinc-100 placeholder-zinc-500 resize-none max-h-48 min-h-[24px] py-1 text-sm"
                  rows={1}
                />
                <div className="flex items-center gap-4 pt-2 border-t border-zinc-800/50">
                  <button className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                  <div className="h-4 w-[1px] bg-zinc-800" />
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {tools.map(t => (
                      <button 
                        key={t.id}
                        onClick={() => setActiveTool(t.id as ToolType)}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                          activeTool === t.id 
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                            : "text-zinc-600 hover:text-zinc-400"
                        )}
                      >
                        {t.id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-3 rounded-xl transition-all duration-200 shadow-lg",
                  input.trim() && !isLoading
                    ? "bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 active:scale-95"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-[10px] text-zinc-600 mt-4 font-mono uppercase tracking-widest">
              OmniMind AI can make mistakes. Verify critical information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
