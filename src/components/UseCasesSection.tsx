import { Trophy, GraduationCap, Home } from "lucide-react";

const useCases = [
  {
    icon: Trophy,
    title: "For Coaches",
    description: "Build progressive training programs, track athlete development, and personalize drills based on individual needs.",
    examples: ["Training schedules", "Skill progressions", "Team performance tracking"],
    gradient: "from-primary to-primary/70",
  },
  {
    icon: GraduationCap,
    title: "For Teachers",
    description: "Create study plans, homework schedules, and learning progressions that adapt to each student's pace.",
    examples: ["Study routines", "Assignment tracking", "Learning milestones"],
    gradient: "from-accent to-accent/70",
  },
  {
    icon: Home,
    title: "For Parents",
    description: "Design daily routines, chore schedules, and activity plans that motivate kids and build good habits.",
    examples: ["Morning routines", "Chore charts", "Activity schedules"],
    gradient: "from-primary to-accent",
  },
];

const UseCasesSection = () => {
  return (
    <section className="py-24 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built for people who{" "}
            <span className="gradient-hero bg-clip-text text-transparent">guide others</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Whether you're developing athletes, students, or kids — TaskFlow adapts to your unique needs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border p-8 hover:shadow-elevated transition-all duration-300"
            >
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${useCase.gradient}`} />
              
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <useCase.icon className="w-7 h-7 text-primary" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {useCase.title}
              </h3>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {useCase.description}
              </p>
              
              <div className="space-y-2">
                {useCase.examples.map((example) => (
                  <div
                    key={example}
                    className="inline-block mr-2 mb-2 px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground"
                  >
                    {example}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCasesSection;
