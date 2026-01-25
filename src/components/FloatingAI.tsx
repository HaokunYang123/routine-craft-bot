import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Mic, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FloatingButton, DoodleCloud } from "@/components/ui/doodle";

interface Message { role: "user" | "assistant"; content: string; }
interface FloatingAIProps { context?: string; placeholder?: string; }

// Retry configuration: 3 attempts with exponential backoff (1s, 2s, 4s)
const RETRY_DELAYS = [1000, 2000, 4000];
const MAX_RETRIES = 3;

/**
 * Check if an error is retryable (transient server/timeout errors)
 */
function isRetryableError(errorMsg: string | undefined): boolean {
  if (!errorMsg) return false;
  const msg = errorMsg.toLowerCase();

  // Don't retry auth-related messages
  if (msg.includes('unauthorized') || msg.includes('jwt') || msg.includes('forbidden')) return false;
  // Don't retry rate limit messages
  if (msg.includes('rate limit') || msg.includes('too many requests')) return false;

  // Retry on timeout errors
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('abort')) return true;
  // Retry on server errors (5xx)
  if (msg.includes('service error') || msg.includes('internal')) return true;
  if (msg.includes('504') || msg.includes('503') || msg.includes('502') || msg.includes('500')) return true;
  // Retry on network errors
  if (msg.includes('network') || msg.includes('connection') || msg.includes('fetch')) return true;

  return false;
}

export function FloatingAI({ context = "You are a helpful assistant.", placeholder = "Ask me anything..." }: FloatingAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        setInput(prev => prev + event.results[0][0].transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => { if (!recognitionRef.current) return; if (isListening) { recognitionRef.current.stop(); setIsListening(false); } else { recognitionRef.current.start(); setIsListening(true); } };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Create new AbortController for this request chain
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // Check if cancelled before each attempt
      if (signal.aborted) {
        setIsLoading(false);
        return; // Don't add error message if user cancelled
      }

      try {
        const { data, error } = await supabase.functions.invoke("ai-chat", {
          body: { messages: [...messages, { role: "user", content: userMessage }], systemPrompt: context }
        });

        // Check if cancelled during request
        if (signal.aborted) {
          setIsLoading(false);
          return; // Don't add error message if user cancelled
        }

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        // Success!
        setMessages(prev => [...prev, { role: "assistant", content: data.response || "I'm here to help! Could you try rephrasing that?" }]);
        setIsLoading(false);
        return;
      } catch (err: any) {
        // Check if user cancelled
        if (signal.aborted) {
          setIsLoading(false);
          return; // Don't add error message if user cancelled
        }

        console.error(`AI Chat error (attempt ${attempt + 1}/${MAX_RETRIES}):`, err);

        // Check if error is retryable
        const errorMsg = err.message || '';
        if (!isRetryableError(errorMsg)) {
          // Non-retryable error - return immediately with error message
          setMessages(prev => [...prev, { role: "assistant", content: errorMsg || "I'm having trouble connecting. Please try again in a moment." }]);
          setIsLoading(false);
          return;
        }

        // Retryable error - wait and try again (unless last attempt)
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
          continue;
        }

        // All retries exhausted
        setMessages(prev => [...prev, { role: "assistant", content: "Request timed out. Try asking for less information at once." }]);
        setIsLoading(false);
      }
    }
  };

  const suggestions = ["What should I do first?", "Help me stay focused", "Give me a tip!"];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild><div className="fixed bottom-24 right-4 z-50"><FloatingButton><MessageCircle className="w-6 h-6" /></FloatingButton></div></SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-3xl border-0 bg-background">
        <SheetHeader className="p-5 pb-3"><div className="flex items-center gap-2"><DoodleCloud className="w-6 h-6 text-primary" /><SheetTitle className="font-hand text-2xl">Assistant</SheetTitle></div></SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3" style={{ height: "calc(85vh - 160px)" }}>
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto bg-pastel-peach rounded-full flex items-center justify-center"><DoodleCloud className="w-8 h-8 text-foreground/60" /></div>
              <p className="font-hand text-xl text-foreground/70">Hi there! How can I help?</p>
              <div className="flex flex-wrap justify-center gap-2">{suggestions.map((s) => (<button key={s} onClick={() => setInput(s)} className="px-4 py-2 bg-card rounded-full text-sm font-hand shadow-soft hover:shadow-card transition-all">{s}</button>))}</div>
            </div>
          )}
          {messages.map((m, i) => (<div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}><div className={cn("max-w-[80%] px-4 py-3 rounded-2xl", m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card shadow-soft rounded-bl-sm")}><p className="text-sm leading-relaxed">{m.content}</p></div></div>))}
          {isLoading && (
            <div className="flex items-center gap-2 px-4">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              <button
                onClick={handleCancel}
                className="ml-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <div className="flex items-center gap-2">
            <button onClick={toggleListening} className={cn("w-11 h-11 rounded-full flex items-center justify-center transition-all", isListening ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80")}><Mic className="w-5 h-5" /></button>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} className="flex-1 h-11 px-4 bg-card rounded-full border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-soft" />
            <button onClick={handleSubmit} disabled={!input.trim() || isLoading} className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-all hover:scale-105 active:scale-95"><Send className="w-5 h-5" /></button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
