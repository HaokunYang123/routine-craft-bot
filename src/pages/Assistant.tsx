import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Loader2, Trash2, User, Mic, MicOff, BookOpen, Users, ListTodo } from "lucide-react";
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

interface ClassSession {
  id: string;
  name: string;
  join_code: string;
}

interface Task {
  id: string;
  title: string;
  is_completed: boolean;
  due_date: string | null;
  assigned_student_id: string | null;
}

// Type for Speech Recognition (Web Speech API)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function Assistant() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Voice Recognition State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for Speech Recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev + (prev ? " " : "") + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech error:", event.error);
        setIsListening(false);
        if (event.error !== "aborted") {
          toast({ title: "Voice Error", description: `Could not recognize speech: ${event.error}`, variant: "destructive" });
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

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

    // Fetch class sessions
    const { data: classData } = await supabase
      .from("class_sessions" as any)
      .select("id, name, join_code")
      .eq("coach_id", user!.id)
      .eq("is_active", true);

    if (classData) {
      setClasses(classData);
    }

    // Fetch recent tasks (last 20)
    const { data: taskData } = await supabase
      .from("tasks")
      .select("id, title, is_completed, due_date, assigned_student_id")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (taskData) {
      setRecentTasks(taskData);
    }
  };

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      toast({ title: "Not Supported", description: "Voice input is not supported in this browser.", variant: "destructive" });
      return;
    }

    if (isListening) {
      recognitionRef.current.abort();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Speech start error:", error);
        setIsListening(false);
      }
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

      // Call AI function with enhanced context
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          context: {
            people,
            classes,
            recentTasks
          },
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

  // Dynamic suggestions based on context
  const getSuggestions = () => {
    const suggestions: string[] = [];

    if (classes.length > 0) {
      suggestions.push(`Summarize progress for ${classes[0].name}`);
    }
    if (recentTasks.length > 0) {
      const incomplete = recentTasks.filter(t => !t.is_completed).length;
      if (incomplete > 0) {
        suggestions.push(`Show me the ${incomplete} incomplete tasks`);
      }
    }
    if (people.length > 0) {
      suggestions.push(`Create a weekly plan for ${people[0].name}`);
    }

    // Fallback suggestions
    if (suggestions.length === 0) {
      suggestions.push(
        "Create a 4-week training plan for beginners",
        "Build a morning routine for students",
        "Suggest a homework schedule"
      );
    }

    return suggestions.slice(0, 3);
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
        <div className="flex items-center gap-2">
          {/* Context Indicators */}
          {classes.length > 0 && (
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
              <BookOpen className="w-3 h-3" />
              {classes.length} classes
            </div>
          )}
          {people.length > 0 && (
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
              <Users className="w-3 h-3" />
              {people.length} people
            </div>
          )}
          {recentTasks.length > 0 && (
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
              <ListTodo className="w-3 h-3" />
              {recentTasks.length} tasks
            </div>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearHistory}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
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
                I know about your {classes.length > 0 ? `${classes.length} classes, ` : ""}{people.length > 0 ? `${people.length} people, ` : ""}and can help create plans, analyze progress, or answer questions.
              </p>
              <div className="grid gap-2 w-full max-w-md">
                {getSuggestions().map((suggestion) => (
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
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === "user"
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
              placeholder={isListening ? "Listening..." : "Ask me to generate a plan, create tasks, or give suggestions..."}
              className={`min-h-[52px] max-h-32 resize-none transition-all ${isListening ? "ring-2 ring-accent animate-pulse" : ""}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            {/* Voice Button */}
            {speechSupported && (
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                className={`shrink-0 h-[52px] w-[52px] transition-all ${isListening ? "animate-pulse" : ""}`}
                onClick={toggleListening}
                disabled={loading}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
            )}
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
