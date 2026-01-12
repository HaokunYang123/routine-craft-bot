import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Send, X, MessageCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WobblyButton,
  WobblyPanel,
  WobblyChatBubble,
  WobblyInput,
  DoodleStar,
  DoodleHeart,
  DoodleLeaf,
} from "@/components/ui/wobbly";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface FloatingAIProps {
  context?: string;
  placeholder?: string;
}

export function FloatingAI({ context = "", placeholder = "Ask anything..." }: FloatingAIProps) {
  const { user, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading || !user || !session) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          context: { additionalContext: context },
        },
      });

      if (error) throw error;

      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Oops! Something went wrong. Try again?" }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "What tasks do I have today?",
    "Help me plan my week",
    "Create a new routine",
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="fixed bottom-28 right-5 z-50 h-14 w-14 flex items-center justify-center transition-transform active:scale-90 md:bottom-8 md:right-8"
        >
          <WobblyPanel variant="badge1" fill="hsl(var(--primary))" className="w-full h-full">
            <div className="flex items-center justify-center h-full">
              <MessageCircle className="h-6 w-6 text-primary-foreground" />
            </div>
          </WobblyPanel>
          <DoodleStar className="absolute -top-1 -right-1 w-5 h-5 animate-wiggle" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] p-0 md:h-[70vh] bg-background border-t-0">
        {/* Wobbly header */}
        <SheetHeader className="relative px-4 pt-4 pb-2">
          <WobblyPanel variant="progress" className="h-14">
            <div className="flex items-center justify-between h-full px-4">
              <div className="flex items-center gap-3">
                <DoodleHeart className="w-6 h-6 animate-bounce-soft" />
                <SheetTitle className="font-sketch text-xl">AI Helper</SheetTitle>
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="p-2 transition-transform active:scale-90"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </WobblyPanel>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100%-10rem)]">
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 space-y-6">
                <div className="relative inline-block">
                  <DoodleLeaf className="w-12 h-12 mx-auto animate-float-gentle" />
                  <DoodleStar className="absolute -top-2 -right-4 w-6 h-6 animate-wiggle" />
                </div>
                <div>
                  <p className="font-sketch text-2xl text-foreground">
                    How can I help you?
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    I'm here to help with your tasks~
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 px-4">
                  {suggestions.map((s, i) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="relative"
                    >
                      <WobblyPanel 
                        variant="badge2" 
                        fill={`hsl(var(--pastel-${['mint', 'pink', 'yellow'][i % 3]}))`}
                        className="h-9 px-4"
                      >
                        <span className="flex items-center h-full font-sketch text-sm text-foreground px-2">
                          {s}
                        </span>
                      </WobblyPanel>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <WobblyChatBubble role={msg.role} className="max-w-[85%] min-h-[50px]">
                    {msg.content}
                  </WobblyChatBubble>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <WobblyChatBubble role="assistant" className="min-h-[50px]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-sketch">Thinking...</span>
                  </div>
                </WobblyChatBubble>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-4 bg-background">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleListening}
              className={cn(
                "shrink-0 h-12 w-12 flex items-center justify-center transition-transform active:scale-90"
              )}
            >
              <WobblyPanel 
                variant="badge1" 
                fill={isListening ? "hsl(var(--destructive))" : "hsl(var(--muted))"}
                className="w-full h-full"
              >
                <div className="flex items-center justify-center h-full">
                  {isListening ? (
                    <MicOff className="h-5 w-5 text-destructive-foreground" />
                  ) : (
                    <Mic className="h-5 w-5 text-foreground" />
                  )}
                </div>
              </WobblyPanel>
            </button>
            <div className="flex-1">
              <WobblyInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0 h-12 w-12 flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50"
            >
              <WobblyPanel variant="badge1" fill="hsl(var(--primary))" className="w-full h-full">
                <div className="flex items-center justify-center h-full">
                  <Send className="h-5 w-5 text-primary-foreground" />
                </div>
              </WobblyPanel>
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
