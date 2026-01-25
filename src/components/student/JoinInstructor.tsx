import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, CheckCircle } from "lucide-react";

interface JoinResult {
    success: boolean;
    message?: string;
    error?: string;
    class_name?: string;
}

export function JoinInstructor({ onSuccess }: { onSuccess?: () => void }) {
    const { toast } = useToast();
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [joined, setJoined] = useState(false);
    const [className, setClassName] = useState("");

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc("accept_invite", {
                p_join_code: code.toUpperCase().trim(),
            });

            const result = data as unknown as JoinResult;

            if (error) {
                throw new Error(error.message);
            }

            if (result?.success) {
                setJoined(true);
                setClassName(result.class_name || "your instructor");
                toast({
                    title: "Joined Successfully",
                    description: result.message || "You are now connected to your instructor.",
                });
                onSuccess?.();
            } else {
                toast({
                    title: "Could not join",
                    description: result?.error || "Invalid invite code. Please try again.",
                    variant: "destructive",
                });
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message || "Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleJoinAnother = () => {
        setJoined(false);
        setCode("");
        setClassName("");
    };

    if (joined) {
        return (
            <Card className="border-success/50 bg-success/5">
                <CardContent className="flex flex-col items-center justify-center py-8">
                    <CheckCircle className="w-12 h-12 text-success mb-4" />
                    <h3 className="font-bold text-lg">You're Connected!</h3>
                    <p className="text-muted-foreground text-center mt-2">
                        You've joined {className}. Check your schedule for assignments.
                    </p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={handleJoinAnother}
                    >
                        Join Another Group
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Join an Instructor
                </CardTitle>
                <CardDescription>
                    Enter the class code from your teacher to connect.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleJoin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">Class Code</Label>
                        <Input
                            id="code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="Enter 6-digit code"
                            maxLength={8}
                            className="text-center text-xl tracking-widest font-mono uppercase"
                            disabled={loading}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Join Class
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
