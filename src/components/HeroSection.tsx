import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="pt-32 pb-20 px-4 gradient-subtle min-h-screen flex items-center">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - Text content */}
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              AI-Powered Routine Management
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
              Build better routines for the people you{" "}
              <span className="gradient-hero bg-clip-text text-transparent">
                care about
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-xl">
              TaskFlow helps coaches, teachers, and parents create personalized plans and track progress — powered by AI that understands your goals.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="xl">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="xl">
                Watch Demo
              </Button>
            </div>

            <div className="flex flex-wrap gap-6 pt-4">
              {["No credit card required", "14-day free trial", "Cancel anytime"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Right column - AI Chat Preview */}
          <div className="relative animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="absolute inset-0 gradient-hero opacity-20 blur-3xl rounded-full" />
            <div className="relative bg-card rounded-2xl shadow-elevated border border-border overflow-hidden">
              {/* Chat header */}
              <div className="px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">TaskFlow AI</p>
                    <p className="text-xs text-muted-foreground">Always ready to help</p>
                  </div>
                </div>
              </div>
              
              {/* Chat messages */}
              <div className="p-6 space-y-4 min-h-[320px]">
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-br-md max-w-[80%]">
                    <p className="text-sm">Create a 4-week training plan for my U12 soccer team</p>
                  </div>
                </div>
                
                <div className="flex justify-start">
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md max-w-[80%]">
                    <p className="text-sm text-foreground">
                      I've created a progressive 4-week plan focusing on:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>• Week 1-2: Ball control & passing fundamentals</li>
                      <li>• Week 3: Small-sided games & positioning</li>
                      <li>• Week 4: Match preparation & teamwork</li>
                    </ul>
                    <p className="text-sm text-primary mt-3 font-medium">
                      View full plan →
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-br-md max-w-[80%]">
                    <p className="text-sm">Perfect! Add extra drills for Jake, he needs work on his left foot</p>
                  </div>
                </div>
              </div>

              {/* Input area */}
              <div className="px-6 py-4 border-t border-border">
                <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-3">
                  <input 
                    type="text" 
                    placeholder="Ask TaskFlow AI anything..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    readOnly
                  />
                  <Button variant="hero" size="sm">
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
