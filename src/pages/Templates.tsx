import { useState } from "react";
import { Library, Plus, Sparkles, Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIPlanBuilder } from "@/components/ai/AIPlanBuilder";
import { GeneratedTask } from "@/hooks/useAIAssistant";
import { useToast } from "@/hooks/use-toast";

interface SavedTemplate {
  id: string;
  name: string;
  tasks: GeneratedTask[];
  createdAt: Date;
}

export default function Templates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [activeTab, setActiveTab] = useState("create");

  const handleSavePlan = (tasks: GeneratedTask[]) => {
    const newTemplate: SavedTemplate = {
      id: crypto.randomUUID(),
      name: `Plan ${templates.length + 1}`,
      tasks,
      createdAt: new Date(),
    };

    setTemplates((prev) => [...prev, newTemplate]);
    setActiveTab("library");

    toast({
      title: "Plan Saved",
      description: `${tasks.length} tasks saved to your template library.`,
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Template Library</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage reusable plans with AI assistance
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/30">
          <TabsTrigger
            value="create"
            className="data-[state=active]:bg-cta-primary data-[state=active]:text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Builder
          </TabsTrigger>
          <TabsTrigger
            value="library"
            className="data-[state=active]:bg-cta-primary data-[state=active]:text-white"
          >
            <Library className="w-4 h-4 mr-2" />
            My Templates ({templates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6">
          <AIPlanBuilder onSavePlan={handleSavePlan} />
        </TabsContent>

        <TabsContent value="library" className="mt-6">
          {templates.length === 0 ? (
            <Card className="border-dashed border-2 border-border bg-card/50">
              <CardContent className="py-16 text-center">
                <Library className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium text-foreground mb-2">
                  No Templates Yet
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Use the AI Builder to create your first template, or create one
                  manually.
                </p>
                <Button
                  onClick={() => setActiveTab("create")}
                  className="bg-cta-primary hover:bg-cta-hover text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create with AI
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="border-border hover:border-cta-primary/50 transition-all cursor-pointer"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-foreground">
                      {template.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Library className="w-4 h-4" />
                          {template.tasks.length} tasks
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {template.tasks.reduce(
                            (sum, t) => sum + t.duration_minutes,
                            0
                          )}
                          m total
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {Math.max(...template.tasks.map((t) => t.day_offset)) + 1}{" "}
                        days
                      </div>
                      <div className="pt-2 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-btn-secondary/30 text-btn-secondary hover:bg-btn-secondary/10"
                        >
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-cta-primary hover:bg-cta-hover text-white"
                        >
                          Assign
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
