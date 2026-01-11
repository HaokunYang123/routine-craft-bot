import { Users, Brain, TrendingUp } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Users,
    title: "Add Your People",
    description: "Create profiles for athletes, students, or family members. Set their goals, skill levels, and availability.",
  },
  {
    number: "02",
    icon: Brain,
    title: "Let AI Build Plans",
    description: "Describe what you need in plain English. TaskFlow generates structured, personalized routines instantly.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Track & Improve",
    description: "Monitor completion, get insights on progress, and receive smart suggestions to keep everyone on track.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 px-4 gradient-subtle">
      <div className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simple to start,{" "}
            <span className="gradient-hero bg-clip-text text-transparent">powerful to scale</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Get up and running in minutes. TaskFlow grows with you as your needs evolve.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
              )}
              
              <div className="text-center">
                <div className="relative inline-flex mb-6">
                  <div className="w-24 h-24 rounded-2xl gradient-hero flex items-center justify-center shadow-glow">
                    <step.icon className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground text-sm font-bold flex items-center justify-center shadow-md">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
