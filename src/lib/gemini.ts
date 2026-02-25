import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/integrations/supabase/client";

const REQUEST_TIMEOUT_MS = 45000;
const JSON_RETRY_SUFFIX = " Respond with valid JSON only, no markdown.";
const AI_CHAT_PATH = "/functions/v1/ai-chat";

export interface GeminiRequest {
  action: string;
  payload?: unknown;
  temperature?: number;
  // Legacy fields retained for compatibility if older callers still pass prompt text.
  systemPrompt?: string;
  userMessage?: string;
}

export interface GeminiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

interface EdgeChatResponse {
  response?: string;
  retry_after_seconds?: number;
  remaining?: number;
  limit?: number;
  error?:
    | string
    | {
      message?: string;
    };
  message?: string;
  error_description?: string;
}

interface RateLimitPayload {
  retry_after_seconds: number;
  remaining: number;
  limit: number;
}

export class RateLimitError extends Error {
  retryAfterSeconds: number;
  remaining: number;
  limit: number;

  constructor(data: RateLimitPayload) {
    super("Rate limit exceeded");
    this.name = "RateLimitError";
    this.retryAfterSeconds = data.retry_after_seconds;
    this.remaining = data.remaining;
    this.limit = data.limit;
  }
}

const getEdgeFunctionUrl = (): string | null => {
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL}${AI_CHAT_PATH}`;
};

const getAuthHeaders = async (): Promise<{ headers: Record<string, string> | null; error: string | null }> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("[gemini] Failed to get session:", error.message);
      return { headers: null, error: "Session expired. Please refresh and try again." };
    }

    const accessToken = data.session?.access_token;
    if (!accessToken) {
      return { headers: null, error: "You must be signed in to use AI features." };
    }

    if (!SUPABASE_ANON_KEY) {
      return { headers: null, error: "Supabase client key not configured." };
    }

    return {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
      error: null,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error("[gemini] Unexpected auth error:", error.message);
    }
    return { headers: null, error: "Could not verify session. Please try again." };
  }
};

const parseGeminiJson = <T>(rawText: string): GeminiResponse<T> => {
  try {
    return {
      success: true,
      data: JSON.parse(rawText) as T,
      error: null,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error("[gemini] Failed to parse JSON response:", error.message);
    } else {
      console.error("[gemini] Failed to parse JSON response");
    }
    return {
      success: false,
      data: null,
      error: "Gemini returned invalid JSON.",
    };
  }
};

const requestGemini = async (
  request: GeminiRequest,
  overrideUserMessage?: string,
): Promise<GeminiResponse<string>> => {
  const edgeFunctionUrl = getEdgeFunctionUrl();
  if (!edgeFunctionUrl) {
    return {
      success: false,
      data: null,
      error: "Supabase URL is not configured.",
    };
  }

  const { headers, error: authError } = await getAuthHeaders();
  if (!headers) {
    return {
      success: false,
      data: null,
      error: authError || "Authentication failed.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const requestBody: Record<string, unknown> = {
      action: request.action,
      payload: request.payload,
      temperature: request.temperature ?? 0.7,
    };

    if (typeof request.systemPrompt === "string") {
      requestBody.systemPrompt = request.systemPrompt;
    }

    if (typeof overrideUserMessage === "string") {
      requestBody.userMessage = overrideUserMessage;
    } else if (typeof request.userMessage === "string") {
      requestBody.userMessage = request.userMessage;
    }

    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    });

    let payload: EdgeChatResponse = {};
    try {
      payload = (await response.json()) as EdgeChatResponse;
    } catch {
      // keep empty payload for fallback error messages
    }

    if (response.status === 429) {
      const retryAfterFromHeader = Number(response.headers.get("Retry-After") || 0);
      const retryAfter = Number(payload.retry_after_seconds ?? retryAfterFromHeader);
      const remaining = Number(payload.remaining ?? 0);
      const limit = Number(payload.limit ?? 0);

      throw new RateLimitError({
        retry_after_seconds: Number.isFinite(retryAfter) ? Math.max(0, Math.ceil(retryAfter)) : 0,
        remaining: Number.isFinite(remaining) ? Math.max(0, Math.floor(remaining)) : 0,
        limit: Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0,
      });
    }

    if (!response.ok) {
      const errorMessage =
        typeof payload.error === "string"
          ? payload.error
          : payload.error?.message;
      const statusMessage =
        errorMessage ||
        payload.message ||
        payload.error_description ||
        response.statusText ||
        "Unknown error";
      console.error("[gemini] Edge function request failed:", response.status, statusMessage);
      return {
        success: false,
        data: null,
        error: `AI service error (${response.status}): ${statusMessage}`,
      };
    }

    const responseText = typeof payload.response === "string" ? payload.response : "";
    if (!responseText) {
      console.error("[gemini] Edge function response missing content");
      return {
        success: false,
        data: null,
        error: "AI response was empty.",
      };
    }

    return {
      success: true,
      data: responseText,
      error: null,
    };
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      console.error("[gemini] Gemini request timed out");
      return {
        success: false,
        data: null,
        error: "Request timed out. Try a simpler prompt or try again.",
      };
    }

    if (error instanceof TypeError) {
      console.error("[gemini] Gemini network error:", error.message);
      return {
        success: false,
        data: null,
        error: "Network error. Check your connection and try again.",
      };
    }

    if (error instanceof Error) {
      console.error("[gemini] Gemini request failed:", error.message);
      return {
        success: false,
        data: null,
        error: `Gemini request failed: ${error.message}`,
      };
    }

    console.error("[gemini] Gemini request failed with unknown error");
    return {
      success: false,
      data: null,
      error: "Gemini request failed due to an unknown error.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

export async function callGemini<T>(request: GeminiRequest): Promise<GeminiResponse<T>> {
  const firstAttempt = await requestGemini(request);
  if (!firstAttempt.success || !firstAttempt.data) {
    return {
      success: false,
      data: null,
      error: firstAttempt.error || "Gemini request failed.",
    };
  }

  const parsedFirstAttempt = parseGeminiJson<T>(firstAttempt.data);
  if (parsedFirstAttempt.success) {
    return parsedFirstAttempt;
  }

  if (typeof request.userMessage !== "string") {
    return {
      success: false,
      data: null,
      error: "Gemini returned invalid JSON.",
    };
  }

  const retryMessage = `${request.userMessage}${JSON_RETRY_SUFFIX}`;
  const retryAttempt = await requestGemini(request, retryMessage);
  if (!retryAttempt.success || !retryAttempt.data) {
    return {
      success: false,
      data: null,
      error: retryAttempt.error || "Gemini retry failed.",
    };
  }

  const parsedRetryAttempt = parseGeminiJson<T>(retryAttempt.data);
  if (!parsedRetryAttempt.success) {
    return {
      success: false,
      data: null,
      error: "Gemini returned invalid JSON after one retry.",
    };
  }

  return parsedRetryAttempt;
}
