const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const REQUEST_TIMEOUT_MS = 15000;
const JSON_RETRY_SUFFIX = " Respond with valid JSON only, no markdown.";

export interface GeminiRequest {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
}

export interface GeminiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

const getGeminiApiKey = (): string | null => {
  const env = import.meta.env as Record<string, string | undefined>;
  const apiKey = env.VITE_GEMINI_API_KEY;
  return apiKey?.trim() || null;
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
  apiKey: string,
  request: GeminiRequest,
  userMessage: string,
): Promise<GeminiResponse<string>> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: request.systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userMessage }],
          },
        ],
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          response_mime_type: "application/json",
          responseMimeType: "application/json",
        },
      }),
    });

    const payload = (await response.json()) as GeminiApiResponse;

    if (!response.ok) {
      const statusMessage = payload.error?.message || response.statusText || "Unknown error";
      console.error("[gemini] Gemini API request failed:", response.status, statusMessage);
      return {
        success: false,
        data: null,
        error: `Gemini API error (${response.status}): ${statusMessage}`,
      };
    }

    const responseText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      console.error("[gemini] Gemini response missing candidates text");
      return {
        success: false,
        data: null,
        error: "Gemini response was empty.",
      };
    }

    return {
      success: true,
      data: responseText,
      error: null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[gemini] Gemini request timed out");
      return {
        success: false,
        data: null,
        error: "Gemini request timed out after 15 seconds.",
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
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.error("[gemini] Missing Gemini API key");
    return {
      success: false,
      data: null,
      error: "Gemini API key not configured",
    };
  }

  const firstAttempt = await requestGemini(apiKey, request, request.userMessage);
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

  const retryMessage = `${request.userMessage}${JSON_RETRY_SUFFIX}`;
  const retryAttempt = await requestGemini(apiKey, request, retryMessage);
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
