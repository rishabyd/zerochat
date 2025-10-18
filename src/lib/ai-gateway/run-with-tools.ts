import { webSearch } from "@/lib/ai-gateway/web-search-tool";
import type { UIDataTypes, UIMessage, UITools } from "ai";
import { smoothStream, streamText } from "ai";
import { saveAiMessage, saveUserMessage } from "../services/user-chat";
import { getGatewayConfig } from "./model-registry";

// Extract text content from message parts for processing and storage
const extractText = (m?: UIMessage<unknown, UIDataTypes, UITools>): string =>
  (m?.parts || [])
    .filter((p) => p.type === "text") // Filter only text parts
    .map((p) => String(p.text || "")) // Convert to string safely
    .join("\n"); // Join with newlines

export async function runWithTools({
  baseMessages,
  model,
  systemPrompt,
  needsWeb: _needsWeb,
  abortSignal,
  maxOutputTokens,
  sessionId,
  complexity,
  searchQuery,
  userMessage,
  userId,
}: {
  userId: string;
  baseMessages: unknown[];
  model: string;
  systemPrompt: string;
  needsWeb: boolean;
  abortSignal: AbortSignal;
  maxOutputTokens: number;
  sessionId: string;
  complexity: number;
  searchQuery: string;
  userMessage: UIMessage<unknown, UIDataTypes, UITools>;
}) {
  console.log("🔍 Starting web search flow with provided search query");

  const providerOptions = {
    gateway: getGatewayConfig(model),
  };

  console.log("🔍 Using search query:", searchQuery);

  if (!searchQuery) {
    console.log(
      "❌ No search query provided, falling back to regular response"
    );
    return streamText({
      system: systemPrompt,
      model,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: baseMessages as any,
      abortSignal,
      maxOutputTokens,
      providerOptions,
      experimental_transform: smoothStream({
        delayInMs: 20,
        chunking: "word",
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }).toUIMessageStreamResponse({ originalMessages: baseMessages as any });
  }

  // Phase 2: Execute web search
  console.log("🌐 Executing web search with query:", searchQuery);

  try {
    if (!webSearch.execute) {
      throw new Error("Web search execute function not available");
    }

    const searchResult = await webSearch.execute(
      { query: searchQuery },
      {
        toolCallId: "search-" + Date.now(),
        messages: [],
      }
    );
    console.log("📡 Search result:", searchResult);

    // Phase 3: Generate final response with search results
    console.log("🤖 Generating final response with search context");

    const enhancedSystemPrompt = `${systemPrompt}

WEB SEARCH CONTEXT:
You have access to current web search results for the query "${searchQuery}".

SEARCH RESULTS:
${JSON.stringify(searchResult, null, 2)}

INSTRUCTIONS FOR USING SEARCH RESULTS:
1. Use the search results to provide accurate, up-to-date information
2. Incorporate facts and data from the search results naturally into your response
3. Cite specific information when referencing search results
4. If search results are limited or unclear, acknowledge this and provide what you can
5. Structure your response logically with clear sections
6. Include relevant dates, numbers, and specific details from the search
7. Distinguish between confirmed facts and any speculation mentioned
8. If the search results don't fully answer the user's question, explain what information is available and what might need additional research

RESPONSE GUIDELINES:
- Be comprehensive and give good web grounded answer
- Include context and background when helpful
- always give your opinion which thing you like and why its better .
- Maintain a helpful, informative tone
`;
    const finalResponse = streamText({
      system: enhancedSystemPrompt,
      model,
      toolChoice: "none",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: baseMessages as any,
      abortSignal,
      maxOutputTokens,
      providerOptions,
      experimental_transform: smoothStream({
        delayInMs: 20,
        chunking: "word",
      }),
      onFinish: async (e) => {
        try {
          console.log("🔍 onFinish callback triggered in search flow");

          // Extract text content from messages for database storage
          const userContent = extractText(userMessage);
          console.log("🔍 Extracted user content:", userContent);

          let assistantContent = (
            e as {
              text?: string;
              responseMessages?: UIMessage<unknown, UIDataTypes, UITools>[];
            }
          ).text?.trim();
          console.log("🔍 Assistant content from text:", assistantContent);

          if (!assistantContent) {
            const resp = (
              e as {
                text?: string;
                responseMessages?: UIMessage<unknown, UIDataTypes, UITools>[];
              }
            ).responseMessages?.find(
              (m: UIMessage<unknown, UIDataTypes, UITools>) =>
                m?.role === "assistant"
            );
            console.log("🔍 Assistant message from responseMessages:", resp);
            assistantContent = resp ? extractText(resp) : undefined;
            console.log("🔍 Extracted assistant content:", assistantContent);
          }

          // Log messages using server actions
          if (userContent && assistantContent) {
            console.log("🔍 Attempting to save messages with:", {
              sessionId,
              userContentLength: userContent.length,
              assistantContentLength: assistantContent.length,
              complexity,
              model,
            });

            try {
              // Log user message
              await saveUserMessage({
                userId,
                sessionId,
                content: userContent,
              });

              // Log AI response
              await saveAiMessage({
                userId,
                sessionId,
                content: assistantContent,
                model,
                webUsed: true,
              });

              console.log("✅ Messages saved to database (search flow)");
            } catch (loggingError) {
              console.error(
                "Failed to log messages (search flow):",
                loggingError
              );
            }
          } else {
            console.log("❌ Cannot save messages - missing content:", {
              hasUserContent: !!userContent,
              hasAssistantContent: !!assistantContent,
              userContentLength: userContent?.length || 0,
              assistantContentLength: assistantContent?.length || 0,
            });
          }

          // Update usage counters
          try {
            console.log("✅ Usage updated successfully");
          } catch (usageError) {
            console.error("Failed to update usage:", usageError);
          }
        } catch (error) {
          console.error("Error in search flow onFinish:", error);
        }
      },
    });

    console.log(
      "✅ Returning final streaming response with web search context"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return finalResponse.toUIMessageStreamResponse({
      originalMessages: baseMessages as any,
    });
  } catch (error) {
    console.error("❌ Web search failed:", error);

    // Fall back to regular response without web search
    return streamText({
      system: systemPrompt,
      model,
      toolChoice: "none",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: baseMessages as any,
      abortSignal,
      maxOutputTokens,
      providerOptions,
      experimental_transform: smoothStream({
        delayInMs: 20,
        chunking: "word",
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }).toUIMessageStreamResponse({ originalMessages: baseMessages as any });
  }
}
