import { saveMessage } from "@/lib/actions/chat-actions";
import { GetBestModel } from "@/lib/ai-gateway/model-registry";
import { getGatewayConfig } from "@/lib/ai-gateway/provider-options";
import { getServerUserId } from "@/lib/auth";
import { saveAiMessage, saveUserMessage } from "@/lib/services/user-chat";
import { getCustomPrompt } from "@/lib/services/user-profile";
import { getSession } from "@/lib/services/user-sessions";
import { urlCrawler } from "@/lib/tools/live-crawler";
import { webSearch } from "@/lib/tools/web-search-tool";
import type { StreamingError } from "@/lib/types";
import { generateMessageId } from "@/lib/utils";
import type { UIDataTypes, UIMessage, UITools } from "ai";

import {
  consumeStream,
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { NextResponse } from "next/server";

const createAssistantMessage = (
  content: string,
): UIMessage<unknown, UIDataTypes, UITools> => ({
  id: generateMessageId(),
  role: "assistant",
  parts: [{ type: "text", text: content }],
});

const extractText = (m?: UIMessage<unknown, UIDataTypes, UITools>): string =>
  (m?.parts || [])
    .filter((p) => p.type === "text")
    .map((p) => String(p.text || ""))
    .join("\n");

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

const logPartialResponse = async (
  sessionId: string,
  userMessage: UIMessage<unknown, UIDataTypes, UITools>,
  partialResponse: string,
  model?: string,
  complexity?: number,
) => {
  try {
    if (!partialResponse || typeof partialResponse !== "string") {
      console.warn("Invalid partial response content:", partialResponse);
      return;
    }

    const trimmedResponse = partialResponse.trim();
    if (!trimmedResponse) {
      console.warn("Empty partial response, skipping save");
      return;
    }

    if (!sessionId || typeof sessionId !== "string") {
      console.warn("Invalid sessionId for partial response:", sessionId);
      return;
    }

    const partialContent = trimmedResponse.replace(/\[partial\]/gi, "").trim();
    const userContent = extractText(userMessage);

    if (partialContent && userContent) {
      console.log(
        `💾 Saving both USER and AI messages (AI: ${partialContent.length} chars, USER: ${userContent.length} chars)`,
      );

      // Use default values if model or complexity are undefined
      const finalModel = model || "unknown";
      const finalComplexity = complexity || 0;

      // Save USER message
      await saveMessage({
        sessionId,
        role: "USER",
        content: userContent,
        model: finalModel,
        complexity: finalComplexity,
      });

      // Save AI message
      await saveMessage({
        sessionId,
        role: "AI",
        content: partialContent,
        model: finalModel,
        complexity: finalComplexity,
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

const handleStreamingError = (
  error: StreamingError,
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

export async function POST(req: Request) {
  console.log(`🚀 Chat POST request started at ${new Date().toISOString()}`);

  try {
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort();
    }, 180000); // 3 minutes

    const signals = [timeoutController.signal];
    if (req.signal) signals.push(req.signal);
    const combinedSignal = AbortSignal.any(signals);

    const cleanup = () => {
      clearTimeout(timeoutId);
    };

    if (combinedSignal.aborted) {
      cleanup();
      return Response.json(
        { error: "Request cancelled by client" },
        { status: 499 },
      );
    }

    try {
      // Parse request body
      const body = (await req.json()) as {
        currentMessage: UIMessage<unknown, UIDataTypes, UITools>;
        sessionId: string;
        chatMode: "agent" | "simple";
        model: string;
      };
      const { sessionId, currentMessage, chatMode, model } = body;

      if (!sessionId) {
        cleanup();
        return Response.json(
          { error: "Session ID is required" },
          { status: 400 },
        );
      }

      if (!currentMessage) {
        cleanup();
        return Response.json(
          { error: "Current message is required" },
          { status: 400 },
        );
      }

      // Load conversation history
      const [session, customData] = await Promise.all([
        getSession(userId, sessionId),
        getCustomPrompt({ userId }),
      ]);
      const dbMessages = session?.messages;

      const historyMessages: UIMessage<unknown, UIDataTypes, UITools>[] =
        dbMessages!.map((msg) => ({
          id: msg.id,
          role: msg.role === "USER" ? "user" : "assistant",
          parts: [{ type: "text", text: msg.content }],
          createdAt: msg.createdAt,
        }));

      console.log(
        `Session ${sessionId}: Loaded ${historyMessages.length} messages from database`,
      );

      if (!currentMessage || currentMessage.role !== "user") {
        cleanup();
        return Response.json(
          { error: "Invalid user message" },
          { status: 400 },
        );
      }

      const messagesForAI = [...historyMessages, currentMessage].slice(-20);

      let partialResponse = "";

      try {
        const messagesForRouter = messagesForAI.slice(-4);

        const modelResult =
          model === "auto"
            ? await GetBestModel(messagesForRouter, chatMode)
            : null;
        const autoModel = modelResult?.autoModel;
        const complexity = modelResult?.complexity;
        const finalModel = model === "auto" ? autoModel : model;

        const result = streamText({
          providerOptions: {
            gateway: getGatewayConfig(finalModel!),
          },
          system: `
          These are user custom instructions-${customData}.

          remember:never use any tool when user is passing greetings or compliments.rest aways use tools .

          note:use webSearch tool is just for getting relevant links and then you will use crawler to crawl that all links in batch for best performance.

          `,
          model: finalModel!,
          tools:
            body.chatMode === "agent"
              ? {
                  webSearch,
                  urlCrawler,
                }
              : undefined,
          stopWhen: body.chatMode === "agent" ? [stepCountIs(10)] : undefined,
          toolChoice: body.chatMode === "agent" ? "auto" : undefined,
          messages: convertToModelMessages(messagesForAI),
          experimental_transform: smoothStream({
            delayInMs: 20,
            chunking: "word",
          }),
          abortSignal: combinedSignal,

          onAbort: async () => {
            console.log("🛑 Stream aborted, saving partial response");
            if (partialResponse.trim()) {
              await logPartialResponse(
                sessionId,
                currentMessage,
                partialResponse,
                finalModel,
                complexity,
              );
            }
          },

          onFinish: async (e) => {
            try {
              if (combinedSignal.aborted) {
                console.log("⚠️ Stream finished with abort");
                // onAbort already handled saving partial response
                return;
              }

              console.log("✅ Stream finished normally");

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
                    m?.role === "assistant",
                );
                assistantContent = resp ? extractText(resp) : undefined;
              }

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
                JSON.stringify(await result.providerMetadata, null, 2),
              );

              if (userContent && assistantContent) {
                try {
                  await saveUserMessage({
                    sessionId,
                    content: userContent,
                    userId,
                  });

                  await saveAiMessage({
                    userId,
                    sessionId,
                    content: assistantContent,
                    model: finalModel!,
                  });
                } catch (loggingError) {
                  console.error("Failed to log messages:", loggingError);
                }
              }

              const toPush: UIMessage<unknown, UIDataTypes, UITools>[] = [];
              if (currentMessage) toPush.push(currentMessage);
              if (assistantContent) {
                toPush.push(createAssistantMessage(assistantContent));
              }
            } catch (error) {
              console.error("Error in onFinish:", error);
              await logPartialResponse(
                sessionId,
                currentMessage,
                partialResponse,
                finalModel,
                complexity,
              );
            }
          },

          onChunk: async (e) => {
            if (e.chunk?.type === "text-delta") {
              partialResponse += e.chunk.text;
            }
          },

          onError: async (error) => {
            console.error("Stream error:", error);
            if (partialResponse.trim()) {
              await logPartialResponse(
                sessionId,
                currentMessage,
                partialResponse,
                finalModel,
                complexity,
              );
            }
            cleanup();
          },
        });

        // ✅ Check for cancellation before creating response
        if (combinedSignal.aborted) {
          if (partialResponse.trim()) {
            await logPartialResponse(
              sessionId,
              currentMessage,
              partialResponse,
              finalModel,
              complexity,
            );
          }
          cleanup();
          return Response.json({ error: "Request cancelled" }, { status: 499 });
        }

        // ✅ Return response with consumeSseStream option for proper abort handling
        return result.toUIMessageStreamResponse({
          originalMessages: messagesForAI,
          consumeSseStream: consumeStream, // ✅ This ensures onFinish/onAbort run on abort
        });
      } catch (error: unknown) {
        if (partialResponse.trim()) {
          await logPartialResponse(sessionId, currentMessage, partialResponse);
        }

        cleanup();

        const { status, message } = handleStreamingError(
          error as StreamingError,
        );

        return Response.json({ error: message }, { status });
      }
    } catch (error: unknown) {
      cleanup();

      const { status, message } = handleStreamingError(error as StreamingError);

      return Response.json({ error: message }, { status });
    } finally {
      cleanup();
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("maintenance")) {
      return Response.json(
        {
          error: "Chat is currently under maintenance. Please try again later.",
        },
        { status: 503 },
      );
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
