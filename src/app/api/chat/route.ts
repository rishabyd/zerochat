import { saveMessage } from "@/lib/actions/chat-actions";
import { GetBestModel } from "@/lib/ai-gateway/model-registry";
import { getGatewayConfig } from "@/lib/ai-gateway/provider-options";
import { auth } from "@/lib/auth";
import { saveAiMessage, saveUserMessage } from "@/lib/services/user-chat";
import { getSession } from "@/lib/services/user-sessions";
import { apiDebugger } from "@/lib/tools/api-testing";
import { urlCrawler } from "@/lib/tools/live-crawler";
import { webSearch } from "@/lib/tools/web-search-tool";
import type { StreamingError } from "@/lib/types";
import { generateMessageId } from "@/lib/utils";
import { supermemoryTools } from "@supermemory/tools/ai-sdk";
import type { UIDataTypes, UIMessage, UITools } from "ai";

import {
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
const createAssistantMessage = (
  content: string
): UIMessage<unknown, UIDataTypes, UITools> => ({
  id: generateMessageId(),
  role: "assistant",
  parts: [{ type: "text", text: content }],
});

// Extract text content from message parts for processing and storage
const extractText = (m?: UIMessage<unknown, UIDataTypes, UITools>): string =>
  (m?.parts || [])
    .filter((p) => p.type === "text") // Filter only text parts
    .map((p) => String(p.text || "")) // Convert to string safely
    .join("\n"); // Join with newlines

// Get user-friendly error messages based on HTTP status codes for better UX
const getErrorMessage = (status: number): string => {
  switch (status) {
    case 429:
      return "Usage limit reached. Try again later.";
    case 400:
      return "Invalid request or model.";
    case 403:
      return "Access denied. Check API key/permissions.";
    case 503:
      return "Service temporarily unavailable due to maintenance.";
    default:
      return "Unexpected error occurred.";
  }
};

// Log partial response with token counting
const logPartialResponse = async (
  sessionId: string,
  userMessage: UIMessage<unknown, UIDataTypes, UITools>,
  partialResponse: string,
  model?: string,
  complexity?: number
) => {
  try {
    // Validate partial response content
    if (!partialResponse || typeof partialResponse !== "string") {
      console.warn("Invalid partial response content:", partialResponse);
      return;
    }

    const trimmedResponse = partialResponse.trim();
    if (!trimmedResponse) {
      console.warn("Empty partial response, skipping save");
      return;
    }

    // Validate sessionId
    if (!sessionId || typeof sessionId !== "string") {
      console.warn("Invalid sessionId for partial response:", sessionId);
      return;
    }

    const partialContent = trimmedResponse.replace(/\[partial\]/gi, "").trim();

    if (partialContent) {
      await saveMessage({
        sessionId,
        role: "AI",
        content: partialContent,
        model,
      });
    }
  } catch (error) {
    console.error(`Failed to save partial response:`, {
      sessionId,
      partialResponseLength: partialResponse?.length,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};

// Handle streaming errors and convert to appropriate HTTP responses
const handleStreamingError = (
  error: StreamingError
): { status: number; message: string } => {
  console.error("AI streaming failed:", error);

  if (error?.name === "AbortError") {
    return { status: 499, message: "Request cancelled by client" };
  }

  if (error?.message?.includes("quota") || error?.code === 429) {
    return { status: 429, message: getErrorMessage(429) };
  }

  if (error?.message?.includes("model") || error?.code === 400) {
    return { status: 400, message: getErrorMessage(400) };
  }

  if (error?.response?.status === 403) {
    return { status: 403, message: getErrorMessage(403) };
  }

  return { status: 500, message: getErrorMessage(500) };
};

// POST endpoint to handle chat message processing and AI response streaming
export async function POST(req: Request) {
  console.log(`🚀 Chat POST request started at ${new Date().toISOString()}`);

  try {
    const session = await auth.api.getSession({ headers: req.headers });
    const userId = session?.user.id;
    if (!userId)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    // const userProfile = await getCurrentUserProfile(userId);

    // Enforce plan usage limits before processing heavy work

    // Get the request's abort signal if available (for client-side cancellation)
    const requestSignal = req.signal;

    // Create AbortController for internal timeout management
    const timeoutController = new AbortController();
    const timeoutSignal = timeoutController.signal;

    // Create a combined abort signal that triggers when either signal is aborted
    const combinedSignal = new AbortController();

    // Listen to both signals and abort the combined signal when either triggers
    if (requestSignal) {
      requestSignal.addEventListener("abort", () => {
        combinedSignal.abort();
      });
    }
    timeoutSignal.addEventListener("abort", () => {
      combinedSignal.abort();
    });

    // Set up request timeout and cleanup (3 minutes instead of 5 for faster response)
    const timeoutId = setTimeout(() => {
      timeoutController.abort();
    }, 180000);

    // Cleanup function to release resources and clear timeout
    const cleanup = () => {
      clearTimeout(timeoutId);
    };

    // Check if request was already cancelled by client
    if (requestSignal?.aborted) {
      cleanup();
      return Response.json(
        { error: "Request cancelled by client" },
        { status: 499 }
      );
    }

    try {
      // Check if request is already aborted
      if (combinedSignal.signal.aborted) {
        cleanup();
        return Response.json({ error: "Request cancelled" }, { status: 499 });
      }

      // Parse request body - expecting currentMessage instead of full messages array
      const body = (await req.json()) as {
        currentMessage: UIMessage<unknown, UIDataTypes, UITools>; // Current user message
        sessionId: string; // Chat session identifier
        chatMode: "agent" | "simple";
      };
      const { sessionId, currentMessage, chatMode } = body;

      if (!sessionId) {
        cleanup();
        return Response.json(
          { error: "Session ID is required" },
          { status: 400 }
        );
      }

      if (!currentMessage) {
        cleanup();
        return Response.json(
          { error: "Current message is required" },
          { status: 400 }
        );
      }

      // Load conversation history from database and convert to UIMessage format
      const dbMessages = (await getSession(userId, sessionId))?.messages || [];

      // Convert database messages to UIMessage format
      const historyMessages: UIMessage<unknown, UIDataTypes, UITools>[] =
        dbMessages.map((msg) => ({
          id: msg.id,
          role: msg.role === "USER" ? "user" : "assistant",
          parts: [{ type: "text", text: msg.content }],
          createdAt: msg.createdAt,
        }));

      console.log(
        `Session ${sessionId}: Loaded ${historyMessages.length} messages from database`
      );

      // Validate current message format and role
      if (!currentMessage || currentMessage.role !== "user") {
        cleanup();
        return Response.json(
          { error: "Invalid user message" },
          { status: 400 }
        );
      }

      // Prepare full context for AI (limited to MAX_CHAT_MESSAGES for performance)
      const messagesForAI = [...historyMessages, currentMessage].slice(-20);

      // Enhanced streaming with partial response capture and comprehensive logging
      let partialResponse = "";

      // Handle client abort to log partial responses
      requestSignal?.addEventListener(
        "abort",
        () => {
          if (partialResponse.trim()) {
            void logPartialResponse(sessionId, currentMessage, partialResponse);
          }
        },
        { once: true }
      );
      try {
        const messagesForRouter = messagesForAI.slice(-4);
        const { model, complexity } = await GetBestModel(messagesForRouter);

        const result = streamText({
          providerOptions: {
            gateway: getGatewayConfig(model),
          },
          system: `You are an intelligent assistant with memory capabilities. You can save and retrieve user preferences to provide highly personalized responses.

## Memory Usage Rules

### ALWAYS search memories first
Before answering ANY question, FIRST call searchMemories to check for relevant user context. This is MANDATORY, not optional.

### Save important information automatically
When users share preferences, constraints, or context about themselves, save it using addMemory WITHOUT announcing it.

### Use memories naturally
- NEVER say "I remember you prefer X" or "Based on your preferences..."
- NEVER list saved preferences back to the user
- INSTEAD: Naturally incorporate preferences into your advice
- Make personalized recommendations feel organic, not robotic

## Good vs Bad Examples

❌ BAD: "I see from your preferences that you use TypeScript and Vercel. Based on this, I recommend..."
✅ GOOD: "For your Next.js setup, I'd recommend using Prisma since it has excellent TypeScript support and works seamlessly on Vercel."

❌ BAD: "Let me check your preferences... You're bootstrapping with limited budget..."
✅ GOOD: "Given cost is a priority, the free tier of Supermemory would work well here."

❌ BAD: "I saved your preference for backend work over full-stack."
✅ GOOD: [Save silently, then naturally suggest backend-focused solutions]

## What to Save

Save facts like:
- Tech stack: "Uses Next.js 15, TypeScript, Prisma, Vercel"
- Projects: "Building WatchDevs video platform for developers"
- Constraints: "Bootstrapping, cost-conscious, limited runway"
- Preferences: "Prefers backend work, finds React exhausting"
- Pain points: "Concerned about Vercel costs at scale"

## Execution Flow

1. User asks question
2. IMMEDIATELY call searchMemories(user's query)
3. Read retrieved memories silently
4. Craft response that naturally incorporates that context
5. If user shares new info, call addMemory silently
6. Respond without mentioning the memory operations

Your goal: Make every response feel personally tailored WITHOUT the user noticing you're using memory tools.`,

          model,
          tools:
            body.chatMode === "agent"
              ? {
                  webSearch,
                  apiDebugger,
                  urlCrawler,
                  ...supermemoryTools(process.env.SUPERMEMORY_API_KEY!, {
                    containerTags: [userId],
                  }),
                }
              : undefined,
          stopWhen: body.chatMode === "agent" ? [stepCountIs(10)] : undefined,
          toolChoice: body.chatMode === "agent" ? "auto" : "none",
          messages: convertToModelMessages(messagesForAI),
          experimental_transform: smoothStream({
            delayInMs: 35,
            chunking: "word",
          }),
          abortSignal: combinedSignal.signal,

          onFinish: async (e) => {
            try {
              // Check if request was aborted before processing
              if (combinedSignal.signal.aborted) {
                await logPartialResponse(
                  sessionId,
                  currentMessage,
                  partialResponse
                );
                return;
              }

              // Extract text content from messages for database storage
              const userContent = extractText(currentMessage);
              let assistantContent = (
                e as {
                  text?: string;
                  responseMessages?: UIMessage<unknown, UIDataTypes, UITools>[];
                }
              ).text?.trim();
              if (!assistantContent) {
                const resp = (
                  e as {
                    text?: string;
                    responseMessages?: UIMessage<
                      unknown,
                      UIDataTypes,
                      UITools
                    >[];
                  }
                ).responseMessages?.find(
                  (m: UIMessage<unknown, UIDataTypes, UITools>) =>
                    m?.role === "assistant"
                );
                assistantContent = resp ? extractText(resp) : undefined;
              }

              // Calculate token usage for cost tracking
              const usage =
                (
                  e.providerMetadata?.google as {
                    usageMetadata?: {
                      promptTokenCount?: number;
                      candidatesTokenCount?: number;
                    };
                  }
                )?.usageMetadata || {};
              const totalTokens =
                (usage.promptTokenCount || 0) +
                (usage.candidatesTokenCount || 0);
              console.log("Total tokens-", totalTokens);

              console.log(
                "Provider metadata-",
                JSON.stringify(await result.providerMetadata, null, 2)
              );

              // Log messages using new server actions
              if (userContent && assistantContent) {
                try {
                  // Log user message (no tokens - only content and metadata)
                  await saveUserMessage({
                    sessionId,
                    content: userContent,
                    userId,
                  });

                  // Log AI response (with tokens for cost tracking and billing)
                  await saveAiMessage({
                    userId,
                    sessionId,
                    content: assistantContent,
                    model,
                    webUsed: false,
                  });

                  // Messages logged successfully
                } catch (loggingError) {
                  console.error("Failed to log messages:", loggingError);
                  // Don't fail the stream if logging fails
                }
              }

              // Persist to database for fast subsequent access
              const toPush: UIMessage<unknown, UIDataTypes, UITools>[] = [];
              if (currentMessage) toPush.push(currentMessage);
              if (assistantContent) {
                toPush.push(createAssistantMessage(assistantContent));
              }

              if (toPush.length) {
                // Messages are saved to database via logUserMessage
              }
            } catch {
              // Log partial response even if persistence fails
              await logPartialResponse(
                sessionId,
                currentMessage,
                partialResponse,
                model,
                complexity
              );

              // Don't throw here to avoid breaking the stream
            }
          },
          onChunk: async (e) => {
            partialResponse = "";
          },
          onError: async (_error) => {
            // Log partial response and error metrics
            if (partialResponse.trim()) {
              await logPartialResponse(
                sessionId,
                currentMessage,
                partialResponse,
                model,
                complexity
              );
            }

            cleanup();
          },
        });

        // Check for cancellation before creating response
        if (combinedSignal.signal.aborted) {
          // Log partial response if any was generated before cancellation
          if (partialResponse.trim()) {
            await logPartialResponse(
              sessionId,
              currentMessage,
              partialResponse,
              model,
              complexity
            );
          }
          cleanup();
          return Response.json({ error: "Request cancelled" }, { status: 499 });
        }

        // Create response with proper cancellation handling
        const response = result.toUIMessageStreamResponse({
          originalMessages: messagesForAI,
        });

        return response;
      } catch (error: unknown) {
        // Log partial response if any was generated before the error
        if (partialResponse.trim()) {
          await logPartialResponse(sessionId, currentMessage, partialResponse);
        }

        cleanup();

        // Enhanced error handling with proper abort detection
        const { status, message } = handleStreamingError(
          error as StreamingError
        );

        return Response.json({ error: message }, { status });
      }
    } catch (error: unknown) {
      cleanup();

      // Enhanced error handling with proper abort detection
      const { status, message } = handleStreamingError(error as StreamingError);

      return Response.json({ error: message }, { status });
    } finally {
      // Ensure cleanup always happens regardless of success/failure
      cleanup();
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("maintenance")) {
      return Response.json(
        {
          error: "Chat is currently under maintenance. Please try again later.",
        },
        { status: 503 }
      );
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Chat API error occurred
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
