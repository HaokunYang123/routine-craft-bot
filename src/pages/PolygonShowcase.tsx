import {
  PolygonCard,
  PolygonButton,
  PolygonBadge,
  PolygonContainer,
  PolygonInput,
  PolygonTab,
  PolygonProgress,
  PolygonStatus,
  PolygonNavItem,
} from "@/components/ui/polygon";
import { Check, Star, ArrowRight, Bell, Settings, Home, User, Zap } from "lucide-react";

const PolygonShowcase = () => {
  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Polygon UI System
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Directional concave irregular polygons with uneven edges, inward notches, and tapered ends.
          </p>
        </div>

        {/* Buttons Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <PolygonButton shape="right">
              Continue <ArrowRight className="w-4 h-4" />
            </PolygonButton>
            <PolygonButton shape="left" variant="accent">
              <ArrowRight className="w-4 h-4 rotate-180" /> Go Back
            </PolygonButton>
            <PolygonButton shape="sharp" variant="hero">
              <Zap className="w-4 h-4" /> Power Up
            </PolygonButton>
            <PolygonButton shape="notch" variant="secondary">
              Settings <Settings className="w-4 h-4" />
            </PolygonButton>
          </div>
          <div className="flex flex-wrap gap-4">
            <PolygonButton shape="right" variant="outline" size="sm">
              Small
            </PolygonButton>
            <PolygonButton shape="right" variant="ghost" size="lg">
              Large Ghost
            </PolygonButton>
            <PolygonButton shape="sharp" variant="destructive" size="xl">
              Extra Large
            </PolygonButton>
          </div>
        </section>

        {/* Cards Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PolygonCard shape="a" elevation="soft" className="p-6">
              <h3 className="font-semibold text-lg mb-2">Card Shape A</h3>
              <p className="text-sm text-muted-foreground">
                Subtle corner cuts with balanced proportions.
              </p>
            </PolygonCard>
            <PolygonCard shape="b" elevation="elevated" className="p-6">
              <h3 className="font-semibold text-lg mb-2">Card Shape B</h3>
              <p className="text-sm text-muted-foreground">
                Asymmetric with deeper inward angles.
              </p>
            </PolygonCard>
            <PolygonCard shape="c" variant="muted" className="p-6">
              <h3 className="font-semibold text-lg mb-2">Card Shape C</h3>
              <p className="text-sm text-muted-foreground">
                Right-weighted with smooth transitions.
              </p>
            </PolygonCard>
            <PolygonCard shape="notch" variant="primary" elevation="glow" className="p-6">
              <h3 className="font-semibold text-lg mb-2">Notched Card</h3>
              <p className="text-sm opacity-90">
                Distinctive concave notch at top-right.
              </p>
            </PolygonCard>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PolygonCard shape="a" variant="glass" className="p-8">
              <h3 className="font-semibold text-xl mb-3">Glass Effect</h3>
              <p className="text-muted-foreground">
                Semi-transparent with backdrop blur for layered interfaces.
              </p>
            </PolygonCard>
            <PolygonCard shape="b" variant="outline" className="p-8">
              <h3 className="font-semibold text-xl mb-3">Outlined</h3>
              <p className="text-muted-foreground">
                Border-only variant for subtle containers.
              </p>
            </PolygonCard>
          </div>
        </section>

        {/* Badges Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Badges</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <PolygonBadge shape="a">Default</PolygonBadge>
            <PolygonBadge shape="a" variant="accent">Accent</PolygonBadge>
            <PolygonBadge shape="b" variant="secondary">Shape B</PolygonBadge>
            <PolygonBadge shape="arrow" variant="success" size="lg">
              <Check className="w-3 h-3 mr-1" /> Complete
            </PolygonBadge>
            <PolygonBadge shape="notch" variant="destructive">Alert</PolygonBadge>
            <PolygonBadge shape="a" variant="outline" size="lg">Outlined</PolygonBadge>
          </div>
        </section>

        {/* Navigation Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Navigation</h2>
          <div className="flex flex-wrap gap-2">
            <PolygonNavItem active>
              <Home className="w-4 h-4" /> Home
            </PolygonNavItem>
            <PolygonNavItem>
              <User className="w-4 h-4" /> Profile
            </PolygonNavItem>
            <PolygonNavItem variant="muted">
              <Settings className="w-4 h-4" /> Settings
            </PolygonNavItem>
            <PolygonNavItem>
              <Bell className="w-4 h-4" /> Notifications
            </PolygonNavItem>
          </div>
        </section>

        {/* Tabs Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Tabs</h2>
          <div className="flex gap-0">
            <PolygonTab active>Overview</PolygonTab>
            <PolygonTab>Analytics</PolygonTab>
            <PolygonTab>Reports</PolygonTab>
            <PolygonTab>Settings</PolygonTab>
          </div>
        </section>

        {/* Input Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Inputs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Shape A Input</label>
              <PolygonInput shape="a" placeholder="Enter your email..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Notched Input</label>
              <PolygonInput shape="notch" placeholder="Search..." inputSize="lg" />
            </div>
          </div>
        </section>

        {/* Progress Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Progress</h2>
          <div className="space-y-4 max-w-xl">
            <PolygonProgress value={75} showLabel />
            <PolygonProgress value={45} />
            <PolygonProgress value={90} showLabel />
          </div>
        </section>

        {/* Status Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Status Indicators</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <PolygonStatus variant="success" size="sm" />
              <span className="text-sm">Success</span>
            </div>
            <div className="flex items-center gap-2">
              <PolygonStatus variant="warning" />
              <span className="text-sm">Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <PolygonStatus variant="error" size="lg" />
              <span className="text-sm">Error</span>
            </div>
            <div className="flex items-center gap-2">
              <PolygonStatus variant="info" />
              <span className="text-sm">Info</span>
            </div>
            <div className="flex items-center gap-2">
              <PolygonStatus variant="neutral" />
              <span className="text-sm">Neutral</span>
            </div>
          </div>
        </section>

        {/* Containers Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Containers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PolygonContainer shape="a" variant="card" className="p-6 h-40 flex items-center justify-center">
              <span className="text-muted-foreground">Shape A</span>
            </PolygonContainer>
            <PolygonContainer shape="notch" variant="muted" className="p-6 h-40 flex items-center justify-center">
              <span className="text-muted-foreground">Notched</span>
            </PolygonContainer>
            <PolygonContainer shape="step" variant="subtle" className="p-6 h-40 flex items-center justify-center">
              <span className="text-muted-foreground">Stepped</span>
            </PolygonContainer>
          </div>
        </section>

        {/* Combined Example */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Combined Example</h2>
          <PolygonCard shape="notch" elevation="elevated" className="p-8 max-w-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">Project Alpha</h3>
                  <PolygonBadge shape="arrow" variant="success" size="sm">
                    Active
                  </PolygonBadge>
                </div>
                <p className="text-sm text-muted-foreground">
                  A showcase of the polygon UI system in action.
                </p>
              </div>
              <PolygonStatus variant="success" />
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">72%</span>
              </div>
              <PolygonProgress value={72} />
            </div>
            <div className="flex gap-3">
              <PolygonButton shape="right" size="sm">
                View Details <ArrowRight className="w-4 h-4" />
              </PolygonButton>
              <PolygonButton shape="sharp" variant="ghost" size="sm">
                <Star className="w-4 h-4" /> Favorite
              </PolygonButton>
            </div>
          </PolygonCard>
        </section>
      </div>
    </div>
  );
};

export default PolygonShowcase;
