"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { useChatStore } from "@/lib/store/useChatStore";
import { isToolUIPart } from "@/lib/utils/is-tool-part";
import type { ToolUIPart, UIDataTypes, UIMessage, UITools } from "ai";
import {
  ArrowBigUp,
  Banknote,
  Brain,
  Globe,
  LoaderPinwheel,
  TextSelect,
  Wrench,
} from "lucide-react";
import { useMemo } from "react";
import MessageBubble from "./message-bubble";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";

export type ChatMessageType = UIMessage<unknown, UIDataTypes, UITools>;

type MessagePart = ChatMessageType["parts"] extends Array<infer P> ? P : never;

type ReasoningPart = MessagePart & {
  type: "reasoning";
  text?: string;
  state?: string;
  reasoning?: {
    state?: string;
    title?: string;
  };
};

const TOOL_ACTIVE_STATES: Array<ToolUIPart["state"]> = [
  "input-streaming",
  "input-available",
];

const REASONING_ACTIVE_STATES = ["in-progress", "streaming", "pending"];

const isReasoningPart = (part: MessagePart): part is ReasoningPart => {
  if (typeof part !== "object" || part === null) return false;
  return (part as { type?: unknown }).type === "reasoning";
};

const isActiveReasoning = (part: ReasoningPart): boolean => {
  // Check the state property first
  if (part.state) {
    return REASONING_ACTIVE_STATES.some((state) =>
      part.state!.toLowerCase().includes(state),
    );
  }
  // Check reasoning.state as fallback
  if (part.reasoning?.state) {
    return REASONING_ACTIVE_STATES.some((state) =>
      part.reasoning!.state!.toLowerCase().includes(state),
    );
  }
  // If no state, check if there's text content - if yes, it's likely complete
  return !part.text || part.text.trim().length === 0;
};

const stringFromUnknown = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof (value as { toString: () => string }).toString === "function"
  ) {
    const rendered = (value as { toString: () => string }).toString();
    if (rendered !== "[object Object]") {
      return rendered;
    }
  }

  return null;
};

const extractTextFromPart = (part: MessagePart): string | null => {
  if (typeof part !== "object" || part === null) return null;

  const candidates: unknown[] = [];
  if ("text" in part) candidates.push((part as { text?: unknown }).text);
  if ("delta" in part) candidates.push((part as { delta?: unknown }).delta);
  if ("textDelta" in part)
    candidates.push((part as { textDelta?: unknown }).textDelta);
  if ("value" in part) candidates.push((part as { value?: unknown }).value);

  for (const candidate of candidates) {
    const asString = stringFromUnknown(candidate);
    if (asString && asString.trim().length > 0) {
      return asString;
    }
  }

  return null;
};

const getIndicatorState = (messages: ChatMessageType[]) => {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== "assistant") {
    return { type: "thinking", label: null };
  }

  for (const part of lastMsg.parts ?? []) {
    if (isToolUIPart(part) && TOOL_ACTIVE_STATES.includes(part.state)) {
      const toolName = part.type.startsWith("tool-")
        ? part.type.slice(5)
        : "tool";
      return { type: "tool", label: toolName };
    }
    if (isReasoningPart(part) && isActiveReasoning(part)) {
      return { type: "reasoning", label: null };
    }
  }

  return { type: "thinking", label: null };
};

interface MessageAreaProps {
  messages: ChatMessageType[];
}

