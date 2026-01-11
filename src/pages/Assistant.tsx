import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Loader2, Trash2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

interface Person {
  id: string;
  name: string;
  type: string;
  age: number | null;
  notes: string | null;
}

export default function Assistant() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const fetchData = async () => {
    // Fetch chat history
    const { data: chatData } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true });

    if (chatData) {
      setMessages(chatData.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
    }

    // Fetch people for context
    const { data: peopleData } = await supabase
      .from("people")
      .select("id, name, type, age, notes")
      .eq("user_id", user!.id);

    if (peopleData) {
      setPeople(peopleData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !user || !session) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    // Add user message optimistically
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);

    try {
      // Save user message to DB
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        role: "user",
        content: userMessage,
      });

      // Call AI function
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          context: { people },
        },
      });

      if (error) throw error;

      const assistantMessage = data.message;

      // Add assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: assistantMessage }]);

      // Save assistant message to DB
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        role: "assistant",
        content: assistantMessage,
      });
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response",
        variant: "destructive",
      });
      // Remove optimistic message on error
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMessages([]);
      toast({ title: "Cleared", description: "Chat history has been cleared." });
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground">
            Generate plans, get suggestions, and manage routines with AI.
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearHistory}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear History
          </Button>
        )}
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mb-4 shadow-glow">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                How can I help you today?
              </h3>
              <p className="text-muted-foreground max-w-md mb-6">
                I can generate training plans, create study schedules, build daily routines, and give personalized suggestions.
              </p>
              <div className="grid gap-2 w-full max-w-md">
                {[
                  "Create a 4-week training plan for beginners",
                  "Build a morning routine for a 10-year-old",
                  "Suggest homework schedule for after-school",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-left px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 text-sm text-foreground transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to generate a plan, create tasks, or give suggestions..."
              className="min-h-[52px] max-h-32 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              variant="hero"
              size="icon"
              className="shrink-0 h-[52px] w-[52px]"
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
