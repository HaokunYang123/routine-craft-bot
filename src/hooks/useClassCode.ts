import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ClassSession {
    session_id: string;
    session_name: string;
    coach_id: string;
}

export function useClassCode() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validateCode = useCallback(async (code: string): Promise<ClassSession | null> => {
        if (!code.trim()) {
            setError("Please enter a class code");
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            // Call the database function to validate the code
            const { data, error: rpcError } = await supabase
                .rpc("validate_join_code", { code: code.trim().toUpperCase() });

            if (rpcError) {
                throw new Error("Failed to validate class code");
            }

            if (!data || data.length === 0) {
                setError("Invalid or expired class code");
                return null;
            }

            return data[0] as ClassSession;
        } catch (err: unknown) {
            setError("Failed to validate class code");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const joinClass = useCallback(async (
        sessionId: string,
        displayName?: string
    ): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setError("You must be logged in to join a class");
                return false;
            }

            const { error: insertError } = await supabase
                .from("class_members")
                .insert({
                    class_session_id: sessionId,
                    user_id: user.id,
                    display_name: displayName || null,
                });

            if (insertError) {
                if (insertError.code === "23505") {
                    // Unique constraint violation - already joined
                    return true; // Consider it a success
                }
                throw new Error("Failed to join class");
            }

            return true;
        } catch (err: unknown) {
            setError("Failed to join class");
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const validateAndJoin = useCallback(async (
        code: string,
        displayName?: string
    ): Promise<ClassSession | null> => {
        const session = await validateCode(code);
        if (!session) return null;

        const joined = await joinClass(session.session_id, displayName);
        if (!joined) return null;

        return session;
    }, [validateCode, joinClass]);

    return {
        loading,
        error,
        validateCode,
        joinClass,
        validateAndJoin,
        clearError: () => setError(null),
    };
}