export default function MessageAreaComponent({ messages }: MessageAreaProps) {
  const thinking = useChatStore((s) => s.thinking);
  const error = useChatStore((s) => s.error);
  const stopResponse = useChatStore((s) => s.stopResponse);

  const { type, label } = useMemo(
    () => getIndicatorState(messages),
    [messages],
  );

  const getIndicator = () => {
    if (type === "tool") {
      const isWebSearch =
        label?.toLowerCase().includes("websearch") ||
        label?.toLowerCase().includes("web");

      const isPricingSearch = label?.toLowerCase().includes("pricingcalc");
      const isLiveUrlCrawling = label?.toLowerCase().includes("urlcrawler");
      const isapiDebugger = label?.toLowerCase().includes("apidebugger");

      if (isWebSearch) {
        return {
          text: "Searching the web...",
          Icon: Globe,
        };
      }
      if (isapiDebugger) {
        return {
          text: "Hitting API's...",
          Icon: ArrowBigUp,
        };
      }
      if (isLiveUrlCrawling) {
        return {
          text: "Live crawling url...",
          Icon: TextSelect,
        };
      }
      if (isPricingSearch) {
        return {
          text: "Fetching latest pricing...",
          Icon: Banknote,
        };
      }

      return {
        text: `Using ${label}...`,
        Icon: Wrench,
      };
    }
    if (type === "reasoning")
      return { text: "Reasoning deeply...", Icon: Brain };
    return { text: "Thinking...", Icon: LoaderPinwheel };
  };

  const { text: indicatorText, Icon: IndicatorIcon } = getIndicator();

  const hasStreamingText = useMemo(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return false;

    return lastMsg.parts.some((part) => {
      if (part.type === "text") {
        const text = (part as { text?: string }).text;
        return text && text.trim().length > 0;
      }
      return false;
    });
  }, [messages]);

  const shouldShowIndicator = thinking && !hasStreamingText;

  function isUserOrAssistant(
    msg: ChatMessageType,
  ): msg is ChatMessageType & { role: "user" | "assistant" } {
    return msg.role === "user" || msg.role === "assistant";
  }

  const filteredMessages = messages.filter(isUserOrAssistant);

  const lastUserMessageIndex = filteredMessages.reduce(
    (lastIndex, msg, index) => {
      return msg.role === "user" ? index : lastIndex;
    },
    -1,
  );

  return (
    <Conversation className="w-full h-full flex-1 relative">
      <ConversationContent className="flex flex-col pt-9 lg:pt-0 w-full">
        {filteredMessages.map((msg, index) => {
          const isLastMessage = index === filteredMessages.length - 1;

          return (
            <div key={`${msg.id ?? "msg"}-${index}`} className="relative">
              {msg.role === "user" ? (
                <MessageBubble msg={msg} />
              ) : (
                <div className="w-full max-w-[95vw] lg:max-w-[55vw] box-border mx-auto ">
                  <Message from={msg.role}>
                    <MessageContent>
                      {msg.parts.map((part, partIndex) => {
                        const isLastPart = partIndex === msg.parts.length - 1;

                        if (part.type === "text") {
                          const textContent = extractTextFromPart(part);
                          return (
                            textContent && (
                              <Response key={`text-${partIndex}`}>
                                {textContent}
                              </Response>
                            )
                          );
                        }

                        if (part.type === "reasoning") {
                          // Use extractTextFromPart for consistent content extraction
                          const reasoningContent = extractTextFromPart(part);

                          // Skip rendering if no content yet
                          if (
                            !reasoningContent ||
                            reasoningContent.trim().length === 0
                          ) {
                            return null;
                          }

                          // Determine if reasoning is actively streaming
                          const isStreamingReasoning =
                            isLastMessage &&
                            isLastPart &&
                            isActiveReasoning(part as ReasoningPart);

                          return (
                            <Reasoning
                              key={`reasoning-${partIndex}`}
                              className="w-fit p-3   bg-black/35 mb-4 "
                              isStreaming={isStreamingReasoning}
                            >
                              <ReasoningTrigger className="cursor-pointer" />
                              <ReasoningContent className="">
                                {reasoningContent}
                              </ReasoningContent>
                            </Reasoning>
                          );
                        }

                        return null;
                      })}
                    </MessageContent>
                  </Message>
                </div>
              )}

              {shouldShowIndicator && index === lastUserMessageIndex && (
                <div className="mx-auto  max-w-[95vw] lg:max-w-[55vw] px-7 ">
                  <div
                    className={`flex items-center bg-background/25 w-fit gap-2 p-3 px-3.5 rounded-full text-sm  transition-opacity duration-100 ${
                      shouldShowIndicator ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <IndicatorIcon className="size-6 animate-pulse flex-shrink-0" />
                      <Shimmer className="">{indicatorText}</Shimmer>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {error && (
          <div className="mx-auto w-full max-w-[95vw] lg:max-w-[60vw] p-7">
            <div className="text-red-500 text-3xl">Error</div>
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
