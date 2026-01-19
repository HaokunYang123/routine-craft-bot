import { useState } from "react";
import { useClassCode } from "@/hooks/useClassCode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";

interface ClassCodeFormProps {
    onSuccess: (sessionName: string) => void;
    onCancel: () => void;
}

export function ClassCodeForm({ onSuccess, onCancel }: ClassCodeFormProps) {
    const [code, setCode] = useState("");
    const [displayName, setDisplayName] = useState("");
    const { loading, error, validateAndJoin, clearError } = useClassCode();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();

        const session = await validateAndJoin(code, displayName || undefined);
        if (session) {
            onSuccess(session.session_name);
        }
    };

    // Format code as user types (uppercase, no spaces)
    const handleCodeChange = (value: string) => {
        const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
        setCode(formatted);
        clearError();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error display */}
            {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Class code input */}
            <div className="space-y-2">
                <Label htmlFor="classCode">Class Code</Label>
                <Input
                    id="classCode"
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="Enter 6-character code"
                    className="text-center text-2xl tracking-widest font-mono uppercase"
                    maxLength={6}
                    autoComplete="off"
                    autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">
                    Ask your teacher or coach for the class code
                </p>
            </div>

            {/* Display name (optional) */}
            <div className="space-y-2">
                <Label htmlFor="displayName">Your Name (optional)</Label>
                <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How should we call you?"
                />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onCancel} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Button>
                <Button
                    type="submit"
                    className="flex-1"
                    disabled={loading || code.length < 6}
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Joining...
                        </>
                    ) : (
                        "Join Class"
                    )}
                </Button>
            </div>
        </form>
    );
}
