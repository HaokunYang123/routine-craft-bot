import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function ParentDashboard() {
  return (
    <ProtectedRoute requiredRole="parent">
      <div className="coach-theme min-h-screen bg-background p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card/80 p-8">
          <h1 className="text-3xl font-semibold text-foreground">Parent Dashboard</h1>
          <p className="mt-2 text-muted-foreground">Link your child's account to get started.</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
