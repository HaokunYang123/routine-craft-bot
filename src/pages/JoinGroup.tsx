import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const PENDING_JOIN_TOKEN_KEY = "pending_join_token";

type JoinStatus = "loading" | "error";

export default function JoinGroup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<JoinStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasRunRef = useRef<string | null>(null);

  useEffect(() => {
    const runJoinFlow = async () => {
      if (!token) {
        setStatus("error");
        setErrorMessage("Invalid join link");
        return;
      }

      if (hasRunRef.current === token) {
        return;
      }
      hasRunRef.current = token;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          sessionStorage.setItem(PENDING_JOIN_TOKEN_KEY, token);
          navigate("/login?message=sign-in-to-join-your-group", { replace: true });
          return;
        }

        const { data: group, error: groupError } = await supabase
          .from("groups")
          .select("id, name")
          .eq("qr_token", token)
          .single();

        if (groupError || !group) {
          setStatus("error");
          setErrorMessage("This join link is invalid or expired");
          return;
        }

        const { data: existingMembership, error: membershipError } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("user_id", session.user.id)
          .eq("group_id", group.id)
          .maybeSingle();

        if (membershipError) {
          setStatus("error");
          setErrorMessage(membershipError.message || "Unable to verify your membership");
          return;
        }

        if (existingMembership) {
          toast({
            title: "Already joined",
            description: "You're already in this group",
          });
          navigate("/app", { replace: true });
          return;
        }

        const { error: joinError } = await supabase
          .from("group_members")
          .insert({ user_id: session.user.id, group_id: group.id });

        if (joinError) {
          if (joinError.code === "23505") {
            toast({
              title: "Already joined",
              description: "You're already in this group",
            });
            navigate("/app", { replace: true });
            return;
          }

          setStatus("error");
          setErrorMessage(joinError.message || "Unable to join this group");
          return;
        }

        toast({
          title: "Success",
          description: `Joined ${group.name}!`,
        });
        navigate("/app", { replace: true });
      } catch (error: unknown) {
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong while joining");
      }
    };

    void runJoinFlow();
  }, [navigate, toast, token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cta-primary" />
            Join Group
          </CardTitle>
          <CardDescription>
            {status === "loading"
              ? "Verifying your join link and enrolling you..."
              : "We couldn't complete your join request."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-cta-primary" />
              Joining your group...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{errorMessage || "Unable to process this join link"}</span>
              </div>
              <Button variant="outline" onClick={() => navigate("/login", { replace: true })} className="w-full">
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
