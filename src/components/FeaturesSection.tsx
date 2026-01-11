import { 
  Wand2, 
  UserCog, 
  MessageSquareText, 
  BarChart3, 
  Lightbulb, 
  Mic 
} from "lucide-react";

const features = [
  {
    icon: Wand2,
    title: "Generate Plans",
    description: "Create complete training plans, study schedules, or daily routines from a simple request. Just describe what you need.",
  },
  {
    icon: UserCog,
    title: "Personalize",
    description: "Adapt any routine for specific individuals based on their level, goals, schedule, or past performance.",
  },
  {
    icon: MessageSquareText,
    title: "Rewrite for Clarity",
    description: "Transform vague tasks into clear, motivating instructions appropriate for any age or skill level.",
  },
  {
    icon: BarChart3,
    title: "Summarize Progress",
    description: "Get weekly summaries highlighting improvements, patterns, and actionable insights for each person.",
  },
  {
    icon: Lightbulb,
    title: "Smart Suggestions",
    description: "Receive proactive recommendations when patterns emerge — like suggesting schedule changes when tasks are consistently missed.",
  },
  {
    icon: Mic,
    title: "Natural Language",
    description: "\"Add practice Mon/Wed at 6pm for the next month\" — just type naturally and TaskFlow handles the rest.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything you need to build{" "}
            <span className="gradient-hero bg-clip-text text-transparent">effective routines</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Powered by AI that understands coaching, teaching, and parenting — not just task lists.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl gradient-card border border-border hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
